/**
 * Unit tests for view_subagent_task tool
 *
 * Tests the view_subagent_task tool which provides passive task inspection, showing:
 * - Task data with metadata (status, links, etc.)
 * - Workflow metadata (names only, NOT full content)
 * - Main workflow metadata (from first task)
 * - Referenced documents (hierarchical @reference loading)
 * - Summary statistics including workflow counts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { viewSubagentTask } from '../view-subagent-task.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import type { DocumentManager } from '../../../document-manager.js';
import type { SessionState } from '../../../session/types.js';
import type { CachedDocument } from '../../../document-cache.js';
import { DocumentNotFoundError, AddressingError } from '../../../shared/addressing-system.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('view_subagent_task tool', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'view-task-test-'));

    // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
    process.env['MCP_WORKSPACE_PATH'] = tempDir;

    manager = createDocumentManager();
    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0
    };
  });

  afterEach(async () => {
    // Clean up temporary directory and all its contents
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  describe('Parameter Validation', () => {
    it('should throw error when document parameter missing', async () => {
      await expect(viewSubagentTask({}, sessionState, manager))
        .rejects.toThrow('document parameter is required');
    });

    it('should accept overview mode (document only)', async () => {
      // Overview mode - should return all tasks with minimal data
      const mockDocument = {
        content: '# Project\n\n## Tasks\n\n### First Task\n\n- Status: pending',
        headings: [
          { slug: 'project', title: 'Project', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'first-task', title: 'First Task', depth: 3 }
        ],
        sections: new Map([
          ['project', ''],
          ['tasks', ''],
          ['first-task', '- Status: pending']
        ]),
        metadata: {
          path: '/docs/project/tasks.md',
          title: 'Project',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue('- Status: pending');

      const result = await viewSubagentTask({ document: '/docs/project/tasks.md' }, sessionState, manager);
      expect(result).toHaveProperty('tasks');
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it('should throw error when document parameter is empty string', async () => {
      await expect(viewSubagentTask({ document: '' }, sessionState, manager))
        .rejects.toThrow();
    });

    it('should throw error when task slug is empty after #', async () => {
      await expect(viewSubagentTask({ document: '/docs/project/tasks.md#' }, sessionState, manager))
        .rejects.toThrow('Task slug(s) cannot be empty after #');
    });

    it('should throw error when document parameter is null', async () => {
      await expect(viewSubagentTask({ document: null }, sessionState, manager))
        .rejects.toThrow();
    });

    it('should throw error when task count exceeds limit', async () => {
      const tasks = Array.from({ length: 11 }, (_, i) => `task-${i}`).join(',');

      await expect(viewSubagentTask({
        document: `/docs/project/tasks.md#${tasks}`
      }, sessionState, manager))
        .rejects.toThrow();
    });
  });

  describe('Overview Mode', () => {
    it('should return overview of all tasks when no task slug provided', async () => {
      const task1Content = `### First Task

- Status: pending
- Workflow: multi-option-tradeoff

First task content.`;

      const task2Content = `### Second Task

- Status: in_progress

Second task content.`;

      const task3Content = `### Third Task

- Status: completed
- Workflow: simplicity-gate

Third task content.`;

      const mockDocument = {
        content: `# Project\n\n## Tasks\n\n${task1Content}\n\n${task2Content}\n\n${task3Content}`,
        headings: [
          { slug: 'project', title: 'Project', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'first-task', title: 'First Task', depth: 3 },
          { slug: 'second-task', title: 'Second Task', depth: 3 },
          { slug: 'third-task', title: 'Third Task', depth: 3 }
        ],
        sections: new Map([
          ['project', ''],
          ['tasks', ''],
          ['first-task', task1Content],
          ['second-task', task2Content],
          ['third-task', task3Content]
        ]),
        metadata: {
          path: '/docs/project/tasks.md',
          title: 'Project',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 30
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'first-task') return task1Content;
        if (slug === 'second-task') return task2Content;
        if (slug === 'third-task') return task3Content;
        return null;
      });

      const result = await viewSubagentTask({ document: '/docs/project/tasks.md' }, sessionState, manager);

      expect(result.tasks.length).toBe(3);

      // Verify minimal data structure for each task (overview mode: only slug, title, status)
      for (const task of result.tasks) {
        expect(task).toHaveProperty('slug');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('status');

        // Should NOT have these fields in overview mode
        expect(task.content).toBeUndefined();
        expect(task.word_count).toBeUndefined();
        expect(task.depth).toBeUndefined();
        expect(task.has_workflow).toBeUndefined();
      }

      // Verify specific task data
      const firstTask = result.tasks[0];
      const secondTask = result.tasks[1];
      const thirdTask = result.tasks[2];

      expect(firstTask).toBeDefined();
      expect(firstTask?.slug).toBe('first-task');
      expect(firstTask?.status).toBe('pending');

      expect(secondTask).toBeDefined();
      expect(secondTask?.slug).toBe('second-task');
      expect(secondTask?.status).toBe('in_progress');

      expect(thirdTask).toBeDefined();
      expect(thirdTask?.slug).toBe('third-task');
      expect(thirdTask?.status).toBe('completed');
    });
  });

  describe('Document and Task Resolution', () => {
    it('should throw DocumentNotFoundError when document does not exist', async () => {
      vi.spyOn(manager, 'getDocument').mockResolvedValue(null);

      await expect(viewSubagentTask({
        document: '/docs/nonexistent/doc.md#some-task'
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
          path: '/docs/project/doc.md',
          title: 'Document',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 3
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);

      await expect(viewSubagentTask({
        document: '/docs/project/doc.md#some-task'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });

    it('should throw error when task not found in document', async () => {
      const mockDocument = {
        content: '# Document\n\n## Tasks\n\n### Other Task\n\nContent',
        headings: [
          { slug: 'document', title: 'Document', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'other-task', title: 'Other Task', depth: 3 }
        ],
        sections: new Map([
          ['document', ''],
          ['tasks', ''],
          ['other-task', 'Content']
        ]),
        metadata: {
          path: '/docs/project/tasks.md',
          title: 'Document',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 5
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(null);

      await expect(viewSubagentTask({
        document: '/docs/project/tasks.md#missing-task'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });

    it('should throw error when section exists but is not a task', async () => {
      const mockDocument = {
        content: '# Document\n\n## Overview\n\nNot a task\n\n## Tasks\n\n### Real Task',
        headings: [
          { slug: 'document', title: 'Document', depth: 1 },
          { slug: 'overview', title: 'Overview', depth: 2 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'real-task', title: 'Real Task', depth: 3 }
        ],
        sections: new Map([
          ['document', ''],
          ['overview', 'Not a task'],
          ['tasks', ''],
          ['real-task', 'Task content']
        ]),
        metadata: {
          path: '/docs/project/tasks.md',
          title: 'Document',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);

      await expect(viewSubagentTask({
        document: '/docs/project/tasks.md#overview'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });
  });

  describe('Workflow Metadata Extraction', () => {
    it('should return workflow_name when task has Workflow field', async () => {
      const taskContent = `### Test Task

- Status: pending
- Workflow: multi-option-tradeoff

Task content here.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'test-task', title: 'Test Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['test-task', taskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewSubagentTask({
        document: '/docs/test.md#test-task'
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
        content: `# Doc\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'simple-task', title: 'Simple Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['simple-task', taskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 8
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewSubagentTask({
        document: '/docs/test.md#simple-task'
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
        content: `# Doc\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'task-with-empty-workflow', title: 'Task with Empty Workflow', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['task-with-empty-workflow', taskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 9
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewSubagentTask({
        document: '/docs/test.md#task-with-empty-workflow'
      }, sessionState, manager);

      expect(result.tasks[0]).not.toHaveProperty('workflow_name');
      expect(result.tasks[0]).toHaveProperty('has_workflow', false);
    });

    it('should handle multiple tasks with different workflow states', async () => {
      const task1Content = `### Task with Workflow

- Status: pending
- Workflow: multi-option-tradeoff

Has workflow.`;

      const task2Content = `### Task without Workflow

- Status: pending

No workflow.`;

      const task3Content = `### Task with Empty Workflow

- Status: pending
- Workflow:

Empty workflow.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${task1Content}\n\n${task2Content}\n\n${task3Content}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'task-with-workflow', title: 'Task with Workflow', depth: 3 },
          { slug: 'task-without-workflow', title: 'Task without Workflow', depth: 3 },
          { slug: 'task-with-empty-workflow', title: 'Task with Empty Workflow', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['task-with-workflow', task1Content],
          ['task-without-workflow', task2Content],
          ['task-with-empty-workflow', task3Content]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 30
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'task-with-workflow') return task1Content;
        if (slug === 'task-without-workflow') return task2Content;
        if (slug === 'task-with-empty-workflow') return task3Content;
        return null;
      });

      const result = await viewSubagentTask({
        document: '/docs/test.md#task-with-workflow,task-without-workflow,task-with-empty-workflow'
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
      const firstTaskContent = `### First Task

- Status: pending
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff

First task content.`;

      const secondTaskContent = `### Second Task

- Status: pending

Second task content.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${firstTaskContent}\n\n${secondTaskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'first-task', title: 'First Task', depth: 3 },
          { slug: 'second-task', title: 'Second Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['first-task', firstTaskContent],
          ['second-task', secondTaskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 20
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'first-task') return firstTaskContent;
        if (slug === 'second-task') return secondTaskContent;
        return null;
      });

      const result = await viewSubagentTask({
        document: '/docs/test.md#first-task,second-task'
      }, sessionState, manager);

      // Both tasks should have main_workflow_name
      expect(result.tasks[0]).toHaveProperty('main_workflow_name', 'spec-first-integration');
      expect(result.tasks[1]).toHaveProperty('main_workflow_name', 'spec-first-integration');

      // Ensure NO full main_workflow object
      expect(result.tasks[0]).not.toHaveProperty('main_workflow');
      expect(result.tasks[1]).not.toHaveProperty('main_workflow');
    });

    it('should not return main_workflow_name when first task has no Main-Workflow', async () => {
      const firstTaskContent = `### First Task

- Status: pending
- Workflow: multi-option-tradeoff

First task without main workflow.`;

      const secondTaskContent = `### Second Task

- Status: pending

Second task.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${firstTaskContent}\n\n${secondTaskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'first-task', title: 'First Task', depth: 3 },
          { slug: 'second-task', title: 'Second Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['first-task', firstTaskContent],
          ['second-task', secondTaskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 18
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'first-task') return firstTaskContent;
        if (slug === 'second-task') return secondTaskContent;
        return null;
      });

      const result = await viewSubagentTask({
        document: '/docs/test.md#first-task,second-task'
      }, sessionState, manager);

      // Neither task should have main_workflow_name
      expect(result.tasks[0]).not.toHaveProperty('main_workflow_name');
      expect(result.tasks[1]).not.toHaveProperty('main_workflow_name');
    });

    it('should not return main_workflow_name when Main-Workflow field is empty', async () => {
      const firstTaskContent = `### First Task

- Status: pending
- Main-Workflow:

Empty main workflow field.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${firstTaskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'first-task', title: 'First Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['first-task', firstTaskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(firstTaskContent);

      const result = await viewSubagentTask({
        document: '/docs/test.md#first-task'
      }, sessionState, manager);

      expect(result.tasks[0]).not.toHaveProperty('main_workflow_name');
    });

    it('should handle viewing single task with main workflow context', async () => {
      const firstTaskContent = `### First Task

- Status: pending
- Main-Workflow: spec-first-integration

First task.`;

      const secondTaskContent = `### Second Task

- Status: pending
- Workflow: simplicity-gate

Second task.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${firstTaskContent}\n\n${secondTaskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'first-task', title: 'First Task', depth: 3 },
          { slug: 'second-task', title: 'Second Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['first-task', firstTaskContent],
          ['second-task', secondTaskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 16
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'first-task') return firstTaskContent;
        if (slug === 'second-task') return secondTaskContent;
        return null;
      });

      // View only second task
      const result = await viewSubagentTask({
        document: '/docs/test.md#second-task'
      }, sessionState, manager);

      // Second task should still get main_workflow_name from first task
      expect(result.tasks[0]).toHaveProperty('main_workflow_name', 'spec-first-integration');
      expect(result.tasks[0]).toHaveProperty('workflow_name', 'simplicity-gate');
    });
  });


  describe('No Content Injection', () => {
    it('should verify workflow_name is string, not object with content', async () => {
      const taskContent = `### Test Task

- Status: pending
- Workflow: multi-option-tradeoff

Task content.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'test-task', title: 'Test Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['test-task', taskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewSubagentTask({
        document: '/docs/test.md#test-task'
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
      const firstTaskContent = `### First Task

- Status: pending
- Main-Workflow: spec-first-integration

First task.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${firstTaskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'first-task', title: 'First Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['first-task', firstTaskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(firstTaskContent);

      const result = await viewSubagentTask({
        document: '/docs/test.md#first-task'
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
      const taskContent = `### Test Task

- Status: pending
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff

Task with both workflow types.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'test-task', title: 'Test Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['test-task', taskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 12
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewSubagentTask({
        document: '/docs/test.md#test-task'
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
      const taskContent = `### Test Task

- Status: pending
- Workflow: simplicity-gate

Test task content.`;

      const mockDocument = {
        content: `# Project\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'project', title: 'Project', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'test-task', title: 'Test Task', depth: 3 }
        ],
        sections: new Map([
          ['project', ''],
          ['tasks', ''],
          ['test-task', taskContent]
        ]),
        metadata: {
          path: '/docs/project/tasks.md',
          title: 'Project',
          lastModified: new Date(),
          contentHash: 'mock-hash',
          wordCount: 10
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewSubagentTask({
        document: '/docs/project/tasks.md#test-task'
      }, sessionState, manager);

      // Verify response structure (streamlined - removed redundant fields)
      expect(result).toHaveProperty('tasks');
      expect(Array.isArray(result.tasks)).toBe(true);

      // Verify task structure
      const task = result.tasks[0];
      expect(task).toHaveProperty('slug');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('content');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('depth');
      expect(task).toHaveProperty('word_count');
      expect(task).toHaveProperty('workflow_name');
      expect(task).toHaveProperty('has_workflow');
    });

    it('should support viewing multiple tasks in single call', async () => {
      const task1Content = `### Task 1

- Status: pending
- Workflow: multi-option-tradeoff

First task.`;

      const task2Content = `### Task 2

- Status: in_progress

Second task.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${task1Content}\n\n${task2Content}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'task-1', title: 'Task 1', depth: 3 },
          { slug: 'task-2', title: 'Task 2', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['task-1', task1Content],
          ['task-2', task2Content]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 16
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'task-1') return task1Content;
        if (slug === 'task-2') return task2Content;
        return null;
      });

      const result = await viewSubagentTask({
        document: '/docs/test.md#task-1,task-2'
      }, sessionState, manager);

      expect(result.tasks).toHaveLength(2);
    });
  });

  describe('Integration with Existing Features', () => {
    it('should maintain existing task fields alongside workflow metadata', async () => {
      const taskContent = `### Complex Task

- Status: in_progress
- Workflow: multi-option-tradeoff
→ @/specs/feature-spec.md

Implement feature according to specification.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${taskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'complex-task', title: 'Complex Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['complex-task', taskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 13
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockResolvedValue(taskContent);

      const result = await viewSubagentTask({
        document: '/docs/test.md#complex-task'
      }, sessionState, manager);

      const task = result.tasks[0];

      // Existing fields
      expect(task).toHaveProperty('slug', 'complex-task');
      expect(task).toHaveProperty('title', 'Complex Task');
      expect(task).toHaveProperty('status', 'in_progress');
      expect(task).toHaveProperty('linked_document', '/specs/feature-spec.md');

      // New workflow fields
      expect(task).toHaveProperty('workflow_name', 'multi-option-tradeoff');
      expect(task).toHaveProperty('has_workflow', true);
    });

    it('should work with hierarchical task structures', async () => {
      const firstTaskContent = `### First Task

- Status: pending
- Main-Workflow: spec-first-integration

First task with main workflow.`;

      const secondTaskContent = `### Second Task

- Status: pending
- Workflow: simplicity-gate

Second task with its own workflow.`;

      const mockDocument = {
        content: `# Doc\n\n## Tasks\n\n${firstTaskContent}\n\n${secondTaskContent}`,
        headings: [
          { slug: 'doc', title: 'Doc', depth: 1 },
          { slug: 'tasks', title: 'Tasks', depth: 2 },
          { slug: 'first-task', title: 'First Task', depth: 3 },
          { slug: 'second-task', title: 'Second Task', depth: 3 }
        ],
        sections: new Map([
          ['doc', ''],
          ['tasks', ''],
          ['first-task', firstTaskContent],
          ['second-task', secondTaskContent]
        ]),
        metadata: {
          path: '/docs/test.md',
          title: 'Test',
          lastModified: new Date(),
          contentHash: 'hash',
          wordCount: 20
        }
      } as unknown as CachedDocument;

      vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDocument);
      vi.spyOn(manager, 'getSectionContent').mockImplementation(async (_path, slug) => {
        if (slug === 'first-task') return firstTaskContent;
        if (slug === 'second-task') return secondTaskContent;
        return null;
      });

      const result = await viewSubagentTask({
        document: '/docs/test.md#first-task,second-task'
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
});
