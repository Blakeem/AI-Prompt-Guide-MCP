/**
 * Enhanced view_document tool implementation with namespace support and linked document context loading
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';
import { loadLinkedDocumentContext } from '../../shared/utilities.js';
import { DocumentNotFoundError } from '../../shared/addressing-system.js';
import { getTaskHeadings } from '../../shared/task-utilities.js';

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
 * @throws {DocumentNotFoundError} When documents cannot be loaded
 */
export async function viewDocument(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<ViewDocumentResponse> {

  // Import helper functions (validation now handled by ToolIntegration)
  const {
    isValidLinkDepth
  } = await import('../schemas/view-document-schemas.js');

  // Input validation and parsing using standardized utilities
  const { ToolIntegration } = await import('../../shared/addressing-system.js');
  const documents = ToolIntegration.validateArrayParameter(args['document'], 'document');
  ToolIntegration.validateCountLimit(documents, 5, 'documents');

  const includeLinked = args['include_linked'] as boolean ?? false;
  let linkDepth = args['link_depth'] as number ?? 2;

  // Validate link depth
  if (!isValidLinkDepth(linkDepth)) {
    linkDepth = 2;
  }

  // Process each document
  const processedDocuments: ViewDocumentResponse['documents'] = [];
  const allLinkedContext: ViewDocumentResponse['linked_context'] = [];

  for (const documentPath of documents) {
    // Use standardized document validation
    const { addresses } = ToolIntegration.validateAndParse({
      document: documentPath
    });

    // Get document
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    const processedDoc = await processDocument({
      manager,
      documentPath,
      document
    });
    processedDocuments.push(processedDoc);

    // Load linked context if requested (only for first document to avoid overwhelming response)
    if (includeLinked && processedDocuments.length === 1) {
      try {
        const linkedContext = await loadLinkedDocumentContext(
          manager,
          documentPath,
          undefined,
          linkDepth
        );
        allLinkedContext.push(...linkedContext);
      } catch (error) {
        console.warn('Failed to load linked context:', error);
      }
    }
  }

  // Calculate summary statistics
  const summary = {
    total_documents: processedDocuments.length,
    total_sections: processedDocuments.reduce((sum, doc) => sum + doc.sections.length, 0),
    total_words: processedDocuments.reduce((sum, doc) => sum + doc.wordCount, 0),
    total_tasks: processedDocuments.reduce((sum, doc) => sum + (doc.tasks?.total ?? 0), 0)
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

  return response;
}

/**
 * Extract document metadata including title, namespace, and file statistics
 */
async function extractDocumentMetadata(
  documentPath: string,
  document: CachedDocument
): Promise<{
  documentInfo: { slug: string; title: string; namespace: string };
  lastModified: string;
  wordCount: number;
  headingCount: number;
  fullContent: string;
}> {
  // Parse document address for standardized formatting
  const { parseDocumentAddress, ToolIntegration } = await import('../../shared/addressing-system.js');
  const documentAddress = parseDocumentAddress(documentPath);
  const documentInfo = ToolIntegration.formatDocumentInfo(documentAddress, { title: document.metadata.title });

  // Read file content and statistics
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

  // Calculate statistics
  const wordCount = fullContent.split(/\s+/).filter(word => word.length > 0).length;
  const headingCount = document.headings.length;

  return {
    documentInfo,
    lastModified,
    wordCount,
    headingCount,
    fullContent
  };
}

/**
 * Parameters for analyzing document sections
 */
interface AnalyzeDocumentSectionsParams {
  documentPath: string;
  document: CachedDocument;
}

/**
 * Analyze document sections and build simple section overview
 * Returns only essential information: slug, title, and depth for ALL sections
 */
async function analyzeDocumentSections(
  params: AnalyzeDocumentSectionsParams
): Promise<Array<{
  slug: string;
  title: string;
  depth: number;
}>> {
  const { document } = params;

  // Build simple sections with only essential information - ALWAYS show ALL sections
  const simpleSections = document.headings.map((heading: { slug: string; title: string; depth: number }) => {
    return {
      slug: heading.slug,
      title: heading.title,
      depth: heading.depth
    };
  });

  return simpleSections;
}

/**
 * Parameters for analyzing document links
 */
interface AnalyzeDocumentLinksParams {
  manager: DocumentManager;
  documentPath: string;
  document: CachedDocument;
  fullContent: string;
}

/**
 * Analyze document links including internal, external, and broken links
 */
async function analyzeDocumentLinks(
  params: AnalyzeDocumentLinksParams
): Promise<{
  total: number;
  internal: number;
  external: number;
  broken: number;
  sectionsWithoutLinks: string[];
}> {
  const { manager, documentPath, document, fullContent } = params;
  // Extract all links from full content using unified ReferenceExtractor
  const { ReferenceExtractor } = await import('../../shared/reference-extractor.js');
  const extractor = new ReferenceExtractor();
  const allLinks = extractor.extractReferences(fullContent);
  const externalLinks = fullContent.match(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g) ?? [];

  let brokenLinks = 0;
  const sectionsWithoutLinks: string[] = [];

  // Check for broken links and sections without links
  for (const heading of document.headings) {
    const sectionContent = await manager.getSectionContent(documentPath, heading.slug) ?? '';
    const sectionLinks = extractor.extractReferences(sectionContent);

    if (sectionLinks.length === 0) {
      sectionsWithoutLinks.push(heading.slug);
    }

    // Basic broken link detection (could be enhanced with actual validation)
    for (const link of sectionLinks) {
      const { parseLink } = await import('../../shared/link-utils.js');
      const parsed = parseLink(link, documentPath);
      if (parsed.type === 'cross-doc' && parsed.document != null && parsed.document !== '' && !parsed.document.includes('.md')) {
        brokenLinks++;
      }
    }
  }

  return {
    total: allLinks.length + externalLinks.length,
    internal: allLinks.length,
    external: externalLinks.length,
    broken: brokenLinks,
    sectionsWithoutLinks
  };
}

/**
 * Analyze document tasks including counts and status information
 */
async function analyzeDocumentTasks(
  manager: DocumentManager,
  documentPath: string,
  document: CachedDocument
): Promise<{
  total: number;
  completed: number;
  pending: number;
  sections_with_tasks: string[];
} | undefined> {
  // Find tasks section
  const taskSection = document.headings.find((h: { slug: string; title: string }) =>
    h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
  );

  if (taskSection == null) {
    return undefined;
  }

  // Use the same task identification logic as task.ts
  const taskHeadings = await getTaskHeadings(document, taskSection);

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

  // Only return tasks object if there are actual tasks
  if (totalTasks > 0) {
    return {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      sections_with_tasks: sectionsWithTasks
    };
  }

  return undefined;
}

/**
 * Parameters for formatting document response
 */
interface FormatDocumentResponseParams {
  documentPath: string;
  metadata: {
    documentInfo: { slug: string; title: string; namespace: string };
    lastModified: string;
    wordCount: number;
    headingCount: number;
  };
  sections: Array<{
    slug: string;
    title: string;
    depth: number;
  }>;
  documentLinks: {
    total: number;
    internal: number;
    external: number;
    broken: number;
    sectionsWithoutLinks: string[];
  };
  tasks?: {
    total: number;
    completed: number;
    pending: number;
    sections_with_tasks: string[];
  } | undefined;
}

/**
 * Format the final document response object
 */
async function formatDocumentResponse(
  params: FormatDocumentResponseParams
): Promise<ViewDocumentResponse['documents'][0]> {
  const { documentPath, metadata, sections, documentLinks, tasks } = params;
  const documentData: ViewDocumentResponse['documents'][0] = {
    path: documentPath,
    slug: metadata.documentInfo.slug,
    title: metadata.documentInfo.title,
    namespace: metadata.documentInfo.namespace,
    sections,
    documentLinks,
    lastModified: metadata.lastModified,
    wordCount: metadata.wordCount,
    headingCount: metadata.headingCount
  };

  if (tasks != null) {
    documentData.tasks = tasks;
  }

  return documentData;
}

/**
 * Parameters for processing a single document
 */
interface ProcessDocumentParams {
  manager: DocumentManager;
  documentPath: string;
  document: CachedDocument;
}

/**
 * Process a single document and return its data
 */
async function processDocument(
  params: ProcessDocumentParams
): Promise<ViewDocumentResponse['documents'][0]> {
  const { manager, documentPath, document } = params;
  // Extract document metadata
  const metadata = await extractDocumentMetadata(documentPath, document);

  // Analyze document sections - ALWAYS show ALL sections
  const sections = await analyzeDocumentSections({
    documentPath,
    document
  });

  // Analyze document links
  const documentLinks = await analyzeDocumentLinks({
    manager,
    documentPath,
    document,
    fullContent: metadata.fullContent
  });

  // Analyze document tasks
  const tasks = await analyzeDocumentTasks(manager, documentPath, document);

  // Format and return response
  return await formatDocumentResponse({
    documentPath,
    metadata,
    sections,
    documentLinks,
    tasks
  });
}

// getTaskHeadingsForViewDocument function moved to shared/task-utilities.ts to eliminate duplication

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