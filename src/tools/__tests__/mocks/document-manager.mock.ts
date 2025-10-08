/**
 * Document manager mocking utilities for testing
 * Addresses Issue #37: Missing mocking for external dependencies
 */

import { vi } from 'vitest';
import type { CachedDocument, DocumentMetadata } from '../../../document-cache.js';
import type { Heading } from '../../../types/core.js';
import type { MockFileSystem } from './filesystem.mock.js';
import { createMockFileSystem } from './filesystem.mock.js';
import { validateHeadingDepth } from '../../../shared/validation-utils.js';

export interface MockDocumentManagerOptions {
  mockFileSystem?: MockFileSystem;
  initialDocuments?: Record<string, string>;
  simulateErrors?: boolean;
}

/**
 * Mock document manager for testing
 * Note: Not exported directly - use createMockDocumentManager() factory function
 */
class MockDocumentManager {
  private readonly mockFileSystem: MockFileSystem;
  private simulateErrors: boolean;
  private readonly documentCache: Map<string, CachedDocument> = new Map();

  constructor(options: MockDocumentManagerOptions = {}) {
    this.mockFileSystem = options.mockFileSystem ?? createMockFileSystem(
      options.initialDocuments ? { initialFiles: options.initialDocuments } : {}
    );
    this.simulateErrors = options.simulateErrors ?? false;
  }

  /**
   * Mock getDocument implementation
   */
  getDocument = vi.fn().mockImplementation(async (path: string): Promise<CachedDocument> => {
    if (this.simulateErrors && Math.random() < 0.1) {
      throw new Error(`Failed to load document: ${path}`);
    }

    // Check cache first
    const cached = this.documentCache.get(path);
    if (cached) {
      return cached;
    }

    const content = this.mockFileSystem.getFileContent(path);
    if (content == null || content === '') {
      throw new Error(`File not found: ${path}`);
    }

    // Parse headings from content
    const headings = this.parseHeadings(content);

    // Create slug index
    const slugIndex = new Map<string, number>();
    headings.forEach((heading, index) => {
      slugIndex.set(heading.slug, index);
    });

    const document: CachedDocument = {
      metadata: this.createMockMetadata(path, content),
      headings,
      toc: [], // Simplified for mocking - could build actual TOC if needed
      slugIndex
    };

    // Cache the document
    this.documentCache.set(path, document);
    return document;
  });

  /**
   * Mock getSectionContent implementation
   */
  getSectionContent = vi.fn().mockImplementation(async (docPath: string, sectionSlug: string): Promise<string | null> => {
    if (this.simulateErrors && Math.random() < 0.1) {
      throw new Error(`Failed to load section: ${sectionSlug}`);
    }

    const content = this.mockFileSystem.getFileContent(docPath);
    if (content == null || content === '') {
      return null;
    }

    return this.extractSection(content, sectionSlug);
  });

  /**
   * Mock updateDocument implementation
   */
  updateDocument = vi.fn().mockImplementation(async (path: string, content: string): Promise<void> => {
    if (this.simulateErrors && Math.random() < 0.1) {
      throw new Error(`Failed to update document: ${path}`);
    }

    await this.mockFileSystem.writeFile(path, content);
  });

  /**
   * Mock updateSection implementation (required by section tool)
   */
  updateSection = vi.fn().mockImplementation(async (docPath: string, sectionSlug: string, content: string): Promise<void> => {
    if (this.simulateErrors && Math.random() < 0.1) {
      throw new Error(`Failed to update section: ${sectionSlug}`);
    }

    // Get current full document content from filesystem
    const currentContent = this.mockFileSystem.getFileContent(docPath);
    if (currentContent == null || currentContent === '') {
      throw new Error(`Document not found: ${docPath}`);
    }

    // Find the section and replace its content directly in the document string
    const updatedContent = this.replaceSectionContent(currentContent, sectionSlug, content);

    // Write the updated content back to filesystem
    await this.mockFileSystem.writeFile(docPath, updatedContent);

    // Clear cache so next read gets fresh content
    this.documentCache.delete(docPath);
  });

  /**
   * Mock insertSection implementation (required by section tool for creation operations)
   */
  insertSection = vi.fn().mockImplementation(async (
    docPath: string,
    referenceSlug: string,
    insertMode: 'insert_before' | 'insert_after' | 'append_child',
    depth: number | undefined,
    title: string,
    content: string,
    _options?: { updateToc?: boolean }
  ): Promise<void> => {
    if (this.simulateErrors && Math.random() < 0.1) {
      throw new Error(`Failed to insert section: ${title}`);
    }

    // Get current full document content from filesystem
    const currentContent = this.mockFileSystem.getFileContent(docPath);
    if (currentContent == null || currentContent === '') {
      throw new Error(`Document not found: ${docPath}`);
    }

    // Insert the section directly in the document string
    const updatedContent = this.insertSectionContent(
      currentContent,
      referenceSlug,
      insertMode,
      depth,
      title,
      content
    );

    // Write the updated content back to filesystem
    await this.mockFileSystem.writeFile(docPath, updatedContent);

    // Clear cache so next read gets fresh content
    this.documentCache.delete(docPath);
  });

