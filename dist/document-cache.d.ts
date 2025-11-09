/**
 * Document cache system with file watching and lazy loading
 */
import { EventEmitter } from 'node:events';
import type { Heading, TocNode } from './types/index.js';
/**
 * Access context for cache operations
 *
 * Tracks the purpose of document access to apply appropriate caching strategies.
 * Different contexts receive different eviction resistance (boost factors).
 */
export declare enum AccessContext {
    /** Search operations (lowest eviction resistance) */
    SEARCH = "search",
    /** Direct document access (standard eviction resistance) */
    DIRECT = "direct",
    /** Reference loading (highest eviction resistance, 2x boost) */
    REFERENCE = "reference"
}
export interface DocumentMetadata {
    path: string;
    title: string;
    lastModified: Date;
    contentHash: string;
    wordCount: number;
    linkCount: number;
    codeBlockCount: number;
    lastAccessed: Date;
    cacheGeneration: number;
    /** Document namespace derived from path for categorization */
    namespace: string;
    /** Lightweight keyword fingerprints for document discovery */
    keywords: string[];
    /** Timestamp when fingerprints were generated */
    fingerprintGenerated: Date;
}
/**
 * Fingerprint entry interface for document discovery improvements
 *
 * Stores lightweight metadata for fast document discovery without requiring
 * full document parsing. Used for efficient relevance scoring and cache
 * invalidation detection.
 */
export interface FingerprintEntry {
    /** Keywords extracted from document content for discovery */
    keywords: string[];
    /** Last modification time for cache invalidation */
    lastModified: Date;
    /** Content hash for change detection */
    contentHash: string;
    /** Document namespace for categorization */
    namespace: string;
}
/**
 * Interface Segregation Principle: Split CachedDocument into focused interfaces
 * to reduce coupling and allow tools to depend only on what they need.
 *
 * These interfaces follow the Interface Segregation Principle by breaking down
 * the complex CachedDocument into focused contracts that tools can implement
 * based on their specific needs, reducing unnecessary dependencies.
 */
/**
 * Core document information interface
 *
 * Provides access to essential document metadata without requiring knowledge
 * of document structure or content. Used by tools that only need basic
 * document information like title, path, and namespace.
 *
 * @example Basic document info usage
 * ```typescript
 * function getDocumentTitle(doc: DocumentCore): string {
 *   return doc.metadata.title;
 * }
 *
 * function getDocumentNamespace(doc: DocumentCore): string {
 *   return doc.metadata.namespace;
 * }
 * ```
 *
 * @example Tool implementation with minimal dependencies
 * ```typescript
 * class DocumentInfoTool {
 *   async execute(doc: DocumentCore): Promise<DocumentInfo> {
 *     return {
 *       title: doc.metadata.title,
 *       path: doc.metadata.path,
 *       namespace: doc.metadata.namespace,
 *       lastModified: doc.metadata.lastModified
 *     };
 *   }
 * }
 * ```
 *
 * @see {@link DocumentMetadata} Complete metadata interface
 * @see {@link CachedDocument} Full document interface
 */
export interface DocumentCore {
    /** Document metadata including title, path, namespace, and timestamps */
    metadata: DocumentMetadata;
}
/**
 * Document structure interface
 *
 * Provides access to document structure information including headings and
 * table of contents. Used by tools that need to navigate or analyze document
 * hierarchy without requiring access to actual content.
 *
 * @example Structure navigation
 * ```typescript
 * function findHeadingBySlug(doc: DocumentStructure, slug: string): Heading | null {
 *   return doc.headings.find(h => h.slug === slug) ?? null;
 * }
 *
 * function getDocumentOutline(doc: DocumentStructure): TocNode[] {
 *   return [...doc.toc]; // Return copy of TOC
 * }
 * ```
 *
 * @example Hierarchical analysis
 * ```typescript
 * function analyzeDocumentStructure(doc: DocumentStructure): StructureAnalysis {
 *   const maxDepth = Math.max(...doc.headings.map(h => h.depth));
 *   const sectionCount = doc.headings.length;
 *   const rootSections = doc.toc.filter(node => node.depth === 1);
 *
 *   return {
 *     maxDepth,
 *     sectionCount,
 *     rootSectionCount: rootSections.length,
 *     avgSectionsPerLevel: sectionCount / maxDepth
 *   };
 * }
 * ```
 *
 * @see {@link Heading} Individual heading interface
 * @see {@link TocNode} Table of contents node interface
 */
