/**
 * Shared utility functions for tool implementations
 */

import type { DocumentManager } from '../document-manager.js';
import type { InsertMode } from '../types/index.js';
import { initializeGlobalCache } from '../document-cache.js';
import type {
  SmartSuggestions,
  RelatedDocumentSuggestion,
  SimilarImplementationSuggestion,
  MissingPieceSuggestion,
  ImplementationStep,
  NamespacePatterns
} from '../tools/schemas/create-document-schemas.js';

/**
 * Helper function to perform a single section edit operation
 */
export async function performSectionEdit(
  manager: DocumentManager,
  normalizedPath: string,
  sectionSlug: string,
  content: string,
  operation: string,
  title?: string
): Promise<{ action: 'edited' | 'created' | 'removed'; section: string; depth?: number; removedContent?: string }> {
  // Check if document exists
  const document = await manager.getDocument(normalizedPath);
  if (!document) {
    throw new Error(`Document not found: ${normalizedPath}`);
  }

  const creationOperations = ['insert_before', 'insert_after', 'append_child'];
  const editOperations = ['replace', 'append', 'prepend'];
  const removeOperations = ['remove'];

  if (removeOperations.includes(operation)) {
    // Remove operations - delete section
    const section = document.headings.find(h => h.slug === sectionSlug);
    if (!section) {
      throw new Error(`Section not found: ${sectionSlug}. Available sections: ${document.headings.map(h => h.slug).join(', ')}`);
    }

    // Get current content for recovery
    const removedContent = await manager.getSectionContent(normalizedPath, sectionSlug) ?? '';

    // Remove the section using the sections utility
    const { deleteSection } = await import('../sections.js');
    const { loadConfig } = await import('../config.js');
    const path = await import('node:path');
    const config = loadConfig();
    const absolutePath = path.join(config.docsBasePath, normalizedPath);
    const { readFileSnapshot, writeFileIfUnchanged } = await import('../fsio.js');

    const snapshot = await readFileSnapshot(absolutePath);
    const updatedContent = deleteSection(snapshot.content, sectionSlug);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updatedContent);

    return {
      action: 'removed',
      section: sectionSlug,
      removedContent
    };

  } else if (creationOperations.includes(operation)) {
    // Creation operations - create new section
    if (title == null || title === '') {
      throw new Error(`Title is required for creation operation: ${operation}`);
    }

    // Map operation to InsertMode
    const insertMode = operation === 'insert_before' ? 'insert_before'
      : operation === 'insert_after' ? 'insert_after'
      : 'append_child';


    // Insert the section with automatic depth calculation
    await manager.insertSection(
      normalizedPath,
      sectionSlug,
      insertMode as InsertMode,
      undefined, // Let it auto-calculate depth
      title,
      content,
      { updateToc: true }
    );

    // Get the created section's slug and depth
    const updatedDocument = await manager.getDocument(normalizedPath);
    if (!updatedDocument) {
      throw new Error('Failed to retrieve updated document');
    }

    // Find the newly created section
    const { titleToSlug } = await import('../slug.js');
    const newSlug = titleToSlug(title);
    const newSection = updatedDocument.headings.find(h => h.slug === newSlug);

    return {
      action: 'created',
      section: newSlug,
      ...(newSection?.depth !== undefined && { depth: newSection.depth })
    };

  } else if (editOperations.includes(operation)) {
    // Edit operations - modify existing section
    if (operation === 'replace') {
      const section = document.headings.find(h => h.slug === sectionSlug);
      if (!section) {
        throw new Error(`Section not found: ${sectionSlug}. Available sections: ${document.headings.map(h => h.slug).join(', ')}`);
      }

      await manager.updateSection(normalizedPath, sectionSlug, content, {
        updateToc: true,
        validateLinks: true
      });
    } else {
      // For append/prepend, get current content and modify it
      const currentContent = await manager.getSectionContent(normalizedPath, sectionSlug) ?? '';

      let newContent: string;
      if (operation === 'append') {
        newContent = currentContent.trim() !== '' ? `${currentContent}\n\n${content}` : content;
      } else if (operation === 'prepend') {
        newContent = currentContent.trim() !== '' ? `${content}\n\n${currentContent}` : content;
      } else {
        throw new Error(`Invalid operation: ${operation}. Must be 'replace', 'append', or 'prepend'`);
      }

      await manager.updateSection(normalizedPath, sectionSlug, newContent, {
        updateToc: true,
        validateLinks: true
      });
    }

    return {
      action: 'edited',
      section: sectionSlug
    };

  } else {
    throw new Error(`Invalid operation: ${operation}. Must be one of: ${[...editOperations, ...creationOperations, ...removeOperations].join(', ')}`);
  }
}

