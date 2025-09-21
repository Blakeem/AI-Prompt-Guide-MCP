/**
 * Document management operations using cache system
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getGlobalCache } from './document-cache.js';
import { replaceSectionBody, insertRelative, renameHeading, deleteSection } from './sections.js';
import { listHeadings, buildToc } from './parse.js';
import { ensureDirectoryExists, writeFileIfUnchanged, readFileSnapshot, fileExists } from './fsio.js';
import { getGlobalLogger } from './utils/logger.js';
import { PathHandler } from './utils/path-handler.js';
import type { TocNode, HeadingDepth, InsertMode } from './types/index.js';
import type { CachedDocument } from './document-cache.js';

const logger = getGlobalLogger();

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
  private readonly cache = getGlobalCache();
  private readonly pathHandler: PathHandler;

  constructor(docsRoot: string) {
    this.docsRoot = path.resolve(docsRoot);
    this.pathHandler = new PathHandler(this.docsRoot);
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
   * Create document with template and features
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
    let content = '';
    
    if (options.template != null && options.template !== '') {
      // Load template content
      try {
        const templatePath = path.join(this.docsRoot, '../templates', `${options.template}.md`);
        content = await fs.readFile(templatePath, 'utf8');
        // Replace template variables
        content = content.replace(/\{\{title\}\}/g, options.title);
      } catch {
        // Template not found, use basic content
        content = `# ${options.title}\n\n`;
      }
    } else {
      content = `# ${options.title}\n\n`;
    }

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
    const snapshot = await readFileSnapshot(absolutePath);
    
    // Parse the current content to get the complete TOC structure
    const currentToc = buildToc(snapshot.content);
    const filteredToc = currentToc.filter(node => 
      node.depth > 1 && node.slug !== 'table-of-contents'
    );

    const tocContent = this.generateTocMarkdown(filteredToc);

    // Update TOC section using our section tools
    try {
      const updated = replaceSectionBody(snapshot.content, 'table-of-contents', tocContent);
      await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated);
      
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
    const snapshot = await readFileSnapshot(absolutePath);
    
    const updated = replaceSectionBody(snapshot.content, slug, newContent);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated);

    // Update TOC if requested
    if (options.updateToc === true) {
      // Wait a bit for file watcher to invalidate cache
      setTimeout(() => {
        void this.updateTableOfContents(docPath);
      }, 100);
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
    const snapshot = await readFileSnapshot(absolutePath);
    
    const updated = renameHeading(snapshot.content, slug, newTitle);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated);

    // Update TOC if requested
    if (options.updateToc === true) {
      setTimeout(() => {
        void this.updateTableOfContents(docPath);
      }, 100);
    }

    logger.info('Renamed document section', { path: docPath, slug, newTitle });
  }

  /**
   * Delete a section
   */
  async deleteSection(docPath: string, slug: string, options: UpdateSectionOptions = {}): Promise<void> {
    const absolutePath = this.getAbsolutePath(docPath);
    const snapshot = await readFileSnapshot(absolutePath);
    
    const updated = deleteSection(snapshot.content, slug);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated);

    // Update TOC if requested
    if (options.updateToc === true) {
      setTimeout(() => {
        void this.updateTableOfContents(docPath);
      }, 100);
    }

    logger.info('Deleted document section', { path: docPath, slug });
  }

  /**
   * Archive document or folder (move to archive folder with duplicate handling)
   */
  async archiveDocument(userPath: string): Promise<{ originalPath: string; archivePath: string; wasFolder: boolean }> {
    // Normalize and validate the path
    const normalizedPath = this.pathHandler.processUserPath(userPath);
    const absolutePath = this.pathHandler.getAbsolutePath(normalizedPath);
    
    // Check if source exists
    if (!(await fileExists(absolutePath))) {
      throw new Error(`Path not found: ${normalizedPath}`);
    }
    
    // Determine if it's a folder or file
    const stats = await fs.stat(absolutePath);
    const isFolder = stats.isDirectory();
    
    // Generate unique archive path (handles duplicates automatically)
    const uniqueArchivePath = await this.pathHandler.generateUniqueArchivePath(normalizedPath);
    
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
      note: 'Archived via MCP server'
    };
    await fs.writeFile(auditPath, JSON.stringify(auditInfo, null, 2), 'utf8');
    
    // Invalidate cache for the archived item
    this.cache.invalidateDocument(normalizedPath);
    
    // If it was a folder, invalidate all documents within it
    if (isFolder) {
      // Get relative archive path for return value
      const relativeArchivePath = path.relative(this.docsRoot, uniqueArchivePath);
      
      // Invalidate all cached documents that were in this folder
      // We'll use cache internals temporarily - this should be refactored to use a proper method
      const cacheInternal = this.cache as unknown as { cache?: Map<string, unknown> };
      if (cacheInternal.cache != null) {
        for (const cachedPath of cacheInternal.cache.keys()) {
          if (typeof cachedPath === 'string' && cachedPath.startsWith(normalizedPath)) {
            this.cache.invalidateDocument(cachedPath);
          }
        }
      }
      
      logger.info('Archived folder', { originalPath: normalizedPath, archivePath: relativeArchivePath });
      
      return {
        originalPath: normalizedPath,
        archivePath: `/${relativeArchivePath}`,
        wasFolder: true
      };
    } else {
      const relativeArchivePath = path.relative(this.docsRoot, uniqueArchivePath);
      
      logger.info('Archived document', { originalPath: normalizedPath, archivePath: relativeArchivePath });
      
      return {
        originalPath: normalizedPath,
        archivePath: `/${relativeArchivePath}`,
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
    depth: HeadingDepth | undefined,
    title: string,
    content: string,
    options: UpdateSectionOptions = {}
  ): Promise<void> {
    const absolutePath = this.getAbsolutePath(docPath);
    const snapshot = await readFileSnapshot(absolutePath);
    
    // Determine depth if not specified
    let finalDepth: HeadingDepth;
    if (depth != null) {
      finalDepth = Math.max(1, Math.min(6, depth)) as HeadingDepth;
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
      
      finalDepth = insertMode === 'append_child' 
        ? Math.min(6, refHeading.depth + 1) as HeadingDepth
        : refHeading.depth;
    }
    
    const updated = insertRelative(snapshot.content, referenceSlug, insertMode, finalDepth, title, content);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updated);

    // Update TOC if requested
    if (options.updateToc === true) {
      setTimeout(() => {
        void this.updateTableOfContents(docPath);
      }, 100);
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
  async listDocuments(): Promise<Array<{
    path: string;
    title: string;
    lastModified: Date;
    headingCount: number;
    wordCount: number;
  }>> {
    const documents: Array<{
      path: string;
      title: string;
      lastModified: Date;
      headingCount: number;
      wordCount: number;
    }> = [];

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
              logger.warn('Failed to load document for listing', { path: docPath, error });
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to read directory', { dir, error });
      }
    };

    await findMarkdownFiles(this.docsRoot);
    
    // Sort by last modified descending
    documents.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    
    return documents;
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
    const documents = await this.listDocuments();

    for (const docInfo of documents) {
      const document = await this.cache.getDocument(docInfo.path);
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
            const sectionContent = await this.cache.getSectionContent(docInfo.path, heading.slug);
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
          logger.warn('Failed to search content', { path: docInfo.path, error });
        }
      }

      if (matches.length > 0) {
        results.push({
          documentPath: docInfo.path,
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
   * Convert document path to absolute filesystem path
   */
  private getAbsolutePath(docPath: string): string {
    return path.join(this.docsRoot, docPath.startsWith('/') ? docPath.slice(1) : docPath);
  }
}