export interface DocumentStructure {
    /** Ordered list of all headings in the document */
    headings: readonly Heading[];
    /** Hierarchical table of contents structure */
    toc: readonly TocNode[];
}
/**
 * Document indexing interface
 *
 * Provides access to optimized lookup structures for fast document querying.
 * Primarily used internally by the cache system and performance-critical
 * operations that need O(1) heading lookups.
 *
 * @example Fast heading lookup
 * ```typescript
 * function getHeadingIndex(doc: DocumentIndex, slug: string): number | undefined {
 *   return doc.slugIndex.get(slug);
 * }
 *
 * function hasHeading(doc: DocumentIndex, slug: string): boolean {
 *   return doc.slugIndex.has(slug);
 * }
 * ```
 *
 * @example Bulk heading operations
 * ```typescript
 * function validateHeadingSlugs(
 *   doc: DocumentIndex,
 *   requiredSlugs: string[]
 * ): ValidationResult {
 *   const missing = requiredSlugs.filter(slug => !doc.slugIndex.has(slug));
 *   const existing = requiredSlugs.filter(slug => doc.slugIndex.has(slug));
 *
 *   return {
 *     valid: missing.length === 0,
 *     missing,
 *     existing
 *   };
 * }
 * ```
 *
 * @see {@link DocumentCache} Cache implementation that builds indices
 */
export interface DocumentIndex {
    /** Map from section slug to heading index for O(1) lookups */
    slugIndex: ReadonlyMap<string, number>;
}
/**
 * Document content interface
 *
 * Placeholder interface for future content-related functionality.
 * Section content is not cached - it's parsed on-demand from the document.
 *
 * @see {@link DocumentCache} Cache implementation managing content lifecycle
 */
export interface DocumentContent {
}
/**
 * Backward compatible composed interface
 * Maintains compatibility with existing code while allowing focused usage
 */
export interface CachedDocument extends DocumentCore, DocumentStructure, DocumentIndex, DocumentContent {
}
interface CacheOptions {
    maxCacheSize: number;
    enableWatching: boolean;
    watchIgnorePatterns: string[];
    evictionPolicy: 'lru' | 'mru';
    boostFactors?: {
        search?: number;
        direct?: number;
        reference?: number;
    };
}
/**
 * Document cache with file watching and intelligent invalidation
 */