/**
 * Get document manager instance (lazy initialization)
 */
let documentManager: DocumentManager | null = null;

export async function getDocumentManager(): Promise<DocumentManager> {
  if (documentManager == null) {
    // Import dynamically to avoid circular dependencies
    const { DocumentManager } = await import('../document-manager.js');
    const { loadConfig } = await import('../config.js');

    const config = loadConfig();

    // Initialize global cache if not already done
    try {
      initializeGlobalCache(config.docsBasePath, {
        maxCacheSize: 100,
        enableWatching: true,
        watchIgnorePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        evictionPolicy: 'lru'
      });
    } catch {
      // Cache already initialized, ignore
    }

    documentManager = new DocumentManager(config.docsBasePath);
  }
  return documentManager;
}

/**
 * Convert a file system path to a namespace
 */
export function pathToNamespace(docPath: string): string {
  // Convert document path to namespace (e.g., "/api/specs/auth.md" → "api/specs")
  const parts = docPath.split('/').filter(part => part !== '' && part !== '.');
  if (parts.length === 0) {
    return '';
  }

  // Remove .md extension from the last part if it's a file
  const lastPart = parts[parts.length - 1];
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  if (lastPart != null && lastPart.endsWith('.md')) {
    parts.pop(); // Remove the file part to get folder namespace
  }

  return parts.join('/');
}

/**
 * Convert a document path to a slug
 * Enhanced to support hierarchical path-to-slug conversion
 */
export function pathToSlug(docPath: string): string {
  const parts = docPath.split('/').filter(part => part !== '' && part !== '.');
  if (parts.length === 0) {
    return '';
  }

  const fileName = parts[parts.length - 1];
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  if (fileName != null && fileName.endsWith('.md')) {
    return fileName.slice(0, -3); // Remove .md extension
  }

  return fileName ?? '';
}


// Re-export hierarchical slug utilities for convenience
export {
  generateHierarchicalSlug,
  splitSlugPath,
  joinSlugPath,
  getSlugDepth,
  getParentSlug,
  getSlugLeaf,
  createHierarchicalSlug,
  isSlugAncestor,
  isDirectChild,
  getDirectChildren,
  getAllDescendants,
  getRelativeSlugPath,
  validateSlugPath
} from './slug-utils.js';

// Re-export link utilities for convenience
export {
  parseLink,
  resolveLink,
  validateLink,
  linkExists,
  resolveLinkWithContext
} from './link-utils.js';

// Re-export link validation utilities for convenience
export {
  validateSingleLink,
  validateDocumentLinks,
  validateSystemLinks,
  autoFixLinks
} from './link-validation.js';

// Re-export link validation types
export type {
  LinkValidationResult,
  DocumentLinkReport,
  SystemLinkReport
} from './link-validation.js';

/**
 * Load linked document context for enhanced view_document responses
 *
 * @param manager - DocumentManager instance
 * @param documentPath - Path to the source document
 * @param sectionSlug - Optional section slug to limit scope
 * @param linkDepth - Maximum depth for recursive context loading (1-3)
 * @returns Array of linked context objects
 */
