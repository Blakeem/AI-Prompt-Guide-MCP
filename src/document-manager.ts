/**
 * Document management operations using cache system
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { DocumentCache } from './document-cache.js';
import { AccessContext } from './document-cache.js';
import type { FingerprintIndex } from './fingerprint-index.js';
import { replaceSectionBody, insertRelative, renameHeading, deleteSection } from './sections.js';
import { listHeadings, buildToc } from './parse.js';
import { ensureDirectoryExists, writeFileIfUnchanged, readFileSnapshot } from './fsio.js';
import { getGlobalLogger } from './utils/logger.js';
import { PathHandler } from './utils/path-handler.js';
import { VirtualPathResolver } from './utils/virtual-path-resolver.js';
import type { TocNode, InsertMode } from './types/index.js';
import { validateHeadingDepth } from './shared/validation-utils.js';
import type { CachedDocument, FingerprintEntry } from './document-cache.js';

const logger = getGlobalLogger();

/**
 * Debounce delay in milliseconds for TOC updates.
 * Prevents race conditions from multiple rapid document updates.
 */
const TOC_UPDATE_DEBOUNCE_MS = 100;

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
export class DocumentManager {
  private readonly docsRoot: string;
  private readonly coordinatorRoot: string;
  private readonly archivedRoot: string;
  public readonly cache: DocumentCache;
  private readonly pathHandler: PathHandler;
  public readonly pathResolver: VirtualPathResolver;
  private readonly fingerprintIndex: FingerprintIndex | undefined;
  private readonly pendingTocUpdates = new Map<string, NodeJS.Timeout>();

  constructor(docsRoot: string, cache: DocumentCache, fingerprintIndex?: FingerprintIndex, archivedBasePath?: string, coordinatorRoot?: string) {
    this.docsRoot = path.resolve(docsRoot);
    // Coordinator root defaults to sibling of docs root if not provided
    this.coordinatorRoot = coordinatorRoot != null
      ? path.resolve(coordinatorRoot)
      : path.join(path.dirname(this.docsRoot), 'coordinator');
    // Archived root defaults to sibling of docs root if not provided
    this.archivedRoot = archivedBasePath != null
      ? path.resolve(archivedBasePath)
      : path.join(path.dirname(this.docsRoot), 'archived');
    this.cache = cache;
    this.pathHandler = new PathHandler(this.docsRoot, archivedBasePath);
    // Initialize virtual path resolver for centralized path routing
    this.pathResolver = new VirtualPathResolver(this.docsRoot, this.coordinatorRoot, this.archivedRoot);
    this.fingerprintIndex = fingerprintIndex;
  }

  /**
   * Generate table of contents markdown
   */
  private generateTocMarkdown(toc: readonly TocNode[], level = 0): string {
    const lines: string[] = [];
    const indent = '  '.repeat(level);

    for (const node of toc) {
      lines.push(`${indent}- [${node.title}](#${node.slug})`);
      if (node.children.length > 0) {
        lines.push(this.generateTocMarkdown(node.children, level + 1));
      }
    }

    return lines.join('\n');
  }

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
  private async loadTemplateWithFallback(template: string, title: string): Promise<string> {
    const defaultContent = `# ${title}\n\n`;

    if (template === '') {
      return defaultContent;
    }

    try {
      const templatePath = path.join(this.docsRoot, '../templates', `${template}.md`);
      const content = await fs.readFile(templatePath, 'utf8');
      // Replace template variables
      return content.replace(/\{\{title\}\}/g, title);
    } catch (error) {
      logger.warn('Template load failed, using default content', {
        template,
        severity: 'OPTIONAL',
        error
      });
      return defaultContent;
    }
  }

