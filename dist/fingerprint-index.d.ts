/**
 * Lightweight document fingerprint index for fast search filtering
 *
 * Provides O(1) keyword lookup to filter document candidates before full loading.
 * Dramatically improves search performance by reducing I/O and parsing overhead.
 *
 * Performance characteristics:
 * - Build time: ~100ms for 500 documents
 * - Memory: ~50KB for 500 documents (~100 bytes per document)
 * - Lookup time: ~0.1ms per keyword
 * - Search speedup: 10-20x for typical queries
 *
 * @example
 * ```typescript
 * const index = new FingerprintIndex('/path/to/docs');
 * await index.initialize();
 *
 * // Fast candidate filtering (sub-millisecond)
 * const candidates = index.findCandidates('authentication security');
 * // Returns ~20-30 paths instead of 500
 *
 * // Then load only those candidates for deep search
 * for (const path of candidates) {
 *   const doc = await manager.getDocument(path);
 *   // ... detailed search
 * }
 * ```
 */
import type { FSWatcher } from 'chokidar';
import type { FingerprintEntry } from './document-cache.js';
/**
 * FingerprintIndex - Fast keyword-based document filtering
 *
 * This index enables sub-millisecond candidate filtering for search operations,
 * dramatically reducing the number of documents that need full parsing.
 *
 * Key design decisions:
 * - Uses inverted index (keyword → documents) for O(1) lookup
 * - Reads only first 1500 bytes per document (balance accuracy vs speed)
 * - Stores lightweight fingerprints (~100 bytes each)
 * - Integrates with file watcher for automatic invalidation
 * - Limits to 20 keywords per document to control memory usage
 */
export declare class FingerprintIndex {
    /** Map from keyword to set of document paths containing that keyword */
    private readonly keywordIndex;
    /** Map from document path to lightweight fingerprint */
    private readonly fingerprints;
    /** Root directory for documents */
    private readonly docsRoot;
    /** Whether the index has been initialized */
    private initialized;
    constructor(docsRoot: string);
    /**
     * Initialize the fingerprint index by scanning all documents
     *
     * Only reads first 1500 bytes of each document for efficiency.
     * Much faster than full document parsing.
     *
     * Performance target: <200ms for 100 documents
     *
     * @returns Promise that resolves when index is built
     */
    initialize(): Promise<void>;
    /**
     * Find all markdown files recursively
     *
     * @param dir - Directory to search
     * @param files - Accumulator for file paths
     * @returns Array of absolute file paths
     */
    private findAllMarkdownFiles;
    /**
     * Index a single document by reading preview and extracting keywords
     *
     * Only reads first 1500 bytes for performance.
     * Extracts title, keywords, and metadata.
     *
     * @param absolutePath - Absolute path to document file
     */
    private indexDocument;
    /**
     * Extract keywords from title and content preview
     *
     * Filters stop words and extracts meaningful keywords.
     * Limits to top 20 keywords per document.
     *
     * @param title - Document title
     * @param content - Content preview (first 1500 bytes)
     * @returns Array of unique keywords (max 20)
     */
    private extractKeywords;
    /**
     * Calculate content hash for change detection
     *
     * Uses SHA-256 truncated to 16 characters for efficiency.
     *
     * @param content - Content to hash
     * @returns Truncated hash string
     */
    private calculateHash;
    /**
     * Convert absolute path to relative document path
     *
     * @param filePath - Absolute file path
     * @returns Relative path starting with /
     */
    private getRelativePath;
    /**
     * Find candidate documents matching search query keywords
     *
     * This is the core optimization: filter to 20-30 candidates before
     * loading full documents for deep search.
     *
     * Algorithm:
     * 1. Extract meaningful keywords from query (filter stop words)
     * 2. Find all documents containing ANY query keyword (union)
     * 3. Return candidate paths for deep search
     *
     * Performance: <1ms for typical queries
     *
     * @param query - Search query string
     * @returns Array of document paths that are potential matches
     */
    findCandidates(query: string): string[];
    /**
     * Get fingerprint for a specific document
     *
     * @param docPath - Relative document path
     * @returns Fingerprint entry or undefined if not found
     */
    getFingerprint(docPath: string): FingerprintEntry | undefined;
    /**
     * Check if index is initialized
     *
     * @returns True if index has been built
     */
    isInitialized(): boolean;
    /**
     * Get statistics about the index
     *
     * Useful for monitoring and debugging.
     *
     * @returns Index statistics
     */
    getStats(): {
        documents: number;
        keywords: number;
        avgKeywordsPerDoc: number;
    };
    /**
     * Invalidate a specific document (call when document changes)
     *
     * Removes document from all keyword indexes and fingerprint map.
     * Should be followed by re-indexing the document.
     *
     * @param docPath - Relative document path
     */
    invalidateDocument(docPath: string): void;
    /**
     * Watch for file changes and update index
     *
     * Integrates with chokidar file watcher for automatic invalidation.
     * Automatically reindexes changed documents.
     *
     * @param watcher - Chokidar FSWatcher instance
     */
    watchFiles(watcher: FSWatcher): void;
    /**
     * Clear the entire index
     *
     * Removes all fingerprints and keyword mappings.
     * Resets initialization state.
     */
    clear(): void;
}
//# sourceMappingURL=fingerprint-index.d.ts.map