  /**
   * Mock archiveDocument implementation
   */
  archiveDocument = vi.fn().mockImplementation(async (path: string): Promise<{ archivePath: string; auditPath: string }> => {
    if (this.simulateErrors && Math.random() < 0.1) {
      throw new Error(`Failed to archive document: ${path}`);
    }

    const archivePath = `/archived${path}`;
    const auditPath = `/archived${path}.audit.json`;

    // Move content to archive
    const content = this.mockFileSystem.getFileContent(path);
    if (content != null && content !== '') {
      await this.mockFileSystem.writeFile(archivePath, content);
      await this.mockFileSystem.writeFile(auditPath, JSON.stringify({
        originalPath: path,
        archivedAt: new Date().toISOString(),
        reason: 'Automated archiving'
      }));
      await this.mockFileSystem.unlink(path);
    }

    return { archivePath, auditPath };
  });

  /**
   * Simple heading parser for mock purposes with duplicate handling
   */
  private parseHeadings(content: string): Heading[] {
    const headings: Heading[] = [];
    const lines = content.split('\n');
    const seenSlugs = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (line != null && line !== '' && line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match != null) {
          const rawDepth = match[1]?.length ?? 1;
          const depth = validateHeadingDepth(rawDepth);
          const title = match[2] ?? '';
          const slug = this.titleToSlug(title);

          // Skip duplicates - keep only the first occurrence
          if (!seenSlugs.has(slug)) {
            seenSlugs.add(slug);
            headings.push({
              index: i,
              depth,
              title,
              slug,
              parentIndex: this.findParentIndex(headings, depth)
            });
          }
        }
      }
    }

    return headings;
  }

  /**
   * Simple slug generation
   */
  private titleToSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Find parent heading index for hierarchical structure
   */
  private findParentIndex(headings: Heading[], currentDepth: number): number | null {
    for (let i = headings.length - 1; i >= 0; i--) {
      const heading = headings[i];
      if (heading != null && heading.depth < currentDepth) {
        return heading.index;
      }
    }
    return null;
  }

  /**
   * Extract section content (simplified for testing)
   * Returns content WITHOUT the heading to maintain consistency with editSection
   */
  private extractSection(content: string, slug: string): string | null {
    const lines = content.split('\n');
    let sectionStart = -1;
    let sectionEnd = -1;
    let targetDepth = 0;

    // Find section start
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (line != null && line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const title = match[2] ?? '';
          const lineSlug = this.titleToSlug(title);
          if (lineSlug === slug) {
            sectionStart = i;
            targetDepth = match[1]?.length ?? 1;
            break;
          }
        }
      }
    }

    if (sectionStart === -1) {
      return null;
    }

    // Find section end
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (line != null && line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+/);
        if (match) {
          const depth = match[1]?.length ?? 1;
          if (depth <= targetDepth) {
            sectionEnd = i - 1;
            break;
          }
        }
      }
    }

    if (sectionEnd === -1) {
      sectionEnd = lines.length - 1;
    }

    // Return content without the heading (skip the first line which is the heading)
    const sectionContent = lines.slice(sectionStart + 1, sectionEnd + 1).join('\n').trim();
    return sectionContent || null;
  }

  /**
   * Create mock metadata
   */
  private createMockMetadata(path: string, content: string): DocumentMetadata {
    const title = this.extractTitle(content);
    const now = new Date();
    const contentHash = `mock-hash-${path}-${content.length}`;

    // Extract namespace from path (e.g., '/api/auth.md' -> 'api')
    const pathParts = path.split('/').filter(part => part !== '' && part !== '.');
    const namespace = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'root';

    // Simple keyword extraction for mocking
    const keywords = this.extractMockKeywords(title ?? 'Untitled Document', content);

    return {
      path,
      title: title ?? 'Untitled Document',
      lastModified: now,
      contentHash,
      wordCount: content.split(/\s+/).length,
      linkCount: (content.match(/\[.*?\]\(.*?\)/g) ?? []).length,
      codeBlockCount: (content.match(/```/g) ?? []).length / 2,
      lastAccessed: now,
      cacheGeneration: 1,
      namespace,
      keywords,
      fingerprintGenerated: now
    };
  }

  /**
   * Extract mock keywords for testing
   */
  private extractMockKeywords(title: string, content: string): string[] {
    // Simple keyword extraction for testing purposes
    const text = `${title} ${content}`.toLowerCase();
    const words = text
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2);

    // Remove common stop words
    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that']);
    const keywords = words.filter(word => !stopWords.has(word));

    // Return unique keywords, limited to 10 for testing
    return [...new Set(keywords)].slice(0, 10);
  }

  /**
   * Extract title from content
   */
  private extractTitle(content: string): string | null {
    const firstLine = content.split('\n')[0]?.trim();
    if (firstLine != null && firstLine !== '' && firstLine.startsWith('# ')) {
      return firstLine.substring(2).trim();
    }
    return null;
  }

  /**
   * Get the underlying mock filesystem
   */
  getFileSystem(): MockFileSystem {
    return this.mockFileSystem;
  }


  /**
   * Insert section content directly in document string
   */
  private insertSectionContent(
    documentContent: string,
    referenceSlug: string,
    insertMode: 'insert_before' | 'insert_after' | 'append_child',
    depth: number | undefined,
    title: string,
    content: string
  ): string {
    const lines = documentContent.split('\n');
    let referenceIndex = -1;
    let referenceDepth = 0;

    // Find reference section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (line != null && line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const lineTitle = match[2] ?? '';
          const lineSlug = this.titleToSlug(lineTitle);
          if (lineSlug === referenceSlug) {
            referenceIndex = i;
            referenceDepth = match[1]?.length ?? 1;
            break;
          }
        }
      }
    }

    if (referenceIndex === -1) {
      throw new Error(`Reference section not found: ${referenceSlug}`);
    }

    // Calculate new section depth
    let newDepth: number;
    if (depth !== undefined) {
      newDepth = depth;
    } else {
      if (insertMode === 'append_child') {
        newDepth = Math.min(referenceDepth + 1, 6);
      } else {
        newDepth = referenceDepth;
      }
    }

    // Create new section heading and content
    const headingPrefix = '#'.repeat(newDepth);
    const newSectionLines = [
      `${headingPrefix} ${title}`,
      '',
      ...(content.trim() !== '' ? [content.trim(), ''] : [''])
    ];

    let insertIndex: number;
    if (insertMode === 'insert_before') {
      insertIndex = referenceIndex;
    } else if (insertMode === 'insert_after') {
      // Find the end of the reference section
      insertIndex = this.findSectionEnd(lines, referenceIndex, referenceDepth) + 1;
    } else { // append_child
      // Find the end of all children of the reference section
      insertIndex = this.findSectionEnd(lines, referenceIndex, referenceDepth) + 1;
    }

    // Insert the new section
    const result = [
      ...lines.slice(0, insertIndex),
      ...newSectionLines,
      ...lines.slice(insertIndex)
    ].join('\n');

    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * Find the end of a section (before next heading at same or higher level)
   */
  private findSectionEnd(lines: string[], startIndex: number, sectionDepth: number): number {
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (line != null && line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+/);
        if (match) {
          const depth = match[1]?.length ?? 1;
          if (depth <= sectionDepth) {
            return i - 1;
          }
        }
      }
    }
    return lines.length - 1;
  }

  /**
   * Replace section content directly in document string
   */
  private replaceSectionContent(documentContent: string, sectionSlug: string, newContent: string): string {
    const lines = documentContent.split('\n');
    let sectionStart = -1;
    let sectionEnd = -1;
    let targetDepth = 0;

    // Find section start
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (line != null && line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const title = match[2] ?? '';
          const lineSlug = this.titleToSlug(title);
          if (lineSlug === sectionSlug) {
            sectionStart = i;
            targetDepth = match[1]?.length ?? 1;
            break;
          }
        }
      }
    }

    if (sectionStart === -1) {
      throw new Error(`Section not found: ${sectionSlug}`);
    }

    // Find section end (next heading at same or higher level)
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (line != null && line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+/);
        if (match) {
          const depth = match[1]?.length ?? 1;
          if (depth <= targetDepth) {
            sectionEnd = i - 1;
            break;
          }
        }
      }
    }

    if (sectionEnd === -1) {
      sectionEnd = lines.length - 1;
    }

    // Replace the section content (keep the heading, replace the body)
    const beforeSection = lines.slice(0, sectionStart + 1); // Include the heading
    const afterSection = lines.slice(sectionEnd + 1);

    // Add the new content (with proper spacing)
    const result = [
      ...beforeSection,
      ...(newContent.trim() !== '' ? ['', newContent.trim(), ''] : ['']),
      ...afterSection
    ].join('\n');

    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * Set error simulation
   */
  setErrorSimulation(enabled: boolean): void {
    this.simulateErrors = enabled;
    this.mockFileSystem.setErrorSimulation(enabled);
  }
}

/**
 * Create a mock document manager for testing
 */
export function createMockDocumentManager(options: MockDocumentManagerOptions = {}): MockDocumentManager {
  return new MockDocumentManager(options);
}