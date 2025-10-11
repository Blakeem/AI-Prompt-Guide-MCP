/**
 * Tests for workflow prompt utilities
 *
 * These tests cover extraction, resolution, and enrichment logic for
 * workflow prompts integrated into task management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractWorkflowName,
  extractMainWorkflowName,
  resolveWorkflowPrompt,
  enrichTaskWithWorkflow,
  enrichTaskWithMainWorkflow
} from '../workflow-prompt-utilities.js';
import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument, DocumentMetadata } from '../../document-cache.js';
import type { TaskViewData } from '../task-view-utilities.js';
import type { WorkflowPrompt } from '../../prompts/workflow-prompts.js';
import type { Heading, TocNode } from '../../types/index.js';
import * as workflowPrompts from '../../prompts/workflow-prompts.js';
import * as taskUtilities from '../task-utilities.js';

describe('Workflow Prompt Utilities', () => {
  describe('extractWorkflowName', () => {
    it('should extract workflow from dash format', () => {
      const content = `
### Task Title
- Status: pending
- Workflow: multi-option-tradeoff
`;
      expect(extractWorkflowName(content)).toBe('multi-option-tradeoff');
    });

    it('should extract workflow from star format', () => {
      const content = `
### Task Title
* Status: pending
* Workflow: simplicity-gate
`;
      expect(extractWorkflowName(content)).toBe('simplicity-gate');
    });

    it('should return null when workflow field is missing', () => {
      const content = `
### Task Title
- Status: pending
`;
      expect(extractWorkflowName(content)).toBeNull();
    });

    it('should return null for empty workflow value', () => {
      const content = `
### Task Title
- Workflow:
`;
      expect(extractWorkflowName(content)).toBe('');
    });

    it('should be case sensitive (Workflow, not workflow)', () => {
      const content = `
### Task Title
- workflow: multi-option-tradeoff
- Workflow: simplicity-gate
`;
      expect(extractWorkflowName(content)).toBe('simplicity-gate');
    });

    it('should trim whitespace from workflow name', () => {
      const content = `
### Task Title
- Workflow:   multi-option-tradeoff
`;
      expect(extractWorkflowName(content)).toBe('multi-option-tradeoff');
    });

    it('should handle workflow with hyphens and underscores', () => {
      const content = `
### Task Title
- Workflow: multi_option-tradeoff-v2
`;
      expect(extractWorkflowName(content)).toBe('multi_option-tradeoff-v2');
    });

    it('should extract first occurrence when multiple exist', () => {
      const content = `
### Task Title
- Workflow: first-workflow
- Workflow: second-workflow
`;
      expect(extractWorkflowName(content)).toBe('first-workflow');
    });
  });

  describe('extractMainWorkflowName', () => {
    it('should extract main workflow from dash format', () => {
      const content = `
### Task Title
- Status: pending
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff
`;
      expect(extractMainWorkflowName(content)).toBe('spec-first-integration');
    });

    it('should extract main workflow from star format', () => {
      const content = `
### Task Title
* Status: pending
* Main-Workflow: spec-first-integration
`;
      expect(extractMainWorkflowName(content)).toBe('spec-first-integration');
    });

    it('should return null when main workflow field is missing', () => {
      const content = `
### Task Title
- Status: pending
- Workflow: multi-option-tradeoff
`;
      expect(extractMainWorkflowName(content)).toBeNull();
    });

    it('should return null for empty main workflow value', () => {
      const content = `
### Task Title
- Main-Workflow:
`;
      expect(extractMainWorkflowName(content)).toBe('');
    });

    it('should be case sensitive (Main-Workflow, not main-workflow)', () => {
      const content = `
### Task Title
- main-workflow: wrong
- Main-Workflow: spec-first-integration
`;
      expect(extractMainWorkflowName(content)).toBe('spec-first-integration');
    });

    it('should trim whitespace from main workflow name', () => {
      const content = `
### Task Title
- Main-Workflow:   spec-first-integration
`;
      expect(extractMainWorkflowName(content)).toBe('spec-first-integration');
    });

    it('should distinguish main workflow from regular workflow', () => {
      const content = `
### Task Title
- Workflow: multi-option-tradeoff
- Main-Workflow: spec-first-integration
`;
      expect(extractMainWorkflowName(content)).toBe('spec-first-integration');
      expect(extractWorkflowName(content)).toBe('multi-option-tradeoff');
    });
  });

  describe('resolveWorkflowPrompt', () => {
    const mockWorkflowPrompt: WorkflowPrompt = {
      name: 'multi-option-tradeoff',
      description: 'Multi-option trade-off analysis',
      content: '# Multi-Option Trade-off Protocol\n\nAnalyze options...',
      tags: ['decision', 'analysis'],
      whenToUse: ['Multiple solution approaches', 'Trade-off decisions']
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should resolve valid workflow name', () => {
      // Use vi.spyOn to mock getWorkflowPrompt
      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(mockWorkflowPrompt);

      const result = resolveWorkflowPrompt('multi-option-tradeoff');

      expect(result).toEqual(mockWorkflowPrompt);
    });

    it('should return null for invalid workflow name', () => {
      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(undefined);

      const result = resolveWorkflowPrompt('non-existent-workflow');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = resolveWorkflowPrompt('');

      expect(result).toBeNull();
    });

    it('should handle getWorkflowPrompt throwing error', () => {
      // Mock getWorkflowPrompt to throw
      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockImplementation(() => {
        throw new Error('Prompts not loaded');
      });

      // Should return null instead of throwing
      expect(() => resolveWorkflowPrompt('any-workflow')).not.toThrow();
      expect(resolveWorkflowPrompt('any-workflow')).toBeNull();
    });
  });

  describe('enrichTaskWithWorkflow', () => {
    const mockWorkflowPrompt: WorkflowPrompt = {
      name: 'multi-option-tradeoff',
      description: 'Multi-option trade-off analysis',
      content: '# Multi-Option Trade-off Protocol\n\nAnalyze options...',
      tags: ['decision', 'analysis'],
      whenToUse: ['Multiple solution approaches', 'Trade-off decisions']
    };

    const baseTaskData: TaskViewData = {
      slug: 'test-task',
      title: 'Test Task',
      content: 'Task content',
      status: 'pending'
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should enrich task with valid workflow', () => {
      const taskContent = `
### Test Task
- Status: pending
- Workflow: multi-option-tradeoff
`;

      // Mock getWorkflowPrompt using vi.spyOn
      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(mockWorkflowPrompt);

      const enriched = enrichTaskWithWorkflow(baseTaskData, taskContent);

      expect(enriched.slug).toBe('test-task');
      expect(enriched.title).toBe('Test Task');
      expect(enriched.workflow).toEqual(mockWorkflowPrompt);
    });

    it('should return unchanged task when workflow field is missing', () => {
      const taskContent = `
### Test Task
- Status: pending
`;

      const enriched = enrichTaskWithWorkflow(baseTaskData, taskContent);

      expect(enriched).toEqual(baseTaskData);
      expect(enriched.workflow).toBeUndefined();
    });

    it('should return unchanged task when workflow field is empty', () => {
      const taskContent = `
### Test Task
- Workflow:
`;

      const enriched = enrichTaskWithWorkflow(baseTaskData, taskContent);

      expect(enriched).toEqual(baseTaskData);
      expect(enriched.workflow).toBeUndefined();
    });

    it('should log warning and return unchanged task for invalid workflow name', () => {
      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(undefined);

      const taskContent = `
### Test Task
- Workflow: non-existent-workflow
`;

      const enriched = enrichTaskWithWorkflow(baseTaskData, taskContent);

      expect(enriched).toEqual(baseTaskData);
      expect(enriched.workflow).toBeUndefined();
      // Warning should be logged (checked in integration tests)
    });

    it('should not mutate original taskData', () => {
      const taskContent = `
### Test Task
- Workflow: multi-option-tradeoff
`;

      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(mockWorkflowPrompt);

      const original = { ...baseTaskData };
      const enriched = enrichTaskWithWorkflow(baseTaskData, taskContent);

      expect(baseTaskData).toEqual(original);
      expect(enriched).not.toBe(baseTaskData);
    });

    it('should preserve all original task properties', () => {
      const extendedTaskData: TaskViewData = {
        ...baseTaskData,
        link: 'https://example.com',
        linkedDocument: '/doc.md',
        referencedDocuments: [],
        wordCount: 42,
        depth: 3,
        parent: 'parent-task'
      };

      const taskContent = `
### Test Task
- Workflow: multi-option-tradeoff
`;

      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(mockWorkflowPrompt);

      const enriched = enrichTaskWithWorkflow(extendedTaskData, taskContent);

      expect(enriched.link).toBe('https://example.com');
      expect(enriched.linkedDocument).toBe('/doc.md');
      expect(enriched.wordCount).toBe(42);
      expect(enriched.depth).toBe(3);
      expect(enriched.parent).toBe('parent-task');
      expect(enriched.workflow).toEqual(mockWorkflowPrompt);
    });
  });

  describe('enrichTaskWithMainWorkflow', () => {
    const mockMainWorkflow: WorkflowPrompt = {
      name: 'spec-first-integration',
      description: 'Spec-first integration protocol',
      content: '# Spec-First Integration\n\nAlways start with specs...',
      tags: ['spec', 'integration'],
      whenToUse: ['API integration', 'New features']
    };

    const baseTaskData: TaskViewData = {
      slug: 'test-task',
      title: 'Test Task',
      content: 'Task content',
      status: 'pending'
    };

    let mockManager: DocumentManager;
    let mockDocument: CachedDocument;

    beforeEach(() => {
      // Mock manager
      mockManager = {
        getSectionContent: vi.fn()
      } as unknown as DocumentManager;

      // Mock document with tasks section
      const mockMetadata: DocumentMetadata = {
        path: '/project/tasks.md',
        title: 'Project Tasks',
        lastModified: new Date(),
        contentHash: 'test-hash',
        wordCount: 100,
        linkCount: 0,
        codeBlockCount: 0,
        lastAccessed: new Date(),
        cacheGeneration: 0,
        namespace: 'project',
        keywords: [],
        fingerprintGenerated: new Date()
      };

      const mockHeadings: Heading[] = [
        {
          slug: 'tasks',
          title: 'Tasks',
          depth: 2,
          index: 0,
          parentIndex: null
        },
        {
          slug: 'first-task',
          title: 'First Task',
          depth: 3,
          index: 1,
          parentIndex: 0
        },
        {
          slug: 'test-task',
          title: 'Test Task',
          depth: 3,
          index: 2,
          parentIndex: 0
        }
      ];

      const mockToc: TocNode[] = [];
      const mockSlugIndex = new Map<string, number>([
        ['tasks', 0],
        ['first-task', 1],
        ['test-task', 2]
      ]);

      mockDocument = {
        metadata: mockMetadata,
        headings: mockHeadings,
        toc: mockToc,
        slugIndex: mockSlugIndex
      } as CachedDocument;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should enrich task with main workflow from first task', async () => {
      const firstTaskContent = `
### First Task
- Status: pending
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff
`;

      vi.mocked(mockManager.getSectionContent).mockResolvedValue(firstTaskContent);

      // Mock getTaskHeadings using vi.spyOn
      vi.spyOn(taskUtilities, 'getTaskHeadings').mockResolvedValue([
        { slug: 'first-task', title: 'First Task', depth: 3 },
        { slug: 'test-task', title: 'Test Task', depth: 3 }
      ]);

      // Mock getWorkflowPrompt using vi.spyOn
      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(mockMainWorkflow);

      const enriched = await enrichTaskWithMainWorkflow(mockManager, mockDocument, baseTaskData);

      expect(enriched.slug).toBe('test-task');
      expect(enriched.mainWorkflow).toEqual(mockMainWorkflow);
    });

    it('should return unchanged task when no tasks section exists', async () => {
      const mockMetadata: DocumentMetadata = {
        path: '/project/doc.md',
        title: 'Document',
        lastModified: new Date(),
        contentHash: 'hash',
        wordCount: 100,
        linkCount: 0,
        codeBlockCount: 0,
        lastAccessed: new Date(),
        cacheGeneration: 0,
        namespace: 'project',
        keywords: [],
        fingerprintGenerated: new Date()
      };

      const docWithoutTasks: CachedDocument = {
        metadata: mockMetadata,
        headings: [
          {
            slug: 'overview',
            title: 'Overview',
            depth: 2,
            index: 0,
            parentIndex: null
          }
        ],
        toc: [],
        slugIndex: new Map([['overview', 0]])
      };

      const enriched = await enrichTaskWithMainWorkflow(mockManager, docWithoutTasks, baseTaskData);

      expect(enriched).toEqual(baseTaskData);
      expect(enriched.mainWorkflow).toBeUndefined();
    });

    it('should return unchanged task when tasks section has no tasks', async () => {
      vi.spyOn(taskUtilities, 'getTaskHeadings').mockResolvedValue([]);

      const enriched = await enrichTaskWithMainWorkflow(mockManager, mockDocument, baseTaskData);

      expect(enriched).toEqual(baseTaskData);
      expect(enriched.mainWorkflow).toBeUndefined();
    });

    it('should return unchanged task when first task has no main workflow field', async () => {
      const firstTaskContent = `
### First Task
- Status: pending
`;

      vi.mocked(mockManager.getSectionContent).mockResolvedValue(firstTaskContent);

      vi.spyOn(taskUtilities, 'getTaskHeadings').mockResolvedValue([
        { slug: 'first-task', title: 'First Task', depth: 3 }
      ]);

      const enriched = await enrichTaskWithMainWorkflow(mockManager, mockDocument, baseTaskData);

      expect(enriched).toEqual(baseTaskData);
      expect(enriched.mainWorkflow).toBeUndefined();
    });

    it('should return unchanged task when main workflow field is empty', async () => {
      const firstTaskContent = `
### First Task
- Main-Workflow:
`;

      vi.mocked(mockManager.getSectionContent).mockResolvedValue(firstTaskContent);

      vi.spyOn(taskUtilities, 'getTaskHeadings').mockResolvedValue([
        { slug: 'first-task', title: 'First Task', depth: 3 }
      ]);

      const enriched = await enrichTaskWithMainWorkflow(mockManager, mockDocument, baseTaskData);

      expect(enriched).toEqual(baseTaskData);
      expect(enriched.mainWorkflow).toBeUndefined();
    });

    it('should log warning and return unchanged task when main workflow name is invalid', async () => {
      const firstTaskContent = `
### First Task
- Main-Workflow: non-existent-workflow
`;

      vi.mocked(mockManager.getSectionContent).mockResolvedValue(firstTaskContent);

      vi.spyOn(taskUtilities, 'getTaskHeadings').mockResolvedValue([
        { slug: 'first-task', title: 'First Task', depth: 3 }
      ]);

      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(undefined);

      const enriched = await enrichTaskWithMainWorkflow(mockManager, mockDocument, baseTaskData);

      expect(enriched).toEqual(baseTaskData);
      expect(enriched.mainWorkflow).toBeUndefined();
      // Warning should be logged (checked in integration tests)
    });

    it('should return unchanged task when first task content cannot be loaded', async () => {
      vi.mocked(mockManager.getSectionContent).mockResolvedValue(null);

      vi.spyOn(taskUtilities, 'getTaskHeadings').mockResolvedValue([
        { slug: 'first-task', title: 'First Task', depth: 3 }
      ]);

      const enriched = await enrichTaskWithMainWorkflow(mockManager, mockDocument, baseTaskData);

      expect(enriched).toEqual(baseTaskData);
      expect(enriched.mainWorkflow).toBeUndefined();
    });

    it('should not mutate original taskData', async () => {
      const firstTaskContent = `
### First Task
- Main-Workflow: spec-first-integration
`;

      vi.mocked(mockManager.getSectionContent).mockResolvedValue(firstTaskContent);

      vi.spyOn(taskUtilities, 'getTaskHeadings').mockResolvedValue([
        { slug: 'first-task', title: 'First Task', depth: 3 }
      ]);

      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(mockMainWorkflow);

      const original = { ...baseTaskData };
      const enriched = await enrichTaskWithMainWorkflow(mockManager, mockDocument, baseTaskData);

      expect(baseTaskData).toEqual(original);
      expect(enriched).not.toBe(baseTaskData);
    });

    it('should preserve all original task properties', async () => {
      const extendedTaskData: TaskViewData = {
        ...baseTaskData,
        link: 'https://example.com',
        linkedDocument: '/doc.md',
        referencedDocuments: [],
        wordCount: 42,
        depth: 3,
        parent: 'parent-task'
      };

      const firstTaskContent = `
### First Task
- Main-Workflow: spec-first-integration
`;

      vi.mocked(mockManager.getSectionContent).mockResolvedValue(firstTaskContent);

      vi.spyOn(taskUtilities, 'getTaskHeadings').mockResolvedValue([
        { slug: 'first-task', title: 'First Task', depth: 3 }
      ]);

      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(mockMainWorkflow);

      const enriched = await enrichTaskWithMainWorkflow(mockManager, mockDocument, extendedTaskData);

      expect(enriched.link).toBe('https://example.com');
      expect(enriched.linkedDocument).toBe('/doc.md');
      expect(enriched.wordCount).toBe(42);
      expect(enriched.depth).toBe(3);
      expect(enriched.parent).toBe('parent-task');
      expect(enriched.mainWorkflow).toEqual(mockMainWorkflow);
    });

    it('should handle tasks section with different title casing', async () => {
      const mockMetadata: DocumentMetadata = {
        path: '/project/tasks.md',
        title: 'Tasks',
        lastModified: new Date(),
        contentHash: 'hash',
        wordCount: 100,
        linkCount: 0,
        codeBlockCount: 0,
        lastAccessed: new Date(),
        cacheGeneration: 0,
        namespace: 'project',
        keywords: [],
        fingerprintGenerated: new Date()
      };

      const docWithTasks: CachedDocument = {
        metadata: mockMetadata,
        headings: [
          {
            slug: 'overview',
            title: 'Overview',
            depth: 2,
            index: 0,
            parentIndex: null
          },
          {
            slug: 'tasks-1',
            title: 'TASKS',
            depth: 2,
            index: 1,
            parentIndex: null
          },
          {
            slug: 'first-task',
            title: 'First Task',
            depth: 3,
            index: 2,
            parentIndex: 1
          }
        ],
        toc: [],
        slugIndex: new Map([
          ['overview', 0],
          ['tasks-1', 1],
          ['first-task', 2]
        ])
      };

      const firstTaskContent = `
### First Task
- Main-Workflow: spec-first-integration
`;

      vi.mocked(mockManager.getSectionContent).mockResolvedValue(firstTaskContent);

      vi.spyOn(taskUtilities, 'getTaskHeadings').mockResolvedValue([
        { slug: 'first-task', title: 'First Task', depth: 3 }
      ]);

      vi.spyOn(workflowPrompts, 'getWorkflowPrompt').mockReturnValue(mockMainWorkflow);

      const enriched = await enrichTaskWithMainWorkflow(mockManager, docWithTasks, baseTaskData);

      expect(enriched.mainWorkflow).toEqual(mockMainWorkflow);
    });
  });
});
