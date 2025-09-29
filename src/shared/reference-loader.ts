/**
 * Reference loading system for hierarchical content loading
 *
 * This module provides recursive loading of documents and their references
 * to build hierarchical content structures with cycle detection and depth limits.
 *
 * Key Features:
 * - Recursive reference loading with depth control
 * - Cycle detection to prevent infinite loops
 * - Hierarchical content organization
 * - Integration with existing DocumentManager
 * - Namespace-aware content loading
 */

import type { DocumentManager } from '../document-manager.js';
import type { NormalizedReference } from './reference-extractor.js';
import { ReferenceExtractor } from './reference-extractor.js';
import { pathToNamespace } from './path-utilities.js';

/**
 * Hierarchical content structure for nested reference loading
 *
 * @example Basic hierarchical content
 * ```typescript
 * {
 *   path: '/api/auth.md',
 *   title: 'Authentication Guide',
 *   content: 'Authentication overview...',
 *   depth: 0,
 *   namespace: 'api',
 *   children: [
 *     {
 *       path: '/api/tokens.md',
 *       title: 'Token Management',
 *       content: 'Token details...',
 *       depth: 1,
 *       namespace: 'api',
 *       children: []
 *     }
 *   ]
 * }
 * ```
 */
export interface HierarchicalContent {
  /** Document path */
  readonly path: string;
  /** Document title from metadata */
  readonly title: string;
  /** Document content (full or section-specific) */
  readonly content: string;
  /** Nesting depth in hierarchy (0 = root) */
  readonly depth: number;
  /** Document namespace for organization */
  readonly namespace: string;
  /** Nested referenced documents */
  readonly children: HierarchicalContent[];
}

/**
 * Reference loading system with hierarchical content organization
 *
 * Provides recursive loading of documents and their references
 * with intelligent cycle detection and depth management.
 */
export class ReferenceLoader {
  private readonly extractor: ReferenceExtractor;

  constructor() {
    this.extractor = new ReferenceExtractor();
  }

  /**
   * Load references recursively to build hierarchical content structure
   *
   * Processes normalized references and loads their target documents,
   * recursively processing nested references up to specified depth.
   *
   * @param refs - Array of normalized references to load
   * @param manager - DocumentManager for loading documents
   * @param maxDepth - Maximum recursion depth (default: 3)
   * @param currentDepth - Current recursion depth (default: 0)
   * @param visitedPaths - Set of visited paths for cycle detection (internal use)
   * @returns Promise resolving to hierarchical content array
   *
   * @example Basic reference loading
   * ```typescript
   * const loader = new ReferenceLoader();
   * const extractor = new ReferenceExtractor();
   *
   * const refs = extractor.normalizeReferences(
   *   ['@/api/auth.md', '@/api/tokens.md'],
   *   '/current/doc.md'
   * );
   *
   * const hierarchy = await loader.loadReferences(refs, manager, 2);
   * ```
   */
  async loadReferences(
    refs: NormalizedReference[],
    manager: DocumentManager,
    maxDepth: number = 3,
    currentDepth: number = 0,
    visitedPaths?: Set<string>
  ): Promise<HierarchicalContent[]> {
    // Input validation
    if (!Array.isArray(refs)) {
      return [];
    }

    if (typeof maxDepth !== 'number' || maxDepth < 0) {
      throw new Error('maxDepth must be a non-negative number');
    }

    if (typeof currentDepth !== 'number' || currentDepth < 0) {
      throw new Error('currentDepth must be a non-negative number');
    }

    // Check depth limit
    if (currentDepth >= maxDepth) {
      return [];
    }

    // Track visited paths to prevent cycles (create new set if not provided)
    const pathsToTrack = visitedPaths ?? new Set<string>();
    const results: HierarchicalContent[] = [];

    for (const ref of refs) {
      try {
        const content = await this.loadSingleReference(
          ref,
          manager,
          maxDepth,
          currentDepth,
          pathsToTrack
        );

        if (content != null) {
          results.push(content);
        }
      } catch (error) {
        // Log error but continue processing other references
        console.warn(`Failed to load reference "${ref.originalRef}":`, error);
      }
    }

    return results;
  }

