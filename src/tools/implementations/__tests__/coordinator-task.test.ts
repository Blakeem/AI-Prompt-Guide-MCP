/**
 * Unit tests for coordinator_task tool
 *
 * Tests the coordinator_task tool with sequential task management in /coordinator/ namespace
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { coordinatorTask } from '../coordinator-task.js';
import type { DocumentManager } from '../../../document-manager.js';
import type { SessionState } from '../../../session/types.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import { resolve } from 'node:path';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('coordinator_task tool', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;
  let testDir: string;
  let docsDir: string;

  beforeEach(async () => {
    // Create temporary test directory with unique ID
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testDir = await mkdtemp(resolve(tmpdir(), `coordinator-task-test-${uniqueId}-`));
    docsDir = resolve(testDir, 'docs');
    const coordinatorDir = resolve(testDir, 'coordinator');
    await mkdir(docsDir, { recursive: true });
    await mkdir(coordinatorDir, { recursive: true });

    // Create document manager using shared utility (root is testDir)
    manager = createDocumentManager(testDir);

    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0
    };
  });

  afterEach(async () => {
    // Destroy manager to cancel pending async operations and clean up cache
    await manager.destroy();

    // Clean up test directory
    if (testDir != null) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Parameter Validation', () => {
    it('should throw error when operations array is missing', async () => {
      await expect(coordinatorTask({}, sessionState, manager))
        .rejects.toThrow('operations array is required');
    });

    it('should throw error when operations is not an array', async () => {
      await expect(coordinatorTask({
        operations: 'not-an-array'
      }, sessionState, manager))
        .rejects.toThrow('operations array is required');
    });

    it('should throw error when operations array is empty', async () => {
      await expect(coordinatorTask({
        operations: []
      }, sessionState, manager))
        .rejects.toThrow('operations array is required and must not be empty');
    });
  });

  describe('Auto-create /coordinator/active.md', () => {
    it('should auto-create /coordinator/active.md if it does not exist', async () => {
      // Call coordinator_task without pre-creating document
      const result = await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Phase 1 Task',
            content: 'Status: pending\n\nImplement Phase 1'
          }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.document).toBe('/coordinator/active.md');
      expect(result.operations_completed).toBe(1);

      // Verify document exists
      const document = await manager.getDocument('/coordinator/active.md');
      expect(document).not.toBeNull();
      if (document != null) {
        expect(document.metadata.title).toBe('Coordinator Tasks');
      }
    });

    it('should not duplicate /coordinator/active.md if already exists', async () => {
      // Create first task (auto-creates document)
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' }
        ]
      }, sessionState, manager);

      // Create second task (should reuse existing document)
      const result = await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.operations_completed).toBe(1);

      // Verify only ONE document exists with TWO tasks
      const document = await manager.getDocument('/coordinator/active.md');
      expect(document).not.toBeNull();
      if (document != null) {
        const task1 = document.headings.find(h => h.slug === 'task-1');
        const task2 = document.headings.find(h => h.slug === 'task-2');
        expect(task1).toBeDefined();
        expect(task2).toBeDefined();
      }
    });
  });

  describe('Sequential Task Creation', () => {
    it('should create multiple tasks in sequential order', async () => {
      const result = await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Phase 1', content: 'Status: pending\n\nMain-Workflow: tdd-incremental-orchestration\n\nImplement Phase 1' },
          { operation: 'create', title: 'Phase 2', content: 'Status: pending\n\nImplement Phase 2' },
          { operation: 'create', title: 'Phase 3', content: 'Status: pending\n\nImplement Phase 3' }
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

  describe('List Operation', () => {
    it('should list tasks in sequential order', async () => {
      // Create tasks first
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task A', content: 'Status: pending\n\nContent A' },
          { operation: 'create', title: 'Task B', content: 'Status: in_progress\n\nContent B' },
          { operation: 'create', title: 'Task C', content: 'Status: completed\n\nContent C' }
        ]
      }, sessionState, manager);

      // List all tasks
      const result = await coordinatorTask({
        operations: [
          { operation: 'list' }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.results[0]?.operation).toBe('list');
      expect(result.results[0]?.status).toBe('listed');
      expect(result.results[0]?.tasks).toBeDefined();
      expect(result.results[0]?.count).toBe(3);
    });

    it('should filter tasks by status', async () => {
      // Create mixed status tasks
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: completed\n\nContent 2' }
        ]
      }, sessionState, manager);

      // Filter by pending
      const result = await coordinatorTask({
        operations: [
          { operation: 'list', status: 'pending' }
        ]
      }, sessionState, manager);

      expect(result.results[0]?.tasks).toBeDefined();
      const tasks = result.results[0]?.tasks;
      if (tasks != null) {
        expect(tasks.every(t => t.status === 'pending')).toBe(true);
        expect(tasks.length).toBe(1);
      }
    });
  });

  describe('Edit Operation', () => {
    it('should edit a task by slug', async () => {
      // Create task first
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Initial Task', content: 'Status: pending\n\nOld content' }
        ]
      }, sessionState, manager);

      // Edit task
      const result = await coordinatorTask({
        operations: [
          {
            operation: 'edit',
            task: 'initial-task',
            content: 'Status: in_progress\n\nUpdated content'
          }
        ]
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.operations_completed).toBe(1);
      expect(result.results[0]?.operation).toBe('edit');
      expect(result.results[0]?.status).toBe('updated');
    });
  });

  describe('Batch Size Limits', () => {
    it('should accept batch with 100 operations (at limit)', async () => {
      // Generate exactly 100 operations
      const operations = Array.from({ length: 100 }, (_, i) => ({
        operation: 'create' as const,
        title: `Task ${i + 1}`,
        content: `Status: pending\n\nContent ${i + 1}`
      }));

      const result = await coordinatorTask({
        operations
      }, sessionState, manager);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(100);
    });

    it('should reject batch with 101 operations (over limit)', async () => {
      // Generate 101 operations (exceeds MAX_BATCH_SIZE)
      const operations = Array.from({ length: 101 }, (_, i) => ({
        operation: 'create' as const,
        title: `Task ${i + 1}`,
        content: `Status: pending\n\nContent ${i + 1}`
      }));

      await expect(coordinatorTask({
        operations
      }, sessionState, manager))
        .rejects.toThrow('Batch size 101 exceeds maximum of 100');
    });
  });

  describe('Response Structure', () => {
    it('should return properly formatted bulk response', async () => {
      const result = await coordinatorTask({
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
      expect(result.document).toBe('/coordinator/active.md');
      expect(typeof result.operations_completed).toBe('number');
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.timestamp).toBe('string');
    });

    it('should use date-only timestamp format', async () => {
      const result = await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Test Task', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      // Timestamp should be date-only (YYYY-MM-DD)
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
