/**
 * Section integration tests - bulk operations only
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { section } from '../implementations/section.js';
import { setupTestSuite, STANDARD_TEST_DOCUMENTS } from './setup/test-environment.js';
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';

const mockSessionState: SessionState = {
  sessionId: 'improved-integration-test',
  createDocumentStage: 0
};

describe('Section Tool - Integration Tests (Bulk Operations)', () => {
  let mockDocumentManager: DocumentManager;

  const testSuite = setupTestSuite('Section Integration', {
    useRealFileSystem: false,
    enableLogging: false,
    mockFileSystemOptions: {
      initialFiles: {
        '/docs/test-document.md': STANDARD_TEST_DOCUMENTS.COMPLEX_DOC,
        '/docs/simple-document.md': STANDARD_TEST_DOCUMENTS.SIMPLE_DOC,
        '/docs/hierarchical-document.md': STANDARD_TEST_DOCUMENTS.HIERARCHICAL_DOC
      },
      simulateErrors: false
    }
  });

  beforeAll(async () => {
    await testSuite.beforeAll();
    mockDocumentManager = testSuite.getEnvironment().getMockDocumentManager() as unknown as DocumentManager;
  });

  afterAll(testSuite.afterAll);
  beforeEach(testSuite.beforeEach);
  afterEach(testSuite.afterEach);

  describe('Basic Operations', () => {
    test('should replace section content', async () => {
      const args = {
        document: '/docs/test-document.md',
        operations: [{
          section: 'overview',
          content: 'Updated overview content with new information.',
          operation: 'replace'
        }]
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toMatchObject({
        success: true,
        document: '/docs/test-document.md',
        operations_completed: 1,
        results: [{ section: 'overview', status: 'updated' }]
      });
    });

    test('should handle multiple operations', async () => {
      const args = {
        document: '/docs/test-document.md',
        operations: [
          { section: 'overview', content: 'Updated overview.', operation: 'replace' },
          { section: 'configuration', content: 'New section.', operation: 'insert_after', title: 'Troubleshooting' }
        ]
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toMatchObject({
        success: true,
        operations_completed: 2,
        results: expect.arrayContaining([
          expect.objectContaining({ section: 'overview', status: 'updated' }),
          expect.objectContaining({ status: 'created' })
        ])
      });
    });
  });

  describe('Error Handling', () => {
    test('should reject missing operations array', async () => {
      const args = {
        document: '/docs/test-document.md'
      };

      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow('operations array is required');
    });

    test('should reject empty operations array', async () => {
      const args = {
        document: '/docs/test-document.md',
        operations: []
      };

      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow('operations array cannot be empty');
    });

    test('should handle missing title for creation operations', async () => {
      const args = {
        document: '/docs/simple-document.md',
        operations: [{
          section: 'features',
          content: 'Test content',
          operation: 'insert_after'
          // Missing title
        }]
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      // Should return error in results for missing title
      expect(result).toMatchObject({
        success: true,
        operations_completed: 0,
        results: [
          expect.objectContaining({ status: 'error', section: 'features' })
        ]
      });
    });

    test('should handle document not found error', async () => {
      const args = {
        document: '/docs/non-existent.md',
        operations: [{
          section: 'overview',
          content: 'Test content',
          operation: 'replace'
        }]
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      // Should return error in results, not throw
      expect(result).toMatchObject({
        success: true,
        operations_completed: 0,
        results: [
          expect.objectContaining({ status: 'error', section: 'overview' })
        ]
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long content', async () => {
      const longContent = 'Very long content. '.repeat(1000);

      const args = {
        document: '/docs/simple-document.md',
        operations: [{
          section: 'features',
          content: longContent,
          operation: 'replace'
        }]
      };

      const result = await section(args, mockSessionState, mockDocumentManager);
      expect(result).toMatchObject({
        success: true,
        operations_completed: 1
      });
    });
  });

  describe('Batch Operations', () => {
    test('should handle batch operations with partial failures', async () => {
      const args = {
        document: '/docs/test-document.md',
        operations: [
          {
            section: 'overview',
            content: 'Valid update.',
            operation: 'replace'
          },
          {
            section: 'non-existent-section',
            content: 'Will fail.',
            operation: 'replace'
          },
          {
            section: 'configuration',
            content: 'Another valid update.',
            operation: 'replace'
          }
        ]
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toMatchObject({
        success: true,
        operations_completed: 2, // Only successful operations
        results: [
          expect.objectContaining({ section: 'overview', status: 'updated' }),
          expect.objectContaining({ section: 'non-existent-section', status: 'error' }),
          expect.objectContaining({ section: 'configuration', status: 'updated' })
        ]
      });
    });
  });

  describe('Performance', () => {
    test('should handle multiple concurrent operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => {
        const args = {
          document: '/docs/test-document.md',
          operations: [{
            section: 'overview',
            content: `Concurrent update ${i}`,
            operation: 'replace' as const
          }]
        };

        return section(args, mockSessionState, mockDocumentManager);
      });

      const results = await Promise.allSettled(concurrentOperations);

      expect(results).toHaveLength(10);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(0);
    });
  });
});
