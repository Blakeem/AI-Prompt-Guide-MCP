/**
 * Unit tests for task tool - Bulk operations only
 *
 * Tests the task tool with bulk operations support for creating, editing, and listing tasks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { task } from '../task.js';
import type { DocumentManager } from '../../../document-manager.js';
import type { SessionState } from '../../../session/types.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import { resolve } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('task tool - Bulk Operations', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;
  let testDir: string;
  let docsDir: string;

  beforeEach(async () => {
    // Create temporary test directory with unique ID
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testDir = await mkdtemp(resolve(tmpdir(), `task-test-${uniqueId}-`));
    docsDir = resolve(testDir, 'docs');
    await mkdir(docsDir, { recursive: true });

    // Create document manager using shared utility
    manager = createDocumentManager(docsDir);

    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0
    };
  });

  afterEach(async () => {
    // Clean up test directory
    if (testDir != null) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Parameter Validation', () => {
    it('should throw error when operations array is missing', async () => {
      await expect(task({
        document: '/test.md'
      }, sessionState, manager))
        .rejects.toThrow('operations array is required');
    });

    it('should throw error when operations is not an array', async () => {
      await expect(task({
        document: '/test.md',
        operations: 'not-an-array'
      }, sessionState, manager))
        .rejects.toThrow('operations array is required');
    });

    it('should throw error when operations array is empty', async () => {
      await expect(task({
        document: '/test.md',
        operations: []
      }, sessionState, manager))
        .rejects.toThrow('operations array cannot be empty');
    });

    it('should throw error when document parameter is missing', async () => {
      await expect(task({
        operations: [{ operation: 'list' }]
      }, sessionState, manager))
        .rejects.toThrow('document');
    });
  });

  describe('Single Create Operation', () => {
    it('should create a single task via operations array', async () => {
      // Create a test document with Tasks section
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          {
            operation: 'create',
            title: 'Implement Feature',
            content: 'Status: pending\n\nBuild feature X'
          }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.document).toBe('/test.md');
      expect(result.operations_completed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.operation).toBe('create');
      expect(result.results[0]?.status).toBe('created');
      expect(result.results[0]?.task?.slug).toBe('implement-feature');
      expect(result.results[0]?.task?.title).toBe('Implement Feature');
    });

    it('should return error when create operation missing required fields', async () => {
      // Create a test document
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          {
            operation: 'create',
            content: 'Missing title'
          }
        ]
      }, sessionState, manager);

      expect(result.results[0]?.status).toBe('error');
      expect(result.results[0]?.error).toContain('title and content');
    });
  });

  describe('Multiple Create Operations', () => {
    it('should create multiple tasks in one call', async () => {
      // Create a test document
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' },
          { operation: 'create', title: 'Task 3', content: 'Status: pending\n\nContent 3' }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.operations_completed).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]?.status).toBe('created');
      expect(result.results[1]?.status).toBe('created');
      expect(result.results[2]?.status).toBe('created');
    });
  });

  describe('Single List Operation', () => {
    it('should list tasks via operations array', async () => {
      // Create a test document with a task
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n### Existing Task\n\nStatus: pending\n\nTask content';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          { operation: 'list' }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.operations_completed).toBe(1);
      expect(result.results[0]?.operation).toBe('list');
      expect(result.results[0]?.status).toBe('listed');
      expect(result.results[0]?.tasks).toBeDefined();
      expect(result.results[0]?.count).toBeGreaterThan(0);
    });

    it('should list tasks with status filter', async () => {
      // Create a test document with multiple tasks
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n### Task 1\n\nStatus: pending\n\nContent\n\n### Task 2\n\nStatus: completed\n\nContent';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          { operation: 'list', status: 'pending' }
        ]
      }, sessionState, manager);

      expect(result.results[0]?.tasks).toBeDefined();
      const tasks = result.results[0]?.tasks;
      expect(tasks).toBeDefined();
      if (tasks != null) {
        // Should only return pending tasks
        expect(tasks.every(t => t.status === 'pending')).toBe(true);
      }
    });
  });

  describe('Single Edit Operation', () => {
    it('should edit a task via operations array', async () => {
      // Create a test document with a task
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n### Existing Task\n\nStatus: pending\n\nOld content';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          {
            operation: 'edit',
            task: 'existing-task',
            content: 'Status: in_progress\n\nUpdated content'
          }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.operations_completed).toBe(1);
      expect(result.results[0]?.operation).toBe('edit');
      expect(result.results[0]?.status).toBe('updated');
    });

    it('should return error when edit operation missing required fields', async () => {
      // Create a test document
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          {
            operation: 'edit',
            content: 'New content'
          }
        ]
      }, sessionState, manager);

      expect(result.results[0]?.status).toBe('error');
      expect(result.results[0]?.error).toContain('task and content');
    });
  });

  describe('Mixed Operations', () => {
    it('should handle create and list in one call', async () => {
      // Create a test document
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          { operation: 'create', title: 'New Task', content: 'Status: pending\n\nContent' },
          { operation: 'list' }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.operations_completed).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.operation).toBe('create');
      expect(result.results[1]?.operation).toBe('list');
    });

    it('should handle multiple operation types in sequence', async () => {
      // Create a test document with a task
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n### Existing Task\n\nStatus: pending\n\nOld content';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          { operation: 'create', title: 'New Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'New Task 2', content: 'Status: pending\n\nContent 2' },
          { operation: 'edit', task: 'existing-task', content: 'Status: completed\n\nUpdated' },
          { operation: 'list' }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.operations_completed).toBe(4);
      expect(result.results).toHaveLength(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle partial failures gracefully', async () => {
      // Create a test document
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          { operation: 'create', title: 'Valid Task', content: 'Status: pending\n\nContent' },
          { operation: 'edit', task: 'nonexistent', content: 'Will fail' }
        ]
      }, sessionState, manager);

      expect(result.results[0]?.status).toBe('created');
      expect(result.results[1]?.status).toBe('error');
      expect(result.operations_completed).toBe(1);
    });

    it('should continue processing after encountering an error', async () => {
      // Create a test document
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent' },
          { operation: 'create', title: 'Missing content' }, // Will fail
          { operation: 'create', title: 'Task 3', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      expect(result.results[0]?.status).toBe('created');
      expect(result.results[1]?.status).toBe('error');
      expect(result.results[2]?.status).toBe('created');
      expect(result.operations_completed).toBe(2);
    });
  });

  describe('Response Structure', () => {
    it('should return properly formatted bulk response', async () => {
      // Create a test document
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          { operation: 'create', title: 'Test Task', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      // Verify response structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('document');
      expect(result).toHaveProperty('operations_completed');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('timestamp');

      expect(result.success).toBe(true);
      expect(result.document).toBe('/test.md');
      expect(typeof result.operations_completed).toBe('number');
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.timestamp).toBe('string');
    });

    it('should use date-only timestamp format', async () => {
      // Create a test document
      const docPath = resolve(testDir, 'docs', 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await task({
        document: '/test.md',
        operations: [
          { operation: 'create', title: 'Test Task', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      // Timestamp should be date-only (YYYY-MM-DD)
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
