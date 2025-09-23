/**
 * Implementation for view_section tool
 * Provides clean section viewing without stats overhead
 */

import type { SessionState } from '../../session/types.js';
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

  // Input validation and parsing
  const documentParam = args['document'];
  if (typeof documentParam !== 'string' || documentParam === '') {
    throw new Error('document parameter is required and must be a non-empty string');
  }

  const sectionParam = args['section'];
  if (sectionParam == null || (typeof sectionParam !== 'string' && !Array.isArray(sectionParam))) {
    throw new Error('section parameter is required and must be a string or array of strings');
  }

  const sections = parseSections(sectionParam as string | string[]);
  if (!validateSectionCount(sections)) {
    throw new Error(`Too many sections. Maximum 10 sections allowed, got ${sections.length}`);
  }

  // Normalize document path
  const documentPath = documentParam.startsWith('/') ? documentParam : `/${documentParam}`;

  // Get document
  const document = await manager.getDocument(documentPath);
  if (document == null) {
    throw new Error(`Document not found: ${documentPath}`);
  }

  // Validate all sections exist
  for (const sectionSlug of sections) {
    const sectionExists = document.headings.some(h => h.slug === sectionSlug);
    if (!sectionExists) {
      const availableSections = document.headings.map(h => h.slug).join(', ');
      throw new Error(`Section not found: ${sectionSlug}. Available sections: ${availableSections}`);
    }
  }

  // Process each section
  const processedSections = await Promise.all(sections.map(async sectionSlug => {
    const heading = document.headings.find(h => h.slug === sectionSlug);
    if (heading == null) {
      throw new Error(`Section not found: ${sectionSlug}`);
    }

    // Get section content
    const content = await manager.getSectionContent(documentPath, sectionSlug) ?? '';

    // Analyze section for links
    const links: string[] = [];
    const linkMatches = content.match(/@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g) ?? [];
    links.push(...linkMatches);

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    // Build hierarchical information
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
    document: documentPath,
    sections: processedSections,
    summary
  };
}