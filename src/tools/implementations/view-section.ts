/**
 * Implementation for view_section tool
 * Provides clean section viewing without stats overhead
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { HierarchicalContext } from '../../shared/addressing-system.js';
import {
  ToolIntegration,
  DocumentNotFoundError,
  SectionNotFoundError,
  AddressingError,
  parseSectionAddress,
  type SectionAddress
} from '../../shared/addressing-system.js';
import { getParentSlug } from '../../shared/utilities.js';
import { ReferenceExtractor } from '../../shared/reference-extractor.js';

/**
 * Enhanced response format for view_section with hierarchical support
 */
interface ViewSectionResponse {
  mode: 'overview' | 'detail';
  document: string;
  sections: Array<{
    slug: string;
    title: string;
    content?: string;  // Only in detail mode
    depth: number;
    full_path: string;
    parent?: string;
    word_count?: number;  // Only in detail mode
    links?: string[];  // Only in detail mode
    hierarchical_context?: HierarchicalContext | null;  // Only in detail mode
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
  _state: SessionState,
  manager: DocumentManager
): Promise<ViewSectionResponse> {

  // Mode Detection: Parse document parameter to detect mode
  const documentParam = ToolIntegration.validateStringParameter(args['document'], 'document');

  let mode: 'overview' | 'detail';
  let docPath: string;
  let sectionSlugs: string[] | undefined;

  if (documentParam.includes('#')) {
    // Detail mode: Parse document + slug(s)
    const parts = documentParam.split('#');
    docPath = parts[0] ?? documentParam;
    const slugsPart = parts[1];
    mode = 'detail';

    if (slugsPart == null || slugsPart === '') {
      throw new AddressingError(
        'Section slug(s) cannot be empty after #',
        'EMPTY_SECTION_SLUG'
      );
    }

    // Support comma-separated slugs: #section1,section2,section3
    sectionSlugs = slugsPart.split(',').map(s => s.trim()).filter(s => s !== '');

    if (sectionSlugs.length === 0) {
      throw new AddressingError(
        'At least one section slug required in detail mode',
        'NO_SECTION_SLUGS'
      );
    }

    // Validate count using standardized utility
    ToolIntegration.validateCountLimit(sectionSlugs, 10, 'sections');
  } else {
    // Overview mode: Document only
    docPath = documentParam;
    sectionSlugs = undefined;
    mode = 'overview';
  }

  // Use addressing system for document validation
  const { addresses } = ToolIntegration.validateAndParse({
    document: docPath
  });

  // Get document
  const document = await manager.getDocument(addresses.document.path);
  if (document == null) {
    throw new DocumentNotFoundError(addresses.document.path);
  }

  // Handle Overview Mode: Return all sections with minimal data (no content)
  if (mode === 'overview') {
    // Get all sections from document headings
    const overviewSections = document.headings.map(heading => ({
      slug: heading.slug,
      title: heading.title,
      depth: heading.depth,
      full_path: `${addresses.document.path}#${heading.slug}`
    }));

    // Calculate summary statistics
    const maxDepth = Math.max(...document.headings.map(h => h.depth), 0);
    const namespaces: string[] = []; // Overview mode doesn't load hierarchical context

    return {
      mode: 'overview',
      document: addresses.document.path,
      sections: overviewSections,
      summary: {
        total_sections: overviewSections.length,
        total_words: 0,  // Not calculated in overview mode
        has_content: true,
        hierarchical_stats: {
          max_depth: maxDepth,
          namespaces,
          flat_sections: overviewSections.length,
          hierarchical_sections: 0
        }
      }
    };
  }

  // Detail Mode: Process specified sections with full content
  // At this point we're in detail mode, so sectionSlugs must be defined
  if (sectionSlugs == null) {
    throw new AddressingError(
      'Internal error: sectionSlugs undefined in detail mode',
      'INTERNAL_ERROR'
    );
  }
  const sections = sectionSlugs;

  // Parse and validate all sections using addressing system
  // Use Promise.allSettled for non-critical view operations to handle partial failures gracefully
  const sectionAddressResults = await Promise.allSettled(sections.map(sectionSlug => {
    try {
      return parseSectionAddress(sectionSlug, addresses.document.path);
    } catch (error) {
      if (error instanceof AddressingError) {
        throw error;
      }
      throw new AddressingError(`Invalid section reference: ${sectionSlug}`, 'INVALID_SECTION', { sectionSlug });
    }
  }));

  // Separate successful addresses from failures for graceful handling
  const sectionAddresses: SectionAddress[] = [];
  const failedSections: string[] = [];

  sectionAddressResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sectionAddresses.push(result.value);
    } else {
      const sectionSlug = sections[index];
      if (sectionSlug != null) {
        failedSections.push(sectionSlug);
      }
    }
  });

  // If all sections failed, throw the first error to maintain backward compatibility
  if (sectionAddresses.length === 0 && failedSections.length > 0) {
    const firstResult = sectionAddressResults[0];
    if (firstResult?.status === 'rejected') {
      throw firstResult.reason;
    }
  }

  // Validate all sections exist in document
  for (const sectionAddr of sectionAddresses) {
    const sectionExists = document.headings.some(h => h.slug === sectionAddr.slug);
    if (!sectionExists) {
      throw new SectionNotFoundError(sectionAddr.slug, addresses.document.path);
    }
  }

  // Process each section using Promise.allSettled for graceful partial failure handling
  const sectionProcessingResults = await Promise.allSettled(sectionAddresses.map(async sectionAddr => {
    const heading = document.headings.find(h => h.slug === sectionAddr.slug);
    if (heading == null) {
      throw new SectionNotFoundError(sectionAddr.slug, addresses.document.path);
    }

    // Get section content using the normalized slug
    const content = await manager.getSectionContent(addresses.document.path, sectionAddr.slug) ?? '';

    // Analyze section for links using unified ReferenceExtractor
    const links: string[] = [];
    const extractor = new ReferenceExtractor();
    const references = extractor.extractReferences(content);
    links.push(...references);

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    // Build hierarchical information using standardized ToolIntegration methods
    const parent = getParentSlug(heading.slug);

    // Get hierarchical context using standardized ToolIntegration method
    const hierarchicalContext = ToolIntegration.formatHierarchicalContext(sectionAddr);

    const sectionData: ViewSectionResponse['sections'][0] = {
      slug: heading.slug,
      title: heading.title,
      content,
      depth: heading.depth,
      full_path: ToolIntegration.formatSectionPath(sectionAddr),
      word_count: wordCount,
      links,
      hierarchical_context: hierarchicalContext
    };

    if (parent != null && parent !== '') {
      sectionData.parent = parent;
    }

    return sectionData;
  }));

  // Separate successful sections from failures
  const processedSections: ViewSectionResponse['sections'] = [];
  const processingErrors: { sectionSlug: string; error: Error }[] = [];

  sectionProcessingResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      processedSections.push(result.value);
    } else {
      processingErrors.push({
        sectionSlug: sectionAddresses[index]?.slug ?? failedSections[0] ?? 'unknown',
        error: result.reason
      });
    }
  });

  // If all sections failed to process, throw the first error for backward compatibility
  if (processedSections.length === 0 && processingErrors.length > 0) {
    const firstError = processingErrors[0];
    if (firstError != null) {
      throw firstError.error;
    }
  }

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
    total_words: processedSections.reduce((sum, section) => sum + (section.word_count ?? 0), 0),
    has_content: processedSections.some(section => (section.content ?? '').trim() !== ''),
    hierarchical_stats: {
      max_depth: maxDepth,
      namespaces,
      flat_sections: flatSections.length,
      hierarchical_sections: hierarchicalSections.length
    }
  };

  return {
    mode: 'detail',
    document: addresses.document.path,
    sections: processedSections,
    summary
  };
}