export async function loadLinkedDocumentContext(
  manager: DocumentManager,
  documentPath: string,
  sectionSlug?: string,
  linkDepth: number = 2
): Promise<Array<{
  source_link: string;
  document_path: string;
  section_slug?: string;
  content: string;
  namespace: string;
  title: string;
  relevance: 'primary' | 'secondary' | 'tertiary';
}>> {
  // Input validation
  if (linkDepth < 1 || linkDepth > 3) {
    linkDepth = 2;
  }

  const linkedContext: Array<{
    source_link: string;
    document_path: string;
    section_slug?: string;
    content: string;
    namespace: string;
    title: string;
    relevance: 'primary' | 'secondary' | 'tertiary';
  }> = [];

  // Track visited links to prevent cycles
  const visited = new Set<string>();

  // Queue for breadth-first context loading
  const queue: Array<{
    docPath: string;
    sectionSlug?: string;
    depth: number;
    relevance: 'primary' | 'secondary' | 'tertiary';
  }> = [];

  // Get the source document
  const sourceDocument = await manager.getDocument(documentPath);
  if (!sourceDocument) {
    return linkedContext;
  }

  // Determine content to scan for links
  let contentToScan = '';
  if (sectionSlug != null && sectionSlug !== '') {
    // Scan only the specified section
    const sectionContent = await manager.getSectionContent(documentPath, sectionSlug);
    contentToScan = sectionContent ?? '';
  } else {
    // Scan entire document
    const { readFile } = await import('node:fs/promises');
    const { loadConfig } = await import('../config.js');
    const path = await import('node:path');
    const config = loadConfig();
    const absolutePath = path.join(config.docsBasePath, documentPath);

    try {
      contentToScan = await readFile(absolutePath, 'utf-8');
    } catch {
      return linkedContext;
    }
  }

  // Extract all @ links from content
  const linkPattern = /@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g;
  const matches = contentToScan.match(linkPattern) ?? [];

  // Process each unique link
  const uniqueLinks = [...new Set(matches)];

  for (const linkText of uniqueLinks) {
    const { parseLink: parseLinkFn } = await import('./link-utils.js');
    const parsedLink = parseLinkFn(linkText, documentPath);

    if (parsedLink.type === 'external') {
      continue;
    }

    // Create a unique identifier for this link
    const linkId = parsedLink.type === 'within-doc'
      ? `${documentPath}#${parsedLink.section ?? ''}`
      : `${parsedLink.document ?? ''}#${parsedLink.section ?? ''}`;

    if (visited.has(linkId)) {
      continue;
    }
    visited.add(linkId);

    // Resolve the link
    const { resolveLinkWithContext } = await import('./link-utils.js');
    const resolved = await resolveLinkWithContext(linkText, documentPath, manager);
    if (resolved.validation.valid !== true || resolved.resolvedPath == null) {
      continue;
    }

    // Extract document path and section from resolved path
    const hashIndex = resolved.resolvedPath.indexOf('#');
    const docPath = hashIndex === -1 ? resolved.resolvedPath : resolved.resolvedPath.slice(0, hashIndex);
    const sectionSlug = hashIndex === -1 ? undefined : resolved.resolvedPath.slice(hashIndex + 1);

    // Add to processing queue
    const queueItem: {
      docPath: string;
      sectionSlug?: string;
      depth: number;
      relevance: 'primary' | 'secondary' | 'tertiary';
    } = {
      docPath,
      depth: 1,
      relevance: 'primary'
    };

    if (sectionSlug != null && sectionSlug !== '') {
      queueItem.sectionSlug = sectionSlug;
    }

    queue.push(queueItem);
  }

  // Process queue with depth limiting
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth > linkDepth) {
      continue;
    }

    const currentId = `${current.docPath}#${current.sectionSlug ?? ''}`;
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // Load the linked document
    const linkedDoc = await manager.getDocument(current.docPath);
    if (!linkedDoc) {
      continue;
    }

    // Get content and metadata
    let content = '';
    let title = linkedDoc.metadata.title;

    if (current.sectionSlug != null && current.sectionSlug !== '') {
      // Load specific section
      const sectionContent = await manager.getSectionContent(current.docPath, current.sectionSlug);
      content = sectionContent ?? '';

      // Find section title
      const section = linkedDoc.headings.find(h => h.slug === current.sectionSlug);
      if (section != null) {
        title = section.title;
      }
    } else {
      // Load entire document
      const { readFile } = await import('node:fs/promises');
      const { loadConfig } = await import('../config.js');
      const path = await import('node:path');
      const config = loadConfig();
      const absolutePath = path.join(config.docsBasePath, current.docPath);

      try {
        content = await readFile(absolutePath, 'utf-8');
      } catch {
        continue;
      }
    }

    // Extract namespace from document path
    const namespace = current.docPath.includes('/')
      ? current.docPath.substring(1, current.docPath.lastIndexOf('/'))
      : '';

    // Create source link reference
    const sourceLink = current.sectionSlug != null && current.sectionSlug !== ''
      ? `@${current.docPath}#${current.sectionSlug}`
      : `@${current.docPath}`;

    // Add to context
    const contextItem: {
      source_link: string;
      document_path: string;
      section_slug?: string;
      content: string;
      namespace: string;
      title: string;
      relevance: 'primary' | 'secondary' | 'tertiary';
    } = {
      source_link: sourceLink,
      document_path: current.docPath,
      content,
      namespace,
      title,
      relevance: current.relevance
    };

    if (current.sectionSlug != null && current.sectionSlug !== '') {
      contextItem.section_slug = current.sectionSlug;
    }

    linkedContext.push(contextItem);

    // If we haven't reached max depth, scan this content for more links
    if (current.depth < linkDepth) {
      const nestedLinks = content.match(linkPattern) ?? [];
      const uniqueNestedLinks = [...new Set(nestedLinks)];

      for (const nestedLinkText of uniqueNestedLinks) {
        const { parseLink: parseLinkNestedFn } = await import('./link-utils.js');
        const nestedParsed = parseLinkNestedFn(nestedLinkText, current.docPath);

        if (nestedParsed.type === 'external') {
          continue;
        }

        const { resolveLinkWithContext: resolveLinkNestedFn } = await import('./link-utils.js');
        const nestedResolved = await resolveLinkNestedFn(nestedLinkText, current.docPath, manager);
        if (nestedResolved.validation.valid !== true || nestedResolved.resolvedPath == null) {
          continue;
        }

        // Extract document path and section from resolved path
        const nestedHashIndex = nestedResolved.resolvedPath.indexOf('#');
        const nestedDocPath = nestedHashIndex === -1 ? nestedResolved.resolvedPath : nestedResolved.resolvedPath.slice(0, nestedHashIndex);
        const nestedSectionSlug = nestedHashIndex === -1 ? undefined : nestedResolved.resolvedPath.slice(nestedHashIndex + 1);

        const nestedId = `${nestedDocPath}#${nestedSectionSlug ?? ''}`;
        if (visited.has(nestedId)) {
          continue;
        }

        // Add to queue with incremented depth and reduced relevance
        const nextRelevance = current.relevance === 'primary' ? 'secondary' : 'tertiary';
        const nestedQueueItem: {
          docPath: string;
          sectionSlug?: string;
          depth: number;
          relevance: 'primary' | 'secondary' | 'tertiary';
        } = {
          docPath: nestedDocPath,
          depth: current.depth + 1,
          relevance: nextRelevance
        };

        if (nestedSectionSlug != null && nestedSectionSlug !== '') {
          nestedQueueItem.sectionSlug = nestedSectionSlug;
        }

        queue.push(nestedQueueItem);
      }
    }
  }

  return linkedContext;
}

