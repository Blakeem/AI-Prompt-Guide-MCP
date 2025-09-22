/**
 * Implementation for the browse_documents tool
 * Unified browsing and searching with namespace awareness
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';
import {
  getDocumentManager,
  pathToNamespace,
  pathToSlug,
  getParentSlug
} from '../../shared/utilities.js';

interface FolderInfo {
  name: string;
  path: string;
  namespace: string;
  documentCount: number;
  hasSubfolders: boolean;
}

interface DocumentInfo {
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
  }>;
  tasks?: {
    total: number;
    completed: number;
    pending: string[];
  };
  lastModified: string;
  relevance?: number;
}

// Cross-namespace linking interfaces
type RelationshipType =
  | 'implements_spec'
  | 'implementation_guide'
  | 'consumes_api'
  | 'depends_on'
  | 'references'
  | 'similar_content';

interface RelatedDocument {
  path: string;
  title: string;
  namespace: string;
  relationship: RelationshipType;
  relevance?: number;
  sections_linked?: string[];
  sections_linking?: string[];
  tasks_linked?: number;
  completion_status?: string;
  shared_concepts?: string[];
}

interface DependencyNode {
  sequence: number;
  path: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  blocks?: string[];
  depends_on?: string[];
}

interface RelatedDocuments {
  forward_links: RelatedDocument[];
  backward_links: RelatedDocument[];
  related_by_content: RelatedDocument[];
  dependency_chain: DependencyNode[];
}

interface ImplementationReadiness {
  specs_ready: boolean;
  guides_available: boolean;
  components_needed: number;
  services_needed: number;
  estimated_completion: string;
}

interface CycleDetectionContext {
  visited: Set<string>;
  currentPath: string[];
  depth: number;
  maxDepth: number;
}

interface SearchMatch {
  document: string;
  section: string;
  snippet: string;
  relevance: number;
}

interface SectionInfo {
  slug: string;
  title: string;
  depth: number;
  full_path: string; // Full path like "/api/specs/search-api.md#api/endpoints"
  parent?: string; // Parent slug path for hierarchical slugs
  content_preview?: string; // First few lines of content
  subsection_count: number;
  has_code_blocks: boolean;
  has_links: boolean;
}

interface BrowseResponse {
  path?: string;
  query?: string;
  structure: {
    folders: FolderInfo[];
    documents: DocumentInfo[];
  };
  document_context?: {
    path: string;
    title: string;
    namespace: string;
    slug: string;
    current_section?: string; // The section being browsed (#endpoints)
  };
  sections?: SectionInfo[];
  matches?: SearchMatch[];
  relatedTasks?: Array<{
    taskId: string;
    title: string;
    status: string;
  }>;
  related_documents?: RelatedDocuments;
  implementation_readiness?: ImplementationReadiness;
  breadcrumb?: string[];
  parentPath?: string;
  totalItems: number;
}


/**
 * Detect cycles in document traversal to prevent infinite loops
 */
function detectCycles(context: CycleDetectionContext, targetPath: string): boolean {
  // Check if we've exceeded max depth
  if (context.depth >= context.maxDepth) {
    return true;
  }

  // Check if we've already visited this document
  if (context.visited.has(targetPath)) {
    return true;
  }

  // Check if this creates a cycle in current path
  return context.currentPath.includes(targetPath);
}

/**
 * Find forward links - documents that this document references
 */
