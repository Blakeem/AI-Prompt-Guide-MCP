/**
 * Implementation for view_section tool
 * Provides clean section viewing without stats overhead
 */

import type { SessionState } from '../../session/types.js';
import {
  ToolIntegration,
  DocumentNotFoundError,
  SectionNotFoundError,
  AddressingError,
  parseSectionAddress
} from '../../shared/addressing-system.js';
import {
  splitSlugPath,
  getParentSlug,
  getDocumentManager
} from '../../shared/utilities.js';

/**
 * Clean response format for view_section
 */
interface ViewSectionResponse {
  document: string;
  sections: Array<{
    slug: string;
    title: string;
    content: string;
    depth: number;
    full_path: string;
    parent?: string;
    word_count: number;
    links: string[];
  }>;
  summary: {
    total_sections: number;
    total_words: number;
    has_content: boolean;
  };
}

/**
 * Execute view_section tool
 */
export async function viewSection(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<ViewSectionResponse> {
  // Initialize document manager
  const manager = await getDocumentManager();

  // Import helper functions
  const {
    parseSections,
    validateSectionCount
  } = await import('../schemas/view-section-schemas.js');

  // Validate required parameters
  if (typeof args['document'] !== 'string' || args['document'] === '') {
    throw new AddressingError('document parameter is required and must be a non-empty string', 'INVALID_PARAMETER');
  }

  if (args['section'] == null || (typeof args['section'] !== 'string' && !Array.isArray(args['section']))) {
    throw new AddressingError('section parameter is required and must be a string or array of strings', 'INVALID_PARAMETER');
  }

  // Parse sections using existing schema helper but validate count
  const sections = parseSections(args['section'] as string | string[]);
  if (!validateSectionCount(sections)) {
    throw new AddressingError(`Too many sections. Maximum 10 sections allowed, got ${sections.length}`, 'TOO_MANY_SECTIONS');
  }

  // Use addressing system for document validation
  const { addresses } = ToolIntegration.validateAndParse({
    document: args['document'],
    // We don't use section here because we need to handle multiple sections manually
  });

  // Get document
  const document = await manager.getDocument(addresses.document.path);
  if (document == null) {
    throw new DocumentNotFoundError(addresses.document.path);
  }

  // Parse and validate all sections using addressing system
  const sectionAddresses = sections.map(sectionSlug => {
    try {
      return parseSectionAddress(sectionSlug, addresses.document.path);
    } catch (error) {
      if (error instanceof AddressingError) {
        throw error;
      }
      throw new AddressingError(`Invalid section reference: ${sectionSlug}`, 'INVALID_SECTION', { sectionSlug });
    }
  });

  // Validate all sections exist in document
  for (const sectionAddr of sectionAddresses) {
    const sectionExists = document.headings.some(h => h.slug === sectionAddr.slug);
    if (!sectionExists) {
      throw new SectionNotFoundError(sectionAddr.slug, addresses.document.path);
    }
  }

  // Process each section
  const processedSections = await Promise.all(sectionAddresses.map(async sectionAddr => {
    const heading = document.headings.find(h => h.slug === sectionAddr.slug);
    if (heading == null) {
      throw new SectionNotFoundError(sectionAddr.slug, addresses.document.path);
    }

    // Get section content using the normalized slug
    const content = await manager.getSectionContent(addresses.document.path, sectionAddr.slug) ?? '';

    // Analyze section for links
    const links: string[] = [];
    const linkMatches = content.match(/@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g) ?? [];
    links.push(...linkMatches);

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    // Build hierarchical information using existing utilities
    const slugParts = splitSlugPath(heading.slug);
    const fullPath = slugParts.join('/');
    const parent = getParentSlug(heading.slug);

    const sectionData: ViewSectionResponse['sections'][0] = {
      slug: heading.slug,
      title: heading.title,
      content,
      depth: heading.depth,
      full_path: fullPath,
      word_count: wordCount,
      links
    };

    if (parent != null && parent !== '') {
      sectionData.parent = parent;
    }

    return sectionData;
  }));

  // Calculate summary statistics
  const summary = {
    total_sections: processedSections.length,
    total_words: processedSections.reduce((sum, section) => sum + section.word_count, 0),
    has_content: processedSections.some(section => section.content.trim() !== '')
  };

  return {
    document: addresses.document.path,
    sections: processedSections,
    summary
  };
}