/**
 * Main orchestration function for document suggestions analysis
 */
export async function analyzeDocumentSuggestions(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string
): Promise<SmartSuggestions> {
  // Collect all analysis in parallel for performance
  const [relatedDocs, similarImplementations] = await Promise.all([
    findRelatedDocuments(manager, namespace, title, overview),
    findSimilarImplementations(manager, namespace, title, overview)
  ]);

  // Identify missing pieces based on related documents and patterns
  const missingPieces = await identifyMissingPieces(manager, namespace, title, overview, relatedDocs);

  // Generate implementation sequence based on all analysis
  const implementationSequence = generateImplementationSequence(relatedDocs, missingPieces, namespace, title);

  return {
    related_documents: relatedDocs,
    similar_implementations: similarImplementations,
    missing_pieces: missingPieces,
    implementation_sequence: implementationSequence
  };
}

/**
 * Find related documents across namespaces that should be referenced or implemented
 */
async function findRelatedDocuments(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string
): Promise<RelatedDocumentSuggestion[]> {
  // Content fingerprinting - extract keywords and concepts
  const keywords = extractKeywords(title, overview);
  const suggestions: RelatedDocumentSuggestion[] = [];

  try {
    // Get all documents across namespaces
    const allDocuments = await manager.listDocuments();

    for (const docInfo of allDocuments) {
      // Skip documents in the same namespace for related docs analysis
      const docNamespace = pathToNamespace(docInfo.path);
      if (docNamespace === namespace) {
        continue;
      }

      const document = await manager.getDocument(docInfo.path);
      if (document == null) continue;

      // For content analysis, we need to read the actual content
      const content = await manager.getSectionContent(docInfo.path, '') ?? '';

      // Calculate relevance based on title and content overlap
      const relevance = calculateContentRelevance(keywords, document.metadata.title, content);

      if (relevance > 0.3) { // Only include moderately relevant or higher
        // Determine relationship type and implementation gap
        const relationship = analyzeDocumentRelationship(namespace, docNamespace, title, document.metadata.title);

        const suggestion: RelatedDocumentSuggestion = {
          path: docInfo.path,
          title: document.metadata.title,
          namespace: docNamespace,
          reason: relationship.reason,
          relevance: Math.round(relevance * 100) / 100
        };

        if (relationship.sectionsToReference != null) {
          suggestion.sections_to_reference = relationship.sectionsToReference;
        }

        if (relationship.implementationGap != null) {
          suggestion.implementation_gap = relationship.implementationGap;
        }

        suggestions.push(suggestion);
      }
    }

    // Sort by relevance and return top 5
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);

  } catch (error) {
    // Return empty array on error instead of throwing
    console.warn('Error finding related documents:', error);
    return [];
  }
}

