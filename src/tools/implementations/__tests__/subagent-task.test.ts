/**
 * Unit tests for task tool - Bulk operations only
 *
 * Tests the task tool with bulk operations support for creating, editing, and listing tasks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { subagentTask } from '../subagent-task.js';
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
    // Set MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = process.env["MCP_WORKSPACE_PATH"] ?? "/tmp/test-workspace";

    // Create temporary test directory with unique ID
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testDir = await mkdtemp(resolve(tmpdir(), `task-test-${uniqueId}-`));

    // Configure MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = testDir;
    docsDir = resolve(testDir, 'docs');
    await mkdir(docsDir, { recursive: true });

    // Create document manager using shared utility
    // Note: testDir is the root, docsDir is {testDir}/docs
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
      await expect(subagentTask({
        document: '/docs/test.md'
      }, sessionState, manager))
        .rejects.toThrow('operations array is required');
    });

    it('should throw error when operations is not an array', async () => {
      await expect(subagentTask({
        document: '/docs/test.md',
        operations: 'not-an-array'
      }, sessionState, manager))
        .rejects.toThrow('operations array is required');
    });

    it('should throw error when operations array is empty', async () => {
      await expect(subagentTask({
        document: '/docs/test.md',
        operations: []
      }, sessionState, manager))
        .rejects.toThrow('operations array cannot be empty');
    });

    it('should throw error when document parameter is missing', async () => {
      await expect(subagentTask({
        operations: [{ operation: 'list' }]
      }, sessionState, manager))
        .rejects.toThrow('document');
    });
  });

  describe('Single Create Operation', () => {
    it('should create a single task via operations array', async () => {
      // Create a test document with Tasks section
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          {
            operation: 'create',
            title: 'Implement Feature',
            content: 'Status: pending\n\nBuild feature X'
          }
        ]
      }, sessionState, manager);

      // Optimized response - success field removed
      // Optimized response - document field removed
      expect(result.operations_completed).toBe(1);
      expect(result.results).toHaveLength(1);
      // Optimized response - operation field removed
      // Optimized response - status field removed
      expect(result.results[0]?.task?.slug).toBe('implement-feature');
      expect(result.results[0]?.task?.title).toBe('Implement Feature');
    });

    it('should return error when create operation missing required fields', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          {
            operation: 'create',
            content: 'Missing title'
          }
        ]
      }, sessionState, manager);

      expect(result.results[0]?.error).toContain('title and content');
    });
  });

  describe('Multiple Create Operations', () => {
    it('should create multiple tasks in one call', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' },
          { operation: 'create', title: 'Task 3', content: 'Status: pending\n\nContent 3' }
        ]
      }, sessionState, manager);

      expect(result.operations_completed).toBe(3);
      expect(result.results).toHaveLength(3);
    });
  });

  describe('Single List Operation', () => {
    it('should list tasks via operations array', async () => {
      // Create a test document with a task
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n### Existing Task\n\nStatus: pending\n\nTask content';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          { operation: 'list' }
        ]
      }, sessionState, manager);

      expect(result.operations_completed).toBe(1);
      expect(result.results[0]?.tasks).toBeDefined();
      expect(result.results[0]?.count).toBeGreaterThan(0);
    });

    it('should list tasks with status filter', async () => {
      // Create a test document with multiple tasks
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n### Task 1\n\nStatus: pending\n\nContent\n\n### Task 2\n\nStatus: completed\n\nContent';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
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

    it('should list tasks with has_references flag and NO referenced_documents content', async () => {
      // Create a test document with tasks, one with references
      const docPath = resolve(docsDir, 'test.md');
      const docContent = `# Test

## Tasks

### Task 1 Without References

Status: pending

Just normal content.

### Task 2 With References

Status: pending

This task references @/docs/other.md for context.

### Task 3 Also Without References

Status: completed

Normal content here too.`;
      await writeFile(docPath, docContent);

      // Create referenced document to avoid errors
      const otherDocPath = resolve(docsDir, 'other.md');
      const otherDocContent = '# Other Doc\n\nSome reference content.';
      await writeFile(otherDocPath, otherDocContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          { operation: 'list' }
        ]
      }, sessionState, manager);

      const tasks = result.results[0]?.tasks;
      expect(tasks).toBeDefined();
      expect(tasks?.length).toBe(3);

      if (tasks != null) {
        // Find tasks by title
        const task1 = tasks.find(t => t.title === 'Task 1 Without References');
        const task2 = tasks.find(t => t.title === 'Task 2 With References');
        const task3 = tasks.find(t => t.title === 'Task 3 Also Without References');

        // Task without references should NOT have has_references flag
        expect(task1?.has_references).toBeUndefined();

        // Task with references should have has_references: true
        expect(task2?.has_references).toBe(true);

        // CRITICAL: Task with references should NOT have referenced_documents in list operation
        expect(task2?.referenced_documents).toBeUndefined();

        // Task 3 also without references
        expect(task3?.has_references).toBeUndefined();

        // Verify response is compact (no massive referenced_documents content)
        const responseSize = JSON.stringify(result).length;
        // With 3 tasks and no referenced_documents content, should be < 5000 chars
        expect(responseSize).toBeLessThan(5000);
      }
    });
  });

  describe('Single Edit Operation', () => {
    it('should edit a task via operations array', async () => {
      // Create a test document with a task
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n### Existing Task\n\nStatus: pending\n\nOld content';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          {
            operation: 'edit',
            task: 'existing-task',
            content: 'Status: in_progress\n\nUpdated content'
          }
        ]
      }, sessionState, manager);

      expect(result.operations_completed).toBe(1);
    });

    it('should return error when edit operation missing required fields', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          {
            operation: 'edit',
            content: 'New content'
          }
        ]
      }, sessionState, manager);

      expect(result.results[0]?.error).toContain('task slug');
    });
  });

  describe('Mixed Operations', () => {
    it('should handle create and list in one call', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          { operation: 'create', title: 'New Task', content: 'Status: pending\n\nContent' },
          { operation: 'list' }
        ]
      }, sessionState, manager);

      expect(result.operations_completed).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('should handle multiple operation types in sequence', async () => {
      // Create a test document with a task
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n### Existing Task\n\nStatus: pending\n\nOld content';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          { operation: 'create', title: 'New Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'New Task 2', content: 'Status: pending\n\nContent 2' },
          { operation: 'edit', task: 'existing-task', content: 'Status: completed\n\nUpdated' },
          { operation: 'list' }
        ]
      }, sessionState, manager);

      expect(result.operations_completed).toBe(4);
      expect(result.results).toHaveLength(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle partial failures gracefully', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          { operation: 'create', title: 'Valid Task', content: 'Status: pending\n\nContent' },
          { operation: 'edit', task: 'nonexistent', content: 'Will fail' }
        ]
      }, sessionState, manager);

      expect(result.results[1]?.error).toBeDefined();
      expect(result.operations_completed).toBe(1);
    });

    it('should continue processing after encountering an error', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent' },
          { operation: 'create', title: 'Missing content' }, // Will fail
          { operation: 'create', title: 'Task 3', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      expect(result.results[1]?.error).toBeDefined();
      expect(result.results[2]?.task).toBeDefined();
      expect(result.operations_completed).toBe(2);
    });
  });

  describe('Response Structure', () => {
    it('should return properly formatted bulk response', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      const result = await subagentTask({
        document: '/docs/test.md',
        operations: [
          { operation: 'create', title: 'Test Task', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      // Verify response structure
      expect(result).toHaveProperty('operations_completed');
      expect(result).toHaveProperty('results');

      expect(typeof result.operations_completed).toBe('number');
      expect(Array.isArray(result.results)).toBe(true);
    });

    // Removed test: 'should use date-only timestamp format' - timestamp field no longer in response
  });

  describe('Batch Size Limits', () => {
    it('should accept batch with 100 operations (at limit)', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      // Generate exactly 100 operations
      const operations = Array.from({ length: 100 }, (_, i) => ({
        operation: 'create',
        title: `Task ${i + 1}`,
        content: `Status: pending\n\nContent ${i + 1}`
      }));

      const result = await subagentTask({
        document: '/docs/test.md',
        operations
      }, sessionState, manager);

      expect(result.results).toHaveLength(100);
    });

    it('should reject batch with 101 operations (over limit)', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      // Generate 101 operations (exceeds MAX_BATCH_SIZE)
      const operations = Array.from({ length: 101 }, (_, i) => ({
        operation: 'create',
        title: `Task ${i + 1}`,
        content: `Status: pending\n\nContent ${i + 1}`
      }));

      await expect(subagentTask({
        document: '/docs/test.md',
        operations
      }, sessionState, manager))
        .rejects.toThrow('Batch size 101 exceeds maximum of 100');
    });

    it('should include helpful context in batch size error', async () => {
      // Create a test document
      const docPath = resolve(docsDir, 'test.md');
      const docContent = '# Test\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      // Generate 101 operations
      const operations = Array.from({ length: 101 }, (_, i) => ({
        operation: 'create',
        title: `Task ${i + 1}`,
        content: `Status: pending\n\nContent ${i + 1}`
      }));

      try {
        await subagentTask({
          document: '/docs/test.md',
          operations
        }, sessionState, manager);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Verify error message includes batch size info
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('101');
          expect(error.message).toContain('100');
        }
      }
    });
  });

  describe('Auto-create Tasks Section (TDD)', () => {
    it('should auto-create Tasks section if missing when creating first task', async () => {
      // Create document WITHOUT Tasks section
      const docPath = resolve(docsDir, 'test-autocreate.md');
      const docContent = '# Test Document\n\nSome content here.\n\n';
      await writeFile(docPath, docContent);

      // Create a task - should auto-create Tasks section
      const result = await subagentTask({
        document: '/docs/test-autocreate.md',
        operations: [
          {
            operation: 'create',
            title: 'First Task',
            content: 'Status: pending\n\nThis is the first task'
          }
        ]
      }, sessionState, manager);

      // Verify task was created successfully
      expect(result.operations_completed).toBe(1);
      expect(result.results[0]?.task?.slug).toBe('first-task');

      // Verify Tasks section was created
      const document = await manager.getDocument('/docs/test-autocreate.md');
      expect(document).not.toBeNull();
      if (document != null) {
        const tasksSection = document.headings.find(h =>
          h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
        );
        expect(tasksSection).toBeDefined();
        expect(tasksSection?.title).toBe('Tasks');

        // Verify task is under Tasks section
        const taskHeading = document.headings.find(h => h.slug === 'first-task');
        expect(taskHeading).toBeDefined();
        expect(taskHeading?.title).toBe('First Task');
      }
    });

    it('should not duplicate Tasks section if already exists', async () => {
      // Create document WITH Tasks section
      const docPath = resolve(docsDir, 'test-existing.md');
      const docContent = '# Test Document\n\n## Tasks\n\n';
      await writeFile(docPath, docContent);

      // Create a task
      const result = await subagentTask({
        document: '/docs/test-existing.md',
        operations: [
          {
            operation: 'create',
            title: 'New Task',
            content: 'Status: pending\n\nTask content'
          }
        ]
      }, sessionState, manager);

      // Verify task was created successfully
      expect(result.operations_completed).toBe(1);

      // Verify only ONE Tasks section exists
      const document = await manager.getDocument('/docs/test-existing.md');
      expect(document).not.toBeNull();
      if (document != null) {
        const tasksSections = document.headings.filter(h =>
          h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
        );
        expect(tasksSections).toHaveLength(1);
      }
    });

    it('should create Tasks section at correct depth (H2)', async () => {
      // Create document with H1 title only
      const docPath = resolve(docsDir, 'test-depth.md');
      const docContent = '# Document Title\n\nSome overview content.\n\n';
      await writeFile(docPath, docContent);

      // Create a task (auto-creates Tasks)
      await subagentTask({
        document: '/docs/test-depth.md',
        operations: [
          {
            operation: 'create',
            title: 'Test Task',
            content: 'Status: pending\n\nTask content'
          }
        ]
      }, sessionState, manager);

      // Verify Tasks section is H2 (depth 2)
      const document = await manager.getDocument('/docs/test-depth.md');
      expect(document).not.toBeNull();
      if (document != null) {
        const tasksSection = document.headings.find(h =>
          h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
        );
        expect(tasksSection).toBeDefined();
        expect(tasksSection?.depth).toBe(2);
      }
    });

    it('should handle case-insensitive Tasks section detection', async () => {
      // Create document with lowercase "tasks" section
      const docPath = resolve(docsDir, 'test-case.md');
      const docContent = '# Test Document\n\n## tasks\n\n';
      await writeFile(docPath, docContent);

      // Create a task
      const result = await subagentTask({
        document: '/docs/test-case.md',
        operations: [
          {
            operation: 'create',
            title: 'Task One',
            content: 'Status: pending\n\nContent'
          }
        ]
      }, sessionState, manager);

      // Should not create duplicate, should use existing
      expect(result.operations_completed).toBe(1);

      // Verify only ONE tasks section exists
      const document = await manager.getDocument('/docs/test-case.md');
      expect(document).not.toBeNull();
      if (document != null) {
        const tasksSections = document.headings.filter(h =>
          h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
        );
        expect(tasksSections).toHaveLength(1);
      }
    });

    it('should throw error if document has no title heading (H1)', async () => {
      // Create document WITHOUT H1 title
      const docPath = resolve(docsDir, 'test-notitle.md');
      const docContent = '## Section One\n\nSome content.\n\n';
      await writeFile(docPath, docContent);

      // Try to create a task - should fail with helpful error
      const result = await subagentTask({
        document: '/docs/test-notitle.md',
        operations: [
          {
            operation: 'create',
            title: 'Test Task',
            content: 'Status: pending\n\nContent'
          }
        ]
      }, sessionState, manager);

      // Should have error result
      expect(result.results[0]?.error).toContain('title heading');
    });

    it('should create Tasks section with proper content on auto-create', async () => {
      // Create document without Tasks section
      const docPath = resolve(docsDir, 'test-content.md');
      const docContent = '# My Document\n\nOverview content.\n\n';
      await writeFile(docPath, docContent);

      // Create a task (auto-creates Tasks)
      await subagentTask({
        document: '/docs/test-content.md',
        operations: [
          {
            operation: 'create',
            title: 'First Task',
            content: 'Status: pending\n\nTask details'
          }
        ]
      }, sessionState, manager);

      // Verify Tasks section content
      const sectionContent = await manager.getSectionContent('/docs/test-content.md', 'tasks');
      expect(sectionContent).toBeDefined();
      expect(sectionContent).toContain('Task list for this document');
    });

    it('should handle multiple task creates with auto-created Tasks section', async () => {
      // Create document without Tasks section
      const docPath = resolve(docsDir, 'test-multiple.md');
      const docContent = '# Test Doc\n\nContent.\n\n';
      await writeFile(docPath, docContent);

      // Create multiple tasks in one call
      const result = await subagentTask({
        document: '/docs/test-multiple.md',
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' },
          { operation: 'create', title: 'Task 3', content: 'Status: pending\n\nContent 3' }
        ]
      }, sessionState, manager);

      // All should succeed
      expect(result.operations_completed).toBe(3);
      expect(result.results.every(r => r.task != null)).toBe(true);

      // Verify Tasks section exists and contains all tasks
      const document = await manager.getDocument('/docs/test-multiple.md');
      expect(document).not.toBeNull();
      if (document != null) {
        const tasksSection = document.headings.find(h => h.slug === 'tasks');
        expect(tasksSection).toBeDefined();

        const task1 = document.headings.find(h => h.slug === 'task-1');
        const task2 = document.headings.find(h => h.slug === 'task-2');
        const task3 = document.headings.find(h => h.slug === 'task-3');

        expect(task1).toBeDefined();
        expect(task2).toBeDefined();
        expect(task3).toBeDefined();
      }
    });
  });

  describe('next_step conditional display', () => {
    it('should show next_step guidance on first task creation', async () => {
      // Arrange - prepare new document without Tasks section
      const docPath = resolve(docsDir, 'new-project.md');
      const docContent = '# New Project\n\nProject overview content.\n\n';
      await writeFile(docPath, docContent);

      // Act - create first task in new document
      const result = await subagentTask({
        document: '/docs/new-project.md',
        operations: [
          {
            operation: 'create',
            title: 'Initialize Repository',
            content: 'Status: pending\n\nWorkflow: develop-tdd\n\nSet up initial repository structure'
          }
        ]
      }, sessionState, manager);

      // Assert - verify next_step is present and contains expected guidance
      expect(result.operations_completed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.next_step).toBeDefined();
      expect(result.results[0]?.next_step).toContain('Give subagent this exact instruction');
      expect(result.results[0]?.next_step).toContain('do not run start_subagent_task yourself');
      expect(result.results[0]?.next_step).toContain('start_subagent_task');
      expect(result.results[0]?.next_step).toContain('/docs/new-project.md#initialize-repository');
    });

    it('should NOT show next_step on second task creation', async () => {
      // Arrange - create document with first task (setup)
      const docPath = resolve(docsDir, 'existing-project.md');
      const docContent = '# Existing Project\n\n## Tasks\n\n### First Task\n\nStatus: pending\n\nExisting task content';
      await writeFile(docPath, docContent);

      // Act - create second task
      const result = await subagentTask({
        document: '/docs/existing-project.md',
        operations: [
          {
            operation: 'create',
            title: 'Second Task',
            content: 'Status: pending\n\nImplement second feature'
          }
        ]
      }, sessionState, manager);

      // Assert - verify next_step field is absent
      expect(result.operations_completed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.next_step).toBeUndefined();
    });

    it('should NOT show next_step on third or subsequent task creation', async () => {
      // Arrange - create document with multiple existing tasks
      const docPath = resolve(docsDir, 'multi-task-project.md');
      const docContent = `# Multi Task Project

## Tasks

### Task One

Status: pending

First task content

### Task Two

Status: in_progress

Second task content`;
      await writeFile(docPath, docContent);

      // Act - create third task
      const result = await subagentTask({
        document: '/docs/multi-task-project.md',
        operations: [
          {
            operation: 'create',
            title: 'Task Three',
            content: 'Status: pending\n\nThird task content'
          }
        ]
      }, sessionState, manager);

      // Assert - verify next_step is still absent
      expect(result.operations_completed).toBe(1);
      expect(result.results[0]?.next_step).toBeUndefined();
    });

    it('should only show next_step on first task in multi-task creation', async () => {
      // Arrange - prepare document without Tasks section
      const docPath = resolve(docsDir, 'batch-project.md');
      const docContent = '# Batch Project\n\nOverview content.\n\n';
      await writeFile(docPath, docContent);

      // Act - create multiple tasks at once in new document
      const result = await subagentTask({
        document: '/docs/batch-project.md',
        operations: [
          { operation: 'create', title: 'Setup Environment', content: 'Status: pending\n\nWorkflow: develop-tdd\n\nSetup dev environment' },
          { operation: 'create', title: 'Write Tests', content: 'Status: pending\n\nWrite initial test suite' },
          { operation: 'create', title: 'Implement Features', content: 'Status: pending\n\nImplement core features' }
        ]
      }, sessionState, manager);

      // Assert - only first result should have next_step
      expect(result.operations_completed).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]?.next_step).toBeDefined();
      expect(result.results[0]?.next_step).toContain('Give subagent this exact instruction');
      expect(result.results[0]?.next_step).toContain('/docs/batch-project.md#setup-environment');
      expect(result.results[1]?.next_step).toBeUndefined();
      expect(result.results[2]?.next_step).toBeUndefined();
    });

    it('should show correct full path with slug in next_step', async () => {
      // Arrange - create new document
      const docPath = resolve(docsDir, 'path-test.md');
      const docContent = '# Path Test\n\nOverview.\n\n';
      await writeFile(docPath, docContent);

      // Act - create task with specific title that creates predictable slug
      const result = await subagentTask({
        document: '/docs/path-test.md',
        operations: [
          {
            operation: 'create',
            title: 'Test Task Name',
            content: 'Status: pending\n\nTask content'
          }
        ]
      }, sessionState, manager);

      // Assert - verify the full path in next_step includes correct document and slug
      expect(result.results[0]?.next_step).toBeDefined();
      expect(result.results[0]?.next_step).toContain('/docs/path-test.md#test-task-name');
      expect(result.results[0]?.task?.slug).toBe('test-task-name');
    });
  });
});
