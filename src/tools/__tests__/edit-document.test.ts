import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { editDocument } from '../implementations/edit-document.js';
import type { SessionState } from '../../session/types.js';
import { createDocumentManager } from '../../shared/utilities.js';
import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';
import { AddressingError, DocumentNotFoundError } from '../../shared/addressing-system.js';
import * as sections from '../../sections.js';
import * as fsio from '../../fsio.js';

describe('edit_document Tool', () => {
  let sessionState: SessionState;
  let manager: DocumentManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let renameHeadingSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let readFileSnapshotSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let writeFileIfUnchangedSpy: any;

  beforeEach(() => {
    manager = createDocumentManager();
    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0,
    };

    // Mock fsio functions
    readFileSnapshotSpy = vi.spyOn(fsio, 'readFileSnapshot');
    writeFileIfUnchangedSpy = vi.spyOn(fsio, 'writeFileIfUnchanged').mockResolvedValue(undefined);

    // Mock renameHeading
    renameHeadingSpy = vi.spyOn(sections, 'renameHeading');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should throw error when neither title nor overview provided', async () => {
      await expect(
        editDocument({ document: '/test.md' }, sessionState, manager)
      ).rejects.toThrow(AddressingError);
    });

    it('should throw error when document not found', async () => {
      vi.spyOn(manager, 'getDocument').mockResolvedValue(null);

      await expect(
        editDocument({ document: '/nonexistent.md', title: 'New Title' }, sessionState, manager)
      ).rejects.toThrow(DocumentNotFoundError);
    });

    it('should throw error when document has no title (H1)', async () => {
      const content = '## Section\n\nContent without title';
      const mockDoc = {
        headings: [{ slug: 'section', title: 'Section', depth: 2 }],
        sections: new Map([['section', 'Content without title']]),
        metadata: {
          path: '/no-title.md',
          title: 'Section',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 3,
        },
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      readFileSnapshotSpy.mockResolvedValue({ content, mtimeMs: 1000 });

      await expect(
        editDocument({ document: '/no-title.md', title: 'New Title' }, sessionState, manager)
      ).rejects.toThrow(AddressingError);
    });
  });

  describe('Title Editing', () => {
    it('should successfully edit document title only', async () => {
      const originalContent = '# Original Title\n\nOriginal overview content\n\n## Section\n\nSection content';
      const mockDoc = {
        headings: [
          { slug: 'original-title', title: 'Original Title', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 },
        ],
        sections: new Map([
          ['original-title', ''],
          ['section', 'Section content'],
        ]),
        metadata: {
          path: '/test.md',
          title: 'Original Title',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5,
        },
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce({
          ...mockDoc,
          metadata: { ...mockDoc.metadata, title: 'Updated Title' },
        } as CachedDocument);

      readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
      renameHeadingSpy.mockReturnValue('# Updated Title\n\nOriginal overview content\n\n## Section\n\nSection content');
      vi.spyOn(manager.cache, 'invalidateDocument');

      const result = await editDocument(
        { document: '/test.md', title: 'Updated Title' },
        sessionState,
        manager
      );

      expect(result).toMatchObject({
        action: 'edited',
        document: '/test.md',
        changes_made: ['title'],
        previous_title: 'Original Title',
        new_title: 'Updated Title',
      });

      // Verify renameHeading was called
      expect(renameHeadingSpy).toHaveBeenCalledWith(originalContent, 'original-title', 'Updated Title');

      // Verify file was written
      expect(writeFileIfUnchangedSpy).toHaveBeenCalled();

      // Verify cache was invalidated
      expect(manager.cache.invalidateDocument).toHaveBeenCalledWith('/test.md');
    });
  });

  describe('Overview Editing', () => {
    it('should successfully edit document overview only', async () => {
      const originalContent = '# Test Title\n\nOriginal overview\n\n## Section\n\nSection content';
      const mockDoc = {
        headings: [
          { slug: 'test-title', title: 'Test Title', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 },
        ],
        sections: new Map([
          ['test-title', ''],
          ['section', 'Section content'],
        ]),
        metadata: {
          path: '/test.md',
          title: 'Test Title',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5,
        },
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce(mockDoc);

      readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
      vi.spyOn(manager.cache, 'invalidateDocument');

      const result = await editDocument(
        { document: '/test.md', overview: 'Updated overview content' },
        sessionState,
        manager
      );

      expect(result).toMatchObject({
        action: 'edited',
        document: '/test.md',
        changes_made: ['overview'],
        previous_overview: 'Original overview',
        new_overview: 'Updated overview content',
      });

      // Verify file was written with new overview
      expect(writeFileIfUnchangedSpy).toHaveBeenCalled();
      const writtenContent = writeFileIfUnchangedSpy.mock.calls[0]?.[2] as string;
      expect(writtenContent).toContain('# Test Title');
      expect(writtenContent).toContain('Updated overview content');
      expect(writtenContent).toContain('## Section');

      // Verify cache was invalidated
      expect(manager.cache.invalidateDocument).toHaveBeenCalledWith('/test.md');
    });

    it('should handle document with no H2 sections', async () => {
      const originalContent = '# Title Only\n\nOriginal overview content';
      const mockDoc = {
        headings: [{ slug: 'title-only', title: 'Title Only', depth: 1 }],
        sections: new Map([['title-only', '']]),
        metadata: {
          path: '/no-sections.md',
          title: 'Title Only',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 3,
        },
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce(mockDoc);

      readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
      vi.spyOn(manager.cache, 'invalidateDocument');

      const result = await editDocument(
        { document: '/no-sections.md', overview: 'New overview for document without sections' },
        sessionState,
        manager
      );

      expect(result).toMatchObject({
        action: 'edited',
        changes_made: ['overview'],
        previous_overview: 'Original overview content',
        new_overview: 'New overview for document without sections',
      });
    });
  });

  describe('Combined Title and Overview Editing', () => {
    it('should successfully edit both title and overview', async () => {
      const originalContent = '# Original Title\n\nOriginal overview\n\n## Section\n\nSection content';
      const mockDoc = {
        headings: [
          { slug: 'original-title', title: 'Original Title', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 },
        ],
        sections: new Map([
          ['original-title', ''],
          ['section', 'Section content'],
        ]),
        metadata: {
          path: '/both.md',
          title: 'Original Title',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5,
        },
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce({
          ...mockDoc,
          metadata: { ...mockDoc.metadata, title: 'Updated Title' },
        } as CachedDocument);

      readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
      renameHeadingSpy.mockReturnValue('# Updated Title\n\nOriginal overview\n\n## Section\n\nSection content');
      vi.spyOn(manager.cache, 'invalidateDocument');

      const result = await editDocument(
        {
          document: '/both.md',
          title: 'Updated Title',
          overview: 'Updated overview',
        },
        sessionState,
        manager
      );

      expect(result).toMatchObject({
        action: 'edited',
        document: '/both.md',
        changes_made: ['title', 'overview'],
        previous_title: 'Original Title',
        previous_overview: 'Original overview',
        new_title: 'Updated Title',
        new_overview: 'Updated overview',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string title (treated as not provided)', async () => {
      const originalContent = '# Original Title\n\nOriginal overview';
      const mockDoc = {
        headings: [{ slug: 'original-title', title: 'Original Title', depth: 1 }],
        sections: new Map([['original-title', '']]),
        metadata: {
          path: '/empty-title.md',
          title: 'Original Title',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 3,
        },
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce(mockDoc);

      readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
      vi.spyOn(manager.cache, 'invalidateDocument');

      const result = await editDocument(
        {
          document: '/empty-title.md',
          title: '',
          overview: 'New overview',
        },
        sessionState,
        manager
      );

      // Empty title should not be in changes_made
      expect(result).toMatchObject({
        changes_made: ['overview'],
      });

      // Verify renameHeading was NOT called
      expect(renameHeadingSpy).not.toHaveBeenCalled();
    });

    it('should handle empty string overview (treated as not provided)', async () => {
      const originalContent = '# Original Title\n\nOriginal overview';
      const mockDoc = {
        headings: [{ slug: 'original-title', title: 'Original Title', depth: 1 }],
        sections: new Map([['original-title', '']]),
        metadata: {
          path: '/empty-overview.md',
          title: 'Original Title',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 3,
        },
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce({
          ...mockDoc,
          metadata: { ...mockDoc.metadata, title: 'New Title' },
        } as CachedDocument);

      readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
      renameHeadingSpy.mockReturnValue('# New Title\n\nOriginal overview');
      vi.spyOn(manager.cache, 'invalidateDocument');

      const result = await editDocument(
        {
          document: '/empty-overview.md',
          title: 'New Title',
          overview: '',
        },
        sessionState,
        manager
      );

      // Empty overview should not be in changes_made
      expect(result).toMatchObject({
        changes_made: ['title'],
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache after editing', async () => {
      const originalContent = '# Original\n\nOriginal overview';
      const mockDoc = {
        headings: [{ slug: 'original', title: 'Original', depth: 1 }],
        sections: new Map([['original', '']]),
        metadata: {
          path: '/cache-test.md',
          title: 'Original',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 2,
        },
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce({
          ...mockDoc,
          metadata: { ...mockDoc.metadata, title: 'Updated' },
        } as CachedDocument);

      readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
      renameHeadingSpy.mockReturnValue('# Updated\n\nOriginal overview');
      const invalidateSpy = vi.spyOn(manager.cache, 'invalidateDocument');

      await editDocument({ document: '/cache-test.md', title: 'Updated' }, sessionState, manager);

      expect(invalidateSpy).toHaveBeenCalledWith('/cache-test.md');
    });
  });

  describe('Response Format', () => {
    it('should include all required response fields', async () => {
      const originalContent = '# Title\n\nOverview';
      const mockDoc = {
        headings: [{ slug: 'title', title: 'Title', depth: 1 }],
        sections: new Map([['title', '']]),
        metadata: {
          path: '/response.md',
          title: 'Title',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 2,
        },
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce({
          ...mockDoc,
          metadata: { ...mockDoc.metadata, title: 'New Title' },
        } as CachedDocument);

      readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
      renameHeadingSpy.mockReturnValue('# New Title\n\nOverview');
      vi.spyOn(manager.cache, 'invalidateDocument');

      const result = await editDocument(
        {
          document: '/response.md',
          title: 'New Title',
        },
        sessionState,
        manager
      );

      expect(result).toHaveProperty('action', 'edited');
      expect(result).toHaveProperty('document', '/response.md');
      expect(result).toHaveProperty('changes_made');
      expect(result).toHaveProperty('document_info');
      expect(result).toHaveProperty('timestamp');

      const resultObj = result as Record<string, unknown>;
      expect(Array.isArray(resultObj['changes_made'])).toBe(true);
      expect(typeof resultObj['timestamp']).toBe('string');
    });
  });
});
