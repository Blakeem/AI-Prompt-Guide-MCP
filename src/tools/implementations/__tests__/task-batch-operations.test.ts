/**
 * Tests for task tool batch operations to verify cache consistency
 *
 * This test file specifically verifies that sequential task operations in a batch
 * work correctly after the cache invalidation fixes in DocumentManager.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DocumentManager } from '../../../document-manager.js';
import { DocumentCache } from '../../../document-cache.js';
import { task } from '../task.js';
import type { SessionState } from '../../../session/types.js';

describe('Task Batch Operations - Cache Consistency', () => {
  let testDir: string;
  let cache: DocumentCache;
  let manager: DocumentManager;
  const testDoc = '/test-batch-tasks.md';
  const mockSessionState: SessionState = {
    sessionId: 'test-session',
    createDocumentStage: 0
  };

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `mcp-task-batch-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create cache and manager instances
    cache = new DocumentCache(testDir);
    manager = new DocumentManager(testDir, cache);

    // Create test document with Tasks section
    const testContent = `# Test Document

## Tasks

`;
    const testPath = path.join(testDir, 'test-batch-tasks.md');
    await fs.writeFile(testPath, testContent, 'utf-8');
  });

  afterEach(async () => {
    // Wait for any pending debounced operations (e.g., TOC updates)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Cleanup
    await cache.destroy();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should handle sequential task creation in batch without race conditions', async () => {
    // Create multiple tasks in sequence - each depends on previous tasks existing
    const result = await task(
      {
        document: testDoc,
        operations: [
          {
            operation: 'create',
            title: 'Task 1',
            content: 'Status: pending\n\nFirst task'
          },
          {
            operation: 'create',
            title: 'Task 2',
            content: 'Status: pending\n\nSecond task'
          },
          {
            operation: 'create',
            title: 'Task 3',
            content: 'Status: pending\n\nThird task'
          }
        ]
      },
      mockSessionState,
      manager
    );

    // All operations should succeed
    expect(result.success).toBe(true);
    expect(result.operations_completed).toBe(3);

    // Verify no errors in results
    const errors = result.results.filter(r => r.status === 'error');
    expect(errors).toHaveLength(0);

    // Verify all tasks were created
    const created = result.results.filter(r => r.status === 'created');
    expect(created).toHaveLength(3);

    // Verify document has all tasks
    const doc = await manager.getDocument(testDoc);
    expect(doc).not.toBeNull();

    const taskSlugs = ['task-1', 'task-2', 'task-3'];
    for (const slug of taskSlugs) {
      const taskHeading = doc?.headings.find(h => h.slug === slug);
      expect(taskHeading).toBeDefined();
    }
  });

  it('should handle create followed by edit in batch', async () => {
    // First create a task, then edit it in the same batch
    const result = await task(
      {
        document: testDoc,
        operations: [
          {
            operation: 'create',
            title: 'Edit Test Task',
            content: 'Status: pending\n\nOriginal content'
          },
          {
            operation: 'edit',
            task: 'edit-test-task',
            content: 'Status: in_progress\n\nUpdated content'
          }
        ]
      },
      mockSessionState,
      manager
    );

    // Both operations should succeed
    expect(result.success).toBe(true);
    expect(result.operations_completed).toBe(2);

    // Verify no errors
    const errors = result.results.filter(r => r.status === 'error');
    expect(errors).toHaveLength(0);

    // Verify task was created and edited
    const taskContent = await manager.getSectionContent(testDoc, 'edit-test-task');
    // Note: Underscores in markdown are escaped, so we check for the escaped version
    expect(taskContent).toContain('in\\_progress');
    expect(taskContent).toContain('Updated content');
  });

  it('should handle create followed by list in batch', async () => {
    // Create tasks and then list them in the same batch
    const result = await task(
      {
        document: testDoc,
        operations: [
          {
            operation: 'create',
            title: 'List Test 1',
            content: 'Status: pending\n\nTask 1'
          },
          {
            operation: 'create',
            title: 'List Test 2',
            content: 'Status: completed\n\nTask 2'
          },
          {
            operation: 'list'
          }
        ]
      },
      mockSessionState,
      manager
    );

    // All operations should succeed
    expect(result.success).toBe(true);
    expect(result.operations_completed).toBe(3);

    // Find the list result
    const listResult = result.results.find(r => r.operation === 'list');
    expect(listResult).toBeDefined();
    expect(listResult?.status).toBe('listed');

    // List should include the newly created tasks
    expect(listResult?.count).toBeGreaterThanOrEqual(2);
    expect(listResult?.tasks).toBeDefined();

    const taskSlugs = listResult?.tasks?.map(t => t.slug) ?? [];
    expect(taskSlugs).toContain('list-test-1');
    expect(taskSlugs).toContain('list-test-2');
  });

  it('should handle mixed operations without cache inconsistencies', async () => {
    // Complex scenario: create, edit, list, create, list
    const result = await task(
      {
        document: testDoc,
        operations: [
          {
            operation: 'create',
            title: 'Mixed Task 1',
            content: 'Status: pending\n\nTask 1'
          },
          {
            operation: 'edit',
            task: 'mixed-task-1',
            content: 'Status: in_progress\n\nTask 1 updated'
          },
          {
            operation: 'list',
            status: 'in_progress'
          },
          {
            operation: 'create',
            title: 'Mixed Task 2',
            content: 'Status: pending\n\nTask 2'
          },
          {
            operation: 'list'
          }
        ]
      },
      mockSessionState,
      manager
    );

    // All operations should succeed
    expect(result.success).toBe(true);
    expect(result.operations_completed).toBe(5);

    // Verify no errors
    const errors = result.results.filter(r => r.status === 'error');
    expect(errors).toHaveLength(0);

    // First list should show only in_progress task
    const firstList = result.results[2];
    expect(firstList?.operation).toBe('list');
    expect(firstList?.tasks?.length).toBe(1);
    expect(firstList?.tasks?.[0]?.slug).toBe('mixed-task-1');

    // Second list should show both tasks
    const secondList = result.results[4];
    expect(secondList?.operation).toBe('list');
    expect(secondList?.count).toBe(2);
  });
});
