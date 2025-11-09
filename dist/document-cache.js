/**
 * Document cache system with file watching and lazy loading
 */
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { watch } from 'chokidar';
import { EventEmitter } from 'node:events';
import { listHeadings, buildToc } from './parse.js';
import { getGlobalLogger } from './utils/logger.js';
import { invalidateAddressCache } from './shared/addressing-system.js';
import { pathToNamespace } from './shared/path-utilities.js';
import { ERROR_CODES, DEFAULT_LIMITS } from './constants/defaults.js';
import { createRequire } from 'node:module';
const logger = getGlobalLogger();
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
/**
 * Creates a custom error with code, context, and version information
 */
function createError(message, code, context) {
    const error = new Error(message);
    return Object.assign(error, {
        code,
        context: { ...context, version: packageJson.version }
    });
}
/**
 * Access context for cache operations
 *
 * Tracks the purpose of document access to apply appropriate caching strategies.
 * Different contexts receive different eviction resistance (boost factors).
 */
export var AccessContext;
(function (AccessContext) {
    /** Search operations (lowest eviction resistance) */
    AccessContext["SEARCH"] = "search";
    /** Direct document access (standard eviction resistance) */
    AccessContext["DIRECT"] = "direct";
    /** Reference loading (highest eviction resistance, 2x boost) */
    AccessContext["REFERENCE"] = "reference";
})(AccessContext || (AccessContext = {}));
/**
 * Pre-compiled regex patterns for metadata extraction
 * These patterns are created once at module load time for optimal performance
 */
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g;
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
/**
 * Stop words Set for keyword extraction
 * Created once at module load time for optimal performance
 */
const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'will', 'can', 'are', 'you',
    'how', 'what', 'when', 'where', 'why', 'who', 'which', 'was', 'were',
    'been', 'have', 'has', 'had', 'should', 'would', 'could', 'may', 'might',
    'must', 'shall', 'not', 'but', 'however', 'therefore', 'thus', 'also',
    'such', 'very', 'more', 'most', 'much', 'many', 'some', 'any', 'all'
]);
const DEFAULT_OPTIONS = {
    maxCacheSize: 100,
    enableWatching: true,
    watchIgnorePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    evictionPolicy: 'lru',
    boostFactors: {
        search: 3.0,
        direct: 1.0,
        reference: 2.0
    }
};
/**
 * Document cache with file watching and intelligent invalidation
 */
