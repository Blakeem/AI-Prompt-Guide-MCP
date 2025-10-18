/**
 * Comprehensive unit tests for the section tool (bulk operations only)
 */

import { describe, test, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { section } from './section.js';
import { performSectionEdit } from '../../shared/utilities.js';
import type { DocumentManager } from '../../document-manager.js';
import type { SessionState } from '../../session/types.js';

// Mock dependencies
vi.mock('../../shared/utilities.js', () => ({
  performSectionEdit: vi.fn(),
  pathToNamespace: vi.fn(() => 'test-namespace'),
  pathToSlug: vi.fn(() => 'test-slug'),
  getSlugDepth: vi.fn(() => 2),
  getParentSlug: vi.fn(() => 'parent-slug'),
  validateSlugPath: vi.fn(() => ({ success: true, result: 'valid-slug' })),
  resolveLinkWithContext: vi.fn()
}));

// Mock link-utils module
vi.mock('../../shared/link-utils.js', () => ({
  resolveLinkWithContext: vi.fn(() => Promise.resolve({
    validation: { valid: true },
    resolvedPath: null
  }))
}));

const mockPerformSectionEdit = performSectionEdit as MockedFunction<typeof performSectionEdit>;

// Mock DocumentManager
const createMockDocumentManager = (): Partial<DocumentManager> => ({
  getDocument: vi.fn(() => Promise.resolve({
    metadata: {
      path: '/test-doc.md',
      title: 'Test Document',
      lastModified: new Date(),
      contentHash: 'mock-hash',
      wordCount: 100,
      linkCount: 5,
      codeBlockCount: 2,
      lastAccessed: new Date(),
      cacheGeneration: 1,
      namespace: 'root',
      keywords: ['test', 'document'],
      fingerprintGenerated: new Date()
    },
    headings: [],
    toc: [],
    slugIndex: new Map()
  })),
  updateSection: vi.fn(),
  insertSection: vi.fn(),
  getSectionContent: vi.fn(),
  searchDocuments: vi.fn(() => Promise.resolve([]))
});

// Mock session state
const mockSessionState: SessionState = {
  sessionId: 'test-session-123',
  createDocumentStage: 0
};

describe('Section Tool - Bulk Operations Only', () => {
  let mockDocumentManager: DocumentManager;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'section-test-'));

    // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
    process.env['MCP_WORKSPACE_PATH'] = tempDir;

    vi.clearAllMocks();
    mockDocumentManager = createMockDocumentManager() as DocumentManager;
  });

  afterEach(async () => {
    // Clean up temporary directory and all its contents
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  describe('Bulk Edit Operations', () => {
    test('should handle single replace operation via operations array', async () => {
      const args = {
        document: '/test-doc.md',
        operations: [{
          section: 'overview',
          content: 'Updated overview content.',
          operation: 'replace'
        }]
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(mockPerformSectionEdit).toHaveBeenCalledWith(
        mockDocumentManager,
        '/test-doc.md',
        'overview',
        'Updated overview content.',
        'replace',
        undefined
      );

      expect(result).toEqual({
        success: true,
        document: '/test-doc.md',
        operations_completed: 1,
        results: [{
          section: 'overview',
          status: 'updated'
        }]
      });
    });

    test('should handle multiple operations', async () => {
      const args = {
        document: '/test-doc.md',
        operations: [
          {
            section: 'overview',
            content: 'Updated overview.',
            operation: 'replace'
          },
          {
            section: 'features',
            content: 'New feature section.',
            operation: 'insert_after',
            title: 'New Feature'
          },
          {
            section: 'api-reference',
            content: 'Additional API info.',
            operation: 'append'
          }
        ]
      };

      mockPerformSectionEdit
        .mockResolvedValueOnce({ action: 'edited', section: 'overview' })
        .mockResolvedValueOnce({ action: 'created', section: 'new-feature', depth: 2 })
        .mockResolvedValueOnce({ action: 'edited', section: 'api-reference' });

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(mockPerformSectionEdit).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: true,
        document: '/test-doc.md',
        operations_completed: 3,
        results: [
          { section: 'overview', status: 'updated' },
          { section: 'new-feature', status: 'created', depth: 2 },
          { section: 'api-reference', status: 'updated' }
        ]
      });
    });

    test('should handle insert_before operation', async () => {
      const args = {
        document: '/test-doc.md',
        operations: [{
          section: 'features',
          content: 'New section content.',
          operation: 'insert_before',
          title: 'New Section'
        }]
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'created',
        section: 'new-section',
        depth: 2
      });

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toEqual({
        success: true,
        document: '/test-doc.md',
        operations_completed: 1,
        results: [{
          section: 'new-section',
          status: 'created',
          depth: 2
        }]
      });
    });

    test('should handle remove operation', async () => {
      const args = {
        document: '/test-doc.md',
        operations: [{
          section: 'deprecated',
          content: '',
          operation: 'remove'
        }]
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'removed',
        section: 'deprecated',
        removedContent: 'Old content'
      });

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toEqual({
        success: true,
        document: '/test-doc.md',
        operations_completed: 1,
        results: [{
          section: 'deprecated',
          status: 'removed'
        }]
      });
    });
  });

  describe('Error Handling', () => {
    test('should reject missing operations array', async () => {
      const args = {
        document: '/test-doc.md'
        // No operations field
      };

      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow('operations array is required');
    });

    test('should reject empty operations array', async () => {
      const args = {
        document: '/test-doc.md',
        operations: []
      };

      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow('operations array cannot be empty');
    });

    test('should reject non-array operations', async () => {
      const args = {
        document: '/test-doc.md',
        operations: 'not-an-array'
      };

      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow('operations array is required and must be an array');
    });

    test('should handle partial failures gracefully', async () => {
      const args = {
        document: '/test-doc.md',
        operations: [
          {
            section: 'overview',
            content: 'Valid update.',
            operation: 'replace'
          },
          {
            section: 'invalid-section',
            content: 'This will fail.',
            operation: 'replace'
          },
          {
            section: 'features',
            content: 'Another valid update.',
            operation: 'append'
          }
        ]
      };

      mockPerformSectionEdit
        .mockResolvedValueOnce({ action: 'edited', section: 'overview' })
        .mockRejectedValueOnce(new Error('Section not found: invalid-section'))
        .mockResolvedValueOnce({ action: 'edited', section: 'features' });

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toEqual({
        success: true,
        document: '/test-doc.md',
        operations_completed: 2, // Only successful operations count
        results: [
          { section: 'overview', status: 'updated' },
          { section: 'invalid-section', status: 'error', error: 'Section not found: invalid-section' },
          { section: 'features', status: 'updated' }
        ]
      });
    });

    test('should handle missing document path', async () => {
      const args = {
        operations: [{
          section: 'overview',
          content: 'Content',
          operation: 'replace'
        }]
      };

      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow('document path is required');
    });
  });

  describe('Path Normalization', () => {
    test('should normalize document path by adding leading slash', async () => {
      const args = {
        document: 'relative/path/doc.md',
        operations: [{
          section: 'overview',
          content: 'Content.',
          operation: 'replace'
        }]
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      await section(args, mockSessionState, mockDocumentManager);

      expect(mockPerformSectionEdit).toHaveBeenCalledWith(
        mockDocumentManager,
        '/relative/path/doc.md',
        'overview',
        'Content.',
        'replace',
        undefined
      );
    });
  });

  describe('Response Format Validation', () => {
    test('should include document path when all operations on same document', async () => {
      const args = {
        document: '/test-doc.md',
        operations: [
          { section: 'overview', content: 'Content 1', operation: 'replace' },
          { section: 'features', content: 'Content 2', operation: 'replace' }
        ]
      };

      mockPerformSectionEdit
        .mockResolvedValueOnce({ action: 'edited', section: 'overview' })
        .mockResolvedValueOnce({ action: 'edited', section: 'features' });

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toHaveProperty('document', '/test-doc.md');
    });
  });

  describe('Multiple Documents', () => {
    test('should handle operations across multiple documents', async () => {
      const args = {
        document: '/doc1.md',
        operations: [
          {
            section: 'section1',
            content: 'Content 1.',
            operation: 'replace'
          }
        ]
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'section1'
      });

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toEqual({
        success: true,
        document: '/doc1.md',
        operations_completed: 1,
        results: [
          { section: 'section1', status: 'updated' }
        ]
      });
    });
  });

  describe('Operation Types', () => {
    test('should handle all operation types correctly', async () => {
      const testCases = [
        { operation: 'replace', expectedAction: 'edited' },
        { operation: 'append', expectedAction: 'edited' },
        { operation: 'prepend', expectedAction: 'edited' },
        { operation: 'insert_before', expectedAction: 'created', title: 'New' },
        { operation: 'insert_after', expectedAction: 'created', title: 'New' },
        { operation: 'append_child', expectedAction: 'created', title: 'New' },
        { operation: 'remove', expectedAction: 'removed' }
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        const args = {
          document: '/test-doc.md',
          operations: [{
            section: 'test',
            content: 'Test content',
            operation: testCase.operation,
            ...(testCase.title != null && { title: testCase.title })
          }]
        };

        mockPerformSectionEdit.mockResolvedValue({
          action: testCase.expectedAction as 'edited' | 'created' | 'removed',
          section: 'test'
        });

        const result = await section(args, mockSessionState, mockDocumentManager);

        expect(result).toMatchObject({
          success: true,
          operations_completed: 1
        });
      }
    });
  });
});
