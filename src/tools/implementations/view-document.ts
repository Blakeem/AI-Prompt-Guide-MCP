/**
 * Enhanced view_document tool implementation with namespace support and linked document context loading
 */

import type { SessionState } from '../../session/types.js';
import type { CachedDocument } from '../../document-cache.js';
import {
  loadLinkedDocumentContext,
  getDocumentManager,
  parseLink
} from '../../shared/utilities.js';
import { DocumentNotFoundError } from '../../shared/addressing-system.js';

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
 * MCP tool for enhanced document viewing with comprehensive metadata and linked document context
 *
 * Provides detailed document inspection including content, structure analysis, statistics,
 * and automatic loading of linked document context. Supports both single and multiple document viewing.
 *
 * @param args - Parameters object containing document path(s) and viewing options
 * @param _state - MCP session state (unused in current implementation)
 * @returns Enhanced document information with metadata, content, statistics, and linked context
 *
 * @example
 * // Single document view
 * const result = await viewDocument({
 *   document: "api/authentication.md"
 * });
 *
 * // Multiple documents with linked context loading
 * const result = await viewDocument({
 *   documents: ["api/auth.md", "api/users.md"],
 *   include_linked_context: true
 * });
 *
 * // Access comprehensive document information
 * console.log(result.documents[0].title);
 * console.log(result.documents[0].statistics.word_count);
 * console.log(result.documents[0].headings.length);
 *
 * @throws {Error} When document paths are invalid or documents cannot be loaded
 * @throws {Error} When linked document context loading fails
 */
export async function viewDocument(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<ViewDocumentResponse> {
  // Initialize document manager
  const manager = await getDocumentManager();

  // Import helper functions (validation now handled by ToolIntegration)
  const {
    normalizeSection,
    isValidLinkDepth
  } = await import('../schemas/view-document-schemas.js');

  // Input validation and parsing using standardized utilities
  const { ToolIntegration } = await import('../../shared/addressing-system.js');
  const documents = ToolIntegration.validateArrayParameter(args['document'], 'document');
  ToolIntegration.validateCountLimit(documents, 5, 'documents');

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
    // Use standardized document validation
    const { addresses } = ToolIntegration.validateAndParse({
      document: documentPath,
      ...(sectionSlug != null && sectionSlug !== '' && { section: sectionSlug })
    });

    // Get document
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
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
  // Parse document address for standardized formatting
  const { parseDocumentAddress } = await import('../../shared/addressing-system.js');
  const documentAddress = parseDocumentAddress(documentPath);

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

    // Build hierarchical information using standardized ToolIntegration methods
    const { parseSectionAddress, ToolIntegration } = await import('../../shared/addressing-system.js');
    const { getParentSlug } = await import('../../shared/utilities.js');

    const sectionAddress = parseSectionAddress(heading.slug, documentPath);
    const fullPath = ToolIntegration.formatSectionPath(sectionAddress);
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

  // Analyze tasks if present using consistent logic from task.ts
  let tasks: ViewDocumentResponse['documents'][0]['tasks'];
  const taskSection = document.headings.find((h: { slug: string; title: string }) =>
    h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
  );

  if (taskSection != null) {
    // Use the same task identification logic as task.ts
    const taskHeadings = await getTaskHeadingsForViewDocument(document, taskSection);

    let completedTasks = 0;
    let pendingTasks = 0;
    const sectionsWithTasks: string[] = [];

    // Analyze each task heading for status
    for (const taskHeading of taskHeadings) {
      const content = await manager.getSectionContent(documentPath, taskHeading.slug) ?? '';

      // Extract status using same logic as task.ts
      const status = extractTaskStatus(content) ?? 'pending';

      if (status === 'completed') {
        completedTasks++;
      } else {
        pendingTasks++;
      }

      sectionsWithTasks.push(taskHeading.slug);
    }

    const totalTasks = taskHeadings.length;

    // Only include tasks object if there are actual tasks
    if (totalTasks > 0) {
      tasks = {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        sections_with_tasks: sectionsWithTasks
      };
    }
  }

  // Return document data using standardized ToolIntegration formatting
  const { ToolIntegration } = await import('../../shared/addressing-system.js');
  const documentInfo = ToolIntegration.formatDocumentInfo(documentAddress, { title: document.metadata.title });

  const documentData: ViewDocumentResponse['documents'][0] = {
    path: documentPath,
    slug: documentInfo.slug,
    title: documentInfo.title,
    namespace: documentInfo.namespace,
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

/**
 * Find all task headings that are children of the Tasks section
 * COPIED FROM task.ts FOR CONSISTENCY
 */
async function getTaskHeadingsForViewDocument(
  document: CachedDocument,
  tasksSection: { slug: string; title: string; depth?: number }
): Promise<Array<{ slug: string; title: string; depth: number }>> {
  const taskHeadings: Array<{ slug: string; title: string; depth: number }> = [];
  const tasksIndex = document.headings.findIndex(h => h.slug === tasksSection.slug);

  if (tasksIndex === -1) return taskHeadings;

  const tasksSectionDepth = tasksSection.depth ?? document.headings.find(h => h.slug === tasksSection.slug)?.depth ?? 2;
  const targetDepth = tasksSectionDepth + 1;

  // Look at headings after the Tasks section
  for (let i = tasksIndex + 1; i < document.headings.length; i++) {
    const heading = document.headings[i];
    if (heading == null) continue;

    // If we hit a heading at the same or shallower depth as Tasks, we're done
    if (heading.depth <= tasksSectionDepth) {
      break;
    }

    // If this is a direct child of Tasks section (depth = Tasks.depth + 1), it's a task
    if (heading.depth === targetDepth) {
      // Use addressing system to validate this is actually a task
      const compatibleDocument = {
        headings: document.headings.map(h => ({
          slug: h.slug,
          title: h.title,
          depth: h.depth
        }))
      };

      const { isTaskSection } = await import('../../shared/addressing-system.js');
      const isTask = await isTaskSection(heading.slug, compatibleDocument);
      if (isTask) {
        taskHeadings.push({
          slug: heading.slug,
          title: heading.title,
          depth: heading.depth
        });
      }
    }

    // Skip deeper nested headings (they are children of tasks, not tasks themselves)
  }

  return taskHeadings;
}

/**
 * Extract task status from content (same logic as task.ts)
 */
function extractTaskStatus(content: string): string | undefined {
  // Support both "* Status: value" and "- Status: value" formats
  const starMatch = content.match(/^\* Status:\s*(.+)$/m);
  if (starMatch != null) return starMatch[1]?.trim();

  const dashMatch = content.match(/^- Status:\s*(.+)$/m);
  return dashMatch?.[1]?.trim();
}