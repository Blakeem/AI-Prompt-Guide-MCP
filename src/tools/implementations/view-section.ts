/**
 * Implementation for view_section tool
 * Provides clean section viewing without stats overhead
 */

import type { SessionState } from '../../session/types.js';
import type { HierarchicalContext } from '../../shared/addressing-system.js';
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
 * Enhanced response format for view_section with hierarchical support
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
    hierarchical_context: HierarchicalContext | null;
  }>;
  summary: {
    total_sections: number;
    total_words: number;
    has_content: boolean;
    hierarchical_stats?: {
      max_depth: number;
      namespaces: string[];
      flat_sections: number;
      hierarchical_sections: number;
    };
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
  const { addresses } = await ToolIntegration.validateAndParse({
    document: args['document'],
    // We don't use section here because we need to handle multiple sections manually
  });

  // Get document
  const document = await manager.getDocument(addresses.document.path);
  if (document == null) {
    throw new DocumentNotFoundError(addresses.document.path);
  }

  // Parse and validate all sections using addressing system
  const sectionAddresses = await Promise.all(sections.map(async sectionSlug => {
    try {
      return await parseSectionAddress(sectionSlug, addresses.document.path);
    } catch (error) {
      if (error instanceof AddressingError) {
        throw error;
      }
      throw new AddressingError(`Invalid section reference: ${sectionSlug}`, 'INVALID_SECTION', { sectionSlug });
    }
  }));

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

    // Get hierarchical context using standardized ToolIntegration method
    const hierarchicalContext = ToolIntegration.formatHierarchicalContext(sectionAddr);

    const sectionData: ViewSectionResponse['sections'][0] = {
      slug: heading.slug,
      title: heading.title,
      content,
      depth: heading.depth,
      full_path: fullPath,
      word_count: wordCount,
      links,
      hierarchical_context: hierarchicalContext
    };

    if (parent != null && parent !== '') {
      sectionData.parent = parent;
    }

    return sectionData;
  }));

  // Calculate summary statistics with hierarchical stats
  const hierarchicalSections = processedSections.filter(s => s.hierarchical_context != null);
  const flatSections = processedSections.filter(s => s.hierarchical_context == null);

  // Get unique namespaces from hierarchical sections
  const namespaces = [...new Set(
    hierarchicalSections
      .map(s => s.hierarchical_context?.parent_path)
      .filter((path): path is string => path != null && path !== '')
  )];

  // Calculate max depth
  const maxDepth = Math.max(
    ...hierarchicalSections.map(s => s.hierarchical_context?.depth ?? 0),
    0
  );

  const summary = {
    total_sections: processedSections.length,
    total_words: processedSections.reduce((sum, section) => sum + section.word_count, 0),
    has_content: processedSections.some(section => section.content.trim() !== ''),
    hierarchical_stats: {
      max_depth: maxDepth,
      namespaces,
      flat_sections: flatSections.length,
      hierarchical_sections: hierarchicalSections.length
    }
  };

  return {
    document: addresses.document.path,
    sections: processedSections,
    summary
  };
}