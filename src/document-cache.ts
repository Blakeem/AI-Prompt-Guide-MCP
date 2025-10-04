/**
 * Document cache system with file watching and lazy loading
 */

import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { watch } from 'chokidar';
import { EventEmitter } from 'node:events';
import { listHeadings, buildToc } from './parse.js';
import type { Heading, TocNode } from './types/index.js';
import { getGlobalLogger } from './utils/logger.js';
import { invalidateAddressCache } from './shared/addressing-system.js';
import { pathToNamespace } from './shared/path-utilities.js';

const logger = getGlobalLogger();

/**
 * Pre-compiled regex patterns for metadata extraction
 * These patterns are created once at module load time for optimal performance
 */
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g;
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;

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

export interface CachedSectionEntry {
  content: string;
  generation: number;
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
 * Provides access to actual section content with lazy loading and cache
 * management. Used by tools that need to read or modify section content.
 * Content is loaded on-demand to optimize memory usage.
 *
 * @example Lazy content access
 * ```typescript
 * async function getSectionContent(
 *   doc: DocumentContent,
 *   slug: string
 * ): Promise<string | null> {
 *   const sectionEntry = doc.sections?.get(slug);
 *   return sectionEntry?.content ?? null;
 * }
 * ```
 *
 * @example Content enumeration
 * ```typescript
 * function getAllLoadedSections(doc: DocumentContent): string[] {
 *   if (!doc.sections) return [];
 *   return Array.from(doc.sections.keys());
 * }
 *
 * function getContentStats(doc: DocumentContent): ContentStats {
 *   if (!doc.sections) return { loadedSections: 0, totalContentLength: 0 };
 *
 *   let totalLength = 0;
 *   for (const entry of doc.sections.values()) {
 *     totalLength += entry.content.length;
 *   }
 *
 *   return {
 *     loadedSections: doc.sections.size,
 *     totalContentLength: totalLength
 *   };
 * }
 * ```
 *
 * @see {@link CachedSectionEntry} Individual section cache entry
 * @see {@link DocumentCache} Cache implementation managing content lifecycle
 */
export interface DocumentContent {
  /** Lazy-loaded section content with cache generations for invalidation */
  sections?: Map<string, CachedSectionEntry>;
}

/**
 * Backward compatible composed interface
 * Maintains compatibility with existing code while allowing focused usage
 */
export interface CachedDocument extends
  DocumentCore,
  DocumentStructure,
  DocumentIndex,
  DocumentContent {}

interface CacheOptions {
  maxCacheSize: number;
  enableWatching: boolean;
  watchIgnorePatterns: string[];
  evictionPolicy: 'lru' | 'mru';
}

const DEFAULT_OPTIONS: CacheOptions = {
  maxCacheSize: 100,
  enableWatching: true,
  watchIgnorePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  evictionPolicy: 'lru'
};

/**
 * Document cache with file watching and intelligent invalidation
 */
export class DocumentCache extends EventEmitter {
  private readonly cache = new Map<string, CachedDocument>();
  private readonly accessOrder = new Map<string, number>();
  private readonly options: CacheOptions;
  private readonly docsRoot: string;
  private watcher: ReturnType<typeof watch> | undefined;
  private accessCounter = 0;
  private cacheGenerationCounter = 0;

  constructor(docsRoot: string, options: Partial<CacheOptions> = {}) {
    super();
    this.docsRoot = path.resolve(docsRoot);
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (this.options.enableWatching) {
      this.initializeWatcher();
    }

    // Integrate with addressing system cache for consistency
    this.setupAddressingCacheIntegration();

    logger.info('DocumentCache initialized', {
      docsRoot: this.docsRoot,
      maxSize: this.options.maxCacheSize
    });
  }

  /**
   * Setup integration with addressing system cache to maintain consistency
   */
  private setupAddressingCacheIntegration(): void {
    // Listen to our own document change events and invalidate addressing cache
    this.on('document:changed', (docPath: string) => {
      try {
        invalidateAddressCache(docPath);
        logger.debug('Invalidated addressing cache for changed document', { path: docPath });
      } catch (error) {
        logger.error('CRITICAL: Failed to invalidate addressing cache for changed document', { path: docPath, error });
        // Re-throw to prevent cache inconsistency
        throw error;
      }
    });

    this.on('document:deleted', (docPath: string) => {
      try {
        invalidateAddressCache(docPath);
        logger.debug('Invalidated addressing cache for deleted document', { path: docPath });
      } catch (error) {
        logger.error('CRITICAL: Failed to invalidate addressing cache for deleted document', { path: docPath, error });
        // Re-throw to prevent cache inconsistency
        throw error;
      }
    });
  }

