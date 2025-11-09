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
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { move } from '../implementations/move.js';
import { createDocumentManager } from '../../shared/utilities.js';
import type { DocumentManager } from '../../document-manager.js';
import type { SessionState } from '../../session/types.js';
import type { CachedDocument } from '../../document-cache.js';
import { DocumentNotFoundError, SectionNotFoundError, AddressingError } from '../../shared/addressing-system.js';
import * as utilities from '../../shared/utilities.js';

describe('move tool', () => {
  let manager: DocumentManager;
  let tempDir: string;
  let sessionState: SessionState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let performSectionEditSpy: any;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'move-test-'));

    // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
    process.env['MCP_WORKSPACE_PATH'] = tempDir;

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

  afterEach(async () => {
    // Clean up temporary directory and all its contents
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should throw error when from parameter missing', async () => {
      await expect(move({
        to: '/docs/api/doc.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow('from parameter is required');
    });

    it('should throw error when to parameter missing', async () => {
      await expect(move({
        from: '/docs/api/doc.md#section',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow('to parameter is required');
    });

    it('should throw error when reference parameter missing', async () => {
      await expect(move({
        from: '/docs/api/doc.md#section',
        to: '/docs/api/doc.md',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow('reference parameter is required');
    });

    it('should throw error when position parameter missing', async () => {
      await expect(move({
        from: '/docs/api/doc.md#section',
        to: '/docs/api/doc.md',
        reference: 'overview'
      }, sessionState, manager))
        .rejects.toThrow('position parameter is required');
    });

    it('should throw error when position is invalid', async () => {
      await expect(move({
        from: '/docs/api/doc.md#section',
        to: '/docs/api/doc.md',
        reference: 'overview',
        position: 'invalid'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });

    it('should throw error when from path does not include section', async () => {
      await expect(move({
        from: '/docs/api/doc.md',
        to: '/docs/api/other.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });

    it('should throw error when from path has invalid format', async () => {
      await expect(move({
        from: '/docs/api/doc.md#',
        to: '/docs/api/other.md',
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
        from: '/docs/nonexistent/doc.md#section',
        to: '/docs/api/doc.md',
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
          path: '/docs/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockSourceDoc);

      await expect(move({
        from: '/docs/api/source.md#nonexistent',
        to: '/docs/api/dest.md',
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
          path: '/docs/api/source.md',
          title: 'Source',
          lastModified: new Date(),
          contentHash: 'hash1',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockSourceDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(null);

      await expect(move({
        from: '/docs/api/source.md#section',
        to: '/docs/api/dest.md',
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
          path: '/docs/api/source.md',
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
        from: '/docs/api/source.md#section',
        to: '/docs/nonexistent/dest.md',
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
          path: '/docs/api/source.md',
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
          path: '/docs/api/dest.md',
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
        from: '/docs/api/source.md#section',
        to: '/docs/api/dest.md',
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
          path: '/docs/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content two');

      const result = await move({
        from: '/docs/api/doc.md#section-two',
        to: '/docs/api/doc.md',
        reference: 'section-one',
        position: 'before'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify performSectionEdit was called twice (remove then create for same-document)
      expect(performSectionEditSpy).toHaveBeenCalledTimes(2);

      // First call: delete from old location (same-document strategy)
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/docs/api/doc.md',
        'section-two',
        '',
        'remove'
      );

      // Second call: create in new location
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        2,
        manager,
        '/docs/api/doc.md',
        'section-one',
        'Content two',
        'insert_before',
        'Section Two'
      );

      // Verify result structure
      expect(result['moved_to']).toBe('/docs/api/doc.md#section-two');
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
          path: '/docs/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content one');

      const result = await move({
        from: '/docs/api/doc.md#section-one',
        to: '/docs/api/doc.md',
        reference: 'section-two',
        position: 'after'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify call order for same-document move (remove then create)
      expect(performSectionEditSpy).toHaveBeenCalledTimes(2);

      // First call: remove from old location
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/docs/api/doc.md',
        'section-one',
        '',
        'remove'
      );

      // Second call: create at new location with insert_after mode
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        2,
        manager,
        '/docs/api/doc.md',
        'section-two',
        'Content one',
        'insert_after',
        'Section One'
      );

      // Verify result structure
      expect(result['moved_to']).toBe('/docs/api/doc.md#section-one');
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
          path: '/docs/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Section content');

      const result = await move({
        from: '/docs/api/doc.md#section',
        to: '/docs/api/doc.md',
        reference: 'parent',
        position: 'child'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify call order for same-document move (remove then create)
      expect(performSectionEditSpy).toHaveBeenCalledTimes(2);

      // First call: remove from old location
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/docs/api/doc.md',
        'section',
        '',
        'remove'
      );

      // Second call: create at new location with append_child mode
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        2,
        manager,
        '/docs/api/doc.md',
        'parent',
        'Section content',
        'append_child',
        'Section'
      );

      // Verify result structure
      expect(result['moved_to']).toBe('/docs/api/doc.md#section');
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
          path: '/docs/api/source.md',
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
          path: '/docs/api/dest.md',
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
        from: '/docs/api/source.md#section',
        to: '/docs/api/dest.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify performSectionEdit was called twice
      expect(performSectionEditSpy).toHaveBeenCalledTimes(2);

      // First call: create in destination
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/docs/api/dest.md',
        'overview',
        'Source content',
        'insert_after',
        'Section'
      );

      // Second call: delete from source
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        2,
        manager,
        '/docs/api/source.md',
        'section',
        '',
        'remove'
      );

      // Verify result
      expect(result['moved_to']).toBe('/docs/api/dest.md#section');
    });
  });

  describe('Task Move Operations', () => {
    it('should move task same as sections (no type field in response)', async () => {
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
          path: '/docs/project/source.md',
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
          path: '/docs/project/dest.md',
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

      const result = await move({
        from: '/docs/project/source.md#task-one',
        to: '/docs/project/dest.md',
        reference: 'task-two',
        position: 'after'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify response uses standard minimal format (no type field)
      expect(result['moved_to']).toBe('/docs/project/dest.md#task-one');
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
          path: '/docs/api/source.md',
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
          path: '/docs/api/dest.md',
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
        from: '/docs/api/source.md#section',
        to: '/docs/api/dest.md',
        reference: '#overview', // With leading #
        position: 'after'
      }, sessionState, manager);

      // Verify normalized slug (without #) was used
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/docs/api/dest.md',
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
          path: '/docs/api/source.md',
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
          path: '/docs/api/dest.md',
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
        from: '/docs/api/source.md#section',
        to: '/docs/api/dest.md',
        reference: 'overview', // Without leading #
        position: 'after'
      }, sessionState, manager);

      // Verify slug was used as-is
      expect(performSectionEditSpy).toHaveBeenNthCalledWith(
        1,
        manager,
        '/docs/api/dest.md',
        'overview',
        'Content',
        'insert_after',
        'Section'
      );
    });
  });

  describe('Data Safety - Different Strategies for Same vs Cross-Document', () => {
    it('should use remove-then-create for same-document moves to avoid duplicates', async () => {
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
          path: '/docs/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content two');

      await move({
        from: '/docs/api/doc.md#section-two',
        to: '/docs/api/doc.md',
        reference: 'section-one',
        position: 'before'
      }, sessionState, manager);

      // Verify call order for same-document move
      const calls = performSectionEditSpy.mock.calls;
      expect(calls.length).toBe(2);

      // First call should be REMOVE (delete from old location)
      expect(calls[0]?.[4]).toBe('remove');
      expect(calls[0]?.[2]).toBe('section-two');

      // Second call should be CREATE (insert at new location)
      expect(calls[1]?.[4]).toBe('insert_before');
      expect(calls[1]?.[2]).toBe('section-one');
    });

    it('should use create-then-remove for cross-document moves for data safety', async () => {
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
          path: '/docs/api/source.md',
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
          path: '/docs/api/dest.md',
          title: 'Destination',
          lastModified: new Date(),
          contentHash: 'hash2',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockSourceDoc)
        .mockResolvedValueOnce(mockDestDoc)
        .mockResolvedValueOnce(mockDestDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Source content');

      await move({
        from: '/docs/api/source.md#section',
        to: '/docs/api/dest.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager);

      // Verify call order for cross-document move
      const calls = performSectionEditSpy.mock.calls;
      expect(calls.length).toBe(2);

      // First call should be CREATE (insert at new location)
      expect(calls[0]?.[4]).toBe('insert_after');
      expect(calls[0]?.[1]).toBe('/docs/api/dest.md');

      // Second call should be REMOVE (delete from old location)
      expect(calls[1]?.[4]).toBe('remove');
      expect(calls[1]?.[1]).toBe('/docs/api/source.md');
    });

    it('should rollback same-document move if create fails after remove', async () => {
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
          path: '/docs/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content two');

      // Mock performSectionEdit to succeed on remove, fail on create, succeed on rollback
      performSectionEditSpy
        .mockResolvedValueOnce({ action: 'edited' }) // Remove succeeds
        .mockRejectedValueOnce(new Error('Create failed')) // Create fails
        .mockResolvedValueOnce({ action: 'edited' }); // Rollback succeeds

      await expect(move({
        from: '/docs/api/doc.md#section-two',
        to: '/docs/api/doc.md',
        reference: 'section-one',
        position: 'before'
      }, sessionState, manager))
        .rejects.toThrow('Create failed');

      // Verify rollback was attempted (3 calls: remove, create fail, rollback)
      expect(performSectionEditSpy).toHaveBeenCalledTimes(3);

      // Last call should be rollback (insert_before)
      const calls = performSectionEditSpy.mock.calls;
      expect(calls[2]?.[4]).toBe('insert_before');
    });

    it('should throw detailed error if both create and rollback fail', async () => {
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
          path: '/docs/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content');

      // Mock performSectionEdit to succeed on remove, fail on both create and rollback
      performSectionEditSpy
        .mockResolvedValueOnce({ action: 'edited' }) // Remove succeeds
        .mockRejectedValueOnce(new Error('Create failed')) // Create fails
        .mockRejectedValueOnce(new Error('Rollback failed')); // Rollback fails

      await expect(move({
        from: '/docs/api/doc.md#section',
        to: '/docs/api/doc.md',
        reference: 'doc',
        position: 'child'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);

      // Verify error message includes both errors
      try {
        await move({
          from: '/docs/api/doc.md#section',
          to: '/docs/api/doc.md',
          reference: 'doc',
          position: 'child'
        }, sessionState, manager);
      } catch (error) {
        if (error instanceof AddressingError) {
          expect(error.message).toContain('rollback failed');
          expect(error.message).toContain('Content may be lost');
          expect(error.code).toBe('MOVE_ROLLBACK_FAILED');
        }
      }
    });

    it('should throw error if cross-document creation fails but not leave partial state', async () => {
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
          path: '/docs/api/source.md',
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
          path: '/docs/api/dest.md',
          title: 'Dest',
          lastModified: new Date(),
          contentHash: 'hash2',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument')
        .mockResolvedValueOnce(mockSourceDoc)
        .mockResolvedValueOnce(mockDestDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Content');

      // Mock performSectionEdit to fail on first call (creation)
      performSectionEditSpy.mockRejectedValueOnce(new Error('Creation failed'));

      await expect(move({
        from: '/docs/api/source.md#section',
        to: '/docs/api/dest.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager))
        .rejects.toThrow();

      // Verify only creation was attempted, deletion was never called
      expect(performSectionEditSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Structure', () => {
    it('should return minimal result with only moved_to field', async () => {
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
          path: '/docs/api/source.md',
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
          path: '/docs/api/dest.md',
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
        from: '/docs/api/source.md#section',
        to: '/docs/api/dest.md',
        reference: 'overview',
        position: 'after'
      }, sessionState, manager) as Record<string, unknown>;

      // Verify only moved_to field is present (context efficiency)
      expect(result['moved_to']).toBe('/docs/api/dest.md#section');
      expect(result['success']).toBeUndefined();
      expect(result['position']).toBeUndefined();
      expect(Object.keys(result)).toEqual(['moved_to']);
    });

    it('should return moved_to field with correct slug based on section title', async () => {
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
          path: '/docs/api/doc.md',
          title: 'Doc',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 8
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('Two');

      const result = await move({
        from: '/docs/api/doc.md#section-two',
        to: '/docs/api/doc.md',
        reference: 'section-one',
        position: 'before'
      }, sessionState, manager) as Record<string, unknown>;

      expect(result['moved_to']).toBe('/docs/api/doc.md#section-two');
      expect(typeof result['moved_to']).toBe('string');
    });
  });
});
