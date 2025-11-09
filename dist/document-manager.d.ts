/**
 * Document management operations using cache system
 */
import type { DocumentCache } from './document-cache.js';
import type { FingerprintIndex } from './fingerprint-index.js';
import { VirtualPathResolver } from './utils/virtual-path-resolver.js';
import type { InsertMode } from './types/index.js';
import type { CachedDocument, FingerprintEntry } from './document-cache.js';
interface CreateDocumentOptions {
    title: string;
    template?: string;
    features?: {
        toc?: boolean;
        anchors?: boolean;
        codeHighlight?: boolean;
        mermaid?: boolean;
        searchIndex?: boolean;
    };
}
interface UpdateSectionOptions {
    preserveAnchors?: boolean;
    updateToc?: boolean;
    validateLinks?: boolean;
}
interface SearchOptions {
    searchIn?: ('title' | 'headings' | 'content' | 'code')[];
    fuzzy?: boolean;
    boost?: {
        title?: number;
        headings?: number;
        code?: number;
    };
    highlight?: boolean;
    groupByDocument?: boolean;
}
interface SearchResult {
    documentPath: string;
    documentTitle: string;
    matches: Array<{
        type: 'title' | 'heading' | 'content' | 'code';
        slug?: string;
        snippet: string;
        score: number;
    }>;
}
/**
 * Document management facade using cache system
 */
