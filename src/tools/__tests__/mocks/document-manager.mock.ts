/**
 * Document manager mocking utilities for testing
 * Addresses Issue #37: Missing mocking for external dependencies
 */

import { vi } from 'vitest';
import type { CachedDocument, DocumentMetadata, CachedSectionEntry } from '../../../document-cache.js';
import type { Heading, HeadingDepth } from '../../../types/core.js';
import type { MockFileSystem } from './filesystem.mock.js';
import { createMockFileSystem } from './filesystem.mock.js';

export interface MockDocumentManagerOptions {
  mockFileSystem?: MockFileSystem;
  initialDocuments?: Record<string, string>;
  simulateErrors?: boolean;
}

/**
 * Mock document manager for testing
 */
export class MockDocumentManager {
  private readonly mockFileSystem: MockFileSystem;
  private simulateErrors: boolean;

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

    const content = this.mockFileSystem.getFileContent(path);
    if (content == null || content === '') {
      throw new Error(`File not found: ${path}`);
    }

    // Parse headings from content
    const headings = this.parseHeadings(content);

    // Create sections map
    const sections = new Map<string, CachedSectionEntry>();
    for (const heading of headings) {
      // Simple section extraction - just get the heading and immediate content
      const section = this.extractSection(content, heading.slug);
      if (section != null && section !== '') {
        sections.set(heading.slug, {
          content: section,
          generation: 1
        });
      }
    }

    // Create slug index
    const slugIndex = new Map<string, number>();
    headings.forEach((heading, index) => {
      slugIndex.set(heading.slug, index);
    });

    const document: CachedDocument = {
      metadata: this.createMockMetadata(path, content),
      headings,
      toc: [], // Simplified for mocking - could build actual TOC if needed
      slugIndex,
      sections
    };

    return document;
  });

  /**
   * Mock getSectionContent implementation
   */
  getSectionContent = vi.fn().mockImplementation(async (docPath: string, sectionSlug: string): Promise<string | null> => {
    if (this.simulateErrors && Math.random() < 0.1) {
      throw new Error(`Failed to load section: ${sectionSlug}`);
    }

    const document = await this.getDocument(docPath);
    return document.sections.get(sectionSlug) ?? null;
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

    // Get current document
    const document = await this.getDocument(docPath);

    // Find the section and replace its content
    const sectionContent = document.sections.get(sectionSlug);
    if (sectionContent == null) {
      throw new Error(`Section not found: ${sectionSlug}`);
    }

    // For mock purposes, just update the sections map
    document.sections.set(sectionSlug, {
      content,
      generation: sectionContent.generation + 1
    });

    // Update the full document content (simplified)
    const updatedContent = this.rebuildDocumentContent(document);
    await this.mockFileSystem.writeFile(docPath, updatedContent);
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
   * Simple heading parser for mock purposes
   */
  private parseHeadings(content: string): Heading[] {
    const headings: Heading[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (line != null && line !== '' && line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match != null) {
          const depth = Math.min(Math.max(match[1]?.length ?? 1, 1), 6) as HeadingDepth;
          const title = match[2] ?? '';
          const slug = this.titleToSlug(title);

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
   */
  private extractSection(content: string, slug: string): string | null {
    const lines = content.split('\n');
    let sectionStart = -1;
    let sectionEnd = -1;
    let targetDepth = 0;

    // Find section start
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (line?.startsWith('#')) {
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
      if (line?.startsWith('#')) {
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

    return lines.slice(sectionStart, sectionEnd + 1).join('\n');
  }

  /**
   * Create mock metadata
   */
  private createMockMetadata(path: string, content: string): DocumentMetadata {
    const title = this.extractTitle(content);
    const now = new Date();
    const contentHash = `mock-hash-${path}-${content.length}`;

    return {
      path,
      title: title ?? 'Untitled Document',
      lastModified: now,
      contentHash,
      wordCount: content.split(/\s+/).length,
      linkCount: (content.match(/\[.*?\]\(.*?\)/g) ?? []).length,
      codeBlockCount: (content.match(/```/g) ?? []).length / 2,
      lastAccessed: now,
      cacheGeneration: 1
    };
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
   * Rebuild document content from sections (simplified for testing)
   */
  private rebuildDocumentContent(document: CachedDocument): string {
    // This is a simplified reconstruction - in reality this would be more complex
    let content = '';
    for (const heading of document.headings) {
      const sectionEntry = document.sections?.get(heading.slug);
      if (sectionEntry != null) {
        content += `${sectionEntry.content}\n\n`;
      }
    }
    return content.trim();
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