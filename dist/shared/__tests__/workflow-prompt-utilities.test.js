/**
 * Tests for workflow prompt utilities
 *
 * These tests cover extraction, resolution, and enrichment logic for
 * workflow prompts integrated into task management.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { extractWorkflowName, extractMainWorkflowName, resolveWorkflowPrompt, enrichTaskWithWorkflow, enrichTaskWithMainWorkflow } from '../workflow-prompt-utilities.js';
import * as workflowPrompts from '../../prompts/workflow-prompts.js';
import * as taskUtilities from '../task-utilities.js';
describe('Workflow Prompt Utilities', () => {
    let tempDir;
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
        it('should extract workflow from bold format', () => {
            const content = `
### Task Title
**Workflow:** develop-staged-tdd
`;
            expect(extractWorkflowName(content)).toBe('develop-staged-tdd');
        });
        it('should extract workflow from bold format with surrounding text', () => {
            const content = `
### Task Title

**Workflow:** develop-staged

This is the task description.
`;
            expect(extractWorkflowName(content)).toBe('develop-staged');
        });
        it('should extract workflow from plain format (no list marker)', () => {
            const content = `
### Task Title
Workflow: audit
`;
            expect(extractWorkflowName(content)).toBe('audit');
        });
        it('should extract workflow from bold list format (dash)', () => {
            const content = `
### Task Title
- **Workflow:** review
`;
            expect(extractWorkflowName(content)).toBe('review');
        });
        it('should extract workflow from bold list format (asterisk)', () => {
            const content = `
### Task Title
* **Workflow:** spec-external
`;
            expect(extractWorkflowName(content)).toBe('spec-external');
        });
        it('should return null when workflow field is missing', () => {
            const content = `
### Task Title
- Status: pending
`;
            expect(extractWorkflowName(content)).toBeNull();
        });
        it('should return empty string for empty workflow value', () => {
            const content = `
### Task Title
- Workflow:
`;
            expect(extractWorkflowName(content)).toBe('');
        });
        it('should return empty string for empty workflow value in bold format', () => {
            const content = `
### Task Title
**Workflow:**
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
        it('should trim whitespace from workflow name in bold format', () => {
            const content = `
### Task Title
**Workflow:**   develop-staged-tdd
`;
            expect(extractWorkflowName(content)).toBe('develop-staged-tdd');
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
        it('should NOT match malformed partial bold format (only opening)', () => {
            const content = `
### Task Title
**Workflow: develop-staged-tdd
`;
            // Malformed markdown - missing closing **, should not match
            expect(extractWorkflowName(content)).toBeNull();
        });
        it('should match plain format with spurious asterisks in value', () => {
            const content = `
### Task Title
Workflow:** develop-staged-tdd
`;
            // Plain format matches Workflow: and captures everything after (including spurious **)
            expect(extractWorkflowName(content)).toBe('** develop-staged-tdd');
        });
        it('should handle workflow at start of content', () => {
            const content = `**Workflow:** develop-staged-tdd
Some task content here.
`;
            expect(extractWorkflowName(content)).toBe('develop-staged-tdd');
        });
        it('should handle workflow with extra spaces after colon', () => {
            const content = `
### Task Title
**Workflow:**    develop-staged-tdd
`;
            expect(extractWorkflowName(content)).toBe('develop-staged-tdd');
        });
        it('should handle workflow with tabs after colon', () => {
            const content = `
### Task Title
**Workflow:**\t\tdevelop-staged-tdd
`;
            expect(extractWorkflowName(content)).toBe('develop-staged-tdd');
        });
    });
    afterEach(async () => {
        // Clean up temporary directory and all its contents
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch {
            // Ignore if directory doesn't exist
        }
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
        it('should extract main workflow from bold format', () => {
            const content = `
### Task Title
**Main-Workflow:** spec-first-integration
`;
            expect(extractMainWorkflowName(content)).toBe('spec-first-integration');
        });
        it('should extract main workflow from bold format with surrounding text', () => {
            const content = `
### Task Title

**Main-Workflow:** develop-staged-tdd

This is the task description.
`;
            expect(extractMainWorkflowName(content)).toBe('develop-staged-tdd');
        });
        it('should extract main workflow from plain format (no list marker)', () => {
            const content = `
### Task Title
Main-Workflow: audit
`;
            expect(extractMainWorkflowName(content)).toBe('audit');
        });
        it('should extract main workflow from bold list format (dash)', () => {
            const content = `
### Task Title
- **Main-Workflow:** review
`;
            expect(extractMainWorkflowName(content)).toBe('review');
        });
        it('should extract main workflow from bold list format (asterisk)', () => {
            const content = `
### Task Title
* **Main-Workflow:** spec-external
`;
            expect(extractMainWorkflowName(content)).toBe('spec-external');
        });
        it('should return null when main workflow field is missing', () => {
            const content = `
### Task Title
- Status: pending
- Workflow: multi-option-tradeoff
`;
            expect(extractMainWorkflowName(content)).toBeNull();
        });
        it('should return empty string for empty main workflow value', () => {
            const content = `
### Task Title
- Main-Workflow:
`;
            expect(extractMainWorkflowName(content)).toBe('');
        });
        it('should return empty string for empty main workflow value in bold format', () => {
            const content = `
### Task Title
**Main-Workflow:**
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
        it('should trim whitespace from main workflow name in bold format', () => {
            const content = `
### Task Title
**Main-Workflow:**   spec-first-integration
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
        it('should handle main workflow at start of content', () => {
            const content = `**Main-Workflow:** develop-staged-tdd
Some task content here.
`;
            expect(extractMainWorkflowName(content)).toBe('develop-staged-tdd');
        });
        it('should handle main workflow with extra spaces after colon', () => {
            const content = `
### Task Title
**Main-Workflow:**    develop-staged-tdd
`;
            expect(extractMainWorkflowName(content)).toBe('develop-staged-tdd');
        });
        it('should handle main workflow with tabs after colon', () => {
            const content = `
### Task Title
**Main-Workflow:**\t\tdevelop-staged-tdd
`;
            expect(extractMainWorkflowName(content)).toBe('develop-staged-tdd');
        });
    });
    describe('resolveWorkflowPrompt', () => {
        const mockWorkflowPrompt = {
            name: 'multi-option-tradeoff',
            description: 'Multi-option trade-off analysis',
            content: '# Multi-Option Trade-off Protocol\n\nAnalyze options...',
            whenToUse: 'Multiple solution approaches or trade-off decisions'
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
        const mockWorkflowPrompt = {
            name: 'multi-option-tradeoff',
            description: 'Multi-option trade-off analysis',
            content: '# Multi-Option Trade-off Protocol\n\nAnalyze options...',
            whenToUse: 'Multiple solution approaches or trade-off decisions'
        };
        const baseTaskData = {
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
            const extendedTaskData = {
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
        const mockMainWorkflow = {
            name: 'spec-first-integration',
            description: 'Spec-first integration protocol',
            content: '# Spec-First Integration\n\nAlways start with specs...',
            whenToUse: 'API integration or new features'
        };
        const baseTaskData = {
            slug: 'test-task',
            title: 'Test Task',
            content: 'Task content',
            status: 'pending'
        };
        let mockManager;
        let mockDocument;
        beforeEach(async () => {
            // Create temporary directory for test files
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-prompt-utilities-test-'));
            // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
            process.env['MCP_WORKSPACE_PATH'] = tempDir;
            // Mock manager
            mockManager = {
                getSectionContent: vi.fn()
            };
            // Mock document with tasks section
            const mockMetadata = {
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
            const mockHeadings = [
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
            const mockToc = [];
            const mockSlugIndex = new Map([
                ['tasks', 0],
                ['first-task', 1],
                ['test-task', 2]
            ]);
            mockDocument = {
                metadata: mockMetadata,
                headings: mockHeadings,
                toc: mockToc,
                slugIndex: mockSlugIndex
            };
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
            const mockMetadata = {
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
            const docWithoutTasks = {
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
            const extendedTaskData = {
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
            const mockMetadata = {
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
            const docWithTasks = {
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
//# sourceMappingURL=workflow-prompt-utilities.test.js.map