  /**
   * Check if a file exists at the given absolute path
   *
   * @param absolutePath - Absolute filesystem path to check
   * @returns Promise resolving to true if file exists, false otherwise
   */
  private async fileExists(absolutePath: string): Promise<boolean> {
    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Schedule a table of contents update with debouncing
   *
   * Cancels any pending TOC update for the same document and schedules a new one
   * with configurable debounce delay. This prevents race conditions from multiple rapid updates.
   *
   * @param docPath - Relative path to the document
   */
  private scheduleTocUpdate(docPath: string): void {
    // Cancel any pending update for this document
    const existingTimeout = this.pendingTocUpdates.get(docPath);
    if (existingTimeout != null) {
      clearTimeout(existingTimeout);
    }

    // Schedule new update with debounce
    const timeoutId = setTimeout(() => {
      this.pendingTocUpdates.delete(docPath);
      void this.updateTableOfContents(docPath);
    }, TOC_UPDATE_DEBOUNCE_MS);

    // Store timeout ID
    this.pendingTocUpdates.set(docPath, timeoutId);
  }

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
  async createDocument(docPath: string, options: CreateDocumentOptions): Promise<void> {
    const absolutePath = this.getAbsolutePath(docPath);
    
    // Ensure directory exists
    await ensureDirectoryExists(path.dirname(absolutePath));

    // Check if file already exists
    try {
      await fs.access(absolutePath);
      throw new Error(`Document already exists: ${docPath}`);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, continue
    }

    // Build initial content
    let content = await this.loadTemplateWithFallback(
      options.template ?? '',
      options.title
    );

    // Add table of contents if requested
    if (options.features?.toc === true) {
      const tocPlaceholder = '## Table of Contents\n\n<!-- TOC will be generated here -->\n\n';
      
      // Use our markdown parsing tools to find the right insertion point
      const headings = listHeadings(content);
      if (headings.length > 0) {
        // Insert TOC after the first heading (title) using our section tools
        const firstHeading = headings[0];
        if (firstHeading != null) {
          content = insertRelative(content, firstHeading.slug, 'insert_after', 2, 'Table of Contents', '<!-- TOC will be generated here -->');
        } else {
          content = `${content}\n\n${tocPlaceholder}`;
        }
      } else {
        // If no headings found, just append at the end
        content = `${content}\n\n${tocPlaceholder}`;
      }
    }

    // Write file
    await fs.writeFile(absolutePath, content, 'utf8');

    // Generate TOC if requested and content has headings beyond title
    if (options.features?.toc === true) {
      await this.updateTableOfContents(docPath);
    }

    logger.info('Created document', { 
      path: docPath, 
      title: options.title,
      features: options.features 
    });
  }

  /**
   * Update table of contents in document
   */
  async updateTableOfContents(docPath: string): Promise<void> {
    const document = await this.cache.getDocument(docPath);
    if (!document) {
      throw new Error(`Document not found: ${docPath}`);
    }

    // Filter out the title heading and TOC heading itself
    const contentHeadings = document.headings.filter(h =>
      h.depth > 1 && h.slug !== 'table-of-contents'
    );

    if (contentHeadings.length === 0) {
      return; // No headings to create TOC for
    }

    // Build TOC from filtered headings using our buildToc tool
    const absolutePath = this.getAbsolutePath(docPath);
    const snapshot = await readFileSnapshot(absolutePath, { bypassValidation: true });

    // Parse the current content to get the complete TOC structure
    const currentToc = buildToc(snapshot.content);
    const filteredToc = currentToc.filter(node =>
      node.depth > 1 && node.slug !== 'table-of-contents'
    );

    const tocContent = this.generateTocMarkdown(filteredToc);

    // Update TOC section using our section tools
    try {
      const updated = replaceSectionBody(snapshot.content, 'table-of-contents', tocContent);
      await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated, { bypassValidation: true });

      logger.debug('Updated table of contents', { path: docPath });
    } catch (error) {
      logger.warn('Failed to update TOC', { path: docPath, error });
      // Don't throw - TOC update is not critical
    }
  }

  /**
   * Update a document section
   */
  async updateSection(
    docPath: string,
    slug: string,
    newContent: string,
    options: UpdateSectionOptions = {}
  ): Promise<void> {
    const absolutePath = this.getAbsolutePath(docPath);
    const snapshot = await readFileSnapshot(absolutePath, { bypassValidation: true });

    const updated = replaceSectionBody(snapshot.content, slug, newContent);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated, { bypassValidation: true });