export declare class DocumentManager {
    private readonly docsRoot;
    private readonly coordinatorRoot;
    private readonly archivedRoot;
    readonly cache: DocumentCache;
    private readonly pathHandler;
    readonly pathResolver: VirtualPathResolver;
    private readonly fingerprintIndex;
    private readonly pendingTocUpdates;
    constructor(docsRoot: string, cache: DocumentCache, fingerprintIndex?: FingerprintIndex, archivedBasePath?: string, coordinatorRoot?: string);
    /**
     * Generate table of contents markdown
     */
    private generateTocMarkdown;
    /**
     * Load template content with fallback to default content
     *
     * Attempts to load template from ../templates/${template}.md.
     * Returns default content on any error (file not found, permissions, etc).
     *
     * @param template - Template name (without .md extension)
     * @param title - Document title for default content and template variable replacement
     * @returns Promise resolving to template content or default content
     */
    private loadTemplateWithFallback;
    /**
     * Check if a file exists at the given absolute path
     *
     * @param absolutePath - Absolute filesystem path to check
     * @returns Promise resolving to true if file exists, false otherwise
     */
    private fileExists;
    /**
     * Schedule a table of contents update with debouncing
     *
     * Cancels any pending TOC update for the same document and schedules a new one
     * with configurable debounce delay. This prevents race conditions from multiple rapid updates.
     *
     * @param docPath - Relative path to the document
     */
    private scheduleTocUpdate;
    /**
     * Creates a new markdown document with specified content and metadata
     *
     * Validates document path, ensures parent directories exist, and builds initial content
     * from template or provided data. Automatically generates table of contents if requested.
     *
     * @param docPath - Relative path for the new document (e.g., "api/new-feature.md")
     * @param options - Configuration for document creation including title, content, and template
     * @returns Promise that resolves when document is successfully created
     *
     * @example
     * await manager.createDocument("api/authentication.md", {
     *   title: "Authentication Guide",
     *   content: "Initial content here",
     *   generateToc: true
     * });
     *
     * @throws {Error} When document already exists at the specified path
     * @throws {Error} When filesystem operations fail (permissions, disk space, etc.)
     */
    createDocument(docPath: string, options: CreateDocumentOptions): Promise<void>;
    /**
     * Update table of contents in document
     */
    updateTableOfContents(docPath: string): Promise<void>;
    /**
     * Update a document section
     */
    updateSection(docPath: string, slug: string, newContent: string, options?: UpdateSectionOptions): Promise<void>;
    /**
     * Rename a heading
     */
    renameSection(docPath: string, slug: string, newTitle: string, options?: UpdateSectionOptions): Promise<void>;
    /**
     * Delete a section
     */
    deleteSection(docPath: string, slug: string, options?: UpdateSectionOptions): Promise<void>;
    /**
     * Archives a document or folder by moving it to the archived directory with audit trail
     *
     * Creates timestamped archive directory, moves the document/folder, and generates
     * an audit file with metadata about the archival operation.
     *
     * @param userPath - Path to document or folder to archive (relative to docs root)
     * @returns Archive operation result with original path, archive path, and folder status
     *
     * @example
     * const result = await manager.archiveDocument("api/old-feature.md");
     * console.log(`Archived to: ${result.archivePath}`);
     * console.log(`Was folder: ${result.wasFolder}`);
     *
     * @throws {Error} When source path doesn't exist or archive operation fails
     * @throws {Error} When filesystem operations fail (permissions, disk space, etc.)
     */
    archiveDocument(userPath: string): Promise<{
        originalPath: string;
        archivePath: string;
        wasFolder: boolean;
    }>;
    /**
     * Insert section at specific location
     */
    insertSection(docPath: string, referenceSlug: string, insertMode: InsertMode, depth: number | undefined, title: string, content: string, options?: UpdateSectionOptions): Promise<void>;
    /**
     * Move section to different location (implementation needed)
     */
    moveSection(docPath: string, sectionSlug: string, targetSlug: string, position: string): Promise<void>;
    /**
     * List all documents
     */
    listDocuments(): Promise<{
        documents: Array<{
            path: string;
            title: string;
            lastModified: Date;
            headingCount: number;
            wordCount: number;
        }>;
        errors?: Array<{
            path: string;
            error: string;
        }>;
    }>;
    /**
     * List document fingerprints for efficient discovery operations
     *
     * Returns lightweight fingerprint data for all documents without triggering
     * full document parsing. Uses cached fingerprints when available and fresh.
     *
     * @param options - Configuration options
     * @returns Promise resolving to array of valid fingerprint entries
     *
     * @example
     * // Get all document fingerprints
     * const fingerprints = await manager.listDocumentFingerprints();
     * console.log(`Found ${fingerprints.length} documents with fingerprints`);
     *
     * @example
     * // Get fingerprints for specific namespace with stale refresh
     * const apiFingerprints = await manager.listDocumentFingerprints({
     *   namespace: 'api',
     *   refreshStale: true
     * });
     *
     * @example
     * // Use for efficient discovery without full parsing
     * const fingerprints = await manager.listDocumentFingerprints();
     * const relevantDocs = fingerprints.filter(fp =>
     *   fp.keywords.some(keyword => targetKeywords.includes(keyword))
     * );
     */
    listDocumentFingerprints(options?: {
        /** Whether to refresh stale fingerprints (default: false) */
        refreshStale?: boolean;
        /** Optional namespace filter to limit results */
        namespace?: string;
    }): Promise<FingerprintEntry[]>;
    /**
     * Search documents
     */
    searchDocuments(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Get document by path
     */
    getDocument(docPath: string): Promise<CachedDocument | null>;
    /**
     * Get section content
     */
    getSectionContent(docPath: string, slug: string): Promise<string | null>;
    /**
     * Get complete document content
     *
     * Retrieves the full content of a document from the filesystem.
     * This method provides direct access to the entire document content
     * without going through the section-based cache system, making it
     * ideal for operations that need the complete document like relevance
     * analysis and keyword extraction.
     *
     * @param docPath - Relative path to the document (e.g., "api/auth.md")
     * @returns Promise resolving to full document content or null if file doesn't exist
     *
     * @example
     * const content = await manager.getDocumentContent("api/authentication.md");
     * if (content) {
     *   const keywords = extractKeywords(content);
     *   console.log(`Found keywords: ${keywords.join(', ')}`);
     * }
     *
     * @throws {Error} When file access fails due to permissions or other filesystem errors
     */
    getDocumentContent(docPath: string): Promise<string | null>;
    /**
     * Destroy the document manager and clean up resources
     * Cancels all pending TOC updates and destroys the cache
     */
    destroy(): Promise<void>;
    /**
     * Convert document path to absolute filesystem path
     */
    private getAbsolutePath;
}
export {};
//# sourceMappingURL=document-manager.d.ts.map