  /**
   * Initialize file system watcher
   */
  private initializeWatcher(): void {
    this.watcher = watch(this.docsRoot, {
      ignored: this.options.watchIgnorePatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 20
      }
    });

    // Critical: Handle watcher errors to prevent silent cache staleness
    this.watcher.on('error', (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('CRITICAL: File watcher error - cache may become stale', {
        error: errorMessage,
        docsRoot: this.docsRoot
      });
      this.emit('watcher:error', error);
      // Consider implementing fallback polling mechanism
    });

    this.watcher.on('change', (filePath: string) => {
      try {
        const relativePath = this.getRelativePath(filePath);
        this.invalidateDocument(relativePath);
        this.emit('document:changed', relativePath);
        logger.debug('Document changed', { path: relativePath });
      } catch (error) {
        logger.error('Error handling file change', { filePath, error });
      }
    });

    this.watcher.on('unlink', (filePath: string) => {
      try {
        const relativePath = this.getRelativePath(filePath);
        this.invalidateDocument(relativePath);
        this.emit('document:deleted', relativePath);
        logger.debug('Document deleted', { path: relativePath });
      } catch (error) {
        logger.error('Error handling file deletion', { filePath, error });
      }
    });

    logger.info('File watcher initialized', { docsRoot: this.docsRoot });
  }

  /**
   * Convert absolute path to relative document path
   */
  private getRelativePath(filePath: string): string {
    const relative = path.relative(this.docsRoot, filePath);
    return relative.startsWith('/') ? relative : `/${relative}`;
  }

  /**
   * Get absolute file path from document path
   */
  private getAbsolutePath(docPath: string): string {
    return path.join(this.docsRoot, docPath.startsWith('/') ? docPath.slice(1) : docPath);
  }

