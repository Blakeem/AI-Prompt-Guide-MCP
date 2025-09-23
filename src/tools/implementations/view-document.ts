/**
 * Enhanced view_document tool implementation with namespace support and linked document context loading
 */

import type { SessionState } from '../../session/types.js';
import type { CachedDocument } from '../../document-cache.js';
import {
  loadLinkedDocumentContext,
  getDocumentManager
} from '../../shared/utilities.js';

/**
 * Enhanced response format for view_document (supports multiple documents)
 */
interface ViewDocumentResponse {
  // Multiple document support
  documents: Array<{
    // Core document information
    path: string;
    slug: string;
    title: string;
    namespace: string;
    sections: Array<{
      slug: string;
      title: string;
      depth: number;
      full_path: string;
      parent?: string;
      hasContent: boolean;
      links: string[];
    }>;

    // Enhanced metadata with stats (like browse_documents)
    documentLinks: {
      total: number;
      internal: number;
      external: number;
      broken: number;
      sectionsWithoutLinks: string[];
    };

    // Standard metadata
    tasks?: {
      total: number;
      completed: number;
      pending: number;
      sections_with_tasks: string[];
    };
    lastModified: string;
    wordCount: number;
    headingCount: number;
  }>;

  // Global context (for multiple documents)
  summary: {
    total_documents: number;
    total_sections: number;
    total_words: number;
    total_tasks?: number;
    section_filter?: string;  // If filtering by section
  };

  // Context loading fields (optional, for all documents)
  linked_context?: Array<{
    source_link: string;
    document_path: string;
    section_slug?: string;
    content: string;
    namespace: string;
    title: string;
    relevance: 'primary' | 'secondary' | 'tertiary';
  }>;

  // Section-specific viewing (optional, only for single document + section)
  section_context?: {
    current_section: string;
    parent_sections: string[];
    child_sections: string[];
    sibling_sections: string[];
  };
}

/**
 * Execute view_document tool with enhanced capabilities
 */
