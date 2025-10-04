/**
 * Improved section integration tests with comprehensive mocking and error scenarios
 * Addresses Issues #35, #36, #37: Test coverage, organization, and mocking
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

describe('Section Tool - Improved Integration Tests', () => {
  let mockDocumentManager: DocumentManager;

  const testSuite = setupTestSuite('Section Integration', {
    useRealFileSystem: false,
    enableLogging: false,
    mockFileSystemOptions: {
      initialFiles: {
        '/test-document.md': STANDARD_TEST_DOCUMENTS.COMPLEX_DOC,
        '/simple-document.md': STANDARD_TEST_DOCUMENTS.SIMPLE_DOC,
        '/hierarchical-document.md': STANDARD_TEST_DOCUMENTS.HIERARCHICAL_DOC
      },
      simulateErrors: false
    }
  });

  beforeAll(async () => {
    await testSuite.beforeAll();

    // Get the mock document manager from environment (dependency injection)
    mockDocumentManager = testSuite.getEnvironment().getMockDocumentManager() as unknown as DocumentManager;
  });

  afterAll(testSuite.afterAll);
  beforeEach(testSuite.beforeEach);
  afterEach(testSuite.afterEach);

  describe('Basic Operations with Mocked Dependencies', () => {
    test('should replace section content with proper response structure', async () => {
      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: 'Updated overview content with new information.',
        operation: 'replace'
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      // Verify response structure
      expect(result).toMatchObject({
        updated: true,
        document: '/test-document.md',
        section: 'overview',
        operation: 'replace',
        timestamp: expect.any(String)
      });

      // Verify document was updated
      const environment = testSuite.getEnvironment();
      const updatedContent = environment.getMockFileSystem().getFileContent('/test-document.md');
      expect(updatedContent).toContain('Updated overview content with new information.');
      expect(updatedContent).not.toContain('This is a more complex document for testing.');
    });

    test('should append content to existing section', async () => {
      const args = {
        document: '/simple-document.md',
        section: 'features',
        content: 'Additional features added.',
        operation: 'append'
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toMatchObject({
        updated: true,
        document: '/simple-document.md',
        section: 'features',
        operation: 'append'
      });

      // Verify content was appended
      const environment = testSuite.getEnvironment();
      const updatedContent = environment.getMockFileSystem().getFileContent('/simple-document.md');
      expect(updatedContent).toContain('Basic features section.');
      expect(updatedContent).toContain('Additional features added.');
    });

    test('should create new section with proper hierarchy', async () => {
      const args = {
        document: '/test-document.md',
        section: 'configuration',
        content: 'New section content for installation.',
        operation: 'insert_before',
        title: 'Installation'
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toMatchObject({
        created: true,
        document: '/test-document.md',
        new_section: 'installation',
        operation: 'insert_before'
      });

      // Verify section was created and positioned correctly
      const environment = testSuite.getEnvironment();
      const updatedContent = environment.getMockFileSystem().getFileContent('/test-document.md');
      expect(updatedContent).toContain('## Installation');
      expect(updatedContent).toContain('New section content for installation.');

      // Verify order: Installation should come before Configuration
      const installationIndex = updatedContent?.indexOf('## Installation') ?? -1;
      const configurationIndex = updatedContent?.indexOf('## Configuration') ?? -1;
      expect(installationIndex).toBeLessThan(configurationIndex);
    });
  });

  describe('Error Scenarios with Mocked Failures', () => {
    test('should handle document not found error', async () => {
      const args = {
        document: '/non-existent.md',
        section: 'overview',
        content: 'Test content',
        operation: 'replace'
      };

      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow('Failed to edit section');
    });

    test('should handle filesystem errors gracefully', async () => {
      const environment = testSuite.getEnvironment();

      // Enable error simulation
      environment.enableErrorSimulation(true);

      const args = {
        document: '/test-document.md',
        section: 'overview',
        content: 'Test content',
        operation: 'replace'
      };

      // Some operations might fail due to simulated errors
      try {
        const result = await section(args, mockSessionState, mockDocumentManager);
        // If it succeeds, verify it's a valid result
        expect(result).toBeDefined();
      } catch (error) {
        // If it fails, verify it's a proper error
        expect(error).toBeInstanceOf(Error);
      }

      // Disable error simulation for other tests
      environment.enableErrorSimulation(false);
    });

    test('should handle section not found for edit operations', async () => {
      const args = {
        document: '/simple-document.md',
        section: 'non-existent-section',
        content: 'Test content',
        operation: 'replace'
      };

      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow();
    });

    test('should handle invalid operation parameters', async () => {
      const args = {
        document: '/simple-document.md',
        section: 'features',
        content: 'Test content',
        operation: 'insert_after',
        // Missing title for creation operation
      };

      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow();
    });
  });

  describe('Batch Operations with Mixed Results', () => {
    test('should handle successful batch operations', async () => {
      const operations = [
        {
          document: '/test-document.md',
          section: 'overview',
          content: 'Updated overview.',
          operation: 'replace'
        },
        {
          document: '/simple-document.md',
          section: 'features',
          content: 'Updated features.',
          operation: 'replace'
        },
        {
          document: '/test-document.md',
          section: 'architecture',
          content: 'New troubleshooting section.',
          operation: 'insert_after',
          title: 'Troubleshooting'
        }
      ];

      const result = await section(operations, mockSessionState, mockDocumentManager);

      expect(result).toMatchObject({
        total_operations: 3,
        sections_modified: 3,
        batch_results: expect.arrayContaining([
          expect.objectContaining({ success: true }),
          expect.objectContaining({ success: true }),
          expect.objectContaining({ success: true })
        ])
      });
    });

    test('should handle batch operations with partial failures', async () => {
      const operations = [
        {
          document: '/test-document.md',
          section: 'overview',
          content: 'Valid update.',
          operation: 'replace'
        },
        {
          document: '/non-existent.md',
          section: 'section',
          content: 'Will fail.',
          operation: 'replace'
        },
        {
          document: '/simple-document.md',
          section: 'features',
          content: 'Another valid update.',
          operation: 'replace'
        }
      ];

      const result = await section(operations, mockSessionState, mockDocumentManager);

      expect(result).toMatchObject({
        total_operations: 3,
        sections_modified: 2, // Only successful operations
        batch_results: [
          expect.objectContaining({ success: true }),
          expect.objectContaining({ success: false }),
          expect.objectContaining({ success: true })
        ]
      });

      // Verify that successful operations were applied
      const environment = testSuite.getEnvironment();
      const testDoc = environment.getMockFileSystem().getFileContent('/test-document.md');
      const simpleDoc = environment.getMockFileSystem().getFileContent('/simple-document.md');

      expect(testDoc).toContain('Valid update.');
      expect(simpleDoc).toContain('Another valid update.');
    });
  });

  describe('Complex Document Structures', () => {
    test('should handle deeply nested sections', async () => {
      const args = {
        document: '/hierarchical-document.md',
        section: 'level-3a',
        content: 'Updated deep nested content.',
        operation: 'replace'
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toMatchObject({
        updated: true,
        section: 'level-3a'
      });

      const environment = testSuite.getEnvironment();
      const content = environment.getMockFileSystem().getFileContent('/hierarchical-document.md');
      expect(content).toContain('Updated deep nested content.');
    });

    test('should create child sections at appropriate depth', async () => {
      const args = {
        document: '/hierarchical-document.md',
        section: 'level-2a',
        content: 'New child section content.',
        operation: 'append_child',
        title: 'New Child Section'
      };

      const result = await section(args, mockSessionState, mockDocumentManager);

      expect(result).toMatchObject({
        created: true,
        new_section: 'new-child-section',
        operation: 'append_child'
      });

      const environment = testSuite.getEnvironment();
      const content = environment.getMockFileSystem().getFileContent('/hierarchical-document.md');
      expect(content).toContain('#### New Child Section');
      expect(content).toContain('New child section content.');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle empty content gracefully', async () => {
      const args = {
        document: '/simple-document.md',
        section: 'features',
        content: '',
        operation: 'replace'
      };

      // Empty content should be rejected
      await expect(section(args, mockSessionState, mockDocumentManager))
        .rejects
        .toThrow('Content is required');
    });

    test('should handle very long content', async () => {
      const longContent = 'Very long content. '.repeat(1000);

      const args = {
        document: '/simple-document.md',
        section: 'features',
        content: longContent,
        operation: 'replace'
      };

      const result = await section(args, mockSessionState, mockDocumentManager);
      expect(result).toMatchObject({
        updated: true,
        section: 'features'
      });

      const environment = testSuite.getEnvironment();
      const content = environment.getMockFileSystem().getFileContent('/simple-document.md');
      expect(content).toContain(longContent.substring(0, 100)); // Check first part
    });

    test('should handle special characters in content', async () => {
      const specialContent = `
# Test with Special Characters 🚀
## Émojis and Ünîcödé

### Code Block
\`\`\`javascript
console.log("Hello, world!");
\`\`\`

### Markdown Elements
**Bold**, *italic*, \`code\`, [links](http://example.com)

> Blockquotes
> - List items
> - More items

| Table | Headers |
|-------|---------|
| Cell  | Data    |
      `;

      const args = {
        document: '/simple-document.md',
        section: 'features',
        content: specialContent,
        operation: 'replace'
      };

      const result = await section(args, mockSessionState, mockDocumentManager);
      expect(result).toMatchObject({
        updated: true,
        section: 'features'
      });

      const environment = testSuite.getEnvironment();
      const content = environment.getMockFileSystem().getFileContent('/simple-document.md');
      expect(content).toContain('🚀');
      expect(content).toContain('Émojis and Ünîcödé');
      expect(content).toContain('```javascript');
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle multiple concurrent operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => {
        const args = {
          document: '/test-document.md',
          section: 'overview',
          content: `Concurrent update ${i}`,
          operation: 'replace' as const
        };

        return section(args, mockSessionState, mockDocumentManager);
      });

      const results = await Promise.allSettled(concurrentOperations);

      // All operations should complete
      expect(results).toHaveLength(10);

      // Count successful operations
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(0);

      // The last successful operation should have its content in the document
      const environment = testSuite.getEnvironment();
      const content = environment.getMockFileSystem().getFileContent('/test-document.md');
      expect(content).toMatch(/Concurrent update \d+/);
    });
  });
});