export class DocumentCache extends EventEmitter {
    cache = new Map();
    accessOrder = new Map();
    accessMetadata = new Map();
    options;
    docsRoot;
    coordinatorRoot;
    watcher;
    accessCounter = 0;
    boostFactors;
    watcherErrorCount = 0;
    MAX_WATCHER_ERRORS = 3;
    pollingInterval;
    totalHeadingsLoaded = 0;
    constructor(docsRoot, options = {}, coordinatorRoot) {
        super();
        this.docsRoot = path.resolve(docsRoot);
        // Coordinator root defaults to sibling of docs root if not provided
        this.coordinatorRoot = coordinatorRoot != null
            ? path.resolve(coordinatorRoot)
            : path.join(path.dirname(this.docsRoot), 'coordinator');
        this.options = { ...DEFAULT_OPTIONS, ...options };
        // Merge boost factors with defaults
        this.boostFactors = {
            search: options.boostFactors?.search ?? DEFAULT_OPTIONS.boostFactors?.search ?? 3.0,
            direct: options.boostFactors?.direct ?? DEFAULT_OPTIONS.boostFactors?.direct ?? 1.0,
            reference: options.boostFactors?.reference ?? DEFAULT_OPTIONS.boostFactors?.reference ?? 2.0
        };
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
    setupAddressingCacheIntegration() {
        // Listen to our own document change events and invalidate addressing cache
        this.on('document:changed', (docPath) => {
            try {
                invalidateAddressCache(docPath);
                logger.debug('Invalidated addressing cache for changed document', { path: docPath });
            }
            catch (error) {
                logger.error('CRITICAL: Failed to invalidate addressing cache - MANUAL INTERVENTION REQUIRED', {
                    path: docPath,
                    error,
                    remedy: 'Restart server or manually clear caches'
                });
                // Don't re-throw - log for monitoring but continue operation
                // Emit a separate critical error event for alerting
                this.emit('cache:inconsistency:critical', { docPath, error });
            }
        });
        this.on('document:deleted', (docPath) => {
            try {
                invalidateAddressCache(docPath);
                logger.debug('Invalidated addressing cache for deleted document', { path: docPath });
            }
            catch (error) {
                logger.error('CRITICAL: Failed to invalidate addressing cache - MANUAL INTERVENTION REQUIRED', {
                    path: docPath,
                    error,
                    remedy: 'Restart server or manually clear caches'
                });
                // Don't re-throw - log for monitoring but continue operation
                // Emit a separate critical error event for alerting
                this.emit('cache:inconsistency:critical', { docPath, error });
            }
        });
    }
    /**
     * Initialize file system watcher
     */
    initializeWatcher() {
        this.watcher = watch(this.docsRoot, {
            ignored: this.options.watchIgnorePatterns,
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 20
            }
        });
        // Critical: Handle watcher errors with recovery mechanism
        this.watcher.on('error', (error) => {
            this.watcherErrorCount++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('File watcher error - attempting recovery', {
                error: errorMessage,
                errorCount: this.watcherErrorCount,
                maxErrors: this.MAX_WATCHER_ERRORS,
                docsRoot: this.docsRoot
            });
            this.emit('watcher:error', error);
            // After MAX_WATCHER_ERRORS, switch to polling mode
            if (this.watcherErrorCount >= this.MAX_WATCHER_ERRORS) {
                logger.error('Maximum watcher errors reached - switching to polling mode', {
                    errorCount: this.watcherErrorCount
                });
                this.switchToPollingMode();
            }
            else {
                // Attempt to reinitialize with exponential backoff
                this.reinitializeWatcher();
            }
        });
        this.watcher.on('change', (filePath) => {
            try {
                const relativePath = this.getRelativePath(filePath);
                this.invalidateDocument(relativePath);
                this.emit('document:changed', relativePath);
                logger.debug('Document changed', { path: relativePath });
            }
            catch (error) {
                logger.error('Error handling file change', { filePath, error });
            }
        });
        this.watcher.on('unlink', (filePath) => {
            try {
                const relativePath = this.getRelativePath(filePath);
                this.invalidateDocument(relativePath);
                this.emit('document:deleted', relativePath);
                logger.debug('Document deleted', { path: relativePath });
            }
            catch (error) {
                logger.error('Error handling file deletion', { filePath, error });
            }
        });
        logger.info('File watcher initialized', { docsRoot: this.docsRoot });
    }
    /**
     * Reinitialize file watcher with exponential backoff after error
     */
    reinitializeWatcher() {
        if (this.watcher != null) {
            this.watcher.close().catch((error) => {
                logger.warn('Error closing watcher during reinitialize', { error });
            });
            this.watcher = undefined;
        }
        const backoffDelay = 5000 * this.watcherErrorCount;
        logger.info('Scheduling watcher reinitialize with backoff', {
            errorCount: this.watcherErrorCount,
            delayMs: backoffDelay
        });
        setTimeout(() => {
            logger.info('Attempting to reinitialize file watcher');
            this.initializeWatcher();
        }, backoffDelay);
    }
    /**
     * Switch to polling mode after repeated watcher failures
     *
     * Implements fallback polling mechanism that validates cache consistency
     * every 30 seconds by checking file modification times. This ensures the
     * cache stays synchronized even when the file watcher is unavailable.
     */
    switchToPollingMode() {
        if (this.watcher != null) {
            this.watcher.close().catch((error) => {
                logger.warn('Error closing watcher during switch to polling', { error });
            });
            this.watcher = undefined;
        }
        logger.warn('Switching to polling mode after repeated watcher failures', {
            errorCount: this.watcherErrorCount,
            pollingInterval: 30000
        });
        this.pollingInterval = setInterval(() => {
            this.validateCacheConsistency().catch((error) => {
                logger.error('Error during cache validation in polling mode', { error });
            });
        }, 30000);
        this.emit('watcher:polling-mode');
    }
    /**
     * Validate cache consistency by checking file modification times
     *
     * Used in polling mode to detect file changes when the watcher is unavailable.
     * Compares cached modification times with current file stats and invalidates
     * stale entries.
     */
    async validateCacheConsistency() {
        const cachedPaths = Array.from(this.cache.keys());
        for (const docPath of cachedPaths) {
            try {
                const absolutePath = this.getAbsolutePath(docPath);
                const stats = await fs.stat(absolutePath);
                const cached = this.cache.get(docPath);
                if (cached != null) {
                    const cachedMtime = cached.metadata.lastModified.getTime();
                    const currentMtime = stats.mtimeMs;
                    if (currentMtime !== cachedMtime) {
                        logger.debug('Detected stale document in polling mode', {
                            path: docPath,
                            cachedMtime: new Date(cachedMtime).toISOString(),
                            currentMtime: new Date(currentMtime).toISOString()
                        });
                        this.invalidateDocument(docPath);
                        this.emit('document:changed', docPath);
                    }
                }
            }
            catch (error) {
                if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                    // File was deleted
                    logger.debug('Detected deleted document in polling mode', { path: docPath });
                    this.invalidateDocument(docPath);
                    this.emit('document:deleted', docPath);
                }
                else {
                    logger.warn('Error validating document in polling mode', {
                        path: docPath,
                        error
                    });
                }
            }
        }
    }
    /**
     * Convert absolute path to relative document path
     */
    getRelativePath(filePath) {
        const relative = path.relative(this.docsRoot, filePath);
        return relative.startsWith('/') ? relative : `/${relative}`;
    }
    /**
     * Get absolute file path from document path
     */
    getAbsolutePath(docPath) {
        const relativePath = docPath.startsWith('/') ? docPath.slice(1) : docPath;
        // Check if this is a coordinator path
        if (relativePath.startsWith('coordinator/') || relativePath === 'coordinator') {
            // Use coordinator root and remove the 'coordinator/' prefix
            const coordPath = relativePath === 'coordinator'
                ? ''
                : relativePath.slice('coordinator/'.length);
            return path.join(this.coordinatorRoot, coordPath);
        }
        // Default to docs root
        return path.join(this.docsRoot, relativePath);
    }
    /**
     * Calculate content hash for cache validation
     */
    calculateHash(content) {
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
    extractKeywordsForFingerprint(title, content) {
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
            // Filter out stop words and non-meaningful content
            const keywords = words.filter(word => {
                // Remove stop words using module-level constant
                if (STOP_WORDS.has(word)) {
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
        }
        catch (error) {
            logger.warn('Keyword extraction failed during fingerprinting', { error });
            return [];
        }
    }
    /**
     * Extract metadata from markdown content
     */
    extractMetadata(content, filePath, stats) {
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
            cacheGeneration: 0, // No longer used, kept for backward compatibility
            namespace,
            keywords,
            fingerprintGenerated
        };
    }
    /**
     * Build slug index for fast section lookups
     */
    buildSlugIndex(headings) {
        const index = new Map();
        headings.forEach((heading, index_) => {
            index.set(heading.slug, index_);
        });
        return index;
    }
    /**
     * Enforce cache size limits with boost-aware LRU/MRU eviction
     *
     * Uses access metadata to calculate eviction scores that incorporate
     * both access time and boost factors. Documents with higher boost factors
     * (e.g., search-accessed) are less likely to be evicted.
     */
    enforceCacheSize() {
        if (this.cache.size <= this.options.maxCacheSize) {
            return;
        }
        const entriesToRemove = this.cache.size - this.options.maxCacheSize;
        // Calculate eviction scores (lower score = evict first)
        // Use normalized scoring to prevent integer overflow
        const scoredPaths = Array.from(this.accessMetadata.entries())
            .map(([path, metadata]) => {
            // Normalize timestamp to prevent overflow when multiplying by boost factor
            const normalizedTimestamp = metadata.timestamp / this.accessCounter;
            const score = this.options.evictionPolicy === 'lru'
                ? normalizedTimestamp * metadata.boostFactor // Boost search-accessed docs
                : -normalizedTimestamp * metadata.boostFactor; // MRU with boost
            return { path, score };
        })
            .sort((a, b) => a.score - b.score) // Lowest score first
            .slice(0, entriesToRemove)
            .map(entry => entry.path);
        for (const docPath of scoredPaths) {
            // Get document before deletion to track heading count
            const doc = this.cache.get(docPath);
            this.cache.delete(docPath);
            this.accessOrder.delete(docPath);
            this.accessMetadata.delete(docPath);
            // Decrement total heading count for evicted document
            if (doc != null) {
                this.totalHeadingsLoaded -= doc.headings.length;
                logger.debug('Evicted document from cache', {
                    path: docPath,
                    headingsRemoved: doc.headings.length,
                    totalHeadingsRemaining: this.totalHeadingsLoaded
                });
            }
            else {
                logger.debug('Evicted document from cache', {
                    path: docPath
                });
            }
        }
    }
    /**
     * Update access tracking for cache policies with context-aware boost
     *
     * @param docPath - Document path
     * @param context - Access context (search, direct, reference)
     */
    updateAccess(docPath, context = AccessContext.DIRECT) {
        this.accessCounter++;
        this.accessOrder.set(docPath, this.accessCounter);
        // Track access metadata with boost factor
        this.accessMetadata.set(docPath, {
            timestamp: this.accessCounter,
            context,
            boostFactor: this.boostFactors[context]
        });
    }
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
    async getDocument(docPath, context = AccessContext.DIRECT) {
        // Check cache first
        const cached = this.cache.get(docPath);
        if (cached) {
            this.updateAccess(docPath, context);
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
            // Check global heading limit to prevent DoS via heading accumulation
            const newTotal = this.totalHeadingsLoaded + headings.length;
            if (newTotal > DEFAULT_LIMITS.MAX_TOTAL_HEADINGS) {
                logger.error('Global heading limit exceeded', {
                    currentTotal: this.totalHeadingsLoaded,
                    newDocument: headings.length,
                    maxTotal: DEFAULT_LIMITS.MAX_TOTAL_HEADINGS,
                    docPath
                });
                throw createError('Global heading limit exceeded. Clear cache or increase limit.', ERROR_CODES.RESOURCE_EXHAUSTED, {
                    currentTotal: this.totalHeadingsLoaded,
                    newDocument: headings.length,
                    maxTotal: DEFAULT_LIMITS.MAX_TOTAL_HEADINGS
                });
            }
            // Update total heading count
            this.totalHeadingsLoaded = newTotal;
            const toc = buildToc(content);
            const slugIndex = this.buildSlugIndex(headings);
            const metadata = this.extractMetadata(content, absolutePath, stats);
            // Create cached document
            const document = {
                metadata,
                headings,
                toc,
                slugIndex
            };
            // Add to cache
            this.cache.set(docPath, document);
            this.updateAccess(docPath, context);
            this.enforceCacheSize();
            logger.debug('Loaded document into cache', {
                path: docPath,
                context,
                headings: headings.length,
                size: this.cache.size
            });
            return document;
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                return null; // File not found
            }
            throw error;
        }
    }
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
    async getSectionContent(docPath, slug) {
        const document = await this.getDocument(docPath);
        if (!document) {
            return null;
        }
        // OPTIMIZATION: Fast validation using slugIndex (O(1))
        // Skip validation for hierarchical paths as they need special handling
        if (!slug.includes('/')) {
            const headingIndex = document.slugIndex.get(slug);
            if (headingIndex === undefined) {
                logger.debug('Section not found (invalid slug)', { docPath, slug });
                return null; // Invalid slug - fail fast
            }
        }
        // Parse section content from full document (no caching needed)
        // readSection handles both flat and hierarchical slugs
        try {
            const absolutePath = this.getAbsolutePath(docPath);
            const content = await fs.readFile(absolutePath, 'utf8');
            const { readSection } = await import('./sections.js');
            const sectionContent = readSection(content, slug);
            if (sectionContent == null) {
                logger.debug('Section content not found', { docPath, slug });
                return null;
            }
            logger.debug('Section content loaded', {
                docPath,
                slug,
                length: sectionContent.length
            });
            return sectionContent;
        }
        catch (error) {
            logger.error('Failed to read section content', {
                docPath,
                slug,
                error
            });
            return null;
        }
    }
    /**
     * Invalidate a document in the cache
     */
    invalidateDocument(docPath) {
        // Get the cached document to track heading count before deletion
        const cachedDoc = this.cache.get(docPath);
        const existed = this.cache.delete(docPath);
        this.accessOrder.delete(docPath);
        this.accessMetadata.delete(docPath);
        if (existed) {
            // Decrement total heading count when removing a document
            if (cachedDoc != null) {
                this.totalHeadingsLoaded -= cachedDoc.headings.length;
                logger.debug('Invalidated cached document', {
                    path: docPath,
                    headingsRemoved: cachedDoc.headings.length,
                    totalHeadingsRemaining: this.totalHeadingsLoaded
                });
            }
            else {
                logger.debug('Invalidated cached document', { path: docPath });
            }
            // Also invalidate addressing cache for consistency
            try {
                invalidateAddressCache(docPath);
                logger.debug('Invalidated addressing cache for manually invalidated document', { path: docPath });
            }
            catch (error) {
                logger.error('CRITICAL: Failed to invalidate addressing cache - MANUAL INTERVENTION REQUIRED', {
                    path: docPath,
                    error,
                    remedy: 'Restart server or manually clear caches'
                });
                // Don't re-throw - log for monitoring but continue operation
                // Emit a separate critical error event for alerting
                this.emit('cache:inconsistency:critical', { docPath, error });
            }
        }
        return existed;
    }
    /**
     * Get all cached document paths
     */
    getCachedPaths() {
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
    getCachedDocumentPaths() {
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
    invalidateDocumentsByPrefix(prefix) {
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
     * Get cache statistics including boost information
     */
    getStats() {
        const documents = Array.from(this.cache.values());
        const accessTimes = documents.map(doc => doc.metadata.lastAccessed);
        // Count documents by access context
        const contextCounts = {
            search: 0,
            reference: 0,
            direct: 0
        };
        for (const metadata of this.accessMetadata.values()) {
            contextCounts[metadata.context]++;
        }
        return {
            size: this.cache.size,
            maxSize: this.options.maxCacheSize,
            hitRate: 0, // Would need request tracking to calculate
            oldestAccess: accessTimes.length > 0 ? new Date(Math.min(...accessTimes.map(d => d.getTime()))) : null,
            newestAccess: accessTimes.length > 0 ? new Date(Math.max(...accessTimes.map(d => d.getTime()))) : null,
            boostedDocuments: contextCounts
        };
    }
    /**
     * Clear all cached documents
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.accessOrder.clear();
        this.accessMetadata.clear();
        this.accessCounter = 0;
        this.totalHeadingsLoaded = 0;
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
    createFingerprintEntry(metadata) {
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
    async isFingerprintStale(docPath) {
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
        }
        catch (error) {
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
    async readDocumentContent(docPath) {
        try {
            const absolutePath = this.getAbsolutePath(docPath);
            const content = await fs.readFile(absolutePath, 'utf8');
            logger.debug('Read full document content', {
                path: docPath,
                length: content.length
            });
            return content;
        }
        catch (error) {
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
    async destroy() {
        if (this.watcher != null) {
            await this.watcher.close();
            this.watcher = undefined;
            logger.debug('File watcher closed');
        }
        if (this.pollingInterval != null) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = undefined;
            logger.debug('Polling interval cleared');
        }
        // Invalidate all addressing cache entries for cached documents
        let documentsInvalidated = 0;
        for (const docPath of this.getCachedPaths()) {
            try {
                invalidateAddressCache(docPath);
                documentsInvalidated++;
            }
            catch (error) {
                logger.warn('Failed to invalidate address cache during destroy', {
                    path: docPath,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        this.clear();
        this.removeAllListeners();
        logger.info('DocumentCache destroyed', { documentsInvalidated });
    }
}
/**
 * Global cache instance (singleton pattern)
 * @deprecated Use dependency injection with DocumentCache constructor instead
 */
let globalCache;
/**
 * Initialize global document cache
 * @deprecated Use dependency injection with DocumentCache constructor instead
 */
export function initializeGlobalCache(docsRoot, options) {
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
export function getGlobalCache() {
    if (!globalCache) {
        throw new Error('Global document cache not initialized. Call initializeGlobalCache() first.');
    }
    return globalCache;
}
/**
 * Factory function for creating DocumentCache instances with explicit configuration
 * This is the recommended approach for new code instead of global singletons
 */
export function createDocumentCache(docsRoot, options, coordinatorRoot) {
    return new DocumentCache(docsRoot, options, coordinatorRoot);
}
//# sourceMappingURL=document-cache.js.map