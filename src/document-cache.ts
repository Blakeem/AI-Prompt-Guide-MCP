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
}

export interface CachedDocument {
  metadata: DocumentMetadata;
  headings: readonly Heading[];
  toc: readonly TocNode[];
  slugIndex: ReadonlyMap<string, number>;
  sections?: Map<string, string>; // Lazy-loaded content
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
      lastAccessed: new Date()
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
   * Get or load a document into cache
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
   * Lazy-load section content for a document
   */
  async getSectionContent(docPath: string, slug: string): Promise<string | null> {
    const document = await this.getDocument(docPath);
    if (!document) {
      return null;
    }

    // Check if sections are already loaded
    document.sections ??= new Map();

    // Return cached section if available
    if (document.sections.has(slug)) {
      return document.sections.get(slug) ?? null;
    }

    // Load section from file
    try {
      const absolutePath = this.getAbsolutePath(docPath);
      const content = await fs.readFile(absolutePath, 'utf8');
      
      // Use existing readSection function to extract section
      const { readSection } = await import('./sections.js');
      const sectionContent = readSection(content, slug);
      
      if (sectionContent != null) {
        document.sections.set(slug, sectionContent);
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

