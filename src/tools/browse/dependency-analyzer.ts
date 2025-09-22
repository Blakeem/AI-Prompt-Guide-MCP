/**
 * Dependency analysis and cycle detection for document linking
 */

import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';
import { pathToNamespace } from '../../shared/utilities.js';

// Shared interfaces for dependency analysis
export interface CycleDetectionContext {
  visited: Set<string>;
  currentPath: string[];
  depth: number;
  maxDepth: number;
}

export interface RelatedDocument {
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

export type RelationshipType =
  | 'implements_spec'
  | 'implementation_guide'
  | 'consumes_api'
  | 'depends_on'
  | 'references'
  | 'similar_content';

export interface DependencyNode {
  sequence: number;
  path: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  blocks?: string[];
  depends_on?: string[];
}

export interface RelatedDocuments {
  forward_links: RelatedDocument[];
  backward_links: RelatedDocument[];
  related_by_content: RelatedDocument[];
  dependency_chain: DependencyNode[];
}

/**
 * Detect cycles in document traversal to prevent infinite loops
 */
export function detectCycles(context: CycleDetectionContext, targetPath: string): boolean {
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
export async function findForwardLinks(
  manager: DocumentManager,
  docPath: string,
  document: CachedDocument,
  context: CycleDetectionContext,
  classifyRelationship: (fromDocPath: string, toDocPath: string, linkText: string, toDocTitle: string) => RelationshipType
): Promise<RelatedDocument[]> {
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
export async function findBackwardLinks(
  manager: DocumentManager,
  docPath: string,
  context: CycleDetectionContext,
  classifyRelationship: (fromDocPath: string, toDocPath: string, linkText: string, toDocTitle: string) => RelationshipType
): Promise<RelatedDocument[]> {
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
 * Build dependency chain from related documents
 */
export function buildDependencyChain(relatedDocs: RelatedDocument[]): DependencyNode[] {
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
export function determineCompletionStatus(doc: RelatedDocument): 'completed' | 'in_progress' | 'pending' {
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
 * Main function to analyze document links and relationships
 */
export async function analyzeDocumentLinks(
  manager: DocumentManager,
  docPath: string,
  linkDepth: number,
  classifyRelationship: (fromDocPath: string, toDocPath: string, linkText: string, toDocTitle: string) => RelationshipType,
  findRelatedByContent: (manager: DocumentManager, docPath: string, currentDoc: CachedDocument, context: CycleDetectionContext) => Promise<RelatedDocument[]>
): Promise<RelatedDocuments | null> {
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
      findForwardLinks(manager, docPath, document, { ...context, depth: context.depth + 1 }, classifyRelationship),
      findBackwardLinks(manager, docPath, { ...context, depth: context.depth + 1 }, classifyRelationship),
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