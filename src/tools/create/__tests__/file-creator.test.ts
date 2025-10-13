/**
 * Unit tests for file-creator.ts
 * Tests document creation with Tasks section handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DocumentManager } from '../../../document-manager.js';
import { DocumentCache } from '../../../document-cache.js';
import { createDocumentFile } from '../file-creator.js';
import { loadConfig } from '../../../config.js';
import { rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionState } from '../../../session/types.js';

describe('createDocumentFile', () => {
  let manager: DocumentManager;
  let cache: DocumentCache;
  let testDocsPath: string;

  beforeEach(async () => {
    const config = loadConfig();
    testDocsPath = join(config.docsBasePath, 'test-file-creator');

    // Create fresh test directory
    try {
      await rm(testDocsPath, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await mkdir(testDocsPath, { recursive: true });

    cache = new DocumentCache(config.docsBasePath);
    manager = new DocumentManager(config.docsBasePath, cache);
  });

  afterEach(async () => {
    // Wait for any pending debounced operations (e.g., TOC updates)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Destroy cache before cleanup
    await cache.destroy();

    // Clean up test directory
    try {
      await rm(testDocsPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Tasks section creation', () => {
    it('should create document without Tasks section', async () => {
      const content = '# Test Document\n\nTest overview.\n\n## Table of Contents\n';
      const docPath = '/test-file-creator/no-tasks.md';

      const result = await createDocumentFile(
        'test-file-creator',
        'Test Document',
        'Test overview',
        manager,
        content,
        docPath,
        'test-document'
      );

      expect(result).toHaveProperty('success', true);
      if ('success' in result && result.success) {
        const document = await manager.getDocument(docPath);
        expect(document).toBeDefined();

        // Should not have Tasks section
        const tasksHeading = document?.headings.find(h =>
          h.title.toLowerCase() === 'tasks'
        );
        expect(tasksHeading).toBeUndefined();
      }
    });


    it('should allow Tasks section to be created later via task tool', async () => {
      // This test verifies that the task tool can auto-create the Tasks section
      // when the first task is added (Unit 2 feature)
      const content = '# Test Document\n\nTest overview.\n\n## Table of Contents\n';
      const docPath = '/test-file-creator/auto-tasks.md';

      const result = await createDocumentFile(
        'test-file-creator',
        'Test Document',
        'Test overview',
        manager,
        content,
        docPath,
        'test-document'
      );

      expect(result).toHaveProperty('success', true);
      if ('success' in result && result.success) {
        // Import task tool functionality
        const { task } = await import('../../implementations/task.js');

        const mockSessionState: SessionState = {
          sessionId: 'test-session',
          createDocumentStage: 0
        };

        // Create a task - should auto-create Tasks section (Unit 2 feature)
        const taskResult = await task(
          {
            document: docPath,
            operations: [{
              operation: 'create',
              title: 'First Task',
              content: 'Task description'
            }]
          },
          mockSessionState,
          manager
        );

        expect(taskResult).toHaveProperty('success', true);

        // Verify Tasks section was auto-created
        const document = await manager.getDocument(docPath);
        const tasksHeading = document?.headings.find(h =>
          h.title.toLowerCase() === 'tasks'
        );
        expect(tasksHeading).toBeDefined();
        expect(tasksHeading?.depth).toBe(2);
      }
    });
  });

  describe('Document creation validation', () => {
    it('should reject invalid document path', async () => {
      const content = '# Test\n\nContent\n';
      const invalidPath = '../../../etc/passwd'; // Path traversal attempt

      const result = await createDocumentFile(
        'test-file-creator',
        'Test',
        'Content',
        manager,
        content,
        invalidPath,
        'test'
      );

      expect(result).toHaveProperty('error');
      if ('error' in result) {
        expect(result.error).toContain('Invalid document path');
      }
    });

    it('should handle empty content gracefully', async () => {
      const content = '';
      const docPath = '/test-file-creator/empty.md';

      const result = await createDocumentFile(
        'test-file-creator',
        'Empty Document',
        'No content',
        manager,
        content,
        docPath,
        'empty-document'
      );

      // Should succeed - empty documents are valid
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('Cache refresh behavior', () => {
    it('should refresh cache after document creation', async () => {
      const content = '# Fresh Document\n\nContent here.\n\n## Table of Contents\n';
      const docPath = '/test-file-creator/fresh.md';

      const result = await createDocumentFile(
        'test-file-creator',
        'Fresh Document',
        'Content here',
        manager,
        content,
        docPath,
        'fresh-document'
      );

      expect(result).toHaveProperty('success', true);

      // Verify document is in cache and accessible
      const document = await manager.getDocument(docPath);
      expect(document).toBeDefined();
      expect(document?.metadata.title).toBe('Fresh Document');
    });
  });
});