async function findForwardLinks(manager: DocumentManager, docPath: string, document: CachedDocument, context: CycleDetectionContext): Promise<RelatedDocument[]> {
  const forwardLinks: RelatedDocument[] = [];

  // Get content from all sections of the document
  let fullContent = '';
  for (const heading of document.headings) {
    try {
      const sectionContent = await manager.getSectionContent(docPath, heading.slug);
      if (sectionContent != null) {
        fullContent += `${sectionContent}\n`;
      }
    } catch {
      // Skip sections that can't be read
    }
  }

  // Pattern to match markdown links: [text](path) or [text](path#section)
  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(fullContent)) !== null) {
    const linkText = match[1] ?? '';
    const linkPath = match[2] ?? '';

    // Skip external links (http/https)
    if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
      continue;
    }

    // Extract document path and section from link
    const hashIndex = linkPath.indexOf('#');
    const targetDocPath = hashIndex === -1 ? linkPath : linkPath.slice(0, hashIndex);
    const targetSection = hashIndex === -1 ? undefined : linkPath.slice(hashIndex + 1);

    // Normalize path - ensure it starts with /
    const normalizedPath = targetDocPath.startsWith('/') ? targetDocPath : `/${targetDocPath}`;

    // Skip if this would create a cycle
    if (detectCycles(context, normalizedPath)) {
      continue;
    }

    try {
      const targetDoc = await manager.getDocument(normalizedPath);
      if (targetDoc != null) {
        const relationship = classifyRelationship(docPath, normalizedPath, linkText, targetDoc.metadata.title);

        const relatedDoc: RelatedDocument = {
          path: normalizedPath,
          title: targetDoc.metadata.title,
          namespace: pathToNamespace(normalizedPath),
          relationship,
          ...(targetSection != null && { sections_linked: [targetSection] })
        };

        // Check if we already have this document in our list
        const existing = forwardLinks.find(link => link.path === normalizedPath);
        if (existing != null) {
          // Merge section information
          if (targetSection != null && existing.sections_linked != null) {
            if (!existing.sections_linked.includes(targetSection)) {
              existing.sections_linked.push(targetSection);
            }
          }
        } else {
          forwardLinks.push(relatedDoc);
        }
      }
    } catch {
      // Skip documents that can't be loaded
    }
  }

  return forwardLinks;
}

/**
 * Find backward links - documents that reference this document
 */
async function findBackwardLinks(manager: DocumentManager, docPath: string, context: CycleDetectionContext): Promise<RelatedDocument[]> {
  const backwardLinks: RelatedDocument[] = [];

  try {
    // Search for references to this document across all documents
    const searchResults = await manager.searchDocuments(docPath, {
      searchIn: ['content'],
      fuzzy: false,
      groupByDocument: true
    });

    for (const result of searchResults) {
      // Skip self-references
      if (result.documentPath === docPath) {
        continue;
      }

      // Skip if this would create a cycle
      if (detectCycles(context, result.documentPath)) {
        continue;
      }

      try {
        const referencingDoc = await manager.getDocument(result.documentPath);
        if (referencingDoc != null) {
          const relationship = classifyRelationship(result.documentPath, docPath, '', referencingDoc.metadata.title);

          // Find which sections contain the links
          const sectionsLinking: string[] = [];
          for (const match of result.matches) {
            if (match.slug != null && match.slug !== '' && !sectionsLinking.includes(match.slug)) {
              sectionsLinking.push(match.slug);
            }
          }

          const relatedDoc: RelatedDocument = {
            path: result.documentPath,
            title: referencingDoc.metadata.title,
            namespace: pathToNamespace(result.documentPath),
            relationship,
            ...(sectionsLinking.length > 0 && { sections_linking: sectionsLinking })
          };

          backwardLinks.push(relatedDoc);
        }
      } catch {
        // Skip documents that can't be loaded
      }
    }
  } catch {
    // Return empty if search fails
  }

  return backwardLinks;
}

/**
 * Find related documents by content similarity
 */
