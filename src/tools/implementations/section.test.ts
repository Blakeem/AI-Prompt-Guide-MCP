/**
 * Comprehensive unit tests for the enhanced edit_section tool
 */

import { describe, test, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { section } from './section.js';
import { performSectionEdit } from '../../shared/utilities.js';
import { AddressingError } from '../../shared/addressing-system.js';
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

// Sample document structure for testing - currently unused but kept for potential future use
// const createSampleDocument = (): CachedDocument => ({
//   path: '/test-doc.md',
//   content: `# Test Document

// ## Overview

// This is the overview section.

// ## Features

// ### Feature A

// Description of feature A.

// ### Feature B

// Description of feature B.

// ## API Reference

// Documentation for the API.
// `,
//   headings: [
//     { index: 0, depth: 1, title: 'Test Document', slug: 'test-document', parentIndex: null },
//     { index: 1, depth: 2, title: 'Overview', slug: 'overview', parentIndex: 0 },
//     { index: 2, depth: 2, title: 'Features', slug: 'features', parentIndex: 0 },
//     { index: 3, depth: 3, title: 'Feature A', slug: 'feature-a', parentIndex: 2 },
//     { index: 4, depth: 3, title: 'Feature B', slug: 'feature-b', parentIndex: 2 },
//     { index: 5, depth: 2, title: 'API Reference', slug: 'api-reference', parentIndex: 0 }
//   ],
//   mtimeMs: Date.now(),
//   lastAccessed: Date.now()
// });

describe('Edit Section Tool - Enhanced Functionality', () => {
  let mockDocumentManager: DocumentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocumentManager = createMockDocumentManager() as DocumentManager;
  });

  describe('Single Edit Operations', () => {
    test('should handle replace operation successfully', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview',
        content: 'Updated overview content.',
        operation: 'replace'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(mockPerformSectionEdit).toHaveBeenCalledWith(
        mockDocumentManager,
        '/test-doc.md',
        'overview',
        'Updated overview content.',
        'replace',
        undefined
      );

      expect(result).toEqual({
        updated: true,
        document: '/test-doc.md',
        section: 'overview',
        operation: 'replace',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number),
          parent_slug: null // Top-level sections have no parent
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });

    test('should handle append operation successfully', async () => {
      // Arrange
      const args = {
        document: 'test-doc.md', // Test path normalization
        section: 'overview',
        content: 'Additional content.',
        operation: 'append'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(mockPerformSectionEdit).toHaveBeenCalledWith(
        mockDocumentManager,
        '/test-doc.md', // Should be normalized with leading slash
        'overview',
        'Additional content.',
        'append',
        undefined
      );

      expect(result).toEqual({
        updated: true,
        document: '/test-doc.md',
        section: 'overview',
        operation: 'append',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number),
          parent_slug: null // Top-level sections have no parent
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });

    test('should handle prepend operation successfully', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'features',
        content: 'Prepended content.',
        operation: 'prepend'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'features'
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toEqual({
        updated: true,
        document: '/test-doc.md',
        section: 'features',
        operation: 'prepend',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number),
          parent_slug: null // Top-level sections have no parent
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });

    test('should default to replace operation when operation not specified', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview',
        content: 'Content without operation specified.'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      // Act
      await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(mockPerformSectionEdit).toHaveBeenCalledWith(
        mockDocumentManager,
        '/test-doc.md',
        'overview',
        'Content without operation specified.',
        'replace', // Should default to replace
        undefined
      );
    });
  });

  describe('Single Creation Operations', () => {
    test('should handle insert_before operation successfully', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'features',
        content: 'New section content.',
        operation: 'insert_before',
        title: 'New Section'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'created',
        section: 'new-section',
        depth: 2
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(mockPerformSectionEdit).toHaveBeenCalledWith(
        mockDocumentManager,
        '/test-doc.md',
        'features',
        'New section content.',
        'insert_before',
        'New Section'
      );

      expect(result).toEqual({
        created: true,
        document: '/test-doc.md',
        new_section: 'new-section',
        depth: 2,
        operation: 'insert_before',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number),
          parent_slug: null // Top-level sections have no parent
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });

    test('should handle insert_after operation successfully', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview',
        content: 'Another new section.',
        operation: 'insert_after',
        title: 'Another Section'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'created',
        section: 'another-section',
        depth: 2
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toEqual({
        created: true,
        document: '/test-doc.md',
        new_section: 'another-section',
        depth: 2,
        operation: 'insert_after',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number),
          parent_slug: null // Top-level sections have no parent
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });

    test('should handle append_child operation successfully', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'features',
        content: 'Child section content.',
        operation: 'append_child',
        title: 'Feature C'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'created',
        section: 'feature-c',
        depth: 3
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toEqual({
        created: true,
        document: '/test-doc.md',
        new_section: 'feature-c',
        depth: 3,
        operation: 'append_child',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number),
          parent_slug: null // Top-level sections have no parent
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });

    test('should handle creation operation without depth in response', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'features',
        content: 'Section without depth.',
        operation: 'insert_after',
        title: 'No Depth Section'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'created',
        section: 'no-depth-section'
        // No depth property
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toEqual({
        created: true,
        document: '/test-doc.md',
        new_section: 'no-depth-section',
        operation: 'insert_after',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number),
          parent_slug: null // Top-level sections have no parent
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
        // No depth property should be included
      });
    });
  });

  describe('Batch Operations', () => {
    test('should handle mixed batch operations successfully', async () => {
      // Arrange
      const operations = [
        {
          document: '/test-doc.md',
          section: 'overview',
          content: 'Updated overview.',
          operation: 'replace'
        },
        {
          document: '/test-doc.md',
          section: 'features',
          content: 'New feature section.',
          operation: 'insert_after',
          title: 'New Feature'
        },
        {
          document: '/test-doc.md',
          section: 'api-reference',
          content: 'Additional API info.',
          operation: 'append'
        }
      ];

      // Mock responses for each operation
      mockPerformSectionEdit
        .mockResolvedValueOnce({ action: 'edited', section: 'overview' })
        .mockResolvedValueOnce({ action: 'created', section: 'new-feature', depth: 2 })
        .mockResolvedValueOnce({ action: 'edited', section: 'api-reference' });

      // Act
      const result = await section(operations, mockSessionState, mockDocumentManager);

      // Assert
      expect(mockPerformSectionEdit).toHaveBeenCalledTimes(3);

      expect(result).toEqual({
        batch_results: [
          { success: true, section: 'overview', action: 'edited' },
          { success: true, section: 'new-feature', action: 'created', depth: 2 },
          { success: true, section: 'api-reference', action: 'edited' }
        ],
        document: '/test-doc.md', // Single document
        sections_modified: 3,
        total_operations: 3,
        timestamp: expect.any(String),
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });

    test('should handle batch operations across multiple documents', async () => {
      // Arrange
      const operations = [
        {
          document: '/doc1.md',
          section: 'section1',
          content: 'Content 1.',
          operation: 'replace'
        },
        {
          document: '/doc2.md',
          section: 'section2',
          content: 'Content 2.',
          operation: 'replace'
        }
      ];

      mockPerformSectionEdit
        .mockResolvedValueOnce({ action: 'edited', section: 'section1' })
        .mockResolvedValueOnce({ action: 'edited', section: 'section2' });

      // Act
      const result = await section(operations, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toEqual({
        batch_results: [
          { success: true, section: 'section1', action: 'edited' },
          { success: true, section: 'section2', action: 'edited' }
        ],
        document: undefined, // Multiple documents, so undefined
        sections_modified: 2,
        total_operations: 2,
        timestamp: expect.any(String)
      });
    });

    test('should handle partial failures in batch operations', async () => {
      // Arrange
      const operations = [
        {
          document: '/test-doc.md',
          section: 'overview',
          content: 'Valid update.',
          operation: 'replace'
        },
        {
          document: '/test-doc.md',
          section: 'invalid-section',
          content: 'This will fail.',
          operation: 'replace'
        },
        {
          document: '/test-doc.md',
          section: 'features',
          content: 'Another valid update.',
          operation: 'append'
        }
      ];

      mockPerformSectionEdit
        .mockResolvedValueOnce({ action: 'edited', section: 'overview' })
        .mockRejectedValueOnce(new Error('Section not found: invalid-section'))
        .mockResolvedValueOnce({ action: 'edited', section: 'features' });

      // Act
      const result = await section(operations, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toEqual({
        batch_results: [
          { success: true, section: 'overview', action: 'edited' },
          { success: false, section: 'invalid-section', error: 'Section not found: invalid-section' },
          { success: true, section: 'features', action: 'edited' }
        ],
        document: '/test-doc.md',
        sections_modified: 2, // Only successful operations count
        total_operations: 3,
        timestamp: expect.any(String),
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });

    test('should handle empty batch operations array', async () => {
      // Arrange
      const operations: Record<string, unknown>[] = [];

      // Act & Assert
      await expect(section(operations, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow('Batch operations array cannot be empty');
    });

    test('should handle batch operation with missing parameters', async () => {
      // Arrange
      const operations = [
        {
          document: '/test-doc.md',
          section: 'overview',
          content: 'Valid update.',
          operation: 'replace'
        },
        {
          document: '', // Missing document
          section: 'features',
          content: 'Invalid update.',
          operation: 'replace'
        }
      ];

      mockPerformSectionEdit
        .mockResolvedValueOnce({ action: 'edited', section: 'overview' });

      // Act
      const result = await section(operations, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toEqual({
        batch_results: [
          { success: true, section: 'overview', action: 'edited' },
          {
            success: false,
            section: 'features',
            error: 'Invalid address:  - Document path cannot be empty' // Addressing system error message
          }
        ],
        document: '/test-doc.md',
        sections_modified: 1,
        total_operations: 2,
        timestamp: expect.any(String),
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should throw error for missing required parameters in single operation', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: '', // Missing section
        content: 'Some content.'
      };

      // Act & Assert
      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow();
    });

    test('should throw error for missing content in single operation', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview'
        // Missing content
      };

      // Act & Assert
      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow();
    });

    test('should throw error for missing document in single operation', async () => {
      // Arrange
      const args = {
        section: 'overview',
        content: 'Some content.'
        // Missing document
      };

      // Act & Assert
      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow();
    });

    test('should handle performSectionEdit errors with proper error format', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview',
        content: 'Content.',
        operation: 'replace'
      };

      mockPerformSectionEdit.mockRejectedValue(new Error('Document not found'));

      // Act & Assert
      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow();

      // Verify the error is now a proper AddressingError (MCP-compliant)
      try {
        await section(args, mockSessionState, mockDocumentManager);
      } catch (error) {
        expect(error).toBeInstanceOf(AddressingError);

        if (error instanceof AddressingError) {
          expect(error.code).toBe('SECTION_EDIT_ERROR');
          expect(error.message).toContain('Failed to edit section');
          expect(error.message).toContain('Document not found');
          expect(error.context).toEqual({
            args,
            originalError: 'Document not found'
          });
        }
      }
    });

    test('should handle non-Error objects in catch block', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview',
        content: 'Content.'
      };

      mockPerformSectionEdit.mockRejectedValue('String error message');

      // Act & Assert
      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow();
    });
  });

  describe('Input Validation and Normalization', () => {
    test('should normalize document path by adding leading slash', async () => {
      // Arrange
      const args = {
        document: 'relative/path/doc.md', // No leading slash
        section: 'overview',
        content: 'Content.'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      // Act
      await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(mockPerformSectionEdit).toHaveBeenCalledWith(
        mockDocumentManager,
        '/relative/path/doc.md', // Should have leading slash added
        'overview',
        'Content.',
        'replace',
        undefined
      );
    });

    test('should handle document path that already has leading slash', async () => {
      // Arrange
      const args = {
        document: '/already/absolute/path.md', // Already has leading slash
        section: 'overview',
        content: 'Content.'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      // Act
      await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(mockPerformSectionEdit).toHaveBeenCalledWith(
        mockDocumentManager,
        '/already/absolute/path.md', // Should remain unchanged
        'overview',
        'Content.',
        'replace',
        undefined
      );
    });

    test('should handle null/undefined parameters gracefully', async () => {
      // Arrange
      const args = {
        document: null,
        section: undefined,
        content: null
      };

      // Act & Assert
      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow();
    });

    test('should handle empty string parameters', async () => {
      // Arrange
      const args = {
        document: '',
        section: '',
        content: ''
      };

      // Act & Assert
      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow();
    });
  });

  describe('Response Format Validation', () => {
    test('should include timestamp in ISO format', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview',
        content: 'Content.'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      const timestamp = (result as { timestamp: string }).timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(() => new Date(timestamp)).not.toThrow();
    });

    test('should not include depth property when not provided by performSectionEdit', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'features',
        content: 'New section.',
        operation: 'insert_after',
        title: 'New Section'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'created',
        section: 'new-section'
        // No depth property
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).not.toHaveProperty('depth');
      expect(result).toEqual({
        created: true,
        document: '/test-doc.md',
        new_section: 'new-section',
        operation: 'insert_after',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number),
          parent_slug: null // Top-level sections have no parent
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });

    test('should properly format batch results with mixed successes and failures', async () => {
      // Arrange
      const operations = [
        {
          document: '/test-doc.md',
          section: 'success1',
          content: 'Content 1.',
          operation: 'replace'
        },
        {
          document: '/test-doc.md',
          section: 'failure',
          content: 'Content 2.',
          operation: 'invalid_operation'
        },
        {
          document: '/test-doc.md',
          section: 'success2',
          content: 'Content 3.',
          operation: 'append'
        }
      ];

      mockPerformSectionEdit
        .mockResolvedValueOnce({ action: 'edited', section: 'success1' })
        .mockResolvedValueOnce({ action: 'edited', section: 'success2' });

      // Act
      const result = await section(operations, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toEqual({
        batch_results: [
          { success: true, section: 'success1', action: 'edited' },
          { success: false, section: 'failure', error: 'Invalid operation: invalid_operation. Must be one of: replace, append, prepend, insert_before, insert_after, append_child, remove' },
          { success: true, section: 'success2', action: 'edited' }
        ],
        document: '/test-doc.md',
        sections_modified: 2,
        total_operations: 3,
        timestamp: expect.any(String),
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });
    });
  });

  describe('Link Assistance Feature', () => {
    test('should include link assistance in response for content with links', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview',
        content: 'This section references @/api/users.md#get-user and @#authentication.',
        operation: 'replace'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toMatchObject({
        updated: true,
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.arrayContaining([
              expect.stringContaining('@/'),
              expect.stringContaining('@#')
            ]),
            common_mistakes: expect.any(Array)
          }
        }
      });

      // Verify link assistance structure
      const linkAssistance = (result as Record<string, unknown>)['link_assistance'] as Record<string, unknown>;
      expect(linkAssistance['links_found']).toBeInstanceOf(Array);
      expect(linkAssistance['link_suggestions']).toBeInstanceOf(Array);
      expect((linkAssistance['syntax_help'] as Record<string, unknown>)['correct_examples']).toContain('@/api/specs/user-api.md - Link to entire document');
    });

    test('should include hierarchical info for all operations', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'new-section',
        content: 'New section content.',
        operation: 'insert_after',
        title: 'New Section'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'created',
        section: 'new-section',
        depth: 3
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toMatchObject({
        created: true,
        hierarchical_info: {
          slug_depth: expect.any(Number),
          parent_slug: null // Top-level sections have no parent
        }
      });

      // Verify hierarchical info is present
      const hierarchicalInfo = (result as Record<string, unknown>)['hierarchical_info'] as Record<string, unknown>;
      expect(hierarchicalInfo).toHaveProperty('slug_depth');
      expect(hierarchicalInfo).toHaveProperty('parent_slug');
    });

    test('should include document info when document is found', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview',
        content: 'Updated content.',
        operation: 'replace'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'edited',
        section: 'overview'
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toMatchObject({
        updated: true,
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });

      // Verify document info values
      const documentInfo = (result as Record<string, unknown>)['document_info'] as Record<string, unknown>;
      expect(documentInfo['slug']).toBe('test-doc'); // Addressing system correctly derives from path
      expect(documentInfo['title']).toBe('Test Document');
      expect(documentInfo['namespace']).toBe('root'); // Addressing system calculates namespace from path
    });

    test('should not include link assistance for remove operations', async () => {
      // Arrange
      const args = {
        document: '/test-doc.md',
        section: 'overview',
        content: '', // Content not required for remove
        operation: 'remove'
      };

      mockPerformSectionEdit.mockResolvedValue({
        action: 'removed',
        section: 'overview',
        removedContent: 'Original content'
      });

      // Act
      const result = await section(args, mockSessionState, mockDocumentManager);

      // Assert
      expect(result).toMatchObject({
        removed: true,
        document: '/test-doc.md',
        section: 'overview',
        removed_content: 'Original content',
        operation: 'remove',
        timestamp: expect.any(String)
      });

      // Verify link assistance is NOT included for remove operations
      expect(result).not.toHaveProperty('link_assistance');
      expect(result).not.toHaveProperty('hierarchical_info');
    });
  });
});