export declare class DocumentCache extends EventEmitter {
    private readonly cache;
    private readonly accessOrder;
    private readonly accessMetadata;
    private readonly options;
    private readonly docsRoot;
    private readonly coordinatorRoot;
    private watcher;
    private accessCounter;
    private readonly boostFactors;
    private watcherErrorCount;
    private readonly MAX_WATCHER_ERRORS;
    private pollingInterval;
    private totalHeadingsLoaded;
    constructor(docsRoot: string, options?: Partial<CacheOptions>, coordinatorRoot?: string);
    /**
     * Setup integration with addressing system cache to maintain consistency
     */
    private setupAddressingCacheIntegration;
    /**
     * Initialize file system watcher
     */
    private initializeWatcher;
    /**
     * Reinitialize file watcher with exponential backoff after error
     */
    private reinitializeWatcher;
    /**
     * Switch to polling mode after repeated watcher failures
     *
     * Implements fallback polling mechanism that validates cache consistency
     * every 30 seconds by checking file modification times. This ensures the
     * cache stays synchronized even when the file watcher is unavailable.
     */
    private switchToPollingMode;
    /**
     * Validate cache consistency by checking file modification times
     *
     * Used in polling mode to detect file changes when the watcher is unavailable.
     * Compares cached modification times with current file stats and invalidates
     * stale entries.
     */
    private validateCacheConsistency;
    /**
     * Convert absolute path to relative document path
     */
    private getRelativePath;
    /**
     * Get absolute file path from document path
     */
    private getAbsolutePath;
    /**
     * Calculate content hash for cache validation
     */
    private calculateHash;
    /**
     * Extract lightweight keywords from document content for fingerprinting
     *
     * Optimized for cache operations - extracts meaningful keywords from
     * title and content while being lightweight enough for frequent use.
     *
     * @param title - Document title
     * @param content - Full document content
     * @returns Array of keywords limited to 20 items for performance
     */
    private extractKeywordsForFingerprint;
    /**
     * Extract metadata from markdown content
     */
    private extractMetadata;
    /**
     * Build slug index for fast section lookups
     */
    private buildSlugIndex;
    /**
     * Enforce cache size limits with boost-aware LRU/MRU eviction
     *
     * Uses access metadata to calculate eviction scores that incorporate
     * both access time and boost factors. Documents with higher boost factors
     * (e.g., search-accessed) are less likely to be evicted.
     */
    private enforceCacheSize;
    /**
     * Update access tracking for cache policies with context-aware boost
     *
     * @param docPath - Document path
     * @param context - Access context (search, direct, reference)
     */
    private updateAccess;
    /**
     * Retrieves a document from cache or loads it from the filesystem
     *
     * Uses boost-aware LRU eviction policy and automatic cache invalidation on file changes.
     * Documents are parsed to extract headings, table of contents, and metadata.
     *
     * @param docPath - Relative path to the document (e.g., "api/auth.md")
     * @param context - Access context for boost-aware caching (search, direct, reference)
     * @returns Cached document with metadata and structure, or null if file doesn't exist
     *
     * @example Basic usage (default DIRECT context)
     * const doc = await cache.getDocument("api/authentication.md");
     * if (doc) {
     *   console.log(`Title: ${doc.metadata.title}`);
     *   console.log(`Headings: ${doc.headings.length}`);
     * }
     *
     * @example Search context (3x eviction resistance)
     * const doc = await cache.getDocument("api/authentication.md", AccessContext.SEARCH);
     *
     * @example Reference context (2x eviction resistance)
     * const doc = await cache.getDocument("api/tokens.md", AccessContext.REFERENCE);
     *
     * @throws {Error} When file access fails due to permissions or other filesystem errors
     */
    getDocument(docPath: string, context?: AccessContext): Promise<CachedDocument | null>;
    /**
     * Retrieves the content of a specific section from a document
     *
     * Uses slugIndex for O(1) validation before parsing section content.
     * No caching of section content (sections typically accessed once).
     *
     * @param docPath - Relative path to the document
     * @param slug - Section slug (flat or hierarchical path)
     * @returns Section content or null if section not found
     *
     * @example
     * // Flat addressing
     * const content = await cache.getSectionContent("api/auth.md", "overview");
     *
     * // Hierarchical addressing
     * const content = await cache.getSectionContent("api/auth.md", "api/auth/jwt-tokens");
     *
     * @throws {Error} When document cannot be loaded or section extraction fails
     */
    getSectionContent(docPath: string, slug: string): Promise<string | null>;
    /**
     * Invalidate a document in the cache
     */
    invalidateDocument(docPath: string): boolean;
    /**
     * Get all cached document paths
     */
    getCachedPaths(): string[];
    /**
     * Get all cached document paths (alias for getCachedPaths)
     *
     * Provides explicit API for retrieving cached document paths without
     * requiring access to cache internals. Preferred over direct cache access.
     *
     * @returns Array of document paths currently in cache
     *
     * @example
     * ```typescript
     * const paths = cache.getCachedDocumentPaths();
     * console.log(`Currently caching ${paths.length} documents`);
     * paths.forEach(path => console.log(`  - ${path}`));
     * ```
     */
    getCachedDocumentPaths(): string[];
    /**
     * Invalidate all documents matching a path prefix
     *
     * Useful for invalidating entire folders when archiving or moving documents.
     * Uses proper encapsulation instead of accessing cache internals directly.
     *
     * @param prefix - Path prefix to match (e.g., '/api/' to invalidate all /api/* documents)
     * @returns Number of documents invalidated
     *
     * @example Invalidate all documents in a folder
     * ```typescript
     * const count = cache.invalidateDocumentsByPrefix('/api/');
     * console.log(`Invalidated ${count} documents in /api/ folder`);
     * ```
     *
     * @example Invalidate documents before archiving
     * ```typescript
     * // Before moving folder to archive
     * const invalidated = cache.invalidateDocumentsByPrefix('/old-docs/');
     * logger.info('Prepared folder for archival', { invalidated });
     * ```
     */
    invalidateDocumentsByPrefix(prefix: string): number;
    /**
     * Get cache statistics including boost information
     */
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        oldestAccess: Date | null;
        newestAccess: Date | null;
        boostedDocuments?: {
            search: number;
            reference: number;
            direct: number;
        };
    };
    /**
     * Clear all cached documents
     */
    clear(): void;
    /**
     * Create a fingerprint entry from document metadata
     *
     * Extracts the fingerprint-relevant information from cached metadata
     * for use in document discovery and cache invalidation operations.
     *
     * @param metadata - Document metadata containing fingerprint information
     * @returns FingerprintEntry with extracted data
     */
    createFingerprintEntry(metadata: DocumentMetadata): FingerprintEntry;
    /**
     * Check if a document's fingerprint is stale compared to file system
     *
     * Compares the cached fingerprint timestamp and content hash with the
     * actual file modification time to determine if the cache needs updating.
     *
     * @param docPath - Relative path to the document
     * @returns Promise resolving to true if fingerprint is stale, false if current
     *
     * @example
     * ```typescript
     * const isStale = await cache.isFingerprintStale('/api/auth.md');
     * if (isStale) {
     *   cache.invalidateDocument('/api/auth.md');
     *   // Fingerprint will be regenerated on next getDocument call
     * }
     * ```
     */
    isFingerprintStale(docPath: string): Promise<boolean>;
    /**
     * Read the complete content of a document from the filesystem
     *
     * Provides direct access to the full document content without going through
     * the section-based cache system. Used for operations that need the entire
     * document content like relevance analysis and keyword extraction.
     *
     * @param docPath - Relative path to the document (e.g., "api/auth.md")
     * @returns Promise resolving to full document content or null if file doesn't exist
     *
     * @example
     * const content = await cache.readDocumentContent("api/authentication.md");
     * if (content) {
     *   console.log(`Document length: ${content.length} characters`);
     * }
     *
     * @throws {Error} When file access fails due to permissions or other filesystem errors
     */
    readDocumentContent(docPath: string): Promise<string | null>;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
}
/**
 * Initialize global document cache
 * @deprecated Use dependency injection with DocumentCache constructor instead
 */
export declare function initializeGlobalCache(docsRoot: string, options?: Partial<CacheOptions>): DocumentCache;
/**
 * Get global cache instance
 * @deprecated Use dependency injection with DocumentCache constructor instead
 */
export declare function getGlobalCache(): DocumentCache;
/**
 * Factory function for creating DocumentCache instances with explicit configuration
 * This is the recommended approach for new code instead of global singletons
 */
export declare function createDocumentCache(docsRoot: string, options?: Partial<CacheOptions>, coordinatorRoot?: string): DocumentCache;
export {};
//# sourceMappingURL=document-cache.d.ts.map