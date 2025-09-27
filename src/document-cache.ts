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

const logger = getGlobalLogger();

interface DocumentMetadata {
  path: string;
  title: string;
  lastModified: Date;
  contentHash: string;
  wordCount: number;
  linkCount: number;
  codeBlockCount: number;
  lastAccessed: Date;
  cacheGeneration: number;
}

interface CachedSectionEntry {
  content: string;
  generation: number;
}

export interface CachedDocument {
  metadata: DocumentMetadata;
  headings: readonly Heading[];
  toc: readonly TocNode[];
  slugIndex: ReadonlyMap<string, number>;
  sections?: Map<string, CachedSectionEntry>; // Lazy-loaded content with generations
}

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
class DocumentCache extends EventEmitter {
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
    
    logger.info('DocumentCache initialized', { 
      docsRoot: this.docsRoot, 
      maxSize: this.options.maxCacheSize 
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

    this.watcher.on('change', (filePath: string) => {
      const relativePath = this.getRelativePath(filePath);
      this.invalidateDocument(relativePath);
      this.emit('document:changed', relativePath);
      logger.debug('Document changed', { path: relativePath });
    });

    this.watcher.on('unlink', (filePath: string) => {
      const relativePath = this.getRelativePath(filePath);
      this.invalidateDocument(relativePath);
      this.emit('document:deleted', relativePath);
      logger.debug('Document deleted', { path: relativePath });
    });

    logger.debug('File watcher initialized');
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
   * Extract metadata from markdown content
   */
  private extractMetadata(content: string, filePath: string, stats: { mtime: Date }): DocumentMetadata {
    const lines = content.split('\n');
    const firstHeading = lines.find(line => line.startsWith('#'));
    const title = firstHeading?.replace(/^#+\s*/, '') ?? path.basename(filePath, '.md');

    // Simple content analysis
    const wordCount = content.split(/\s+/).length;
    const linkMatches = content.match(/\[([^\]]+)\]\([^)]+\)/g) ?? [];
    const codeBlockMatches = content.match(/```[\s\S]*?```/g) ?? [];

    return {
      path: this.getRelativePath(filePath),
      title,
      lastModified: stats.mtime,
      contentHash: this.calculateHash(content),
      wordCount,
      linkCount: linkMatches.length,
      codeBlockCount: codeBlockMatches.length,
      lastAccessed: new Date(),
      cacheGeneration: ++this.cacheGenerationCounter
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
    const generation = ++this.cacheGenerationCounter;
    const entry: CachedSectionEntry = { content, generation };

    // Initialize sections map if not present
    document.sections ??= new Map();

    // Atomic operation: update both keys with same generation
    document.sections.set(slug, entry);

    // If hierarchical slug, also cache under flat key
    if (slug.includes('/')) {
      const parts = slug.split('/');
      const flatKey = parts.pop();
      if (flatKey != null && flatKey !== '') {
        document.sections.set(flatKey, entry); // Same entry object, same generation
      }
    }

    logger.debug('Atomic cache update completed', {
      slug,
      generation,
      hierarchicalKey: slug,
      flatKey: slug.includes('/') ? slug.split('/').pop() : null
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
 */
let globalCache: DocumentCache | undefined;

/**
 * Initialize global document cache
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
 */
export function getGlobalCache(): DocumentCache {
  if (!globalCache) {
    throw new Error('Global document cache not initialized. Call initializeGlobalCache() first.');
  }
  
  return globalCache;
}