async function findRelatedByContent(manager: DocumentManager, docPath: string, currentDoc: CachedDocument, context: CycleDetectionContext): Promise<RelatedDocument[]> {
  const relatedDocs: RelatedDocument[] = [];

  try {
    // Get content from all sections of the current document
    let fullContent = '';
    for (const heading of currentDoc.headings) {
      try {
        const sectionContent = await manager.getSectionContent(docPath, heading.slug);
        if (sectionContent != null) {
          fullContent += `${sectionContent}\n`;
        }
      } catch {
        // Skip sections that can't be read
      }
    }

    // Extract key concepts from current document title and content
    const titleWords = extractKeywords(currentDoc.metadata.title);
    const contentKeywords = extractKeywords(fullContent.slice(0, 1000)); // First 1000 chars
    const allKeywords = [...titleWords, ...contentKeywords];

    if (allKeywords.length === 0) {
      return relatedDocs;
    }

    // Search for documents with similar content
    const searchQuery = allKeywords.slice(0, 5).join(' '); // Use top 5 keywords
    const searchResults = await manager.searchDocuments(searchQuery, {
      searchIn: ['title', 'content'],
      fuzzy: true,
      groupByDocument: true
    });

    for (const result of searchResults) {
      // Skip self and documents we've already processed
      if (result.documentPath === docPath) {
        continue;
      }

      // Skip if this would create a cycle
      if (detectCycles(context, result.documentPath)) {
        continue;
      }

      try {
        const relatedDoc = await manager.getDocument(result.documentPath);
        if (relatedDoc != null) {
          // Get content from other document's sections
          let otherContent = '';
          for (const heading of relatedDoc.headings.slice(0, 3)) { // Limit to first 3 sections for performance
            try {
              const sectionContent = await manager.getSectionContent(result.documentPath, heading.slug);
              if (sectionContent != null) {
                otherContent += `${sectionContent}\n`;
              }
            } catch {
              // Skip sections that can't be read
            }
          }

          // Calculate relevance based on shared concepts
          const otherKeywords = extractKeywords(`${relatedDoc.metadata.title} ${otherContent.slice(0, 1000)}`);
          const sharedConcepts = allKeywords.filter(keyword => otherKeywords.includes(keyword));
          const relevance = sharedConcepts.length / Math.max(allKeywords.length, otherKeywords.length);

          // Only include if relevance is above threshold
          if (relevance >= 0.6) {
            const relationship = classifyRelationship(docPath, result.documentPath, '', relatedDoc.metadata.title);

            const related: RelatedDocument = {
              path: result.documentPath,
              title: relatedDoc.metadata.title,
              namespace: pathToNamespace(result.documentPath),
              relationship,
              relevance: Math.round(relevance * 100) / 100,
              shared_concepts: sharedConcepts.slice(0, 5) // Top 5 shared concepts
            };

            relatedDocs.push(related);
          }
        }
      } catch {
        // Skip documents that can't be loaded
      }
    }

    // Sort by relevance descending
    relatedDocs.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));

    // Limit results to prevent overwhelming output
    return relatedDocs.slice(0, 10);

  } catch {
    // Return empty if analysis fails
  }

  return relatedDocs;
}

/**
 * Extract keywords from text for content similarity analysis
 */
