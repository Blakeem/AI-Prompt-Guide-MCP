/**
 * Unit tests for view_coordinator_task tool
 *
 * Tests the view_coordinator_task tool which provides passive task inspection for
 * coordinator tasks in /coordinator/active.md, showing:
 * - Task data with metadata (status, links, etc.)
 * - Workflow metadata (names only, NOT full content)
 * - Main workflow metadata (from first task)
 * - Referenced documents (hierarchical @reference loading)
 * - Summary statistics including workflow counts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { viewCoordinatorTask } from '../view-coordinator-task.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import type { DocumentManager } from '../../../document-manager.js';
import type { SessionState } from '../../../session/types.js';
import type { CachedDocument } from '../../../document-cache.js';
import { DocumentNotFoundError, AddressingError } from '../../../shared/addressing-system.js';

describe('view_coordinator_task tool', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;

  beforeEach(() => {
    manager = createDocumentManager();
    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0
    };
  });

  describe('Parameter Validation', () => {
    it('should accept overview mode (no slug parameter)', async () => {
      // Overview mode - should return all tasks with minimal data
      const mockDocument = {
        content: '# Active Tasks\n\n## Tasks\n\n### Phase 1\n\n- Status: pending',
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', '- Status: pending']
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('- Status: pending');

      const result = await viewCoordinatorTask({}, sessionState, manager);
      expect(result).toHaveProperty('mode', 'overview');
    });

    it('should accept detail mode with single slug', async () => {
      const taskContent = `### Phase 1

- Status: pending

Task content.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({ slug: 'phase-1' }, sessionState, manager);
      expect(result).toHaveProperty('mode', 'detail');
    });

    it('should throw error when slug is empty string', async () => {
      await expect(viewCoordinatorTask({ slug: '' }, sessionState, manager))
        .rejects.toThrow('slug parameter is required and must be a non-empty string');
    });

    it('should throw error when task count exceeds limit', async () => {
      const tasks = Array.from({ length: 11 }, (_, i) => `phase-${i}`).join(',');

      await expect(viewCoordinatorTask({
        slug: tasks
      }, sessionState, manager))
        .rejects.toThrow();
    });

    it('should support comma-separated slugs', async () => {
      const task1Content = `### Phase 1

- Status: pending

First phase.`;

      const task2Content = `### Phase 2

- Status: pending

Second phase.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${task1Content}\n\n${task2Content}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', task1Content],
          ['phase-2', task2Content]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 20
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return task1Content;
        if (slug === 'phase-2') return task2Content;
        return null;
      });

      const result = await viewCoordinatorTask({ slug: 'phase-1,phase-2' }, sessionState, manager);
      expect(result.tasks).toHaveLength(2);
    });
  });

  describe('Overview Mode', () => {
    it('should return overview of all tasks when no slug provided', async () => {
      const task1Content = `### Phase 1

- Status: pending
- Workflow: multi-option-tradeoff

First phase content.`;

      const task2Content = `### Phase 2

- Status: in_progress

Second phase content.`;

      const task3Content = `### Phase 3

- Status: completed
- Workflow: simplicity-gate

Third phase content.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${task1Content}\n\n${task2Content}\n\n${task3Content}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 },
          { slug: 'phase-3', title: 'Phase 3', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', task1Content],
          ['phase-2', task2Content],
          ['phase-3', task3Content]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 30
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return task1Content;
        if (slug === 'phase-2') return task2Content;
        if (slug === 'phase-3') return task3Content;
        return null;
      });

      const result = await viewCoordinatorTask({}, sessionState, manager);

      expect(result.mode).toBe('overview');
      expect(result.tasks.length).toBe(3);

      // Verify minimal data structure for each task
      for (const task of result.tasks) {
        expect(task).toHaveProperty('slug');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('depth');
        expect(task).toHaveProperty('full_path');
        expect(task).toHaveProperty('has_workflow');

        // Should NOT have these fields in overview mode
        expect(task.content).toBeUndefined();
        expect(task.word_count).toBeUndefined();
      }

      // Verify specific task data
      const firstTask = result.tasks[0];
      const secondTask = result.tasks[1];
      const thirdTask = result.tasks[2];

      expect(firstTask).toBeDefined();
      expect(firstTask?.slug).toBe('phase-1');
      expect(firstTask?.status).toBe('pending');
      expect(firstTask?.has_workflow).toBe(true);
      expect(firstTask?.workflow_name).toBe('multi-option-tradeoff');

      expect(secondTask).toBeDefined();
      expect(secondTask?.slug).toBe('phase-2');
      expect(secondTask?.status).toBe('in_progress');
      expect(secondTask?.has_workflow).toBe(false);
      expect(secondTask?.workflow_name).toBeUndefined();

      expect(thirdTask).toBeDefined();
      expect(thirdTask?.slug).toBe('phase-3');
      expect(thirdTask?.status).toBe('completed');
      expect(thirdTask?.has_workflow).toBe(true);
      expect(thirdTask?.workflow_name).toBe('simplicity-gate');

      // Verify summary
      expect(result.summary.total_tasks).toBe(3);
      expect(result.summary.tasks_with_workflows).toBe(2);
    });

    it('should handle empty tasks section', async () => {
      const mockDocument = {
        content: '# Active Tasks\n\n## Tasks\n\n<!-- No tasks yet -->',
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', '<!-- No tasks yet -->']
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);

      const result = await viewCoordinatorTask({}, sessionState, manager);

      expect(result.mode).toBe('overview');
      expect(result.tasks).toHaveLength(0);
      expect(result.summary.total_tasks).toBe(0);
    });
  });

  describe('Detail Mode', () => {
    it('should return full task content with single slug', async () => {
      const taskContent = `### Phase 1

- Status: pending
- Workflow: multi-option-tradeoff

Implement the first phase of the project.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 15
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({ slug: 'phase-1' }, sessionState, manager);

      expect(result.mode).toBe('detail');
      expect(result.tasks).toHaveLength(1);

      const task = result.tasks[0];
      expect(task).toHaveProperty('slug', 'phase-1');
      expect(task).toHaveProperty('title', 'Phase 1');
      expect(task).toHaveProperty('content');
      expect(task).toHaveProperty('status', 'pending');
      expect(task).toHaveProperty('workflow_name', 'multi-option-tradeoff');
      expect(task).toHaveProperty('has_workflow', true);
      expect(task).toHaveProperty('word_count');
    });

    it('should support comma-separated slugs for multiple tasks', async () => {
      const task1Content = `### Phase 1

- Status: pending
- Workflow: multi-option-tradeoff

First phase.`;

      const task2Content = `### Phase 2

- Status: in_progress

Second phase.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${task1Content}\n\n${task2Content}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', task1Content],
          ['phase-2', task2Content]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 20
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return task1Content;
        if (slug === 'phase-2') return task2Content;
        return null;
      });

      const result = await viewCoordinatorTask({ slug: 'phase-1,phase-2' }, sessionState, manager);

      expect(result.mode).toBe('detail');
      expect(result.tasks).toHaveLength(2);
      expect(result.summary.total_tasks).toBe(2);
    });
  });

  describe('Document and Task Resolution', () => {
    it('should throw DocumentNotFoundError when document does not exist', async () => {
      vi.spyOn(manager, 'getDocument').mockResolvedValue(null);

      await expect(viewCoordinatorTask({
        slug: 'some-task'
      }, sessionState, manager))
        .rejects.toThrow(DocumentNotFoundError);
    });

    it('should throw error when document has no tasks section', async () => {
      const mockDocument = {
        content: '# Document\n\nNo tasks here',
        headings: [
          { slug: 'document', title: 'Document', depth: 1 }
        ],
        sections: new Map([
          ['document', 'No tasks here']
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Document',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 3
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);

      await expect(viewCoordinatorTask({
        slug: 'some-task'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });

    it('should throw error when task not found in document', async () => {
      const mockDocument = {
        content: '# Active Tasks\n\n## Tasks\n\n### Other Task\n\nContent',
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'other-task', title: 'Other Task', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['other-task', 'Content']
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(null);

      await expect(viewCoordinatorTask({
        slug: 'missing-task'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });

    it('should throw error when section exists but is not a task', async () => {
      const mockDocument = {
        content: '# Active Tasks\n\n## Overview\n\nNot a task\n\n## Tasks\n\n### Real Task',
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'overview', title: 'Overview', depth: 2 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'real-task', title: 'Real Task', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['overview', 'Not a task'],
          ['tasks', ''],
          ['real-task', 'Task content']
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);

      await expect(viewCoordinatorTask({
        slug: 'overview'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });
  });

  describe('Workflow Metadata Extraction', () => {
    it('should return workflow_name when task has Workflow field', async () => {
      const taskContent = `### Phase 1

- Status: pending
- Workflow: multi-option-tradeoff

Task content here.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({
        slug: 'phase-1'
      }, sessionState, manager);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toHaveProperty('workflow_name', 'multi-option-tradeoff');
      expect(result.tasks[0]).toHaveProperty('has_workflow', true);

      // Ensure NO full workflow object (that's for start_task only)
      expect(result.tasks[0]).not.toHaveProperty('workflow');
    });

    it('should not return workflow_name when task has no Workflow field', async () => {
      const taskContent = `### Simple Task

- Status: pending

No workflow here.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'simple-task', title: 'Simple Task', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['simple-task', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 8
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({
        slug: 'simple-task'
      }, sessionState, manager);

      expect(result.tasks[0]).not.toHaveProperty('workflow_name');
      expect(result.tasks[0]).toHaveProperty('has_workflow', false);
    });

    it('should not return workflow_name when Workflow field is empty', async () => {
      const taskContent = `### Task with Empty Workflow

- Status: pending
- Workflow:

Empty workflow field.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'task-with-empty-workflow', title: 'Task with Empty Workflow', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['task-with-empty-workflow', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 9
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({
        slug: 'task-with-empty-workflow'
      }, sessionState, manager);

      expect(result.tasks[0]).not.toHaveProperty('workflow_name');
      expect(result.tasks[0]).toHaveProperty('has_workflow', false);
    });

    it('should handle multiple tasks with different workflow states', async () => {
      const task1Content = `### Phase with Workflow

- Status: pending
- Workflow: multi-option-tradeoff

Has workflow.`;

      const task2Content = `### Phase without Workflow

- Status: pending

No workflow.`;

      const task3Content = `### Phase with Empty Workflow

- Status: pending
- Workflow:

Empty workflow.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${task1Content}\n\n${task2Content}\n\n${task3Content}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-with-workflow', title: 'Phase with Workflow', depth: 3 },
          { slug: 'phase-without-workflow', title: 'Phase without Workflow', depth: 3 },
          { slug: 'phase-with-empty-workflow', title: 'Phase with Empty Workflow', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-with-workflow', task1Content],
          ['phase-without-workflow', task2Content],
          ['phase-with-empty-workflow', task3Content]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 30
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-with-workflow') return task1Content;
        if (slug === 'phase-without-workflow') return task2Content;
        if (slug === 'phase-with-empty-workflow') return task3Content;
        return null;
      });

      const result = await viewCoordinatorTask({
        slug: 'phase-with-workflow,phase-without-workflow,phase-with-empty-workflow'
      }, sessionState, manager);

      expect(result.tasks).toHaveLength(3);

      // Task 1: Has workflow
      expect(result.tasks[0]).toHaveProperty('workflow_name', 'multi-option-tradeoff');
      expect(result.tasks[0]).toHaveProperty('has_workflow', true);

      // Task 2: No workflow field
      expect(result.tasks[1]).not.toHaveProperty('workflow_name');
      expect(result.tasks[1]).toHaveProperty('has_workflow', false);

      // Task 3: Empty workflow field
      expect(result.tasks[2]).not.toHaveProperty('workflow_name');
      expect(result.tasks[2]).toHaveProperty('has_workflow', false);
    });
  });

  describe('Main Workflow Metadata', () => {
    it('should return main_workflow_name when first task has Main-Workflow', async () => {
      const firstTaskContent = `### Phase 1

- Status: pending
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff

First phase content.`;

      const secondTaskContent = `### Phase 2

- Status: pending

Second phase content.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${firstTaskContent}\n\n${secondTaskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', firstTaskContent],
          ['phase-2', secondTaskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 20
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return firstTaskContent;
        if (slug === 'phase-2') return secondTaskContent;
        return null;
      });

      const result = await viewCoordinatorTask({
        slug: 'phase-1,phase-2'
      }, sessionState, manager);

      // Both tasks should have main_workflow_name
      expect(result.tasks[0]).toHaveProperty('main_workflow_name', 'spec-first-integration');
      expect(result.tasks[1]).toHaveProperty('main_workflow_name', 'spec-first-integration');

      // Ensure NO full main_workflow object
      expect(result.tasks[0]).not.toHaveProperty('main_workflow');
      expect(result.tasks[1]).not.toHaveProperty('main_workflow');
    });

    it('should not return main_workflow_name when first task has no Main-Workflow', async () => {
      const firstTaskContent = `### Phase 1

- Status: pending
- Workflow: multi-option-tradeoff

First phase without main workflow.`;

      const secondTaskContent = `### Phase 2

- Status: pending

Second phase.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${firstTaskContent}\n\n${secondTaskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', firstTaskContent],
          ['phase-2', secondTaskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 18
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return firstTaskContent;
        if (slug === 'phase-2') return secondTaskContent;
        return null;
      });

      const result = await viewCoordinatorTask({
        slug: 'phase-1,phase-2'
      }, sessionState, manager);

      // Neither task should have main_workflow_name
      expect(result.tasks[0]).not.toHaveProperty('main_workflow_name');
      expect(result.tasks[1]).not.toHaveProperty('main_workflow_name');
    });

    it('should not return main_workflow_name when Main-Workflow field is empty', async () => {
      const firstTaskContent = `### Phase 1

- Status: pending
- Main-Workflow:

Empty main workflow field.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${firstTaskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', firstTaskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(firstTaskContent);

      const result = await viewCoordinatorTask({
        slug: 'phase-1'
      }, sessionState, manager);

      expect(result.tasks[0]).not.toHaveProperty('main_workflow_name');
    });

    it('should handle viewing single task with main workflow context', async () => {
      const firstTaskContent = `### Phase 1

- Status: pending
- Main-Workflow: spec-first-integration

First phase.`;

      const secondTaskContent = `### Phase 2

- Status: pending
- Workflow: simplicity-gate

Second phase.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${firstTaskContent}\n\n${secondTaskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', firstTaskContent],
          ['phase-2', secondTaskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 16
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return firstTaskContent;
        if (slug === 'phase-2') return secondTaskContent;
        return null;
      });

      // View only second task
      const result = await viewCoordinatorTask({
        slug: 'phase-2'
      }, sessionState, manager);

      // Second task should still get main_workflow_name from first task
      expect(result.tasks[0]).toHaveProperty('main_workflow_name', 'spec-first-integration');
      expect(result.tasks[0]).toHaveProperty('workflow_name', 'simplicity-gate');
    });
  });

  describe('Summary Statistics', () => {
    it('should count tasks_with_workflows correctly', async () => {
      const task1Content = `### Phase 1

- Status: pending
- Workflow: multi-option-tradeoff

Has workflow.`;

      const task2Content = `### Phase 2

- Status: pending

No workflow.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${task1Content}\n\n${task2Content}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', task1Content],
          ['phase-2', task2Content]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 15
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return task1Content;
        if (slug === 'phase-2') return task2Content;
        return null;
      });

      const result = await viewCoordinatorTask({
        slug: 'phase-1,phase-2'
      }, sessionState, manager);

      expect(result.summary).toHaveProperty('tasks_with_workflows', 1);
    });

    it('should count tasks_with_main_workflow correctly', async () => {
      const firstTaskContent = `### Phase 1

- Status: pending
- Main-Workflow: spec-first-integration

First phase.`;

      const secondTaskContent = `### Phase 2

- Status: pending

Second phase.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${firstTaskContent}\n\n${secondTaskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', firstTaskContent],
          ['phase-2', secondTaskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 14
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return firstTaskContent;
        if (slug === 'phase-2') return secondTaskContent;
        return null;
      });

      const result = await viewCoordinatorTask({
        slug: 'phase-1,phase-2'
      }, sessionState, manager);

      // Both tasks have access to main workflow from first task
      expect(result.summary).toHaveProperty('tasks_with_main_workflow', 2);
    });

    it('should show zero workflow counts when no workflows present', async () => {
      const task1Content = `### Phase 1

- Status: pending

No workflow.`;

      const task2Content = `### Phase 2

- Status: pending

Also no workflow.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${task1Content}\n\n${task2Content}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', task1Content],
          ['phase-2', task2Content]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 12
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return task1Content;
        if (slug === 'phase-2') return task2Content;
        return null;
      });

      const result = await viewCoordinatorTask({
        slug: 'phase-1,phase-2'
      }, sessionState, manager);

      expect(result.summary).toHaveProperty('tasks_with_workflows', 0);
      expect(result.summary).toHaveProperty('tasks_with_main_workflow', 0);
    });

    it('should include existing summary fields along with workflow counts', async () => {
      const taskContent = `### Phase 1

- Status: pending
- Workflow: multi-option-tradeoff

Phase content.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({
        slug: 'phase-1'
      }, sessionState, manager);

      // Verify existing summary fields
      expect(result.summary).toHaveProperty('total_tasks', 1);
      expect(result.summary).toHaveProperty('by_status');
      expect(result.summary).toHaveProperty('with_links');
      expect(result.summary).toHaveProperty('with_references');

      // Verify new workflow fields
      expect(result.summary).toHaveProperty('tasks_with_workflows', 1);
      expect(result.summary).toHaveProperty('tasks_with_main_workflow', 0);
    });
  });

  describe('No Content Injection', () => {
    it('should verify workflow_name is string, not object with content', async () => {
      const taskContent = `### Phase 1

- Status: pending
- Workflow: multi-option-tradeoff

Phase content.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({
        slug: 'phase-1'
      }, sessionState, manager);

      // Verify workflow_name is a string
      const task = result.tasks[0];
      expect(task).toBeDefined();
      expect(typeof task?.workflow_name).toBe('string');
      expect(task?.workflow_name).toBe('multi-option-tradeoff');

      // Ensure it's NOT an object with content/description/etc
      expect(task?.workflow_name).not.toBeInstanceOf(Object);
    });

    it('should verify main_workflow_name is string, not object', async () => {
      const firstTaskContent = `### Phase 1

- Status: pending
- Main-Workflow: spec-first-integration

First phase.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${firstTaskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', firstTaskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(firstTaskContent);

      const result = await viewCoordinatorTask({
        slug: 'phase-1'
      }, sessionState, manager);

      // Verify main_workflow_name is a string
      const task = result.tasks[0];
      expect(task).toBeDefined();
      expect(typeof task?.main_workflow_name).toBe('string');
      expect(task?.main_workflow_name).toBe('spec-first-integration');

      // Ensure it's NOT an object
      expect(task?.main_workflow_name).not.toBeInstanceOf(Object);
    });

    it('should ensure no workflow or main_workflow objects in response', async () => {
      const taskContent = `### Phase 1

- Status: pending
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff

Phase with both workflow types.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 12
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({
        slug: 'phase-1'
      }, sessionState, manager);

      // Should have name fields only
      expect(result.tasks[0]).toHaveProperty('workflow_name', 'multi-option-tradeoff');
      expect(result.tasks[0]).toHaveProperty('main_workflow_name', 'spec-first-integration');

      // Should NOT have workflow objects (those are for start_task only)
      expect(result.tasks[0]).not.toHaveProperty('workflow');
      expect(result.tasks[0]).not.toHaveProperty('main_workflow');

      // Verify response structure doesn't include workflow content keys
      const task = result.tasks[0];
      expect(task).toBeDefined();
      if (task != null) {
        const taskKeys = Object.keys(task);
        expect(taskKeys).not.toContain('workflow');
        expect(taskKeys).not.toContain('main_workflow');
      }
    });
  });

  describe('Response Structure', () => {
    it('should return properly formatted response structure', async () => {
      const taskContent = `### Phase 1

- Status: pending
- Workflow: simplicity-gate

Phase content.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({
        slug: 'phase-1'
      }, sessionState, manager);

      // Verify response structure
      expect(result).toHaveProperty('mode', 'detail');
      expect(result).toHaveProperty('document');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('summary');

      expect(typeof result.document).toBe('string');
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(typeof result.summary).toBe('object');

      // Verify task structure
      const task = result.tasks[0];
      expect(task).toHaveProperty('slug');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('content');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('depth');
      expect(task).toHaveProperty('full_path');
      expect(task).toHaveProperty('word_count');
      expect(task).toHaveProperty('workflow_name');
      expect(task).toHaveProperty('has_workflow');
    });

    it('should support viewing multiple tasks in single call', async () => {
      const task1Content = `### Phase 1

- Status: pending
- Workflow: multi-option-tradeoff

First phase.`;

      const task2Content = `### Phase 2

- Status: in_progress

Second phase.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${task1Content}\n\n${task2Content}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', task1Content],
          ['phase-2', task2Content]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 16
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return task1Content;
        if (slug === 'phase-2') return task2Content;
        return null;
      });

      const result = await viewCoordinatorTask({
        slug: 'phase-1,phase-2'
      }, sessionState, manager);

      expect(result.tasks).toHaveLength(2);
      expect(result.summary.total_tasks).toBe(2);
    });
  });

  describe('Integration with Existing Features', () => {
    it('should maintain existing task fields alongside workflow metadata', async () => {
      const taskContent = `### Complex Phase

- Status: in_progress
- Workflow: multi-option-tradeoff
→ @/specs/feature-spec.md

Implement feature according to specification.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'complex-phase', title: 'Complex Phase', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['complex-phase', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 13
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({
        slug: 'complex-phase'
      }, sessionState, manager);

      const task = result.tasks[0];

      // Existing fields
      expect(task).toHaveProperty('slug', 'complex-phase');
      expect(task).toHaveProperty('title', 'Complex Phase');
      expect(task).toHaveProperty('status', 'in_progress');
      expect(task).toHaveProperty('linked_document', '/specs/feature-spec.md');

      // New workflow fields
      expect(task).toHaveProperty('workflow_name', 'multi-option-tradeoff');
      expect(task).toHaveProperty('has_workflow', true);
    });

    it('should work with hierarchical task structures', async () => {
      const firstTaskContent = `### Phase 1

- Status: pending
- Main-Workflow: spec-first-integration

First phase with main workflow.`;

      const secondTaskContent = `### Phase 2

- Status: pending
- Workflow: simplicity-gate

Second phase with its own workflow.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${firstTaskContent}\n\n${secondTaskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 },
          { slug: 'phase-2', title: 'Phase 2', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', firstTaskContent],
          ['phase-2', secondTaskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 20
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'phase-1') return firstTaskContent;
        if (slug === 'phase-2') return secondTaskContent;
        return null;
      });

      const result = await viewCoordinatorTask({
        slug: 'phase-1,phase-2'
      }, sessionState, manager);

      // Both should have main_workflow_name from first task
      expect(result.tasks[0]).toHaveProperty('main_workflow_name', 'spec-first-integration');
      expect(result.tasks[1]).toHaveProperty('main_workflow_name', 'spec-first-integration');

      // First task has no workflow field (only Main-Workflow)
      expect(result.tasks[0]).not.toHaveProperty('workflow_name');
      expect(result.tasks[0]).toHaveProperty('has_workflow', false);

      // Second task has its own workflow
      expect(result.tasks[1]).toHaveProperty('workflow_name', 'simplicity-gate');
      expect(result.tasks[1]).toHaveProperty('has_workflow', true);
    });
  });

  describe('Path Validation', () => {
    it('should always use /coordinator/active.md path', async () => {
      const taskContent = `### Phase 1

- Status: pending

Task content.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({ slug: 'phase-1' }, sessionState, manager);

      // Verify correct document path
      expect(result.document).toBe('/coordinator/active.md');
      expect(result.tasks[0]?.full_path).toContain('/coordinator/active.md#');
    });

    it('should work in overview mode without any parameters', async () => {
      const taskContent = `### Phase 1

- Status: pending

Task content.`;

      const mockDocument = {
        content: `# Active Tasks\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'active-tasks', title: 'Active Tasks', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'phase-1', title: 'Phase 1', depth: 3 }
        ],
        sections: new Map([
          ['active-tasks', ''],
          ['tasks', ''],
          ['phase-1', taskContent]
        ]),
        metadata: {
          path: '/coordinator/active.md',
          title: 'Active Tasks',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewCoordinatorTask({}, sessionState, manager);

      expect(result.mode).toBe('overview');
      expect(result.document).toBe('/coordinator/active.md');
    });
  });
});
