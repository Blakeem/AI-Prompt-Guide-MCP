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
      tags: ['coordination', 'tdd', 'development'],
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
      tags: ['integration', 'specs', 'validation'],
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
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testDir = await mkdtemp(resolve(tmpdir(), `complete-coordinator-test-${uniqueId}-`));
    docsDir = resolve(testDir, 'docs');
    const coordinatorDir = resolve(testDir, 'coordinator');
    await mkdir(docsDir, { recursive: true });
    await mkdir(coordinatorDir, { recursive: true });

    // Create document manager using root as testDir
    manager = createDocumentManager(testDir);

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

      // Complete first task
      const result = await completeCoordinatorTask({
        note: 'Finished implementation and testing'
      }, sessionState, manager);

      expect(result.mode).toBe('sequential');
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

      // Complete first task
      const result = await completeCoordinatorTask({
        note: 'Done'
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
        expect(result.archived_to).toMatch(/^\/archived\/coordinator\/active-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
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

      // Complete first task only
      const result = await completeCoordinatorTask({
        note: 'Partial completion'
      }, sessionState, manager);

      // Should NOT be archived
      expect(result.archived).toBeUndefined();
      expect(result.next_task).toBeDefined();
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

      expect(result).toHaveProperty('mode');
      expect(result).toHaveProperty('completed_task');
      expect(result).toHaveProperty('timestamp');
      expect(result.mode).toBe('sequential');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