    // Invalidate cache after write to ensure subsequent operations see fresh data
    this.cache.invalidateDocument(docPath);

    // Update TOC if requested
    if (options.updateToc === true) {
      this.scheduleTocUpdate(docPath);
    }

    logger.info('Updated document section', { path: docPath, slug });
  }


  /**
   * Rename a heading
   */
  async renameSection(
    docPath: string,
    slug: string,
    newTitle: string,
    options: UpdateSectionOptions = {}
  ): Promise<void> {
    const absolutePath = this.getAbsolutePath(docPath);
    const snapshot = await readFileSnapshot(absolutePath, { bypassValidation: true });

    const updated = renameHeading(snapshot.content, slug, newTitle);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated, { bypassValidation: true });

    // Invalidate cache after write to ensure subsequent operations see fresh data
    this.cache.invalidateDocument(docPath);

    // Update TOC if requested
    if (options.updateToc === true) {
      this.scheduleTocUpdate(docPath);
    }

    logger.info('Renamed document section', { path: docPath, slug, newTitle });
  }

  /**
   * Delete a section
   */
  async deleteSection(docPath: string, slug: string, options: UpdateSectionOptions = {}): Promise<void> {
    const absolutePath = this.getAbsolutePath(docPath);
    const snapshot = await readFileSnapshot(absolutePath, { bypassValidation: true });

    const updated = deleteSection(snapshot.content, slug);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated, { bypassValidation: true });

    // Invalidate cache after write to ensure subsequent operations see fresh data
    this.cache.invalidateDocument(docPath);

    // Update TOC if requested
    if (options.updateToc === true) {
      this.scheduleTocUpdate(docPath);
    }

    logger.info('Deleted document section', { path: docPath, slug });
  }

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
  async archiveDocument(userPath: string): Promise<{ originalPath: string; archivePath: string; wasFolder: boolean }> {
    // Normalize and validate the path
    const normalizedPath = this.pathHandler.processUserPath(userPath);
    // Use VirtualPathResolver to get correct absolute path (handles docs vs coordinator routing)
    const absolutePath = this.pathResolver.resolve(normalizedPath);

    // Check if source exists (use fs.access directly since we already have validated absolute path)
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`Path not found: ${normalizedPath}`);
    }

    // Determine if it's a folder or file
    const stats = await fs.stat(absolutePath);
    const isFolder = stats.isDirectory();

    // Use VirtualPathResolver to get archive path with proper namespace routing
    // This automatically handles docs vs coordinator paths correctly
    let archivePath = this.pathResolver.getArchivePath(normalizedPath);

    // Handle duplicates by appending counter if file already exists
    let counter = 1;
    const originalArchivePath = archivePath;
    while (await this.fileExists(archivePath)) {
      const ext = path.extname(originalArchivePath);
      const nameWithoutExt = originalArchivePath.slice(0, -ext.length);
      archivePath = `${nameWithoutExt}_${counter}${ext}`;
      counter++;
    }
    const uniqueArchivePath = archivePath;
    
    // Ensure archive directory structure exists
    await ensureDirectoryExists(path.dirname(uniqueArchivePath));
    
    // Move file/folder to archive
    await fs.rename(absolutePath, uniqueArchivePath);
    
    // Create audit trail file
    const auditPath = `${uniqueArchivePath}.audit`;
    const auditInfo = {
      originalPath: normalizedPath,
      archivedAt: new Date().toISOString(),
      archivedBy: 'MCP Document Manager',
      type: isFolder ? 'folder' : 'file',
      reason: 'User requested archive',
      note: 'Archived via MCP server'
    };
    await fs.writeFile(auditPath, JSON.stringify(auditInfo, null, 2), 'utf8');
    
    // Invalidate cache for the archived item
    this.cache.invalidateDocument(normalizedPath);

    // If it was a folder, invalidate all documents within it
    if (isFolder) {
      // Invalidate all cached documents that were in this folder
      const invalidatedCount = this.cache.invalidateDocumentsByPrefix(normalizedPath);

      logger.info('Archived folder', {
        originalPath: normalizedPath,
        archivePath: uniqueArchivePath,
        invalidatedDocuments: invalidatedCount
      });

      return {
        originalPath: normalizedPath,
        archivePath: uniqueArchivePath,
        wasFolder: true
      };
    } else {
      logger.info('Archived document', { originalPath: normalizedPath, archivePath: uniqueArchivePath });

      return {
        originalPath: normalizedPath,
        archivePath: uniqueArchivePath,
        wasFolder: false
      };
    }
  }

  /**
   * Insert section at specific location
   */
  async insertSection(
    docPath: string,
    referenceSlug: string,
    insertMode: InsertMode,
    depth: number | undefined,
    title: string,
    content: string,
    options: UpdateSectionOptions = {}
  ): Promise<void> {
    const absolutePath = this.getAbsolutePath(docPath);
    const snapshot = await readFileSnapshot(absolutePath, { bypassValidation: true });

    // Determine depth if not specified
    let calculatedDepth: number;
    if (depth != null) {
      calculatedDepth = depth;
    } else {
      // Auto-determine depth based on insertion mode
      const document = await this.cache.getDocument(docPath);
      if (!document) {
        throw new Error(`Document not found: ${docPath}`);
      }

      const refHeading = document.headings.find(h => h.slug === referenceSlug);
      if (!refHeading) {
        throw new Error(`Reference section not found: ${referenceSlug}`);
      }

      calculatedDepth = insertMode === 'append_child'
        ? refHeading.depth + 1
        : refHeading.depth;
    }

    // Validate and sanitize depth to ensure it's a valid HeadingDepth (1-6)
    const finalDepth = validateHeadingDepth(calculatedDepth);

    const updated = insertRelative(snapshot.content, referenceSlug, insertMode, finalDepth, title, content);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated, { bypassValidation: true });

    // Invalidate cache after write to ensure subsequent operations see fresh data
    this.cache.invalidateDocument(docPath);

    // Update TOC if requested
    if (options.updateToc === true) {
      this.scheduleTocUpdate(docPath);
    }

    logger.info('Inserted section', { path: docPath, referenceSlug, title, mode: insertMode });
  }

  /**
   * Move section to different location (implementation needed)
   */
  async moveSection(docPath: string, sectionSlug: string, targetSlug: string, position: string): Promise<void> {
    // This would require implementing section extraction and re-insertion
    // For now, throw a helpful error with all the context
    throw new Error(`Move section operation not yet implemented. Document: ${docPath}, Section: ${sectionSlug}, Target: ${targetSlug}, Position: ${position}`);
  }

  /**
   * List all documents
   */
  async listDocuments(): Promise<{
    documents: Array<{
      path: string;
      title: string;
      lastModified: Date;
      headingCount: number;
      wordCount: number;
    }>;
    errors?: Array<{ path: string; error: string }>;
  }> {
    const documents: Array<{
      path: string;
      title: string;
      lastModified: Date;
      headingCount: number;
      wordCount: number;
    }> = [];
    const errors: Array<{ path: string; error: string }> = [];

    const findMarkdownFiles = async (dir: string, basePath = ''): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const docPath = path.join(basePath, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await findMarkdownFiles(fullPath, docPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            try {
              const document = await this.cache.getDocument(`/${docPath}`);
              if (document) {
                documents.push({
                  path: `/${docPath}`,
                  title: document.metadata.title,
                  lastModified: document.metadata.lastModified,
                  headingCount: document.headings.length,
                  wordCount: document.metadata.wordCount
                });
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              errors.push({ path: `/${docPath}`, error: errorMessage });
              logger.warn('Failed to load document for listing', { path: docPath, error });
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ path: dir, error: errorMessage });
        logger.warn('Failed to read directory', { dir, error });
      }
    };

    await findMarkdownFiles(this.docsRoot);

    // Sort by last modified descending
    documents.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return {
      documents,
      ...(errors.length > 0 && { errors })
    };
  }

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
  async listDocumentFingerprints(options?: {
    /** Whether to refresh stale fingerprints (default: false) */
    refreshStale?: boolean;
    /** Optional namespace filter to limit results */
    namespace?: string;
  }): Promise<FingerprintEntry[]> {
    const startTime = performance.now();
    const fingerprints: FingerprintEntry[] = [];
    const staleDocuments: string[] = [];

    // Default options
    const refreshStale = options?.refreshStale ?? false;
    const namespaceFilter = options?.namespace;

    const processMarkdownFiles = async (dir: string, basePath = ''): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const docPath = path.join(basePath, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await processMarkdownFiles(fullPath, docPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            const normalizedDocPath = `/${docPath}`;

            try {
              // First check if we have a cached document with valid fingerprint
              const cachedDocument = this.cache.getCachedPaths().includes(normalizedDocPath)
                ? await this.cache.getDocument(normalizedDocPath)
                : null;

              if (cachedDocument != null) {
                // Check if fingerprint is stale
                const isStale = await this.cache.isFingerprintStale(normalizedDocPath);

                if (isStale) {
                  staleDocuments.push(normalizedDocPath);

                  if (refreshStale) {
                    // Invalidate and reload to get fresh fingerprint
                    this.cache.invalidateDocument(normalizedDocPath);
                    const freshDocument = await this.cache.getDocument(normalizedDocPath);
                    if (freshDocument != null) {
                      const fingerprint = this.cache.createFingerprintEntry(freshDocument.metadata);

                      // Apply namespace filter if specified
                      if (namespaceFilter == null || fingerprint.namespace === namespaceFilter) {
                        fingerprints.push(fingerprint);
                      }
                    }
                  }
                  // If not refreshing stale, skip this document
                } else {
                  // Use cached fingerprint
                  const fingerprint = this.cache.createFingerprintEntry(cachedDocument.metadata);

                  // Apply namespace filter if specified
                  if (namespaceFilter == null || fingerprint.namespace === namespaceFilter) {
                    fingerprints.push(fingerprint);
                  }
                }
              } else {
                // No cached version - need to load to get fingerprint
                // This is efficient since we only load metadata, not sections
                const document = await this.cache.getDocument(normalizedDocPath);
                if (document != null) {
                  const fingerprint = this.cache.createFingerprintEntry(document.metadata);

                  // Apply namespace filter if specified
                  if (namespaceFilter == null || fingerprint.namespace === namespaceFilter) {
                    fingerprints.push(fingerprint);
                  }
                }
              }
            } catch (error) {
              logger.warn('Failed to process document for fingerprint listing', {
                path: normalizedDocPath,
                error
              });
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to read directory for fingerprint listing', { dir, error });
      }
    };

    await processMarkdownFiles(this.docsRoot);

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    logger.debug('Listed document fingerprints', {
      totalFingerprints: fingerprints.length,
      staleDocuments: staleDocuments.length,
      refreshStale,
      namespaceFilter,
      durationMs
    });

    // Sort by last modified descending for consistency with listDocuments
    fingerprints.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return fingerprints;
  }

  /**
   * Search documents
   */
  async searchDocuments(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const searchOptions = {
      searchIn: ['title', 'headings', 'content'] as const,
      fuzzy: false,
      boost: { title: 2.0, headings: 1.5, code: 1.2 },
      highlight: true,
      groupByDocument: true,
      ...options
    };

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // OPTIMIZATION: Use fingerprint index if available
    let documentsToSearch: string[];

    if (this.fingerprintIndex?.isInitialized() === true) {
      // Fast path: Filter candidates using fingerprint index
      const candidates = this.fingerprintIndex.findCandidates(query);
      documentsToSearch = candidates;

      const { documents: allDocuments } = await this.listDocuments();
      logger.debug('Search candidates filtered', {
        query,
        totalDocuments: allDocuments.length,
        candidates: candidates.length,
        reduction: allDocuments.length > 0
          ? `${Math.round((1 - candidates.length / allDocuments.length) * 100)}%`
          : '0%'
      });
    } else {
      // Slow path: Search all documents
      const { documents: allDocs } = await this.listDocuments();
      documentsToSearch = allDocs.map(d => d.path);

      logger.debug('Search without fingerprint index', {
        query,
        totalDocuments: documentsToSearch.length
      });
    }

    // Deep search only in candidates - use 'search' context for boost
    for (const docPath of documentsToSearch) {
      const document = await this.cache.getDocument(docPath, AccessContext.SEARCH);
      if (!document) continue;

      const matches: SearchResult['matches'] = [];

      // Search in title
      if (searchOptions.searchIn.includes('title')) {
        const title = document.metadata.title.toLowerCase();
        if (title.includes(queryLower)) {
          matches.push({
            type: 'title',
            snippet: document.metadata.title,
            score: (searchOptions.boost.title ?? 1.0) * 10
          });
        }
      }

      // Search in headings
      if (searchOptions.searchIn.includes('headings')) {
        for (const heading of document.headings) {
          const headingText = heading.title.toLowerCase();
          if (headingText.includes(queryLower)) {
            matches.push({
              type: 'heading',
              slug: heading.slug,
              snippet: heading.title,
              score: (searchOptions.boost.headings ?? 1.0) * (7 - heading.depth)
            });
          }
        }
      }

      // Search in content using our section tools
      if (searchOptions.searchIn.includes('content')) {
        try {
          // Search within each section using our readSection tool
          for (const heading of document.headings) {
            const sectionContent = await this.cache.getSectionContent(docPath, heading.slug);
            // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
            if (sectionContent != null && sectionContent.toLowerCase().includes(queryLower)) {
              // Extract a meaningful snippet from the section
              const lines = sectionContent.split('\n').filter(line =>
                line.trim() !== '' &&
                !line.trim().startsWith('#') &&
                line.toLowerCase().includes(queryLower)
              );

              if (lines.length > 0) {
                const firstLine = lines[0];
                if (firstLine != null) {
                  matches.push({
                    type: 'content',
                    slug: heading.slug,
                    snippet: firstLine.trim().substring(0, 200), // Limit snippet length
                    score: 1.0 * (heading.depth <= 3 ? 1.2 : 1.0) // Boost matches in higher-level sections
                  });
                  break; // Only one content match per document for now
                }
              }
            }
          }
        } catch (error) {
          logger.warn('Failed to search content', { path: docPath, error });
        }
      }

      if (matches.length > 0) {
        results.push({
          documentPath: docPath,
          documentTitle: document.metadata.title,
          matches: matches.sort((a, b) => b.score - a.score)
        });
      }
    }

    // Sort results by best match score
    results.sort((a, b) => {
      const maxScoreA = Math.max(...a.matches.map(m => m.score));
      const maxScoreB = Math.max(...b.matches.map(m => m.score));
      return maxScoreB - maxScoreA;
    });

    return results;
  }

  /**
   * Get document by path
   */
  async getDocument(docPath: string): Promise<CachedDocument | null> {
    return await this.cache.getDocument(docPath);
  }

  /**
   * Get section content
   */
  async getSectionContent(docPath: string, slug: string): Promise<string | null> {
    return await this.cache.getSectionContent(docPath, slug);
  }

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
  async getDocumentContent(docPath: string): Promise<string | null> {
    return await this.cache.readDocumentContent(docPath);
  }

  /**
   * Destroy the document manager and clean up resources
   * Cancels all pending TOC updates and destroys the cache
   */
  async destroy(): Promise<void> {
    // Cancel all pending TOC updates
    for (const timeoutId of this.pendingTocUpdates.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingTocUpdates.clear();

    // Destroy cache
    await this.cache.destroy();
  }

  /**
   * Convert document path to absolute filesystem path
   */
  private getAbsolutePath(docPath: string): string {
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
}