function extractKeywords(text: string): string[] {
  if (text == null || text === '') {
    return [];
  }

  // Remove markdown formatting and normalize
  const cleanText = text
    .replace(/[#*`_[\]()]/g, ' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words and filter
  const words = cleanText.split(' ').filter(word =>
    word.length > 2 &&
    !isStopWord(word) &&
    !word.match(/^\d+$/) // Skip pure numbers
  );

  // Remove duplicates and return
  return [...new Set(words)];
}

/**
 * Check if a word is a stop word (common words to ignore)
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'can', 'may', 'might', 'must', 'shall', 'from', 'up', 'out', 'down', 'off',
    'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'now', 'get', 'set', 'put', 'use', 'new'
  ]);

  return stopWords.has(word);
}

/**
 * Classify the relationship between two documents
 */
function classifyRelationship(fromDocPath: string, toDocPath: string, linkText: string, toDocTitle: string): RelationshipType {
  const fromNamespace = pathToNamespace(fromDocPath);
  const toNamespace = pathToNamespace(toDocPath);

  // Analyze namespaces and titles for relationship patterns
  const linkTextLower = linkText.toLowerCase();
  const toTitleLower = toDocTitle.toLowerCase();

  // Implementation relationships
  if (fromNamespace.includes('spec') && (toNamespace.includes('guide') || toNamespace.includes('impl'))) {
    return 'implementation_guide';
  }

  if ((fromNamespace.includes('backend') || fromNamespace.includes('service')) && toNamespace.includes('spec')) {
    return 'implements_spec';
  }

  if ((fromNamespace.includes('frontend') || fromNamespace.includes('component')) && toNamespace.includes('api')) {
    return 'consumes_api';
  }

  // Dependency relationships
  if (linkTextLower.includes('depend') || linkTextLower.includes('require') || linkTextLower.includes('prerequisite')) {
    return 'depends_on';
  }

  // Content-based relationships
  if (toTitleLower.includes('guide') || toTitleLower.includes('tutorial') || toTitleLower.includes('how')) {
    return 'implementation_guide';
  }

  if (toTitleLower.includes('spec') || toTitleLower.includes('api')) {
    return 'implements_spec';
  }

  // Default to references for unclear relationships
  return 'references';
}

/**
 * Build dependency chain from related documents
 */
function buildDependencyChain(relatedDocs: RelatedDocument[]): DependencyNode[] {
  const dependencyChain: DependencyNode[] = [];
  const processed = new Set<string>();

  // Group documents by logical sequence
  const specs = relatedDocs.filter(doc => doc.relationship === 'implements_spec' || doc.namespace.includes('spec'));
  const guides = relatedDocs.filter(doc => doc.relationship === 'implementation_guide' || doc.namespace.includes('guide'));
  const implementations = relatedDocs.filter(doc =>
    doc.relationship === 'consumes_api' ||
    doc.namespace.includes('backend') ||
    doc.namespace.includes('frontend') ||
    doc.namespace.includes('service') ||
    doc.namespace.includes('component')
  );

  let sequence = 1;

  // Add specs first (foundational)
  for (const spec of specs) {
    if (!processed.has(spec.path)) {
      dependencyChain.push({
        sequence: sequence++,
        path: spec.path,
        title: spec.title,
        status: determineCompletionStatus(spec),
        blocks: guides.filter(g => !processed.has(g.path)).map(g => g.path)
      });
      processed.add(spec.path);
    }
  }

  // Add guides next (implementation guidance)
  for (const guide of guides) {
    if (!processed.has(guide.path)) {
      dependencyChain.push({
        sequence: sequence++,
        path: guide.path,
        title: guide.title,
        status: determineCompletionStatus(guide),
        blocks: implementations.filter(i => !processed.has(i.path)).map(i => i.path),
        depends_on: specs.map(s => s.path)
      });
      processed.add(guide.path);
    }
  }

  // Add implementations last
  for (const impl of implementations) {
    if (!processed.has(impl.path)) {
      dependencyChain.push({
        sequence: sequence++,
        path: impl.path,
        title: impl.title,
        status: determineCompletionStatus(impl),
        depends_on: [...specs.map(s => s.path), ...guides.map(g => g.path)]
      });
      processed.add(impl.path);
    }
  }

  return dependencyChain;
}

/**
 * Determine completion status of a document based on available information
 */
function determineCompletionStatus(doc: RelatedDocument): 'completed' | 'in_progress' | 'pending' {
  // Use completion status if available
  if (doc.completion_status != null && doc.completion_status !== '') {
    const percentage = parseInt(doc.completion_status.replace('%', ''), 10);
    if (percentage >= 100) return 'completed';
    if (percentage > 0) return 'in_progress';
    return 'pending';
  }

  // Use task information if available
  if (doc.tasks_linked != null && doc.tasks_linked > 0) {
    return 'in_progress';
  }

  // Default to pending for unknown status
  return 'pending';
}

/**
 * Assess implementation readiness based on related documents
 */
function assessImplementationReadiness(relatedDocs: RelatedDocument[]): ImplementationReadiness {
  const specs = relatedDocs.filter(doc => doc.relationship === 'implements_spec' || doc.namespace.includes('spec'));
  const guides = relatedDocs.filter(doc => doc.relationship === 'implementation_guide' || doc.namespace.includes('guide'));
  const components = relatedDocs.filter(doc => doc.namespace.includes('frontend') || doc.namespace.includes('component'));
  const services = relatedDocs.filter(doc => doc.namespace.includes('backend') || doc.namespace.includes('service'));

  const specs_ready = specs.length > 0 && specs.every(spec => determineCompletionStatus(spec) === 'completed');
  const guides_available = guides.length > 0;
  const components_needed = components.length;
  const services_needed = services.length;

  // Calculate overall completion percentage
  const allDocs = [...specs, ...guides, ...components, ...services];
  const completedDocs = allDocs.filter(doc => determineCompletionStatus(doc) === 'completed').length;
  const inProgressDocs = allDocs.filter(doc => determineCompletionStatus(doc) === 'in_progress').length;

  let estimatedCompletion = 0;
  if (allDocs.length > 0) {
    estimatedCompletion = Math.round(((completedDocs + (inProgressDocs * 0.5)) / allDocs.length) * 100);
  }

  return {
    specs_ready,
    guides_available,
    components_needed,
    services_needed,
    estimated_completion: `${estimatedCompletion}%`
  };
}

/**
 * Main function to analyze document links and relationships
 */
async function analyzeDocumentLinks(manager: DocumentManager, docPath: string, linkDepth: number): Promise<RelatedDocuments | null> {
  try {
    const document = await manager.getDocument(docPath);
    if (document == null) {
      return null;
    }

    // Initialize cycle detection context
    const context: CycleDetectionContext = {
      visited: new Set(),
      currentPath: [docPath],
      depth: 0,
      maxDepth: Math.min(linkDepth, 3) // Hard limit of 3 levels
    };

    // Mark current document as visited
    context.visited.add(docPath);

    // Analyze different types of relationships
    const [forwardLinks, backwardLinks, relatedByContent] = await Promise.all([
      findForwardLinks(manager, docPath, document, { ...context, depth: context.depth + 1 }),
      findBackwardLinks(manager, docPath, { ...context, depth: context.depth + 1 }),
      findRelatedByContent(manager, docPath, document, { ...context, depth: context.depth + 1 })
    ]);

    // Combine all related documents for dependency analysis
    const allRelated = [...forwardLinks, ...backwardLinks, ...relatedByContent];
    const dependencyChain = buildDependencyChain(allRelated);

    return {
      forward_links: forwardLinks,
      backward_links: backwardLinks,
      related_by_content: relatedByContent,
      dependency_chain: dependencyChain
    };

  } catch {
    return null;
  }
}

/**
 * Parse section path into document path and section slug
 */
function parseSectionPath(fullPath: string): { documentPath: string; sectionSlug?: string } {
  const hashIndex = fullPath.indexOf('#');
  if (hashIndex === -1) {
    return { documentPath: fullPath };
  }

  const documentPath = fullPath.slice(0, hashIndex);
  const sectionSlug = fullPath.slice(hashIndex + 1);

  if (sectionSlug === '') {
    return { documentPath: documentPath || '/' };
  }

  return {
    documentPath: documentPath || '/',
    sectionSlug
  };
}

/**
 * Generate breadcrumb trail for a path (including section context)
 */
function generateBreadcrumb(docPath: string): string[] {
  const { documentPath, sectionSlug } = parseSectionPath(docPath);
  const parts = documentPath.split('/').filter(part => part !== '' && part !== '.');
  const breadcrumb: string[] = [];

  // Add folder breadcrumbs
  for (let i = 0; i < parts.length; i++) {
    const pathUpToHere = `/${parts.slice(0, i + 1).join('/')}`;
    breadcrumb.push(pathUpToHere);
  }

  // Add section breadcrumb if applicable
  if (sectionSlug != null && sectionSlug !== '') {
    breadcrumb.push(`${documentPath}#${sectionSlug}`);
  }

  return breadcrumb;
}

/**
 * Get parent path for navigation (including section context)
 */
function getParentPath(docPath: string): string | undefined {
  if (docPath === '/' || docPath === '') {
    return undefined;
  }

  const { documentPath, sectionSlug } = parseSectionPath(docPath);

  // If we're in a section, parent is the document
  if (sectionSlug != null && sectionSlug !== '') {
    return documentPath;
  }

  // Otherwise, parent is the folder above
  const parts = documentPath.split('/').filter(part => part !== '' && part !== '.');
  if (parts.length <= 1) {
    return '/';
  }

  return `/${parts.slice(0, -1).join('/')}`;
}

/**
 * Check if a directory exists
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get folder structure at specified path
 */
async function getFolderStructure(manager: DocumentManager, basePath: string, targetPath: string): Promise<{folders: FolderInfo[], documents: DocumentInfo[]}> {
  const folders: FolderInfo[] = [];
  const documents: DocumentInfo[] = [];

  // Construct absolute path for filesystem operations
  const absoluteTargetPath = path.join(basePath, targetPath.startsWith('/') ? targetPath.slice(1) : targetPath);

  // Check if target path exists
  if (!(await directoryExists(absoluteTargetPath))) {
    return { folders, documents };
  }

  try {
    const entries = await fs.readdir(absoluteTargetPath, { withFileTypes: true });

    // Process directories (folders)
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = targetPath === '/' ? `/${entry.name}` : `${targetPath}/${entry.name}`;
        const absoluteFolderPath = path.join(absoluteTargetPath, entry.name);

        // Count documents and check for subfolders
        let documentCount = 0;
        let hasSubfolders = false;

        try {
          const folderEntries = await fs.readdir(absoluteFolderPath, { withFileTypes: true });
          for (const folderEntry of folderEntries) {
            if (folderEntry.isDirectory()) {
              hasSubfolders = true;
            } else if (folderEntry.isFile() && folderEntry.name.endsWith('.md')) {
              documentCount++;
            }
          }
        } catch {
          // Ignore if we can't read the folder
        }

        folders.push({
          name: entry.name,
          path: folderPath,
          namespace: pathToNamespace(folderPath),
          documentCount,
          hasSubfolders
        });
      }
    }

    // Process markdown files (documents)
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const docPath = targetPath === '/' ? `/${entry.name}` : `${targetPath}/${entry.name}`;

        try {
          const document = await manager.getDocument(docPath);
          if (document != null) {
            // Convert headings to sections format
            // Convert headings to sections format with hierarchical slug support
            const sections = document.headings.map((heading) => {
              const hierarchicalSlug = heading.slug.includes('/') ? heading.slug : heading.slug;
              const parent = getParentSlug(hierarchicalSlug);

              return {
                slug: hierarchicalSlug,
                title: heading.title,
                depth: heading.depth,
                full_path: `${docPath}#${hierarchicalSlug}`,
                ...(parent != null && { parent }),
                hasContent: true // We'll assume sections have content
              };
            });

            // TODO: Extract task information if available
            // For now, we'll leave tasks undefined

            documents.push({
              path: docPath,
              slug: pathToSlug(docPath),
              title: document.metadata.title,
              namespace: pathToNamespace(docPath),
              sections,
              lastModified: document.metadata.lastModified.toISOString()
            });
          }
        } catch {
          // Skip documents that can't be loaded
        }
      }
    }

    // Sort folders and documents by name
    folders.sort((a, b) => a.name.localeCompare(b.name));
    documents.sort((a, b) => a.title.localeCompare(b.title));

  } catch {
    // Return empty structure if we can't read the directory
  }

  return { folders, documents };
}