/**
 * Find similar implementations within the same namespace
 */
async function findSimilarImplementations(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string
): Promise<SimilarImplementationSuggestion[]> {
  const keywords = extractKeywords(title, overview);
  const suggestions: SimilarImplementationSuggestion[] = [];

  try {
    // Get documents in the same namespace
    const allDocuments = await manager.listDocuments();
    const namespaceDocuments = allDocuments.filter(docInfo => pathToNamespace(docInfo.path) === namespace);

    for (const docInfo of namespaceDocuments) {
      const document = await manager.getDocument(docInfo.path);
      if (document == null) continue;

      // For content analysis, we need to read the actual content
      const content = await manager.getSectionContent(docInfo.path, '') ?? '';

      // Calculate similarity based on content patterns
      const relevance = calculateContentRelevance(keywords, document.metadata.title, content);

      if (relevance > 0.2) { // Lower threshold for same namespace
        const patterns = extractReusablePatterns(content, namespace);

        suggestions.push({
          path: docInfo.path,
          title: document.metadata.title,
          namespace,
          reason: generateSimilarityReason(namespace, title, document.metadata.title, patterns),
          relevance: Math.round(relevance * 100) / 100,
          reusable_patterns: patterns
        });
      }
    }

    // Sort by relevance and return top 3
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);

  } catch (error) {
    console.warn('Error finding similar implementations:', error);
    return [];
  }
}

/**
 * Identify missing pieces in the documentation ecosystem
 */
