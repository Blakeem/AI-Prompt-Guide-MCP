/**
 * Unit tests for move tool
 *
 * Tests section/task move functionality including:
 * - Successful moves within same document
 * - Successful moves to different documents
 * - Move sections and tasks with all positions (before, after, child)
 * - Data safety: creates in new location BEFORE deleting from old location
 * - Error handling for non-existent sources, destinations, and references
 * - Cache invalidation after moves
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { move } from '../implementations/move.js';
import { createDocumentManager } from '../../shared/utilities.js';
import type { DocumentManager } from '../../document-manager.js';
import type { SessionState } from '../../session/types.js';
import type { CachedDocument } from '../../document-cache.js';
import { DocumentNotFoundError, SectionNotFoundError, AddressingError } from '../../shared/addressing-system.js';
import * as utilities from '../../shared/utilities.js';

describe('move tool', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let performSectionEditSpy: any;

  beforeEach(() => {
    manager = createDocumentManager();
    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0
    };

    // Mock performSectionEdit to track calls and avoid actual file operations
    performSectionEditSpy = vi.spyOn(utilities, 'performSectionEdit').mockResolvedValue({
      action: 'edited',
      section: 'test-section'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should throw error when from parameter missing', async () => {
      await expect(move({
        to: '/api/doc.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow('from parameter is required');
    });

    it('should throw error when to parameter missing', async () => {
      await expect(move({
        from: '/api/doc.md#section',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow('to parameter is required');
    });

    it('should throw error when reference parameter missing', async () => {
      await expect(move({
        from: '/api/doc.md#section',
        to: '/api/doc.md',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow('reference parameter is required');
    });

    it('should throw error when position parameter missing', async () => {
      await expect(move({
        from: '/api/doc.md#section',
        to: '/api/doc.md',
        reference: 'overview'
      }, sessionState, manager))
        .rejects.toThrow('position parameter is required');
    });

    it('should throw error when position is invalid', async () => {
      await expect(move({
        from: '/api/doc.md#section',
        to: '/api/doc.md',
        reference: 'overview',
        position: 'invalid'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });

    it('should throw error when from path does not include section', async () => {
      await expect(move({
        from: '/api/doc.md',
        to: '/api/other.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });

    it('should throw error when from path has invalid format', async () => {
      await expect(move({
        from: '/api/doc.md#',
        to: '/api/other.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });
  });

  describe('Source Document and Section Validation', () => {
    it('should throw DocumentNotFoundError when source document does not exist', async () => {
      vi.spyOn(manager, 'getDocument').mockResolvedValue(null);

      await expect(move({
        from: '/nonexistent/doc.md#section',
        to: '/api/doc.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow(DocumentNotFoundError);
    });

    it('should throw SectionNotFoundError when source section does not exist', async () => {
      const mockSourceDoc = {
        content: '# Source\n\n## Overview\n\nContent',
        headings: [
          { slug: 'source', title: 'Source', depth: 1 },
          { slug: 'overview', title: 'Overview', depth: 2 }
        ],
        sections: new Map([
          ['source', ''],
          ['overview', 'Content']
        ]),
        metadata: {
          path: '/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockSourceDoc);

      await expect(move({
        from: '/api/source.md#nonexistent',
        to: '/api/dest.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow(SectionNotFoundError);
    });

    it('should throw error when source content cannot be read', async () => {
      const mockSourceDoc = {
        content: '# Source\n\n## Section\n\nContent',
        headings: [
          { slug: 'source', title: 'Source', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 }
        ],
        sections: new Map([
          ['source', ''],
          ['section', 'Content']
        ]),
        metadata: {
          path: '/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockSourceDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(null);

      await expect(move({
        from: '/api/source.md#section',
        to: '/api/dest.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });
  });

  describe('Destination Document and Reference Validation', () => {
    it('should throw DocumentNotFoundError when destination document does not exist', async () => {
      const mockSourceDoc = {
        content: '# Source\n\n## Section\n\nContent',
        headings: [
          { slug: 'source', title: 'Source', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 }
        ],
        sections: new Map([
          ['source', ''],
          ['section', 'Content']
        ]),
        metadata: {
          path: '/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockSourceDoc)
        .mockResolvedValueOnce(null);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content');

      await expect(move({
        from: '/api/source.md#section',
        to: '/nonexistent/dest.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow(DocumentNotFoundError);
    });

    it('should throw SectionNotFoundError when reference section does not exist in destination', async () => {
      const mockSourceDoc = {
        content: '# Source\n\n## Section\n\nSource content',
        headings: [
          { slug: 'source', title: 'Source', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 }
        ],
        sections: new Map([
          ['source', ''],
          ['section', 'Source content']
        ]),
        metadata: {
          path: '/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      const mockDestDoc = {
        content: '# Destination\n\n## Other\n\nDest content',
        headings: [
          { slug: 'destination', title: 'Destination', depth: 1 },
          { slug: 'other', title: 'Other', depth: 2 }
        ],
        sections: new Map([
          ['destination', ''],
          ['other', 'Dest content']
        ]),
        metadata: {
          path: '/api/dest.md',
          title: 'Destination',
          lastModified: new Date(),
          contentHash: 'hash2',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockSourceDoc)
        .mockResolvedValueOnce(mockDestDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Source content');

      await expect(move({
        from: '/api/source.md#section',
        to: '/api/dest.md',
        reference: 'nonexistent',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow(SectionNotFoundError);
    });
  });

  describe('Successful Move Operations - Within Same Document', () => {
    it('should move section within same document with position "before"', async () => {
      const mockDoc = {
        content: '# Doc\n\n## Section One\n\nContent one\n\n## Section Two\n\nContent two',
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'section-one', title: 'Section One', depth: 2 },
          { slug: 'section-two', title: 'Section Two', depth: 2 }
        ],
        sections: new Map([
          ['doc', ''],
          ['section-one', 'Content one'],
          ['section-two', 'Content two']
        ]),
        metadata: {
          path: '/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content two');

      const result = await move({
        from: '/api/doc.md#section-two',
        to: '/api/doc.md',
        reference: 'section-one',
        position: 'before'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify performSectionEdit was called twice (create then delete)
      expect(performSectionEditSpy).toHaveBeenCalledTimes(2);

      // First call: create in new location
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/api/doc.md',
        'section-one',
        'Content two',
        'insert_before',
        'Section Two'
      );

      // Second call: delete from old location
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        2,
        manager,
        '/api/doc.md',
        'section-two',
        '',
        'remove'
      );

      // Verify result structure
      expect(result['action']).toBe('moved');
      expect(result['type']).toBe('section');
      expect(result['from']).toEqual({
        document: '/api/doc.md',
        section: 'section-two'
      });
      expect(result['to']).toEqual({
        document: '/api/doc.md',
        section: 'section-two',
        reference: 'section-one',
        position: 'before'
      });
    });

    it('should move section within same document with position "after"', async () => {
      const mockDoc = {
        content: '# Doc\n\n## Section One\n\nContent one\n\n## Section Two\n\nContent two',
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'section-one', title: 'Section One', depth: 2 },
          { slug: 'section-two', title: 'Section Two', depth: 2 }
        ],
        sections: new Map([
          ['doc', ''],
          ['section-one', 'Content one'],
          ['section-two', 'Content two']
        ]),
        metadata: {
          path: '/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content one');

      const result = await move({
        from: '/api/doc.md#section-one',
        to: '/api/doc.md',
        reference: 'section-two',
        position: 'after'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify insert_after mode used
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/api/doc.md',
        'section-two',
        'Content one',
        'insert_after',
        'Section One'
      );

      expect(result['to']).toHaveProperty('position', 'after');
    });

    it('should move section within same document with position "child"', async () => {
      const mockDoc = {
        content: '# Doc\n\n## Parent\n\nParent content\n\n## Section\n\nSection content',
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'parent', title: 'Parent', depth: 2 },
          { slug: 'section', title: 'Section', depth: 2 }
        ],
        sections: new Map([
          ['doc', ''],
          ['parent', 'Parent content'],
          ['section', 'Section content']
        ]),
        metadata: {
          path: '/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Section content');

      const result = await move({
        from: '/api/doc.md#section',
        to: '/api/doc.md',
        reference: 'parent',
        position: 'child'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify append_child mode used
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/api/doc.md',
        'parent',
        'Section content',
        'append_child',
        'Section'
      );

      expect(result['to']).toHaveProperty('position', 'child');
    });
  });

  describe('Successful Move Operations - Between Documents', () => {
    it('should move section from one document to another', async () => {
      const mockSourceDoc = {
        content: '# Source\n\n## Section\n\nSource content',
        headings: [
          { slug: 'source', title: 'Source', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 }
        ],
        sections: new Map([
          ['source', ''],
          ['section', 'Source content']
        ]),
        metadata: {
          path: '/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      const mockDestDoc = {
        content: '# Destination\n\n## Overview\n\nDest content',
        headings: [
          { slug: 'destination', title: 'Destination', depth: 1 },
          { slug: 'overview', title: 'Overview', depth: 2 }
        ],
        sections: new Map([
          ['destination', ''],
          ['overview', 'Dest content']
        ]),
        metadata: {
          path: '/api/dest.md',
          title: 'Destination',
          lastModified: new Date(),
          contentHash: 'hash2',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      // First two calls for source doc, next two for dest doc, last for updated dest doc
      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockSourceDoc)
        .mockResolvedValueOnce(mockDestDoc)
        .mockResolvedValueOnce(mockDestDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Source content');

      const result = await move({
        from: '/api/source.md#section',
        to: '/api/dest.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify performSectionEdit was called twice
      expect(performSectionEditSpy).toHaveBeenCalledTimes(2);

      // First call: create in destination
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/api/dest.md',
        'overview',
        'Source content',
        'insert_after',
        'Section'
      );

      // Second call: delete from source
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        2,
        manager,
        '/api/source.md',
        'section',
        '',
        'remove'
      );

      // Verify result
      expect(result['action']).toBe('moved');
      expect(result['from']).toEqual({
        document: '/api/source.md',
        section: 'section'
      });
      expect(result['to']).toEqual({
        document: '/api/dest.md',
        section: 'section',
        reference: 'overview',
        position: 'after'
      });

      // Verify document info for both source and destination
      const sourceInfo = result['source_document_info'] as Record<string, unknown>;
      expect(sourceInfo['slug']).toBe('source');
      expect(sourceInfo['namespace']).toBe('api');

      const destInfo = result['destination_document_info'] as Record<string, unknown>;
      expect(destInfo['slug']).toBe('dest');
      expect(destInfo['namespace']).toBe('api');
    });
  });

  describe('Task Move Operations', () => {
    it('should detect and move task (type=task in result)', async () => {
      const mockSourceDoc = {
        content: '# Source\n\n## Tasks\n\n### Task One\n\n- Status: pending\n\nTask content',
        headings: [
          { slug: 'source', title: 'Source', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'task-one', title: 'Task One', depth: 3 }
        ],
        sections: new Map([
          ['source', ''],
          ['tasks', ''],
          ['task-one', '- Status: pending\n\nTask content']
        ]),
        metadata: {
          path: '/project/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 8
        }
      } as unknown as CachedDocument;

      const mockDestDoc = {
        content: '# Destination\n\n## Tasks\n\n### Task Two\n\n- Status: completed\n\nDone',
        headings: [
          { slug: 'destination', title: 'Destination', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'task-two', title: 'Task Two', depth: 3 }
        ],
        sections: new Map([
          ['destination', ''],
          ['tasks', ''],
          ['task-two', '- Status: completed\n\nDone']
        ]),
        metadata: {
          path: '/project/dest.md',
          title: 'Destination',
          lastModified: new Date(),
          contentHash: 'hash2',
          wordCount: 8
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockSourceDoc)
        .mockResolvedValueOnce(mockDestDoc)
        .mockResolvedValueOnce(mockDestDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('- Status: pending\n\nTask content');

      // Mock isTaskSection to return true
      vi.spyOn(await import('../../shared/addressing-system.js'), 'isTaskSection').mockResolvedValue(true);

      const result = await move({
        from: '/project/source.md#task-one',
        to: '/project/dest.md',
        reference: 'task-two',
        position: 'after'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify type is 'task'
      expect(result['type']).toBe('task');
      expect(result['action']).toBe('moved');
    });
  });

  describe('Reference Slug Normalization', () => {
    it('should normalize reference with leading # to slug without #', async () => {
      const mockSourceDoc = {
        content: '# Source\n\n## Section\n\nContent',
        headings: [
          { slug: 'source', title: 'Source', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 }
        ],
        sections: new Map([
          ['source', ''],
          ['section', 'Content']
        ]),
        metadata: {
          path: '/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      const mockDestDoc = {
        content: '# Dest\n\n## Overview\n\nContent',
        headings: [
          { slug: 'dest', title: 'Dest', depth: 1 },
          { slug: 'overview', title: 'Overview', depth: 2 }
        ],
        sections: new Map([
          ['dest', ''],
          ['overview', 'Content']
        ]),
        metadata: {
          path: '/api/dest.md',
          title: 'Dest',
          lastModified: new Date(),
          contentHash: 'hash2',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockSourceDoc)
        .mockResolvedValueOnce(mockDestDoc)
        .mockResolvedValueOnce(mockDestDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content');

      await move({
        from: '/api/source.md#section',
        to: '/api/dest.md',
        reference: '#overview', // With leading #
        position: 'after'
      }, sessionState, manager);

      // Verify normalized slug (without #) was used
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/api/dest.md',
        'overview', // No leading #
        'Content',
        'insert_after',
        'Section'
      );
    });

    it('should handle reference without leading # correctly', async () => {
      const mockSourceDoc = {
        content: '# Source\n\n## Section\n\nContent',
        headings: [
          { slug: 'source', title: 'Source', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 }
        ],
        sections: new Map([
          ['source', ''],
          ['section', 'Content']
        ]),
        metadata: {
          path: '/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      const mockDestDoc = {
        content: '# Dest\n\n## Overview\n\nContent',
        headings: [
          { slug: 'dest', title: 'Dest', depth: 1 },
          { slug: 'overview', title: 'Overview', depth: 2 }
        ],
        sections: new Map([
          ['dest', ''],
          ['overview', 'Content']
        ]),
        metadata: {
          path: '/api/dest.md',
          title: 'Dest',
          lastModified: new Date(),
          contentHash: 'hash2',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockSourceDoc)
        .mockResolvedValueOnce(mockDestDoc)
        .mockResolvedValueOnce(mockDestDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content');

      await move({
        from: '/api/source.md#section',
        to: '/api/dest.md',
        reference: 'overview', // Without leading #
        position: 'after'
      }, sessionState, manager);

      // Verify slug was used as-is
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/api/dest.md',
        'overview',
        'Content',
        'insert_after',
        'Section'
      );
    });
  });

  describe('Data Safety - Create Before Delete', () => {
    it('should create in new location BEFORE deleting from old location', async () => {
      const mockDoc = {
        content: '# Doc\n\n## Section One\n\nContent one\n\n## Section Two\n\nContent two',
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'section-one', title: 'Section One', depth: 2 },
          { slug: 'section-two', title: 'Section Two', depth: 2 }
        ],
        sections: new Map([
          ['doc', ''],
          ['section-one', 'Content one'],
          ['section-two', 'Content two']
        ]),
        metadata: {
          path: '/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content two');

      await move({
        from: '/api/doc.md#section-two',
        to: '/api/doc.md',
        reference: 'section-one',
        position: 'before'
      }, sessionState, manager);

      // Verify call order
      const calls = performSectionEditSpy.mock.calls;
      expect(calls.length).toBe(2);

      // First call should be create (insert_before)
      expect(calls[0]?.[4]).toBe('insert_before');

      // Second call should be delete (remove)
      expect(calls[1]?.[4]).toBe('remove');
    });

    it('should throw error if creation fails but not leave partial state', async () => {
      const mockDoc = {
        content: '# Doc\n\n## Section\n\nContent',
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 }
        ],
        sections: new Map([
          ['doc', ''],
          ['section', 'Content']
        ]),
        metadata: {
          path: '/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content');

      // Mock performSectionEdit to fail on first call (creation)
      performSectionEditSpy.mockRejectedValueOnce(new Error('Creation failed'));

      await expect(move({
        from: '/api/doc.md#section',
        to: '/api/doc.md',
        reference: 'doc',
        position: 'child'
      }, sessionState, manager))
        .rejects.toThrow();

      // Verify only creation was attempted, deletion was never called
      expect(performSectionEditSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Structure', () => {
    it('should return comprehensive result with all required fields', async () => {
      const mockSourceDoc = {
        content: '# Source\n\n## Section\n\nContent',
        headings: [
          { slug: 'source', title: 'Source', depth: 1 },
          { slug: 'section', title: 'Section', depth: 2 }
        ],
        sections: new Map([
          ['source', ''],
          ['section', 'Content']
        ]),
        metadata: {
          path: '/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      const mockDestDoc = {
        content: '# Dest\n\n## Overview\n\nContent',
        headings: [
          { slug: 'dest', title: 'Dest', depth: 1 },
          { slug: 'overview', title: 'Overview', depth: 2 }
        ],
        sections: new Map([
          ['dest', ''],
          ['overview', 'Content']
        ]),
        metadata: {
          path: '/api/dest.md',
          title: 'Dest',
          lastModified: new Date(),
          contentHash: 'hash2',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockSourceDoc)
        .mockResolvedValueOnce(mockDestDoc)
        .mockResolvedValueOnce(mockDestDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content');

      const result = await move({
        from: '/api/source.md#section',
        to: '/api/dest.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify all required fields
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('from');
      expect(result).toHaveProperty('to');
      expect(result).toHaveProperty('source_document_info');
      expect(result).toHaveProperty('destination_document_info');
      expect(result).toHaveProperty('timestamp');

      // Verify from structure
      const from = result['from'] as Record<string, unknown>;
      expect(from).toHaveProperty('document');
      expect(from).toHaveProperty('section');

      // Verify to structure
      const to = result['to'] as Record<string, unknown>;
      expect(to).toHaveProperty('document');
      expect(to).toHaveProperty('section');
      expect(to).toHaveProperty('reference');
      expect(to).toHaveProperty('position');

      // Verify document info structures
      const sourceInfo = result['source_document_info'] as Record<string, unknown>;
      expect(sourceInfo).toHaveProperty('slug');
      expect(sourceInfo).toHaveProperty('title');
      expect(sourceInfo).toHaveProperty('namespace');

      const destInfo = result['destination_document_info'] as Record<string, unknown>;
      expect(destInfo).toHaveProperty('slug');
      expect(destInfo).toHaveProperty('title');
      expect(destInfo).toHaveProperty('namespace');
    });

    it('should include timestamp in ISO format', async () => {
      const mockDoc = {
        content: '# Doc\n\n## Section One\n\nOne\n\n## Section Two\n\nTwo',
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'section-one', title: 'Section One', depth: 2 },
          { slug: 'section-two', title: 'Section Two', depth: 2 }
        ],
        sections: new Map([
          ['doc', ''],
          ['section-one', 'One'],
          ['section-two', 'Two']
        ]),
        metadata: {
          path: '/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 8
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Two');

      const result = await move({
        from: '/api/doc.md#section-two',
        to: '/api/doc.md',
        reference: 'section-one',
        position: 'before'
      }, sessionState, manager) as Record<string, unknown>;

      expect(result['timestamp']).toBeDefined();
      expect(typeof result['timestamp']).toBe('string');
      // Verify ISO format (basic check)
      expect(result['timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