/**
 * Analyze section content for metadata
 */
function analyzeSectionContent(content: string): { has_code_blocks: boolean; has_links: boolean; content_preview: string } {
  const has_code_blocks = /```[\s\S]*?```|`[^`]+`/.test(content);
  const has_links = /\[[^\]]*\]\([^)]+\)|\[[^\]]*\]\[[^\]]*\]/.test(content);

  // Get first few lines as preview (up to 200 chars)
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const preview = lines.slice(0, 3).join(' ').trim();
  const content_preview = preview.length > 200 ? `${preview.slice(0, 200)}...` : preview;

  return { has_code_blocks, has_links, content_preview };
}

/**
 * Get section-level structure for a document
 */
async function getSectionStructure(manager: DocumentManager, documentPath: string, targetSectionSlug?: string): Promise<{ sections: SectionInfo[], document_context: { path: string; title: string; namespace: string; slug: string; current_section?: string } | null }> {
  const document = await manager.getDocument(documentPath);
  if (document == null) {
    return { sections: [], document_context: null };
  }

  const sections: SectionInfo[] = [];
  const document_context = {
    path: documentPath,
    title: document.metadata.title,
    namespace: pathToNamespace(documentPath),
    slug: pathToSlug(documentPath),
    ...(targetSectionSlug != null && targetSectionSlug !== '' && { current_section: targetSectionSlug })
  };

  // If no specific section requested, show all top-level sections
  if (targetSectionSlug == null || targetSectionSlug === '') {
    for (const heading of document.headings) {
      try {
        const content = await manager.getSectionContent(documentPath, heading.slug) ?? '';
        const analysis = analyzeSectionContent(content);

        // Count subsections (headings with greater depth that come after this one)
        const headingIndex = document.headings.findIndex(h => h.slug === heading.slug);
        let subsection_count = 0;

        if (headingIndex >= 0) {
          for (let i = headingIndex + 1; i < document.headings.length; i++) {
            const nextHeading = document.headings[i];
            if (nextHeading == null) break;

            if (nextHeading.depth <= heading.depth) {
              break; // Reached sibling or parent heading
            }
            if (nextHeading.depth === heading.depth + 1) {
              subsection_count++; // Direct child
            }
          }
        }

        // Generate hierarchical slug information
        const hierarchicalSlug = heading.slug.includes('/') ? heading.slug : heading.slug;
        const parent = getParentSlug(hierarchicalSlug);

        sections.push({
          slug: hierarchicalSlug,
          title: heading.title,
          depth: heading.depth,
          full_path: `${documentPath}#${hierarchicalSlug}`,
          ...(parent != null && { parent }),
          subsection_count,
          ...analysis
        });
      } catch {
        // Skip sections that can't be analyzed
      }
    }
  } else {
    // Show subsections of the specified section
    const targetHeading = document.headings.find(h => h.slug === targetSectionSlug);
    if (targetHeading != null) {
      const headingIndex = document.headings.findIndex(h => h.slug === targetSectionSlug);

      if (headingIndex >= 0) {
        // Find all subsections (headings with greater depth that come after)
        for (let i = headingIndex + 1; i < document.headings.length; i++) {
          const heading = document.headings[i];
          if (heading == null) break;

          if (heading.depth <= targetHeading.depth) {
            break; // Reached sibling or parent heading
          }

          // Only include direct children for now
          if (heading.depth === targetHeading.depth + 1) {
            try {
              const content = await manager.getSectionContent(documentPath, heading.slug) ?? '';
              const analysis = analyzeSectionContent(content);

              // Count subsections for this heading
              let subsection_count = 0;
              for (let j = i + 1; j < document.headings.length; j++) {
                const nextHeading = document.headings[j];
                if (nextHeading == null) break;

                if (nextHeading.depth <= heading.depth) {
                  break;
                }
                if (nextHeading.depth === heading.depth + 1) {
                  subsection_count++;
                }
              }

              // Generate hierarchical slug information
              const hierarchicalSlug = heading.slug.includes('/') ? heading.slug : heading.slug;
              const parent = getParentSlug(hierarchicalSlug);

              sections.push({
                slug: hierarchicalSlug,
                title: heading.title,
                depth: heading.depth,
                full_path: `${documentPath}#${hierarchicalSlug}`,
                ...(parent != null && { parent }),
                subsection_count,
                ...analysis
              });
            } catch {
              // Skip sections that can't be analyzed
            }
          }
        }
      }
    }
  }

  return { sections, document_context };
}