  /**
   * Calculate content hash for cache validation
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
  }

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
  private extractKeywordsForFingerprint(title: string, content: string): string[] {
    try {
      // Handle null/undefined inputs gracefully
      const safeTitle = title ?? '';
      const safeContent = content ?? '';

      // Focus on title and first few paragraphs for performance
      const textForAnalysis = `${safeTitle} ${safeContent.slice(0, 1000)}`;
      const text = textForAnalysis.toLowerCase();

      if (text.trim().length === 0) {
        return [];
      }

      // Split into words and filter by length
      const words = text
        .split(/\s+/)
        .map(word => word.trim())
        .filter(word => word.length > 2);

      if (words.length === 0) {
        return [];
      }

      // Remove common stop words
      const stopWords = new Set([
        'the', 'and', 'for', 'with', 'this', 'that', 'will', 'can', 'are', 'you',
        'how', 'what', 'when', 'where', 'why', 'who', 'which', 'was', 'were',
        'been', 'have', 'has', 'had', 'should', 'would', 'could', 'may', 'might',
        'must', 'shall', 'not', 'but', 'however', 'therefore', 'thus', 'also',
        'such', 'very', 'more', 'most', 'much', 'many', 'some', 'any', 'all'
      ]);

      const keywords = words.filter(word => {
        // Remove stop words
        if (stopWords.has(word)) {
          return false;
        }
        // Remove words that are just punctuation or numbers
        if (/^[\d\W]+$/.test(word)) {
          return false;
        }
        return true;
      });

      // Remove duplicates and limit for performance
      const uniqueKeywords = [...new Set(keywords)];
      return uniqueKeywords.slice(0, 20);

    } catch (error) {
      logger.warn('Keyword extraction failed during fingerprinting', { error });
      return [];
    }
  }

  /**
   * Extract metadata from markdown content
   */
  private extractMetadata(content: string, filePath: string, stats: { mtime: Date }): DocumentMetadata {
    const lines = content.split('\n');
    const firstHeading = lines.find(line => line.startsWith('#'));
    const title = firstHeading?.replace(/^#+\s*/, '') ?? path.basename(filePath, '.md');

    // Simple content analysis using pre-compiled regex patterns
    const wordCount = content.split(/\s+/).length;
    const linkMatches = content.match(MARKDOWN_LINK_PATTERN) ?? [];
    const codeBlockMatches = content.match(CODE_BLOCK_PATTERN) ?? [];

    // Generate namespace from path
    const relativePath = this.getRelativePath(filePath);
    const namespace = pathToNamespace(relativePath);

    // Extract keywords for fingerprinting
    const keywords = this.extractKeywordsForFingerprint(title, content);

    // Current timestamp for fingerprint generation
    const fingerprintGenerated = new Date();

    return {
      path: relativePath,
      title,
      lastModified: stats.mtime,
      contentHash: this.calculateHash(content),
      wordCount,
      linkCount: linkMatches.length,
      codeBlockCount: codeBlockMatches.length,
      lastAccessed: new Date(),
      cacheGeneration: ++this.cacheGenerationCounter,
      namespace,
      keywords,
      fingerprintGenerated
    };
  }

  /**
   * Build slug index for fast section lookups
   */
  private buildSlugIndex(headings: readonly Heading[]): ReadonlyMap<string, number> {
    const index = new Map<string, number>();
    headings.forEach((heading, index_) => {
      index.set(heading.slug, index_);
    });
    return index;
  }

  /**
   * Enforce cache size limits with LRU/MRU eviction
   */
  private enforceCacheSize(): void {
    if (this.cache.size <= this.options.maxCacheSize) {
      return;
    }

    const entriesToRemove = this.cache.size - this.options.maxCacheSize + 1;
    const sortedPaths = Array.from(this.accessOrder.entries())
      .sort((a, b) => {
        return this.options.evictionPolicy === 'lru' 
          ? a[1] - b[1]  // Oldest first
          : b[1] - a[1]; // Newest first
      })
      .slice(0, entriesToRemove)
      .map(([path]) => path);

    for (const docPath of sortedPaths) {
      this.cache.delete(docPath);
      this.accessOrder.delete(docPath);
      logger.debug('Evicted document from cache', { path: docPath });
    }
  }

  /**
   * Update access tracking for cache policies
   */
  private updateAccess(docPath: string): void {
    this.accessCounter++;
    this.accessOrder.set(docPath, this.accessCounter);
  }

  /**
   * Atomically update cache with both hierarchical and flat keys
   * This prevents race conditions by ensuring both keys are set with the same generation
   */
  private atomicCacheUpdate(document: CachedDocument, slug: string, content: string): void {
    // Build all updates first in a temporary Map
    const generation = ++this.cacheGenerationCounter;
    const entry: CachedSectionEntry = { content, generation };
    const updates = new Map<string, CachedSectionEntry>();

    // Add primary hierarchical slug
    updates.set(slug, entry);

    // If hierarchical slug, also add flat key
    if (slug.includes('/')) {
      const parts = slug.split('/');
      const flatKey = parts.pop();
      if (flatKey != null && flatKey !== '') {
        updates.set(flatKey, entry); // Same entry object, same generation
      }
    }

    // Initialize sections map if not present
    document.sections ??= new Map();

    // Apply all updates atomically in a single operation loop
    for (const [key, value] of updates.entries()) {
      document.sections.set(key, value);
    }

    logger.debug('Atomic cache update completed', {
      slug,
      generation,
      keysUpdated: Array.from(updates.keys())
    });
  }

  /**
   * Retrieves a document from cache or loads it from the filesystem
   *
   * Uses LRU eviction policy and automatic cache invalidation on file changes.
   * Documents are parsed to extract headings, table of contents, and metadata.
   *
   * @param docPath - Relative path to the document (e.g., "api/auth.md")
   * @returns Cached document with metadata and structure, or null if file doesn't exist
   *
   * @example
   * const doc = await cache.getDocument("api/authentication.md");
   * if (doc) {
   *   console.log(`Title: ${doc.metadata.title}`);
   *   console.log(`Headings: ${doc.headings.length}`);
   * }
   *
   * @throws {Error} When file access fails due to permissions or other filesystem errors
   */
  async getDocument(docPath: string): Promise<CachedDocument | null> {
    // Check cache first
    const cached = this.cache.get(docPath);
    if (cached) {
      this.updateAccess(docPath);
      cached.metadata.lastAccessed = new Date();
      return cached;
    }

    // Load from file system
    try {
      const absolutePath = this.getAbsolutePath(docPath);
      const [content, stats] = await Promise.all([
        fs.readFile(absolutePath, 'utf8'),
        fs.stat(absolutePath)
      ]);

      // Parse content
      const headings = listHeadings(content);
      const toc = buildToc(content);
      const slugIndex = this.buildSlugIndex(headings);
      const metadata = this.extractMetadata(content, absolutePath, stats);

      // Create cached document
      const document: CachedDocument = {
        metadata,
        headings,
        toc,
        slugIndex
        // sections will be lazy-loaded on demand
      };

      // Add to cache
      this.cache.set(docPath, document);
      this.updateAccess(docPath);
      this.enforceCacheSize();

      logger.debug('Loaded document into cache', { 
        path: docPath, 
        headings: headings.length,
        size: this.cache.size 
      });

      return document;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null; // File not found
      }
      throw error;
    }
  }

