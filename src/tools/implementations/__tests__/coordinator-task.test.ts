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
import { resolve, join } from 'node:path';
import { mkdtemp, rm, mkdir, access, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('coordinator_task tool', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;
  let testDir: string;
  let docsDir: string;

  beforeEach(async () => {
    // Set MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = process.env["MCP_WORKSPACE_PATH"] ?? "/tmp/test-workspace";

    // Create temporary test directory with unique ID
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testDir = await mkdtemp(resolve(tmpdir(), `coordinator-task-test-${uniqueId}-`));

    // Configure MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = testDir;
    docsDir = resolve(testDir, 'docs');
    const coordinatorDir = resolve(testDir, 'coordinator');
    await mkdir(docsDir, { recursive: true });
    await mkdir(coordinatorDir, { recursive: true });

    // Create document manager using shared utility (root is testDir)
    manager = createDocumentManager(docsDir);

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

      expect(result.operations_completed).toBe(1);
      expect(result.results).toHaveLength(1);

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

      expect(result.operations_completed).toBe(1);
      expect(result.results).toHaveLength(1);

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

      expect(result.operations_completed).toBe(3);
      expect(result.results).toHaveLength(3);
      // Each result should have task data (no status/operation fields)
      expect(result.results[0]?.task).toBeDefined();
      expect(result.results[1]?.task).toBeDefined();
      expect(result.results[2]?.task).toBeDefined();
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

      expect(result.operations_completed).toBe(1);
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

      expect(result.operations_completed).toBe(1);
      // Edit operation returns empty result object on success
      expect(result.results[0]).toBeDefined();
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

      expect(result.operations_completed).toBe(100);
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

      // Verify optimized response structure (no success, document, or timestamp fields)
      expect(result).toHaveProperty('operations_completed');
      expect(result).toHaveProperty('results');

      expect(typeof result.operations_completed).toBe('number');
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.operations_completed).toBe(1);
    });
  });

  describe('Relative Path Returns', () => {
    it('should return relative paths in response (not /coordinator/ prefix)', async () => {
      // Create task and check response paths
      const result = await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Test Task',
            content: 'Status: pending\n\nTest content'
          }
        ]
      }, sessionState, manager);

      // Response should use relative path (no /coordinator/ prefix)
      expect(result.operations_completed).toBe(1);
      expect(result.results).toHaveLength(1);

      // The internal implementation should still use /coordinator/active.md for file operations
      // But any user-facing paths in responses should be relative
      const document = await manager.getDocument('/coordinator/active.md');
      expect(document).not.toBeNull();
    });

    it('should show relative path in list operation links', async () => {
      // Create tasks
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' }
        ]
      }, sessionState, manager);

      // List tasks
      const result = await coordinatorTask({
        operations: [
          { operation: 'list' }
        ]
      }, sessionState, manager);

      expect(result.results[0]?.tasks).toBeDefined();
      const tasks = result.results[0]?.tasks;
      if (tasks != null && tasks.length > 0) {
        const task = tasks[0];
        // Link should use relative path if present
        if (task?.link != null) {
          expect(task.link).not.toContain('/coordinator/');
          expect(task.link).toMatch(/^\/active\.md#/);
        }
      }
    });
  });

  describe('next_step conditional display', () => {
    it('should show next_step guidance on first task creation', async () => {
      // Arrange - create first task in new document
      const result = await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Phase 1: Initialize',
            content: 'Status: pending\n\nMain-Workflow: develop-staged-tdd\n\nInitialize the project'
          }
        ]
      }, sessionState, manager);

      // Assert - verify next_step is present with simplified guidance
      expect(result.operations_completed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.next_step).toBeDefined();
      expect(result.results[0]?.next_step).toBe('start_coordinator_task');
    });

    it('should NOT show next_step on second task creation', async () => {
      // Arrange - create first task (setup)
      await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Phase 1: Setup',
            content: 'Status: pending\n\nMain-Workflow: develop-staged-tdd\n\nSetup environment'
          }
        ]
      }, sessionState, manager);

      // Act - create second task
      const result = await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Phase 2: Implementation',
            content: 'Status: pending\n\nImplement core features'
          }
        ]
      }, sessionState, manager);

      // Assert - verify next_step field is absent
      expect(result.operations_completed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.next_step).toBeUndefined();
    });

    it('should NOT show next_step on third or subsequent task creation', async () => {
      // Arrange - create first and second tasks
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nMain-Workflow: develop-staged-tdd\n\nFirst task' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nSecond task' }
        ]
      }, sessionState, manager);

      // Act - create third task
      const result = await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 3', content: 'Status: pending\n\nThird task' }
        ]
      }, sessionState, manager);

      // Assert - verify next_step is still absent
      expect(result.operations_completed).toBe(1);
      expect(result.results[0]?.next_step).toBeUndefined();
    });

    it('should only show next_step on first task in multi-task creation', async () => {
      // Act - create multiple tasks at once in new document
      const result = await coordinatorTask({
        operations: [
          { operation: 'create', title: 'First Task', content: 'Status: pending\n\nMain-Workflow: develop-staged-tdd\n\nContent 1' },
          { operation: 'create', title: 'Second Task', content: 'Status: pending\n\nContent 2' },
          { operation: 'create', title: 'Third Task', content: 'Status: pending\n\nContent 3' }
        ]
      }, sessionState, manager);

      // Assert - only first result should have simplified next_step
      expect(result.operations_completed).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]?.next_step).toBeDefined();
      expect(result.results[0]?.next_step).toBe('start_coordinator_task');
      expect(result.results[1]?.next_step).toBeUndefined();
      expect(result.results[2]?.next_step).toBeUndefined();
    });
  });

  describe('Filesystem Path Verification', () => {
    it('should create coordinator tasks at correct physical location', async () => {
      // Act - create a coordinator task
      await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Test Task',
            content: 'Status: pending\n\nTest content'
          }
        ]
      }, sessionState, manager);

      // Assert - verify physical file exists at correct location
      const coordinatorDir = resolve(testDir, 'coordinator');
      const activePath = join(coordinatorDir, 'active.md');

      // Verify coordinator directory exists
      await expect(access(coordinatorDir)).resolves.toBeUndefined();

      // Verify active.md file exists
      await expect(access(activePath)).resolves.toBeUndefined();

      // Verify file content
      const content = await readFile(activePath, 'utf8');
      expect(content).toContain('# Coordinator Tasks');
      expect(content).toContain('## Test Task');
      expect(content).toContain('Test content');
    });

    it('should verify virtual path /coordinator/active.md maps to physical coordinator directory', async () => {
      // Act - create task using virtual path
      await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Verify Path Mapping',
            content: 'Status: pending\n\nVerify virtual path mapping'
          }
        ]
      }, sessionState, manager);

      // Assert - verify virtual path resolves to correct physical location
      const virtualPath = '/coordinator/active.md';
      const resolvedPath = manager.pathResolver.resolve(virtualPath);
      const expectedPath = join(testDir, 'coordinator', 'active.md');

      expect(resolvedPath).toBe(expectedPath);

      // Verify file exists at resolved path
      await expect(access(resolvedPath)).resolves.toBeUndefined();

      // Verify content through DocumentManager
      const document = await manager.getDocument(virtualPath);
      expect(document).not.toBeNull();
      if (document != null) {
        expect(document.metadata.title).toBe('Coordinator Tasks');
        const verifyPathTask = document.headings.find(h => h.slug === 'verify-path-mapping');
        expect(verifyPathTask).toBeDefined();
      }
    });

    it('should create coordinator directory if it does not exist', async () => {
      // Arrange - ensure coordinator directory does not exist (fresh test)
      const coordinatorDir = resolve(testDir, 'coordinator');

      // Act - create first coordinator task (should auto-create directory)
      await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Auto Create Dir',
            content: 'Status: pending\n\nAuto-create coordinator directory'
          }
        ]
      }, sessionState, manager);

      // Assert - verify coordinator directory was created
      await expect(access(coordinatorDir)).resolves.toBeUndefined();

      // Verify active.md file was created inside
      const activePath = join(coordinatorDir, 'active.md');
      await expect(access(activePath)).resolves.toBeUndefined();
    });

    it('should use VirtualPathResolver for coordinator namespace routing', async () => {
      // Act - create coordinator task
      await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Test Resolver',
            content: 'Status: pending\n\nTest VirtualPathResolver'
          }
        ]
      }, sessionState, manager);

      // Assert - verify VirtualPathResolver correctly identifies coordinator path
      const virtualPath = '/coordinator/active.md';
      expect(manager.pathResolver.isCoordinatorPath(virtualPath)).toBe(true);

      // Verify base root is coordinator root (not docs root)
      const baseRoot = manager.pathResolver.getBaseRoot(virtualPath);
      const expectedRoot = manager.pathResolver.getCoordinatorRoot();
      expect(baseRoot).toBe(expectedRoot);

      // Verify docs paths are NOT coordinator paths
      expect(manager.pathResolver.isCoordinatorPath('/api/auth.md')).toBe(false);
    });

    it('should verify pathResolver.getCoordinatorRoot() returns correct directory', async () => {
      // Act - get coordinator root from resolver
      const coordinatorRoot = manager.pathResolver.getCoordinatorRoot();
      const expectedRoot = resolve(testDir, 'coordinator');

      // Assert - verify coordinator root matches expected location
      expect(coordinatorRoot).toBe(expectedRoot);

      // Create a task to ensure directory is created
      await coordinatorTask({
        operations: [
          {
            operation: 'create',
            title: 'Root Verification',
            content: 'Status: pending\n\nVerify coordinator root'
          }
        ]
      }, sessionState, manager);

      // Verify physical directory exists at the root location
      await expect(access(coordinatorRoot)).resolves.toBeUndefined();
    });

    it('should create multiple tasks in same physical file', async () => {
      // Act - create multiple tasks
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task One', content: 'Status: pending\n\nFirst task' },
          { operation: 'create', title: 'Task Two', content: 'Status: pending\n\nSecond task' },
          { operation: 'create', title: 'Task Three', content: 'Status: pending\n\nThird task' }
        ]
      }, sessionState, manager);

      // Assert - verify all tasks are in single physical file
      const activePath = join(testDir, 'coordinator', 'active.md');
      const content = await readFile(activePath, 'utf8');

      expect(content).toContain('## Task One');
      expect(content).toContain('## Task Two');
      expect(content).toContain('## Task Three');

      // Verify only ONE file exists (not multiple files)
      const coordinatorDir = resolve(testDir, 'coordinator');
      const fs = await import('node:fs/promises');
      const files = await fs.readdir(coordinatorDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles).toHaveLength(1);
      expect(mdFiles[0]).toBe('active.md');
    });
  });
});
