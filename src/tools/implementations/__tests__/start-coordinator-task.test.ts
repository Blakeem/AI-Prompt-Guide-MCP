/**
 * Unit tests for start_coordinator_task tool
 *
 * Tests the start_coordinator_task tool for sequential coordinator task workflow
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { startCoordinatorTask } from '../start-coordinator-task.js';
import { coordinatorTask } from '../coordinator-task.js';
import type { DocumentManager } from '../../../document-manager.js';
import type { SessionState } from '../../../session/types.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import { resolve } from 'node:path';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
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

describe('start_coordinator_task tool', () => {
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
    testDir = await mkdtemp(resolve(tmpdir(), `start-coordinator-test-${uniqueId}-`));
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

  describe('Sequential Mode', () => {
    it('should find and start first pending task', async () => {
      // Create tasks
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nMain-Workflow: tdd-incremental-orchestration\n\nContent 1' },
          { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' }
        ]
      }, sessionState, manager);

      // Start first task
      const result = await startCoordinatorTask({}, sessionState, manager);

      expect(result.mode).toBe('sequential');
      expect(result.document).toBe('/coordinator/active.md');
      expect(result.task.slug).toBe('task-1');
      expect(result.task.title).toBe('Task 1');
      expect(result.task.status).toBe('pending');
      expect(result.task.full_path).toBe('/coordinator/active.md#task-1');
    });

    it('should inject Main-Workflow from first task', async () => {
      // Create tasks with Main-Workflow in first task
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Phase 1', content: 'Status: pending\n\nMain-Workflow: tdd-incremental-orchestration\n\nImplement TDD approach' }
        ]
      }, sessionState, manager);

      const result = await startCoordinatorTask({}, sessionState, manager);

      expect(result.task.main_workflow).toBeDefined();
      if (result.task.main_workflow != null) {
        expect(result.task.main_workflow.name).toBe('workflow_tdd-incremental-orchestration');
      }
    });

    it('should inject task-specific Workflow if present', async () => {
      // Create tasks with task workflow
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nWorkflow: spec-first-integration\n\nImplement spec first' }
        ]
      }, sessionState, manager);

      const result = await startCoordinatorTask({}, sessionState, manager);

      expect(result.task.workflow).toBeDefined();
      if (result.task.workflow != null) {
        expect(result.task.workflow.name).toBe('workflow_spec-first-integration');
      }
    });

    it('should throw error if no tasks available', async () => {
      // Create completed tasks only
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: completed\n\nCompleted: 2025-10-14\n\nDone' }
        ]
      }, sessionState, manager);

      await expect(startCoordinatorTask({}, sessionState, manager))
        .rejects.toThrow('No available tasks');
    });
  });

  describe('Validation', () => {
    it('should reject #slug parameter (sequential only)', async () => {
      await coordinatorTask({
        operations: [
          { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent' }
        ]
      }, sessionState, manager);

      await expect(startCoordinatorTask({
        document: '/coordinator/active.md#task-1'
      }, sessionState, manager))
        .rejects.toThrow('sequential only');
    });
  });
});