/**
 * Perform search across documents
 */
async function performSearch(manager: DocumentManager, query: string, pathFilter?: string): Promise<{documents: DocumentInfo[], matches: SearchMatch[]}> {
  const documents: DocumentInfo[] = [];
  const matches: SearchMatch[] = [];

  try {
    // Use existing search functionality
    const searchResults = await manager.searchDocuments(query, {
      searchIn: ['title', 'headings', 'content', 'code'],
      fuzzy: true,
      boost: {
        title: 2.0,
        headings: 1.5,
        code: 1.2
      },
      highlight: true,
      groupByDocument: true
    });

    // Apply path filter if specified
    const filteredResults = (pathFilter != null && pathFilter !== '')
      ? searchResults.filter((r) => r.documentPath.startsWith(pathFilter))
      : searchResults;

    // Process search results
    for (const result of filteredResults) {
      try {
        const document = await manager.getDocument(result.documentPath);
        if (document != null) {
          // Convert headings to sections format with hierarchical slug support
          const sections = document.headings.map((heading) => {
            const hierarchicalSlug = heading.slug.includes('/') ? heading.slug : heading.slug;
            const parent = getParentSlug(hierarchicalSlug);

            return {
              slug: hierarchicalSlug,
              title: heading.title,
              depth: heading.depth,
              full_path: `${result.documentPath}#${hierarchicalSlug}`,
              ...(parent != null && { parent }),
              hasContent: true
            };
          });

          // Calculate average relevance score
          const avgRelevance = result.matches.length > 0
            ? result.matches.reduce((sum: number, match) => sum + match.score, 0) / result.matches.length
            : 0;

          documents.push({
            path: result.documentPath,
            slug: pathToSlug(result.documentPath),
            title: result.documentTitle,
            namespace: pathToNamespace(result.documentPath),
            sections,
            lastModified: document.metadata.lastModified.toISOString(),
            relevance: Math.round(avgRelevance * 10) / 10
          });

          // Add search matches
          for (const match of result.matches) {
            matches.push({
              document: result.documentPath,
              section: match.slug ?? 'document',
              snippet: match.snippet,
              relevance: Math.round(match.score * 10) / 10
            });
          }
        }
      } catch {
        // Skip documents that can't be loaded
      }
    }

    // Sort documents by relevance (descending)
    documents.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));

    // Sort matches by relevance (descending)
    matches.sort((a, b) => b.relevance - a.relevance);

  } catch {
    // Return empty results if search fails
  }

  return { documents, matches };
}