  /**
   * Retrieves the content of a specific section from a document with atomic cache operations
   *
   * Supports both hierarchical and flat addressing with lazy-loading section cache.
   * Uses generation-based cache consistency to prevent race conditions between
   * hierarchical and flat cache keys.
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
  async getSectionContent(docPath: string, slug: string): Promise<string | null> {
    const document = await this.getDocument(docPath);
    if (!document) {
      return null;
    }

    // Check if sections are already loaded
    document.sections ??= new Map();

    // Check cache for both flat and hierarchical keys
    const cacheKeys = [slug];
    if (slug.includes('/')) {
      // Also try the final component as a fallback
      const parts = slug.split('/');
      const lastPart = parts.pop();
      if (lastPart != null && lastPart !== '') {
        cacheKeys.push(lastPart);
      }
    }

    for (const key of cacheKeys) {
      const entry = document.sections.get(key);
      if (entry) {
        logger.debug('Cache hit for section', {
          key,
          generation: entry.generation,
          slug
        });
        return entry.content;
      }
    }

    // Load section from file with hierarchical support
    try {
      const absolutePath = this.getAbsolutePath(docPath);
      const content = await fs.readFile(absolutePath, 'utf8');

      const { readSection } = await import('./sections.js');
      const sectionContent = readSection(content, slug);

      if (sectionContent != null) {
        // Use atomic cache update to prevent race conditions
        this.atomicCacheUpdate(document, slug, sectionContent);
      }

      return sectionContent;
    } catch (error) {
      logger.error('Failed to load section content', { path: docPath, slug, error });
      return null;
    }
  }

  /**
   * Invalidate a document in the cache
   */
  invalidateDocument(docPath: string): boolean {
    const existed = this.cache.delete(docPath);
    this.accessOrder.delete(docPath);

    if (existed) {
      logger.debug('Invalidated cached document', { path: docPath });

      // Also invalidate addressing cache for consistency
      try {
        invalidateAddressCache(docPath);
        logger.debug('Invalidated addressing cache for manually invalidated document', { path: docPath });
      } catch (error) {
        logger.error('CRITICAL: Failed to invalidate addressing cache during manual invalidation', { path: docPath, error });
        // Re-throw to prevent cache inconsistency
        throw error;
      }
    }

    return existed;
  }