async function identifyMissingPieces(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string,
  relatedDocs: RelatedDocumentSuggestion[]
): Promise<MissingPieceSuggestion[]> {
  const missingPieces: MissingPieceSuggestion[] = [];

  try {
    // Cross-namespace gap analysis
    const gapAnalysis = await performGapAnalysis(manager, namespace, title, overview, relatedDocs);
    missingPieces.push(...gapAnalysis);

    // Namespace-specific missing pieces
    const namespacePieces = identifyNamespaceMissingPieces(namespace, title, relatedDocs);
    missingPieces.push(...namespacePieces);

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return missingPieces
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 4); // Limit to top 4 suggestions

  } catch (error) {
    console.warn('Error identifying missing pieces:', error);
    return [];
  }
}

/**
 * Generate logical implementation sequence
 */
function generateImplementationSequence(
  relatedDocs: RelatedDocumentSuggestion[],
  missingPieces: MissingPieceSuggestion[],
  namespace: string,
  title: string
): ImplementationStep[] {
  const steps: ImplementationStep[] = [];
  let order = 1;

  // Step 1: Always start with current document
  steps.push({
    order: order++,
    action: getNamespaceAction(namespace),
    document: `Current document (${title})`,
    focus: getNamespaceFocus(namespace)
  });

  // Step 2: Add high-priority missing pieces
  const highPriorityPieces = missingPieces.filter(piece => piece.priority === 'high');
  for (const piece of highPriorityPieces.slice(0, 2)) { // Limit to 2 high priority
    const step: ImplementationStep = {
      order: order++,
      action: `Create ${piece.type}`,
      document: piece.suggested_path,
      focus: piece.reason
    };

    const defaultSections = getDefaultSectionsForType(piece.type);
    if (defaultSections.length > 0) {
      step.sections = defaultSections;
    }

    steps.push(step);
  }

  // Step 3: Reference related documents
  const topRelated = relatedDocs.slice(0, 2); // Top 2 related docs
  for (const related of topRelated) {
    if (related.implementation_gap != null) {
      const step: ImplementationStep = {
        order: order++,
        action: 'Reference and implement',
        document: related.path,
        focus: related.implementation_gap ?? 'Reference for implementation patterns'
      };

      if (related.sections_to_reference != null) {
        step.sections = related.sections_to_reference;
      }

      steps.push(step);
    }
  }

  return steps.slice(0, 4); // Limit to 4 steps for clarity
}

/**
 * Analyze namespace patterns for common sections and links
 */
export async function analyzeNamespacePatterns(
  manager: DocumentManager,
  namespace: string
): Promise<NamespacePatterns> {
  try {
    // Get all documents in the namespace
    const allDocuments = await manager.listDocuments();
    const namespaceDocuments = allDocuments.filter(docInfo => pathToNamespace(docInfo.path) === namespace);

    const sectionCounts = new Map<string, number>();
    const linkCounts = new Map<string, number>();
    const taskCounts = new Map<string, number>();

    // Analyze each document
    for (const docInfo of namespaceDocuments) {
      const document = await manager.getDocument(docInfo.path);
      if (document == null) continue;

      // Count sections
      for (const heading of document.headings) {
        const sectionName = `#${heading.slug}`;
        sectionCounts.set(sectionName, (sectionCounts.get(sectionName) ?? 0) + 1);
      }

      // For content analysis, we need to read the actual content
      const content = await manager.getSectionContent(docInfo.path, '') ?? '';

      // Extract links and tasks from content
      const links = extractLinks(content);
      const tasks = extractTasks(content);

      for (const link of links) {
        linkCounts.set(link, (linkCounts.get(link) ?? 0) + 1);
      }

      for (const task of tasks) {
        taskCounts.set(task, (taskCounts.get(task) ?? 0) + 1);
      }
    }

    // Get most common patterns (appearing in >30% of documents)
    const threshold = Math.max(1, Math.floor(namespaceDocuments.length * 0.3));

    return {
      common_sections: getTopPatterns(sectionCounts, threshold, 8),
      frequent_links: getTopPatterns(linkCounts, threshold, 5),
      typical_tasks: getTopPatterns(taskCounts, threshold, 6)
    };

  } catch (error) {
    console.warn('Error analyzing namespace patterns:', error);
    return {
      common_sections: [],
      frequent_links: [],
      typical_tasks: []
    };
  }
}

// Helper functions for suggestion analysis