export async function viewDocument(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<ViewDocumentResponse> {
  // Initialize document manager
  const manager = await getDocumentManager();

  // Import helper functions
  const {
    parseDocuments,
    normalizeSection,
    validateDocumentCount,
    isValidLinkDepth
  } = await import('../schemas/view-document-schemas.js');

  // Input validation and parsing
  const documentParam = args['document'];
  if (documentParam == null || (typeof documentParam !== 'string' && !Array.isArray(documentParam))) {
    throw new Error('document parameter is required and must be a string or array of strings');
  }

  const documents = parseDocuments(documentParam as string | string[]);
  if (!validateDocumentCount(documents)) {
    throw new Error(`Too many documents. Maximum ${5} documents allowed, got ${documents.length}`);
  }

  const sectionSlug = normalizeSection(args['section'] as string);
  const includeLinked = args['include_linked'] as boolean ?? false;
  let linkDepth = args['link_depth'] as number ?? 2;

  // Validate link depth
  if (!isValidLinkDepth(linkDepth)) {
    linkDepth = 2;
  }

  // Process each document
  const processedDocuments: ViewDocumentResponse['documents'] = [];
  const allLinkedContext: ViewDocumentResponse['linked_context'] = [];
  let sectionContext: ViewDocumentResponse['section_context'];

  for (const documentPath of documents) {
    // Get document
    const document = await manager.getDocument(documentPath);
    if (document == null) {
      throw new Error(`Document not found: ${documentPath}`);
    }

    // If section-specific viewing, validate section exists
    if (sectionSlug != null && sectionSlug !== '') {
      const sectionExists = document.headings.some(h => h.slug === sectionSlug);
      if (!sectionExists) {
        const availableSections = document.headings.map(h => h.slug).join(', ');
        throw new Error(`Section not found in ${documentPath}: ${sectionSlug}. Available sections: ${availableSections}`);
      }
    }

    const processedDoc = await processDocument(manager, documentPath, document, sectionSlug);
    processedDocuments.push(processedDoc);

    // Load linked context if requested (only for first document to avoid overwhelming response)
    if (includeLinked && processedDocuments.length === 1) {
      try {
        const linkedContext = await loadLinkedDocumentContext(
          manager,
          documentPath,
          sectionSlug,
          linkDepth
        );
        allLinkedContext.push(...linkedContext);
      } catch (error) {
        console.warn('Failed to load linked context:', error);
      }
    }

    // Build section context if viewing specific section and single document
    if (sectionSlug != null && sectionSlug !== '' && documents.length === 1) {
      sectionContext = await buildSectionContext(document, sectionSlug);
    }
  }

  // Calculate summary statistics
  const summary = {
    total_documents: processedDocuments.length,
    total_sections: processedDocuments.reduce((sum, doc) => sum + doc.sections.length, 0),
    total_words: processedDocuments.reduce((sum, doc) => sum + doc.wordCount, 0),
    total_tasks: processedDocuments.reduce((sum, doc) => sum + (doc.tasks?.total ?? 0), 0),
    ...(sectionSlug != null && { section_filter: sectionSlug })
  };

  // Build final response
  const response: ViewDocumentResponse = {
    documents: processedDocuments,
    summary
  };

  // Add optional fields
  if (allLinkedContext.length > 0) {
    response.linked_context = allLinkedContext;
  }

  if (sectionContext != null) {
    response.section_context = sectionContext;
  }

  return response;
}

/**
 * Process a single document and return its data
 */
async function processDocument(
  manager: Awaited<ReturnType<typeof getDocumentManager>>,
  documentPath: string,
  document: CachedDocument,
  sectionSlug: string | undefined
): Promise<ViewDocumentResponse['documents'][0]> {
  // Extract namespace from document path
  const namespace = documentPath.includes('/')
    ? documentPath.substring(1, documentPath.lastIndexOf('/'))
    : '';

  // Build enhanced sections list with hierarchical information
  let sectionsToShow = document.headings;

  // If section-specific viewing, filter sections
  if (sectionSlug != null && sectionSlug !== '') {
    const targetSection = document.headings.find((h: { slug: string }) => h.slug === sectionSlug);
    if (targetSection != null) {
      // Include the target section and all its children
      sectionsToShow = document.headings.filter((h: { slug: string }) => {
        return h.slug === sectionSlug || h.slug.startsWith(`${sectionSlug}/`);
      });
    }
  }

  const enhancedSections = await Promise.all(sectionsToShow.map(async (heading: { slug: string; title: string; depth: number }) => {
    // Get section content to analyze for links
    const content = await manager.getSectionContent(documentPath, heading.slug) ?? '';

    // Analyze section for links
    const links: string[] = [];
    const linkMatches = content.match(/@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g) ?? [];
    links.push(...linkMatches);

    // Build hierarchical information
    const { splitSlugPath, getParentSlug } = await import('../../shared/utilities.js');
    const slugParts = splitSlugPath(heading.slug);
    const fullPath = slugParts.join('/');
    const parent = getParentSlug(heading.slug);

    const sectionData: {
      slug: string;
      title: string;
      depth: number;
      full_path: string;
      parent?: string;
      hasContent: boolean;
      links: string[];
    } = {
      slug: heading.slug,
      title: heading.title,
      depth: heading.depth,
      full_path: fullPath,
      hasContent: (content.trim() !== ''),
      links
    };

    if (parent != null && parent !== '') {
      sectionData.parent = parent;
    }

    return sectionData;
  }));

  // Calculate document statistics
  const { loadConfig } = await import('../../config.js');
  const config = loadConfig();
  const { readFile, stat } = await import('node:fs/promises');
  const path_module = await import('node:path');
  const absolutePath = path_module.join(config.docsBasePath, documentPath);

  let fullContent = '';
  let lastModified = '';
  try {
    fullContent = await readFile(absolutePath, 'utf-8');
    const stats = await stat(absolutePath);
    lastModified = stats.mtime.toISOString();
  } catch {
    // Handle file read errors gracefully
    lastModified = new Date().toISOString();
  }

  // Calculate word count and heading count
  const wordCount = fullContent.split(/\s+/).filter(word => word.length > 0).length;
  const headingCount = document.headings.length;

  // Analyze document links
  const { parseLink } = await import('../../shared/utilities.js');
  const allLinks = fullContent.match(/@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g) ?? [];
  const externalLinks = fullContent.match(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g) ?? [];

  let brokenLinks = 0;
  const sectionsWithoutLinks: string[] = [];

  // Check for broken links and sections without links
  for (const heading of document.headings) {
    const sectionContent = await manager.getSectionContent(documentPath, heading.slug) ?? '';
    const sectionLinks = sectionContent.match(/@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g) ?? [];

    if (sectionLinks.length === 0) {
      sectionsWithoutLinks.push(heading.slug);
    }

    // Basic broken link detection (could be enhanced with actual validation)
    for (const link of sectionLinks) {
      const parsed = parseLink(link, documentPath);
      if (parsed.type === 'cross-doc' && parsed.document != null && parsed.document !== '' && !parsed.document.includes('.md')) {
        brokenLinks++;
      }
    }
  }

  const documentLinks = {
    total: allLinks.length + externalLinks.length,
    internal: allLinks.length,
    external: externalLinks.length,
    broken: brokenLinks,
    sectionsWithoutLinks
  };

  // Analyze tasks if present
  let tasks: ViewDocumentResponse['documents'][0]['tasks'];
  const taskSection = document.headings.find((h: { slug: string; title: string }) => h.slug === 'tasks' || h.title.toLowerCase().includes('task'));
  if (taskSection != null) {
    const taskContent = await manager.getSectionContent(documentPath, taskSection.slug) ?? '';
    const taskMatches = taskContent.match(/^\s*- \[([ x])\]/gm) ?? [];
    const totalTasks = taskMatches.length;
    const completedTasks = taskMatches.filter((match: string) => match.includes('[x]')).length;
    const pendingTasks = totalTasks - completedTasks;

    const sectionsWithTasks: string[] = [];
    for (const heading of document.headings) {
      const content = await manager.getSectionContent(documentPath, heading.slug) ?? '';
      if (content.match(/^\s*- \[([ x])\]/m) != null) {
        sectionsWithTasks.push(heading.slug);
      }
    }

    tasks = {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      sections_with_tasks: sectionsWithTasks
    };
  }

  // Return document data
  const documentData: ViewDocumentResponse['documents'][0] = {
    path: documentPath,
    slug: documentPath.split('/').pop()?.replace('.md', '') ?? 'unknown',
    title: document.metadata.title,
    namespace,
    sections: enhancedSections,
    documentLinks,
    lastModified,
    wordCount,
    headingCount
  };

  if (tasks != null) {
    documentData.tasks = tasks;
  }

  return documentData;
}

/**
 * Build section context for section-specific viewing
 */
async function buildSectionContext(
  document: CachedDocument,
  sectionSlug: string
): Promise<ViewDocumentResponse['section_context']> {
  // Find parent sections (breadcrumb trail)
  const { getParentSlug } = await import('../../shared/utilities.js');
  const parentSections: string[] = [];
  let currentParent = getParentSlug(sectionSlug);
  while (currentParent != null) {
    parentSections.unshift(currentParent);
    currentParent = getParentSlug(currentParent);
  }

  // Find child sections
  const childSections = document.headings
    .filter((h: { slug: string }) => {
      return h.slug.startsWith(`${sectionSlug}/`) && h.slug.split('/').length === sectionSlug.split('/').length + 1;
    })
    .map((h: { slug: string }) => h.slug);

  // Find sibling sections (same parent, same depth)
  const parentSlug = getParentSlug(sectionSlug);
  const siblingPrefix = parentSlug != null && parentSlug !== '' ? `${parentSlug}/` : '';
  const siblingPattern = new RegExp(`^${siblingPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^/]+$`);

  const siblingSections = document.headings
    .filter((h: { slug: string }) => h.slug !== sectionSlug && siblingPattern.test(h.slug))
    .map((h: { slug: string }) => h.slug);

  return {
    current_section: sectionSlug,
    parent_sections: parentSections,
    child_sections: childSections,
    sibling_sections: siblingSections
  };
}