  /**
   * Get all cached document paths
   */
  getCachedPaths(): string[] {
    return Array.from(this.cache.keys());
  }

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
  getCachedDocumentPaths(): string[] {
    return this.getCachedPaths();
  }

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
  invalidateDocumentsByPrefix(prefix: string): number {
    let count = 0;
    for (const docPath of this.cache.keys()) {
      if (docPath.startsWith(prefix)) {
        this.invalidateDocument(docPath);
        count++;
      }
    }

    if (count > 0) {
      logger.debug('Invalidated documents by prefix', { prefix, count });
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestAccess: Date | null;
    newestAccess: Date | null;
  } {
    const documents = Array.from(this.cache.values());
    const accessTimes = documents.map(doc => doc.metadata.lastAccessed);
    
    return {
      size: this.cache.size,
      maxSize: this.options.maxCacheSize,
      hitRate: 0, // Would need request tracking to calculate
      oldestAccess: accessTimes.length > 0 ? new Date(Math.min(...accessTimes.map(d => d.getTime()))) : null,
      newestAccess: accessTimes.length > 0 ? new Date(Math.max(...accessTimes.map(d => d.getTime()))) : null
    };
  }

  /**
   * Clear all cached documents
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;

    logger.info('Cache cleared', { previousSize: size });
  }

  /**
   * Create a fingerprint entry from document metadata
   *
   * Extracts the fingerprint-relevant information from cached metadata
   * for use in document discovery and cache invalidation operations.
   *
   * @param metadata - Document metadata containing fingerprint information
   * @returns FingerprintEntry with extracted data
   */
  createFingerprintEntry(metadata: DocumentMetadata): FingerprintEntry {
    return {
      keywords: [...metadata.keywords], // Create defensive copy
      lastModified: metadata.lastModified,
      contentHash: metadata.contentHash,
      namespace: metadata.namespace
    };
  }

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
  async isFingerprintStale(docPath: string): Promise<boolean> {
    try {
      const cached = this.cache.get(docPath);
      if (cached == null) {
        // No cached version means we need to load (not stale in the traditional sense)
        return false;
      }

      const absolutePath = this.getAbsolutePath(docPath);
      const stats = await fs.stat(absolutePath);
      const currentMtime = stats.mtimeMs;

      // Fast path: Use stored mtime from metadata if available
      // This avoids reading file content in most cases
      if (cached.metadata.lastModified != null) {
        const cachedMtime = cached.metadata.lastModified.getTime();

        if (currentMtime === cachedMtime) {
          // mtime matches exactly - cache is fresh (no file content read needed!)
          logger.debug('Fingerprint is fresh - mtime unchanged (fast path)', {
            path: docPath,
            mtime: new Date(currentMtime).toISOString()
          });
          return false;
        }

        logger.debug('mtime changed, verifying with content hash (slow path)', {
          path: docPath,
          cachedMtime: new Date(cachedMtime).toISOString(),
          currentMtime: new Date(currentMtime).toISOString()
        });
      }

      // Slow path: mtime changed or missing from fingerprint
      // Verify staleness with content hash comparison
      // This only happens when file has been modified or on legacy cache entries
      const content = await fs.readFile(absolutePath, 'utf8');
      const currentHash = this.calculateHash(content);

      if (currentHash !== cached.metadata.contentHash) {
        logger.debug('Fingerprint is stale - content hash mismatch', {
          path: docPath,
          cachedHash: cached.metadata.contentHash,
          currentHash
        });
        return true;
      }

      // Hash matches despite mtime change (rare case - e.g., file touched but not modified)
      logger.debug('Content unchanged despite mtime change', {
        path: docPath,
        hash: currentHash
      });
      return false;

    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File no longer exists - consider stale for cleanup
        logger.debug('File no longer exists for fingerprint staleness check', { path: docPath });
        return true;
      }

      logger.warn('Error checking fingerprint staleness', { path: docPath, error });
      // On error, assume stale to trigger refresh on next access
      return true;
    }
  }

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
  async readDocumentContent(docPath: string): Promise<string | null> {
    try {
      const absolutePath = this.getAbsolutePath(docPath);
      const content = await fs.readFile(absolutePath, 'utf8');

      logger.debug('Read full document content', {
        path: docPath,
        length: content.length
      });

      return content;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        logger.debug('Document not found for content read', { path: docPath });
        return null; // File not found
      }

      logger.error('Failed to read document content', { path: docPath, error });
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
      logger.debug('File watcher closed');
    }

    this.clear();
    this.removeAllListeners();

    logger.info('DocumentCache destroyed');
  }
}

/**
 * Global cache instance (singleton pattern)
 * @deprecated Use dependency injection with DocumentCache constructor instead
 */
let globalCache: DocumentCache | undefined;

/**
 * Initialize global document cache
 * @deprecated Use dependency injection with DocumentCache constructor instead
 */
export function initializeGlobalCache(docsRoot: string, options?: Partial<CacheOptions>): DocumentCache {
  if (globalCache) {
    throw new Error('Global document cache already initialized');
  }

  globalCache = new DocumentCache(docsRoot, options);
  return globalCache;
}

/**
 * Get global cache instance
 * @deprecated Use dependency injection with DocumentCache constructor instead
 */
export function getGlobalCache(): DocumentCache {
  if (!globalCache) {
    throw new Error('Global document cache not initialized. Call initializeGlobalCache() first.');
  }

  return globalCache;
}

/**
 * Factory function for creating DocumentCache instances with explicit configuration
 * This is the recommended approach for new code instead of global singletons
 */
export function createDocumentCache(docsRoot: string, options?: Partial<CacheOptions>): DocumentCache {
  return new DocumentCache(docsRoot, options);
}