/**
 * Extract keywords and concepts from title and overview
 */
function extractKeywords(title: string, overview: string): string[] {
  const text = `${title} ${overview}`.toLowerCase();
  const words = text.split(/\s+/).filter(word => word.length > 2);

  // Remove common words and focus on meaningful terms
  const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'will', 'can', 'are', 'you', 'how', 'what', 'when', 'where']);
  return words.filter(word => !stopWords.has(word));
}

/**
 * Calculate content relevance based on keyword overlap
 */
function calculateContentRelevance(keywords: string[], title: string, content: string): number {
  const targetText = `${title} ${content}`.toLowerCase();
  const matches = keywords.filter(keyword => targetText.includes(keyword));
  return matches.length / Math.max(keywords.length, 1);
}

/**
 * Analyze relationship between documents
 */
function analyzeDocumentRelationship(
  sourceNamespace: string,
  targetNamespace: string,
  _sourceTitle: string,
  _targetTitle: string
): { reason: string; sectionsToReference?: string[]; implementationGap?: string } {
  // API specs → guides relationship
  if (sourceNamespace === 'api/specs' && targetNamespace === 'api/guides') {
    return {
      reason: 'Related API implementation guide with proven patterns',
      sectionsToReference: ['#setup', '#implementation', '#testing'],
      implementationGap: 'Create implementation guide based on this API spec'
    };
  }

  // API specs → services relationship
  if (sourceNamespace === 'api/specs' && targetNamespace === 'backend/services') {
    return {
      reason: 'Backend service implementing similar API patterns',
      sectionsToReference: ['#architecture', '#data-layer'],
      implementationGap: 'Design service architecture for this API'
    };
  }

  // Guides → components relationship
  if (sourceNamespace === 'api/guides' && targetNamespace === 'frontend/components') {
    return {
      reason: 'Frontend component consuming this API functionality',
      sectionsToReference: ['#usage-examples', '#props-interface']
    };
  }

  // Default relationship
  return {
    reason: `Similar functionality and patterns in ${targetNamespace}`,
    sectionsToReference: ['#overview']
  };
}

/**
 * Extract reusable patterns from document content
 */
function extractReusablePatterns(content: string, namespace: string): string[] {
  const patterns: string[] = [];

  // Common patterns by namespace
  if (namespace === 'api/specs') {
    if (content.includes('authentication')) patterns.push('Authentication patterns');
    if (content.includes('rate limit')) patterns.push('Rate limiting');
    if (content.includes('pagination')) patterns.push('Pagination');
    if (content.includes('webhook')) patterns.push('Webhook handling');
  } else if (namespace === 'api/guides') {
    if (content.includes('step')) patterns.push('Step-by-step structure');
    if (content.includes('test')) patterns.push('Testing approach');
    if (content.includes('troubleshoot')) patterns.push('Troubleshooting flow');
  } else if (namespace === 'frontend/components') {
    if (content.includes('props')) patterns.push('Props interface design');
    if (content.includes('accessibility')) patterns.push('Accessibility patterns');
    if (content.includes('theme')) patterns.push('Theme integration');
  }

  return patterns;
}

/**
 * Generate similarity reason based on patterns
 */
function generateSimilarityReason(
  namespace: string,
  _title: string,
  _similarTitle: string,
  patterns: string[]
): string {
  if (patterns.length === 0) {
    return `Similar ${namespace} document with comparable structure`;
  }

  return `Shares proven patterns: ${patterns.slice(0, 2).join(', ')}`;
}

/**
 * Perform gap analysis to find missing documents
 */
