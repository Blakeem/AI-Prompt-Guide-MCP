/**
 * Unit tests for complete_coordinator_task tool
 *
 * Tests the complete_coordinator_task tool for sequential task completion and auto-archive
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { completeCoordinatorTask } from '../complete-coordinator-task.js';
import { coordinatorTask } from '../coordinator-task.js';
import type { DocumentManager } from '../../../document-manager.js';
import type { SessionState } from '../../../session/types.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import { resolve } from 'node:path';
import { mkdtemp, rm, mkdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { loadWorkflowPrompts } from '../../../prompts/workflow-prompts.js';

// Mock the workflow-prompts module to provide test workflows
vi.mock('../../../prompts/workflow-prompts.js', () => {
  const mockPrompts = [
    {
      name: 'workflow_tdd-incremental-orchestration',
      description: '🎯 COORDINATION: Orchestrate multi-agent development with TDD',
      content: '# TDD Incremental Orchestration\n\nThis is test content for TDD workflow.',
      whenToUse: [
        'Managing complex features requiring multiple developers',
        'When quality gates must be enforced',
        'Coordinating test-driven development workflows'
      ]
    },
    {
      name: 'workflow_spec-first-integration',
      description: '📋 INTEGRATION: Ensure correctness before coding',
      content: '# Spec-First Integration\n\nValidate against specifications first.',
      whenToUse: [
        'Adding new API integrations',
        'When external dependencies are involved',
        'Before implementing third-party features'
      ]
    }
  ];

  return {
    loadWorkflowPrompts: vi.fn().mockResolvedValue(mockPrompts),
    getWorkflowPrompt: vi.fn((name: string) => {
      return mockPrompts.find(p => p.name === name);
    }),
    getWorkflowPrompts: vi.fn(() => mockPrompts)
  };
});

describe('complete_coordinator_task tool', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;
  let testDir: string;
  let docsDir: string;

  beforeAll(async () => {
    // Ensure workflow prompts are loaded before any tests run
    await loadWorkflowPrompts();
  });

  beforeEach(async () => {
    // Set MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = process.env["MCP_WORKSPACE_PATH"] ?? "/tmp/test-workspace";

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testDir = await mkdtemp(resolve(tmpdir(), `complete-coordinator-test-${uniqueId}-`));

    // Configure MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = testDir;
    docsDir = resolve(testDir, 'docs');
    const coordinatorDir = resolve(testDir, 'coordinator');
    await mkdir(docsDir, { recursive: true });
    await mkdir(coordinatorDir, { recursive: true });

    // Create document manager using docsDir (NOT testDir)
    manager = createDocumentManager(docsDir);

    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0
    };
  });

  afterEach(async () => {
    await manager.destroy();
    if (testDir != null) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Sequential Task Completion', () => {
    it('should complete first pending task and return next task', async () => {
      // Create tasks
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nWorkflow: spec-first-integration\n\nContent 2' }
        ]
      }, sessionState, manager);

      // Complete first task with return_next_task flag
      const result = await completeCoordinatorTask({
        note: 'Finished implementation and testing',
        return_next_task: true
      }, sessionState, manager);

      expect(result.completed_task.slug).toBe('task-1');
      expect(result.completed_task.note).toBe('Finished implementation and testing');
      expect(result.completed_task.completed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Should return next task with workflow (no main workflow)
      expect(result.next_task).toBeDefined();
      if (result.next_task != null) {
        expect(result.next_task.slug).toBe('task-2');
        expect(result.next_task.title).toBe('Task 2');
        expect(result.next_task.workflow).toBeDefined();
      }
    });

    it('should not return main_workflow for next task', async () => {
      // Create tasks
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nMain-Workflow: tdd-incremental-orchestration\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' }
        ]
      }, sessionState, manager);

      // Complete first task with return_next_task flag
      const result = await completeCoordinatorTask({
        note: 'Done',
        return_next_task: true
      }, sessionState, manager);

      // Next task should NOT have main_workflow
      expect(result.next_task).toBeDefined();
      if (result.next_task != null) {
        expect(result.next_task).not.toHaveProperty('main_workflow');
      }
    });
  });

  describe('Auto-Archive When All Complete', () => {
    it('should auto-archive when all tasks are completed', async () => {
      // Create single task
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Only Task', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      // Complete the only task
      const result = await completeCoordinatorTask({
        note: 'All done'
      }, sessionState, manager);

      // Should indicate archived
      expect(result.archived).toBe(true);
      expect(result.archived_to).toBeDefined();
      if (result.archived_to != null) {
        expect(result.archived_to).toMatch(/^\/archived\/coordinator\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
      }

      // Should NOT have next_task
      expect(result.next_task).toBeUndefined();
    });

    it('should create archive directory if it does not exist', async () => {
      // Create and complete single task
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      await completeCoordinatorTask({
        note: 'Complete'
      }, sessionState, manager);

      // Verify archive directory was created
      const archiveDir = resolve(testDir, 'archived', 'coordinator');
      await expect(access(archiveDir)).resolves.toBeUndefined();
    });

    it('should not archive when tasks remain', async () => {
      // Create multiple tasks
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' }
        ]
      }, sessionState, manager);

      // Complete first task only (without return_next_task, next_task will not be returned)
      const result = await completeCoordinatorTask({
        note: 'Partial completion'
      }, sessionState, manager);

      // Should NOT be archived (tasks remain)
      expect(result.archived).toBeUndefined();
      // next_task is only returned when return_next_task: true is passed
      expect(result.next_task).toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('should throw error if no tasks available', async () => {
      // Create a document with a completed task (no available tasks)
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Completed Task', content: 'Status: completed\n\nCompleted: 2025-10-14\n\nDone' }
        ]
      }, sessionState, manager);

      await expect(completeCoordinatorTask({
        note: 'Nothing to complete'
      }, sessionState, manager))
        .rejects.toThrow('No available tasks');
    });

    it('should require note parameter', async () => {
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      await expect(completeCoordinatorTask({}, sessionState, manager))
        .rejects.toThrow('note');
    });
  });

  describe('Response Structure', () => {
    it('should have proper response structure', async () => {
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      const result = await completeCoordinatorTask({
        note: 'Completed successfully'
      }, sessionState, manager);

      // Optimized response structure - only essential fields
      expect(result).toHaveProperty('completed_task');
      expect(result.completed_task).toHaveProperty('completed_date');
      // completed_date should be in YYYY-MM-DD format
      expect(result.completed_task.completed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Compact Workflow Mode (Context Optimization)', () => {
    it('should return compact workflow by default (no content field)', async () => {
      // Create tasks with workflows
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nWorkflow: spec-first-integration\n\nContent 2' }
        ]
      }, sessionState, manager);

      // Complete first task with return_next_task=true, include_full_workflow=false (default)
      const result = await completeCoordinatorTask({
        note: 'Done',
        return_next_task: true
        // include_full_workflow defaults to false
      }, sessionState, manager);

      expect(result.next_task).toBeDefined();
      if (result.next_task?.workflow != null) {
        const workflow = result.next_task.workflow;

        // Should have compact fields
        expect(workflow).toHaveProperty('name');
        expect(workflow).toHaveProperty('description');
        expect(workflow).toHaveProperty('whenToUse');

        // Should NOT have content field (saves 3,000+ chars)
        expect(workflow).not.toHaveProperty('content');

        // Verify structure
        expect(workflow.name).toBe('workflow_spec-first-integration');
        expect(workflow.description).toContain('INTEGRATION');
      }
    });

    it('should return full workflow when include_full_workflow=true', async () => {
      // Create tasks with workflows
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nWorkflow: spec-first-integration\n\nContent 2' }
        ]
      }, sessionState, manager);

      // Complete first task with return_next_task=true, include_full_workflow=true
      const result = await completeCoordinatorTask({
        note: 'Done',
        return_next_task: true,
        include_full_workflow: true
      }, sessionState, manager);

      expect(result.next_task).toBeDefined();
      if (result.next_task?.workflow != null) {
        const workflow = result.next_task.workflow;

        // Should have all fields including content
        expect(workflow).toHaveProperty('name');
        expect(workflow).toHaveProperty('description');
        expect(workflow).toHaveProperty('whenToUse');
        expect(workflow).toHaveProperty('content');

        // Verify content exists and is substantial
        expect('content' in workflow).toBe(true);
        if ('content' in workflow) {
          expect(workflow.content).toContain('Spec-First Integration');
        }
      }
    });

    it('should ignore include_full_workflow when return_next_task=false', async () => {
      // Create tasks
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nWorkflow: spec-first-integration\n\nContent 2' }
        ]
      }, sessionState, manager);

      // Complete with return_next_task=false (default), include_full_workflow=true
      const result = await completeCoordinatorTask({
        note: 'Done',
        // return_next_task defaults to false
        include_full_workflow: true
      }, sessionState, manager);

      // Should not return next_task at all
      expect(result.next_task).toBeUndefined();
    });

    it('should handle tasks without workflows in compact mode', async () => {
      // Create tasks without workflows
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2 (no workflow)' }
        ]
      }, sessionState, manager);

      // Complete with return_next_task=true (compact mode by default)
      const result = await completeCoordinatorTask({
        note: 'Done',
        return_next_task: true
      }, sessionState, manager);

      expect(result.next_task).toBeDefined();
      if (result.next_task != null) {
        // Should not have workflow field at all
        expect(result.next_task.workflow).toBeUndefined();
      }
    });
  });

  describe('Relative Path Returns', () => {
    it('should use relative paths in archived_to field', async () => {
      // Create single task
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Only Task', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      // Complete the only task (triggers archive)
      const result = await completeCoordinatorTask({
        note: 'All done'
      }, sessionState, manager);

      // Should indicate archived with relative path
      expect(result.archived).toBe(true);
      expect(result.archived_to).toBeDefined();
      if (result.archived_to != null) {
        // Archive path should still use /archived/coordinator/ prefix (explicit per requirements)
        expect(result.archived_to).toMatch(/^\/archived\/coordinator\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
      }
    });
  });

  describe('Filesystem Path Verification', () => {
    it('should verify coordinator tasks are at correct physical location', async () => {
      // Act - create a coordinator task
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Test Task', content: 'Status: pending\n\nTest content' }
        ]
      }, sessionState, manager);

      // Assert - verify physical file exists at correct location
      const coordinatorDir = resolve(testDir, 'coordinator');
      const activePath = resolve(coordinatorDir, 'active.md');

      // Verify coordinator directory exists
      await expect(access(coordinatorDir)).resolves.toBeUndefined();

      // Verify active.md file exists
      await expect(access(activePath)).resolves.toBeUndefined();
    });

    it('should verify virtual path /coordinator/active.md resolution', async () => {
      // Act - create task using virtual path
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Verify Path', content: 'Status: pending\n\nVerify path mapping' }
        ]
      }, sessionState, manager);

      // Assert - verify virtual path resolves correctly
      const virtualPath = '/coordinator/active.md';
      const resolvedPath = manager.pathResolver.resolve(virtualPath);
      const expectedPath = resolve(testDir, 'coordinator', 'active.md');

      expect(resolvedPath).toBe(expectedPath);

      // Verify file exists at resolved path
      await expect(access(resolvedPath)).resolves.toBeUndefined();
    });

    it('should verify archive operations use correct paths', async () => {
      // Arrange - create and complete task to trigger archive
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Archive Test', content: 'Status: pending\n\nTest archive' }
        ]
      }, sessionState, manager);

      // Act - complete task (triggers auto-archive)
      const result = await completeCoordinatorTask({
        note: 'Testing archive paths'
      }, sessionState, manager);

      // Assert - verify archive directory structure
      expect(result.archived).toBe(true);
      const archiveDir = resolve(testDir, 'archived', 'coordinator');
      await expect(access(archiveDir)).resolves.toBeUndefined();

      // Verify archived file exists in correct location
      const fs = await import('node:fs/promises');
      const files = await fs.readdir(archiveDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);

      // Verify timestamp format in filename
      expect(mdFiles[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
    });

    it('should use VirtualPathResolver for coordinator namespace routing', async () => {
      // Act - create coordinator task
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Test Resolver', content: 'Status: pending\n\nTest resolver' }
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
          { operation: 'create', title: 'Root Verification', content: 'Status: pending\n\nVerify root' }
        ]
      }, sessionState, manager);

      // Verify physical directory exists at the root location
      await expect(access(coordinatorRoot)).resolves.toBeUndefined();
    });

    it('should verify archive uses VirtualPathResolver.getArchivedRoot()', async () => {
      // Arrange - create task
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Archive Base Test', content: 'Status: pending\n\nTest base' }
        ]
      }, sessionState, manager);

      // Act - trigger archive by completing task
      await completeCoordinatorTask({
        note: 'Testing archive root path'
      }, sessionState, manager);

      // Assert - verify archived root from resolver
      const archivedRoot = manager.pathResolver.getArchivedRoot();
      const expectedArchivedRoot = resolve(testDir, 'archived');

      expect(archivedRoot).toBe(expectedArchivedRoot);

      // Verify archive directory was created at expected location
      const archiveDir = resolve(testDir, 'archived', 'coordinator');
      await expect(access(archiveDir)).resolves.toBeUndefined();
    });
  });
});