/**
 * Browse documents implementation
 */
export async function browseDocuments(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<BrowseResponse> {
  try {
    const manager = await getDocumentManager();
    const requestedPath = (args['path'] as string) ?? '/';
    const query = args['query'] as string | undefined;
    const includeRelated = (args['include_related'] as boolean) ?? false;
    const linkDepth = Math.max(1, Math.min(6, Number(args['link_depth']) || 2));
    const limit = Math.max(1, Math.min(50, Number(args['limit']) || 10));

    // Normalize path
    const normalizedPath = requestedPath.startsWith('/') ? requestedPath : `/${requestedPath}`;

    // Parse section path
    const { documentPath, sectionSlug } = parseSectionPath(normalizedPath);

    // Check if we're targeting a specific document with potential section
    const isDocumentPath = documentPath.endsWith('.md');

    // Check if we're in search mode or browse mode
    const isSearchMode = (query != null && query !== '') && query.trim() !== '';

    if (isSearchMode) {
      // Search mode
      const pathFilter = normalizedPath !== '/' ? normalizedPath : undefined;
      const { documents, matches } = await performSearch(manager, query, pathFilter);

      // Limit results
      const limitedDocuments = documents.slice(0, limit);
      const limitedMatches = matches.slice(0, limit);

      const result: BrowseResponse = {
        query,
        structure: {
          folders: [], // No folder structure in search mode
          documents: limitedDocuments
        },
        matches: limitedMatches,
        totalItems: documents.length
      };

      if (pathFilter != null && pathFilter !== '') {
        result.path = pathFilter;
        result.breadcrumb = generateBreadcrumb(pathFilter);
        const parent = getParentPath(pathFilter);
        if (parent != null) {
          result.parentPath = parent;
        }
      }

      return result;

    } else if (isDocumentPath) {
      // Document/Section browse mode
      const { sections, document_context } = await getSectionStructure(manager, documentPath, sectionSlug);

      const result: BrowseResponse = {
        path: normalizedPath,
        structure: {
          folders: [],
          documents: []
        },
        ...(document_context != null && { document_context }),
        sections,
        totalItems: sections.length
      };

      // Add related documents analysis if requested
      if (includeRelated && document_context != null) {
        const relatedDocuments = await analyzeDocumentLinks(manager, documentPath, linkDepth);
        if (relatedDocuments != null) {
          result.related_documents = relatedDocuments;

          // Generate implementation readiness assessment
          const allRelated = [
            ...relatedDocuments.forward_links,
            ...relatedDocuments.backward_links,
            ...relatedDocuments.related_by_content
          ];
          result.implementation_readiness = assessImplementationReadiness(allRelated);
        }
      }

      if (normalizedPath !== '/') {
        result.breadcrumb = generateBreadcrumb(normalizedPath);
      }

      const parent = getParentPath(normalizedPath);
      if (parent != null) {
        result.parentPath = parent;
      }

      return result;

    } else {
      // Folder browse mode
      const { loadConfig } = await import('../../config.js');
      const config = loadConfig();
      const { folders, documents } = await getFolderStructure(manager, config.docsBasePath, normalizedPath);

      const result: BrowseResponse = {
        path: normalizedPath,
        structure: {
          folders,
          documents
        },
        totalItems: folders.length + documents.length
      };

      if (normalizedPath !== '/') {
        result.breadcrumb = generateBreadcrumb(normalizedPath);
      }

      const parent = getParentPath(normalizedPath);
      if (parent != null) {
        result.parentPath = parent;
      }

      return result;
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Return error response with helpful guidance
    return {
      path: args['path'] as string ?? '/',
      structure: {
        folders: [],
        documents: []
      },
      totalItems: 0,
      // Include error information in a way that's helpful
      breadcrumb: [`Error: ${message}`]
    };
  }
}