async function performGapAnalysis(
  _manager: DocumentManager,
  namespace: string,
  title: string,
  _overview: string,
  relatedDocs: RelatedDocumentSuggestion[]
): Promise<MissingPieceSuggestion[]> {
  const gaps: MissingPieceSuggestion[] = [];

  // API spec → implementation guide gap
  if (namespace === 'api/specs') {
    const guideExists = relatedDocs.some(doc => doc.namespace === 'api/guides');
    if (!guideExists) {
      const { titleToSlug } = await import('../slug.js');
      const slug = titleToSlug(title);
      gaps.push({
        type: 'guide',
        suggested_path: `/api/guides/${slug}-implementation.md`,
        title: `${title} Implementation Guide`,
        reason: 'No implementation guide exists for this API specification',
        priority: 'high'
      });
    }
  }

  // Guide → troubleshooting gap
  if (namespace === 'api/guides' || namespace === 'frontend/components') {
    const troubleshootingExists = relatedDocs.some(doc => doc.namespace === 'docs/troubleshooting');
    if (!troubleshootingExists) {
      const { titleToSlug } = await import('../slug.js');
      const slug = titleToSlug(title);
      gaps.push({
        type: 'troubleshooting',
        suggested_path: `/docs/troubleshooting/${slug}-issues.md`,
        title: `${title} Common Issues`,
        reason: 'No troubleshooting documentation exists for this implementation',
        priority: 'medium'
      });
    }
  }

  return gaps;
}

/**
 * Identify namespace-specific missing pieces
 */
function identifyNamespaceMissingPieces(
  _namespace: string,
  _title: string,
  _relatedDocs: RelatedDocumentSuggestion[]
): MissingPieceSuggestion[] {
  // This could be expanded with more sophisticated analysis
  // For now, return basic suggestions based on namespace patterns
  return [];
}

/**
 * Get default sections for document type
 */
function getDefaultSectionsForType(type: string): string[] {
  switch (type) {
    case 'guide':
      return ['#prerequisites', '#step-by-step-implementation', '#testing'];
    case 'spec':
      return ['#overview', '#endpoints', '#authentication'];
    case 'troubleshooting':
      return ['#quick-diagnostics', '#common-issues', '#advanced-diagnostics'];
    case 'component':
      return ['#props-interface', '#usage-examples', '#styling'];
    case 'service':
      return ['#architecture-overview', '#components', '#deployment'];
    default:
      return ['#overview'];
  }
}

/**
 * Get action name for namespace
 */
function getNamespaceAction(namespace: string): string {
  switch (namespace) {
    case 'api/specs':
      return 'Create API specification';
    case 'api/guides':
      return 'Create implementation guide';
    case 'frontend/components':
      return 'Create component documentation';
    case 'backend/services':
      return 'Create service documentation';
    case 'docs/troubleshooting':
      return 'Create troubleshooting guide';
    default:
      return 'Create document';
  }
}

/**
 * Get focus description for namespace
 */
function getNamespaceFocus(namespace: string): string {
  switch (namespace) {
    case 'api/specs':
      return 'Define endpoints, schemas, and authentication requirements';
    case 'api/guides':
      return 'Provide step-by-step implementation with code examples';
    case 'frontend/components':
      return 'Document props, usage patterns, and accessibility features';
    case 'backend/services':
      return 'Define architecture, data flows, and integration patterns';
    case 'docs/troubleshooting':
      return 'Document common issues, diagnostics, and solutions';
    default:
      return 'Define structure and core content';
  }
}

/**
 * Extract links from markdown content
 */
function extractLinks(content: string): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;

  match = linkRegex.exec(content);
  while (match !== null) {
    const url = match[2];
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (url != null && url.startsWith('/')) { // Internal links only
      links.push(url);
    }
    match = linkRegex.exec(content);
  }

  return links;
}

/**
 * Extract tasks from markdown content
 */
function extractTasks(content: string): string[] {
  const taskRegex = /- \[ \] (.+)/g;
  const tasks: string[] = [];
  let match;

  match = taskRegex.exec(content);
  while (match !== null) {
    const task = match[1];
    if (task != null) {
      tasks.push(task);
    }
    match = taskRegex.exec(content);
  }

  return tasks;
}

/**
 * Get top patterns from count map
 */
function getTopPatterns(countMap: Map<string, number>, threshold: number, limit: number): string[] {
  return Array.from(countMap.entries())
    .filter(([, count]) => count >= threshold)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([pattern]) => pattern);
}