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
export declare class ReferenceLoader {
    private readonly extractor;
    private readonly MAX_TOTAL_NODES;
    private readonly DEFAULT_TIMEOUT_MS;
    constructor();
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
     * @param totalNodesLoaded - Node count tracker across all branches (internal use)
     * @param startTime - Operation start timestamp for timeout tracking (internal use)
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
    loadReferences(refs: NormalizedReference[], manager: DocumentManager, maxDepth?: number, currentDepth?: number, visitedPaths?: Set<string>, totalNodesLoaded?: {
        count: number;
    }, startTime?: number): Promise<HierarchicalContent[]>;
    /**
     * Load a single reference with cycle detection
     *
     * @param ref - Normalized reference to load
     * @param manager - DocumentManager for loading
     * @param maxDepth - Maximum recursion depth
     * @param currentDepth - Current recursion depth
     * @param visitedPaths - Set of already visited paths for cycle detection
     * @param nodeTracker - Node count tracker across all branches
     * @param startTime - Operation start timestamp for timeout tracking
     * @returns Promise resolving to hierarchical content or null if skipped
     */
    private loadSingleReference;
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
    loadReferencesFromContent(content: string, contextPath: string, manager: DocumentManager, maxDepth?: number): Promise<HierarchicalContent[]>;
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
    flattenHierarchy(hierarchy: HierarchicalContent[]): string[];
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
    };
}
//# sourceMappingURL=reference-loader.d.ts.map