  /**
   * Load a single reference with cycle detection
   *
   * @param ref - Normalized reference to load
   * @param manager - DocumentManager for loading
   * @param maxDepth - Maximum recursion depth
   * @param currentDepth - Current recursion depth
   * @param visitedPaths - Set of already visited paths for cycle detection
   * @returns Promise resolving to hierarchical content or null if skipped
   */
  private async loadSingleReference(
    ref: NormalizedReference,
    manager: DocumentManager,
    maxDepth: number,
    currentDepth: number,
    visitedPaths: Set<string>
  ): Promise<HierarchicalContent | null> {
    // Check for cycles (should not happen due to filtering, but keeping as safety check)
    if (visitedPaths.has(ref.documentPath)) {
      console.warn(`Unexpected cycle detected for path: ${ref.documentPath}`);
      return null;
    }

    // Add to visited set
    visitedPaths.add(ref.documentPath);

    try {
      // Load the document
      const document = await manager.getDocument(ref.documentPath);
      if (document == null) {
        console.warn(`Document not found: ${ref.documentPath}`);
        return null;
      }

      // Get content (section-specific or full document)
      let content: string;
      let title: string;

      if (ref.sectionSlug != null) {
        // Load specific section
        const sectionContent = document.sections?.get(ref.sectionSlug)?.content;
        if (sectionContent == null) {
          console.warn(`Section not found: ${ref.sectionSlug} in ${ref.documentPath}`);
          return null;
        }
        content = sectionContent;

        // Find section title from headings
        const heading = document.headings.find(h => h.slug === ref.sectionSlug);
        title = heading?.title ?? `Section: ${ref.sectionSlug}`;
      } else {
        // Load full document content from the __full__ section or construct from sections
        const fullContent = document.sections?.get('__full__')?.content;
        if (fullContent != null) {
          content = fullContent;
        } else {
          // Fallback: construct content from all sections
          const allSections = Array.from(document.sections?.values() ?? [])
            .map(entry => entry.content)
            .join('\n\n');
          content = allSections;
        }
        title = document.metadata.title;
      }

      // Extract nested references from content
      const nestedRefs = this.extractor.extractReferences(content);
      const normalizedNestedRefs = this.extractor.normalizeReferences(
        nestedRefs,
        ref.documentPath
      );

      // Filter out self-references and already visited paths (with cycle detection logging)
      const filteredNestedRefs = normalizedNestedRefs.filter(
        nestedRef => {
          if (visitedPaths.has(nestedRef.documentPath)) {
            console.warn(`Cycle detected for path: ${nestedRef.documentPath}`);
            return false;
          }
          return true;
        }
      );

      // Recursively load nested references with visited path tracking
      const children = await this.loadReferences(
        filteredNestedRefs,
        manager,
        maxDepth,
        currentDepth + 1,
        visitedPaths
      );

      // Build hierarchical content
      const hierarchicalContent: HierarchicalContent = {
        path: ref.documentPath,
        title,
        content,
        depth: currentDepth,
        namespace: pathToNamespace(ref.documentPath),
        children
      };

      return hierarchicalContent;
    } finally {
      // Remove from visited set when done (allows same document at different branches)
      visitedPaths.delete(ref.documentPath);
    }
  }

  /**
   * Load references from content string with automatic extraction
   *
   * Convenience method that combines reference extraction and loading
   * in a single operation.
   *
   * @param content - Content to extract references from
   * @param contextPath - Context document path for resolution
   * @param manager - DocumentManager for loading
   * @param maxDepth - Maximum recursion depth (default: 3)
   * @returns Promise resolving to hierarchical content array
   *
   * @example Direct content loading
   * ```typescript
   * const loader = new ReferenceLoader();
   * const content = 'See @/api/auth.md and @/api/tokens.md for details.';
   *
   * const hierarchy = await loader.loadReferencesFromContent(
   *   content,
   *   '/current/doc.md',
   *   manager
   * );
   * ```
   */
  async loadReferencesFromContent(
    content: string,
    contextPath: string,
    manager: DocumentManager,
    maxDepth: number = 3
  ): Promise<HierarchicalContent[]> {
    // Extract references from content
    const refs = this.extractor.extractReferences(content);

    // Normalize references
    const normalizedRefs = this.extractor.normalizeReferences(refs, contextPath);

    // Load hierarchical content
    return await this.loadReferences(normalizedRefs, manager, maxDepth);
  }

  /**
   * Get flattened list of all documents in hierarchy
   *
   * Utility method to extract all document paths from hierarchical content
   * for analysis or batch operations.
   *
   * @param hierarchy - Hierarchical content array
   * @returns Array of document paths in depth-first order
   *
   * @example Flatten hierarchy
   * ```typescript
   * const hierarchy = await loader.loadReferences(refs, manager);
   * const allPaths = loader.flattenHierarchy(hierarchy);
   * // Returns: ['/api/auth.md', '/api/tokens.md', '/api/errors.md']
   * ```
   */
  flattenHierarchy(hierarchy: HierarchicalContent[]): string[] {
    const paths: string[] = [];

    const collect = (items: HierarchicalContent[]): void => {
      for (const item of items) {
        paths.push(item.path);
        collect(item.children);
      }
    };

    collect(hierarchy);
    return paths;
  }

  /**
   * Get hierarchy statistics for analysis
   *
   * @param hierarchy - Hierarchical content array
   * @returns Statistics about the hierarchy structure
   */
  getHierarchyStats(hierarchy: HierarchicalContent[]): {
    totalDocuments: number;
    maxDepth: number;
    namespaces: string[];
  } {
    let totalDocuments = 0;
    let maxDepth = -1;
    const namespaceSet = new Set<string>();

    const analyze = (items: HierarchicalContent[]): void => {
      for (const item of items) {
        totalDocuments++;
        maxDepth = Math.max(maxDepth, item.depth);
        namespaceSet.add(item.namespace);
        analyze(item.children);
      }
    };

    analyze(hierarchy);

    return {
      totalDocuments,
      maxDepth: maxDepth === -1 ? 0 : maxDepth,
      namespaces: Array.from(namespaceSet).sort()
    };
  }
}