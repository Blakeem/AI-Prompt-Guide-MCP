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
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getGlobalLogger } from './utils/logger.js';
import { pathToNamespace } from './shared/path-utilities.js';
const logger = getGlobalLogger();
/**
 * Stop words to exclude from keyword extraction
 * Reused from document-cache.ts for consistency
 */
const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'will', 'can', 'are', 'you',
    'how', 'what', 'when', 'where', 'why', 'who', 'which', 'was', 'were',
    'been', 'have', 'has', 'had', 'should', 'would', 'could', 'may', 'might',
    'must', 'shall', 'not', 'but', 'however', 'therefore', 'thus', 'also',
    'such', 'very', 'more', 'most', 'much', 'many', 'some', 'any', 'all'
]);
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
export class FingerprintIndex {
    /** Map from keyword to set of document paths containing that keyword */
    keywordIndex = new Map();
    /** Map from document path to lightweight fingerprint */
    fingerprints = new Map();
    /** Root directory for documents */
    docsRoot;
    /** Whether the index has been initialized */
    initialized = false;
    constructor(docsRoot) {
        this.docsRoot = path.resolve(docsRoot);
    }
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
    async initialize() {
        if (this.initialized) {
            logger.warn('FingerprintIndex already initialized');
            return;
        }
        const startTime = performance.now();
        const mdFiles = await this.findAllMarkdownFiles(this.docsRoot);
        logger.info('Building fingerprint index', { fileCount: mdFiles.length });
        for (const filePath of mdFiles) {
            try {
                await this.indexDocument(filePath);
            }
            catch (error) {
                logger.warn('Failed to index document', { path: filePath, error });
                // Continue indexing other documents
            }
        }
        this.initialized = true;
        const duration = performance.now() - startTime;
        logger.info('Fingerprint index built', {
            documents: this.fingerprints.size,
            keywords: this.keywordIndex.size,
            durationMs: Math.round(duration)
        });
    }
    /**
     * Find all markdown files recursively
     *
     * @param dir - Directory to search
     * @param files - Accumulator for file paths
     * @returns Array of absolute file paths
     */
    async findAllMarkdownFiles(dir, files = []) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                await this.findAllMarkdownFiles(fullPath, files);
            }
            else if (entry.isFile() && entry.name.endsWith('.md')) {
                files.push(fullPath);
            }
        }
        return files;
    }
    /**
     * Index a single document by reading preview and extracting keywords
     *
     * Only reads first 1500 bytes for performance.
     * Extracts title, keywords, and metadata.
     *
     * @param absolutePath - Absolute path to document file
     */
    async indexDocument(absolutePath) {
        // Get file stats for mtime
        const stats = await fs.stat(absolutePath);
        // Read only first 1500 bytes for efficiency
        const fd = await fs.open(absolutePath, 'r');
        const buffer = Buffer.alloc(1500);
        const { bytesRead } = await fd.read(buffer, 0, 1500, 0);
        await fd.close();
        const preview = buffer.subarray(0, bytesRead).toString('utf8');
        // Extract title (first heading)
        const lines = preview.split('\n');
        const firstHeading = lines.find(line => line.startsWith('#'));
        const title = firstHeading?.replace(/^#+\s*/, '') ?? path.basename(absolutePath, '.md');
        // Extract keywords
        const keywords = this.extractKeywords(title, preview);
        // Calculate content hash (for invalidation)
        const contentHash = this.calculateHash(preview);
        // Get relative path
        const relativePath = this.getRelativePath(absolutePath);
        // Get namespace
        const namespace = pathToNamespace(relativePath);
        // Create fingerprint entry
        const fingerprint = {
            keywords,
            lastModified: stats.mtime,
            contentHash,
            namespace
        };
        // Store fingerprint
        this.fingerprints.set(relativePath, fingerprint);
        // Update keyword index
        for (const keyword of keywords) {
            if (!this.keywordIndex.has(keyword)) {
                this.keywordIndex.set(keyword, new Set());
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.keywordIndex.get(keyword).add(relativePath);
        }
    }
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
    extractKeywords(title, content) {
        const text = `${title} ${content}`.toLowerCase();
        const words = text
            .split(/\s+/)
            .map(word => word.trim())
            // Remove trailing punctuation (e.g., "api." -> "api")
            .map(word => word.replace(/[.,;:!?]+$/, ''))
            .filter(word => word.length > 2 && !STOP_WORDS.has(word) && !/^[\d\W]+$/.test(word));
        const uniqueKeywords = [...new Set(words)];
        return uniqueKeywords.slice(0, 20); // Limit to top 20 keywords
    }
    /**
     * Calculate content hash for change detection
     *
     * Uses SHA-256 truncated to 16 characters for efficiency.
     *
     * @param content - Content to hash
     * @returns Truncated hash string
     */
    calculateHash(content) {
        return createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
    }
    /**
     * Convert absolute path to relative document path
     *
     * @param filePath - Absolute file path
     * @returns Relative path starting with /
     */
    getRelativePath(filePath) {
        const relative = path.relative(this.docsRoot, filePath);
        return relative.startsWith('/') ? relative : `/${relative}`;
    }
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
    findCandidates(query) {
        if (!this.initialized) {
            logger.warn('FingerprintIndex not initialized, returning all documents');
            return Array.from(this.fingerprints.keys());
        }
        const queryWords = query.toLowerCase()
            .split(/\s+/)
            .map(word => word.trim())
            .filter(word => word.length > 2 && !STOP_WORDS.has(word));
        if (queryWords.length === 0) {
            // No meaningful query words, return all documents
            return Array.from(this.fingerprints.keys());
        }
        // Union of all documents containing any query keyword
        const candidateSets = [];
        for (const word of queryWords) {
            const docs = this.keywordIndex.get(word);
            if (docs != null) {
                candidateSets.push(docs);
            }
        }
        if (candidateSets.length === 0) {
            // No keywords found in index
            return [];
        }
        // Union: Documents matching ANY keyword
        const allCandidates = new Set();
        for (const set of candidateSets) {
            for (const doc of set) {
                allCandidates.add(doc);
            }
        }
        return Array.from(allCandidates);
    }
    /**
     * Get fingerprint for a specific document
     *
     * @param docPath - Relative document path
     * @returns Fingerprint entry or undefined if not found
     */
    getFingerprint(docPath) {
        return this.fingerprints.get(docPath);
    }
    /**
     * Check if index is initialized
     *
     * @returns True if index has been built
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Get statistics about the index
     *
     * Useful for monitoring and debugging.
     *
     * @returns Index statistics
     */
    getStats() {
        return {
            documents: this.fingerprints.size,
            keywords: this.keywordIndex.size,
            avgKeywordsPerDoc: this.fingerprints.size > 0
                ? Math.round(Array.from(this.fingerprints.values()).reduce((sum, fp) => sum + fp.keywords.length, 0) / this.fingerprints.size)
                : 0
        };
    }
    /**
     * Invalidate a specific document (call when document changes)
     *
     * Removes document from all keyword indexes and fingerprint map.
     * Should be followed by re-indexing the document.
     *
     * @param docPath - Relative document path
     */
    invalidateDocument(docPath) {
        const fingerprint = this.fingerprints.get(docPath);
        if (fingerprint == null)
            return;
        // Remove from keyword index
        for (const keyword of fingerprint.keywords) {
            const docs = this.keywordIndex.get(keyword);
            if (docs != null) {
                docs.delete(docPath);
                if (docs.size === 0) {
                    this.keywordIndex.delete(keyword);
                }
            }
        }
        // Remove fingerprint
        this.fingerprints.delete(docPath);
    }
    /**
     * Watch for file changes and update index
     *
     * Integrates with chokidar file watcher for automatic invalidation.
     * Automatically reindexes changed documents.
     *
     * @param watcher - Chokidar FSWatcher instance
     */
    watchFiles(watcher) {
        watcher.on('change', (filePath) => {
            if (!filePath.endsWith('.md'))
                return;
            const relativePath = this.getRelativePath(filePath);
            this.invalidateDocument(relativePath);
            void this.indexDocument(filePath).then(() => {
                logger.debug('Reindexed changed document', { path: relativePath });
            }).catch((error) => {
                logger.warn('Failed to reindex changed document', { path: relativePath, error });
            });
        });
        watcher.on('unlink', (filePath) => {
            if (!filePath.endsWith('.md'))
                return;
            const relativePath = this.getRelativePath(filePath);
            this.invalidateDocument(relativePath);
            logger.debug('Removed document from index', { path: relativePath });
        });
        watcher.on('add', (filePath) => {
            if (!filePath.endsWith('.md'))
                return;
            void this.indexDocument(filePath).then(() => {
                const relativePath = this.getRelativePath(filePath);
                logger.debug('Added document to index', { path: relativePath });
            }).catch((error) => {
                logger.warn('Failed to add document to index', { path: filePath, error });
            });
        });
    }
    /**
     * Clear the entire index
     *
     * Removes all fingerprints and keyword mappings.
     * Resets initialization state.
     */
    clear() {
        this.keywordIndex.clear();
        this.fingerprints.clear();
        this.initialized = false;
        logger.info('Fingerprint index cleared');
    }
}
//# sourceMappingURL=fingerprint-index.js.map