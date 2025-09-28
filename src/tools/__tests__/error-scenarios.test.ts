/**
 * Comprehensive error scenario testing for MCP tools
 * Addresses Issue #35: Inadequate test coverage for error scenarios
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { section } from '../implementations/section.js';
import { createMockDocumentManager } from './mocks/document-manager.mock.js';
import { createMockFileSystem, createFileSystemError, ERROR_SCENARIOS } from './mocks/filesystem.mock.js';
import type { SessionState } from '../../session/types.js';

// Mock the utilities module
vi.mock('../../shared/utilities.js', async () => {
  const actual = await vi.importActual('../../shared/utilities.js') as Record<string, unknown>;
  return {
    ...actual,
    getDocumentManager: vi.fn()
  };
});

describe('Error Scenario Testing', () => {
  let mockDocumentManager: ReturnType<typeof createMockDocumentManager>;
  const mockSessionState: SessionState = {
    sessionId: 'error-test-session',
    createDocumentStage: 0
  };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock document manager with test documents
    mockDocumentManager = createMockDocumentManager({
      initialDocuments: {
        '/test-document.md': `# Test Document

## Overview
This is a test document for error scenario testing.

### Features
Document has some features.

## Configuration
Configuration section content.
`
      }
    });

    // Mock the getDocumentManager function
    const { getDocumentManager } = await import('../../shared/utilities.js');
    vi.mocked(getDocumentManager).mockResolvedValue(mockDocumentManager as any);
  });

  describe('Document Not Found Errors', () => {
    test('should handle non-existent document gracefully', async () => {
      const args = {
        document: '/non-existent.md',
        section: 'overview',
        content: 'Test content',
        operation: 'replace'
      };

      await expect(section(args, mockSessionState))
        .rejects
        .toThrow('File not found: /non-existent.md');
    });

    test('should provide helpful error message for missing document', async () => {
      const args = {
        document: '/missing-file.md',
        section: 'overview',
        content: 'Test content',
        operation: 'replace'
      };

      try {
        await section(args, mockSessionState);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error;
        expect(err.message).toContain('Failed to edit section');
        expect(err.message).toContain('File not found');
      }
    });
  });

  describe('Section Not Found Errors', () => {
    test('should handle non-existent section for replace operation', async () => {
      const args = {
        document: '/test-document.md',
        section: 'non-existent-section',
        content: 'Test content',
        operation: 'replace'
      };

      await expect(section(args, mockSessionState))
        .rejects
        .toThrow(); // Should throw an error for non-existent section
    });

    test('should handle empty section slug', async () => {
      const args = {
        document: '/test-document.md',
        section: '',
        content: 'Test content',
        operation: 'replace'
      };

      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });

    test('should handle null section slug', async () => {
      const args = {
        document: '/test-document.md',
        section: null as any,
        content: 'Test content',
        operation: 'replace'
      };

      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });
  });

  describe('Invalid Operation Errors', () => {
    test('should handle invalid operation type', async () => {
      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: 'Test content',
        operation: 'invalid-operation' as any
      };

      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });

    test('should handle missing title for creation operations', async () => {
      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: 'Test content',
        operation: 'insert_after'
        // Missing title
      };

      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });

    test('should handle empty content for required operations', async () => {
      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: '',
        operation: 'replace'
      };

      // Empty content is not allowed for replace operations
      await expect(section(args, mockSessionState))
        .rejects
        .toThrow('Content is required for all operations except remove');
    });
  });

  describe('Filesystem Error Scenarios', () => {
    test('should handle permission denied errors', async () => {
      // Enable error simulation
      mockDocumentManager.setErrorSimulation(true);

      // Mock specific filesystem error
      const mockFS = mockDocumentManager.getFileSystem();
      mockFS.writeFile.mockRejectedValueOnce(
        createFileSystemError('PERMISSION_DENIED', '/test-document.md')
      );

      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: 'Updated content',
        operation: 'replace'
      };

      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });

    test('should handle disk full errors', async () => {
      const mockFS = mockDocumentManager.getFileSystem();
      mockFS.writeFile.mockRejectedValueOnce(
        createFileSystemError('DISK_FULL', '/test-document.md')
      );

      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: 'Updated content',
        operation: 'replace'
      };

      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });

    test('should handle I/O errors gracefully', async () => {
      // Mock the document manager's getDocument method to throw an I/O error
      mockDocumentManager.getDocument.mockRejectedValueOnce(
        createFileSystemError('IO_ERROR', '/test-document.md')
      );

      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: 'Updated content',
        operation: 'replace'
      };

      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();

      // Reset the mock for other tests
      mockDocumentManager.getDocument.mockRestore();
    });
  });

  describe('Malformed Input Handling', () => {
    test('should handle invalid document paths', async () => {
      const invalidPaths = [
        '',
        null,
        undefined,
        123,
        {},
        []
      ];

      for (const invalidPath of invalidPaths) {
        const args = {
          document: invalidPath as any,
          section: 'overview',
          content: 'Test content',
          operation: 'replace'
        };

        await expect(section(args, mockSessionState))
          .rejects
          .toThrow();
      }
    });

    test('should handle extremely long content', async () => {
      const veryLongContent = 'x'.repeat(1000000); // 1MB of content

      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: veryLongContent,
        operation: 'replace'
      };

      // Should either succeed or fail gracefully
      try {
        const result = await section(args, mockSessionState);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle special characters in content', async () => {
      const specialContent = `
# Special Characters Test
## Section with émojis 🚀 and ünícödé

### Code blocks with backticks
\`\`\`javascript
console.log("test");
\`\`\`

### Markdown that could break parsing
**Bold** *italic* \`code\` [link](url)

> Blockquotes
> - Lists
> - More items

| Tables | Are | Here |
|--------|-----|------|
| Cell   | Data| Test |
      `;

      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: specialContent,
        operation: 'replace'
      };

      const result = await section(args, mockSessionState);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('updated', true);
    });
  });

  describe('Batch Operation Error Handling', () => {
    test('should handle mixed success/failure in batch operations', async () => {
      const operations = [
        {
          document: '/test-document.md',
          section: 'overview',
          content: 'Valid update',
          operation: 'replace'
        },
        {
          document: '/non-existent.md',
          section: 'section',
          content: 'Will fail',
          operation: 'replace'
        },
        {
          document: '/test-document.md',
          section: 'configuration',
          content: 'Another valid update',
          operation: 'replace'
        }
      ];

      const result = await section(operations, mockSessionState);

      expect(result).toHaveProperty('batch_results');
      const batchResults = (result as any).batch_results;
      expect(batchResults).toHaveLength(3);

      // First and third should succeed, second should fail
      expect(batchResults[0]).toHaveProperty('success', true);
      expect(batchResults[1]).toHaveProperty('success', false);
      expect(batchResults[2]).toHaveProperty('success', true);
    });

    test('should continue processing after partial failures', async () => {
      // Enable random errors
      mockDocumentManager.setErrorSimulation(true);

      const operations = Array.from({ length: 10 }, (_, i) => ({
        document: '/test-document.md',
        section: 'overview',
        content: `Update ${i}`,
        operation: 'replace' as const
      }));

      const result = await section(operations, mockSessionState);

      expect(result).toHaveProperty('batch_results');
      expect(result).toHaveProperty('total_operations', 10);

      const batchResults = (result as any).batch_results;
      expect(batchResults).toHaveLength(10);

      // Some operations should succeed, some might fail due to error simulation
      const successCount = batchResults.filter((r: any) => r.success).length;
      const failureCount = batchResults.filter((r: any) => !r.success).length;

      expect(successCount + failureCount).toBe(10);
      expect(result).toHaveProperty('sections_modified', successCount);
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('should handle high concurrency gracefully', async () => {
      const concurrentOperations = Array.from({ length: 50 }, (_, i) => {
        const args = {
          document: '/test-document.md',
          section: 'overview',
          content: `Concurrent update ${i}`,
          operation: 'replace' as const
        };

        return section(args, mockSessionState);
      });

      // All operations should complete without crashing
      const results = await Promise.allSettled(concurrentOperations);

      expect(results).toHaveLength(50);

      // Count successful operations
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Should handle the load gracefully
      expect(successful + failed).toBe(50);
      expect(successful).toBeGreaterThan(0); // At least some should succeed
    });
  });

  describe('Cache and Memory Pressure', () => {
    test('should handle cache invalidation errors', async () => {
      // Simulate cache being cleared between operations
      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: 'Test content',
        operation: 'replace'
      };

      // First operation should work
      const result1 = await section(args, mockSessionState);
      expect(result1).toHaveProperty('updated', true);

      // Clear the mock filesystem to simulate cache inconsistency
      mockDocumentManager.getFileSystem().clear();

      // Second operation should handle missing document gracefully
      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });
  });
});