/**
 * Unit tests for task tool - Bulk operations only
 *
 * Tests the task tool with bulk operations support for creating, editing, and listing tasks.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { task } from '../task.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import { resolve } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
describe('task tool - Bulk Operations', () => {
    let manager;
    let sessionState;
    let testDir;
    let docsDir;
    beforeEach(async () => {
        // Create temporary test directory with unique ID
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        testDir = await mkdtemp(resolve(tmpdir(), `task-test-${uniqueId}-`));
        docsDir = resolve(testDir, 'docs');
        await mkdir(docsDir, { recursive: true });
        // Create document manager using shared utility
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
            await expect(task({
                document: '/test.md'
            }, sessionState, manager))
                .rejects.toThrow('operations array is required');
        });
        it('should throw error when operations is not an array', async () => {
            await expect(task({
                document: '/test.md',
                operations: 'not-an-array'
            }, sessionState, manager))
                .rejects.toThrow('operations array is required');
        });
        it('should throw error when operations array is empty', async () => {
            await expect(task({
                document: '/test.md',
                operations: []
            }, sessionState, manager))
                .rejects.toThrow('operations array cannot be empty');
        });
        it('should throw error when document parameter is missing', async () => {
            await expect(task({
                operations: [{ operation: 'list' }]
            }, sessionState, manager))
                .rejects.toThrow('document');
        });
    });
    describe('Single Create Operation', () => {
        it('should create a single task via operations array', async () => {
            // Create a test document with Tasks section
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    {
                        operation: 'create',
                        title: 'Implement Feature',
                        content: 'Status: pending\n\nBuild feature X'
                    }
                ]
            }, sessionState, manager);
            expect(result.success).toBe(true);
            expect(result.document).toBe('/test.md');
            expect(result.operations_completed).toBe(1);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]?.operation).toBe('create');
            expect(result.results[0]?.status).toBe('created');
            expect(result.results[0]?.task?.slug).toBe('implement-feature');
            expect(result.results[0]?.task?.title).toBe('Implement Feature');
        });
        it('should return error when create operation missing required fields', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    {
                        operation: 'create',
                        content: 'Missing title'
                    }
                ]
            }, sessionState, manager);
            expect(result.results[0]?.status).toBe('error');
            expect(result.results[0]?.error).toContain('title and content');
        });
    });
    describe('Multiple Create Operations', () => {
        it('should create multiple tasks in one call', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
                    { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' },
                    { operation: 'create', title: 'Task 3', content: 'Status: pending\n\nContent 3' }
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
    describe('Single List Operation', () => {
        it('should list tasks via operations array', async () => {
            // Create a test document with a task
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n### Existing Task\n\nStatus: pending\n\nTask content';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    { operation: 'list' }
                ]
            }, sessionState, manager);
            expect(result.success).toBe(true);
            expect(result.operations_completed).toBe(1);
            expect(result.results[0]?.operation).toBe('list');
            expect(result.results[0]?.status).toBe('listed');
            expect(result.results[0]?.tasks).toBeDefined();
            expect(result.results[0]?.count).toBeGreaterThan(0);
        });
        it('should list tasks with status filter', async () => {
            // Create a test document with multiple tasks
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n### Task 1\n\nStatus: pending\n\nContent\n\n### Task 2\n\nStatus: completed\n\nContent';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
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
    });
    describe('Single Edit Operation', () => {
        it('should edit a task via operations array', async () => {
            // Create a test document with a task
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n### Existing Task\n\nStatus: pending\n\nOld content';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    {
                        operation: 'edit',
                        task: 'existing-task',
                        content: 'Status: in_progress\n\nUpdated content'
                    }
                ]
            }, sessionState, manager);
            expect(result.success).toBe(true);
            expect(result.operations_completed).toBe(1);
            expect(result.results[0]?.operation).toBe('edit');
            expect(result.results[0]?.status).toBe('updated');
        });
        it('should return error when edit operation missing required fields', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    {
                        operation: 'edit',
                        content: 'New content'
                    }
                ]
            }, sessionState, manager);
            expect(result.results[0]?.status).toBe('error');
            expect(result.results[0]?.error).toContain('task slug');
        });
    });
    describe('Mixed Operations', () => {
        it('should handle create and list in one call', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    { operation: 'create', title: 'New Task', content: 'Status: pending\n\nContent' },
                    { operation: 'list' }
                ]
            }, sessionState, manager);
            expect(result.success).toBe(true);
            expect(result.operations_completed).toBe(2);
            expect(result.results).toHaveLength(2);
            expect(result.results[0]?.operation).toBe('create');
            expect(result.results[1]?.operation).toBe('list');
        });
        it('should handle multiple operation types in sequence', async () => {
            // Create a test document with a task
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n### Existing Task\n\nStatus: pending\n\nOld content';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    { operation: 'create', title: 'New Task 1', content: 'Status: pending\n\nContent 1' },
                    { operation: 'create', title: 'New Task 2', content: 'Status: pending\n\nContent 2' },
                    { operation: 'edit', task: 'existing-task', content: 'Status: completed\n\nUpdated' },
                    { operation: 'list' }
                ]
            }, sessionState, manager);
            expect(result.success).toBe(true);
            expect(result.operations_completed).toBe(4);
            expect(result.results).toHaveLength(4);
        });
    });
    describe('Error Handling', () => {
        it('should handle partial failures gracefully', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    { operation: 'create', title: 'Valid Task', content: 'Status: pending\n\nContent' },
                    { operation: 'edit', task: 'nonexistent', content: 'Will fail' }
                ]
            }, sessionState, manager);
            expect(result.results[0]?.status).toBe('created');
            expect(result.results[1]?.status).toBe('error');
            expect(result.operations_completed).toBe(1);
        });
        it('should continue processing after encountering an error', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent' },
                    { operation: 'create', title: 'Missing content' }, // Will fail
                    { operation: 'create', title: 'Task 3', content: 'Status: pending\n\nContent' }
                ]
            }, sessionState, manager);
            expect(result.results[0]?.status).toBe('created');
            expect(result.results[1]?.status).toBe('error');
            expect(result.results[2]?.status).toBe('created');
            expect(result.operations_completed).toBe(2);
        });
    });
    describe('Response Structure', () => {
        it('should return properly formatted bulk response', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
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
            expect(result.document).toBe('/test.md');
            expect(typeof result.operations_completed).toBe('number');
            expect(Array.isArray(result.results)).toBe(true);
            expect(typeof result.timestamp).toBe('string');
        });
        it('should use date-only timestamp format', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            const result = await task({
                document: '/test.md',
                operations: [
                    { operation: 'create', title: 'Test Task', content: 'Status: pending\n\nContent' }
                ]
            }, sessionState, manager);
            // Timestamp should be date-only (YYYY-MM-DD)
            expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
    describe('Batch Size Limits', () => {
        it('should accept batch with 100 operations (at limit)', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            // Generate exactly 100 operations
            const operations = Array.from({ length: 100 }, (_, i) => ({
                operation: 'create',
                title: `Task ${i + 1}`,
                content: `Status: pending\n\nContent ${i + 1}`
            }));
            const result = await task({
                document: '/test.md',
                operations
            }, sessionState, manager);
            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(100);
        });
        it('should reject batch with 101 operations (over limit)', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            // Generate 101 operations (exceeds MAX_BATCH_SIZE)
            const operations = Array.from({ length: 101 }, (_, i) => ({
                operation: 'create',
                title: `Task ${i + 1}`,
                content: `Status: pending\n\nContent ${i + 1}`
            }));
            await expect(task({
                document: '/test.md',
                operations
            }, sessionState, manager))
                .rejects.toThrow('Batch size 101 exceeds maximum of 100');
        });
        it('should include helpful context in batch size error', async () => {
            // Create a test document
            const docPath = resolve(testDir, 'docs', 'test.md');
            const docContent = '# Test\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            // Generate 101 operations
            const operations = Array.from({ length: 101 }, (_, i) => ({
                operation: 'create',
                title: `Task ${i + 1}`,
                content: `Status: pending\n\nContent ${i + 1}`
            }));
            try {
                await task({
                    document: '/test.md',
                    operations
                }, sessionState, manager);
                // Should not reach here
                expect(true).toBe(false);
            }
            catch (error) {
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
            const docPath = resolve(testDir, 'docs', 'test-autocreate.md');
            const docContent = '# Test Document\n\nSome content here.\n\n';
            await writeFile(docPath, docContent);
            // Create a task - should auto-create Tasks section
            const result = await task({
                document: '/test-autocreate.md',
                operations: [
                    {
                        operation: 'create',
                        title: 'First Task',
                        content: 'Status: pending\n\nThis is the first task'
                    }
                ]
            }, sessionState, manager);
            // Verify task was created successfully
            expect(result.success).toBe(true);
            expect(result.operations_completed).toBe(1);
            expect(result.results[0]?.status).toBe('created');
            expect(result.results[0]?.task?.slug).toBe('first-task');
            // Verify Tasks section was created
            const document = await manager.getDocument('/test-autocreate.md');
            expect(document).not.toBeNull();
            if (document != null) {
                const tasksSection = document.headings.find(h => h.slug === 'tasks' || h.title.toLowerCase() === 'tasks');
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
            const docPath = resolve(testDir, 'docs', 'test-existing.md');
            const docContent = '# Test Document\n\n## Tasks\n\n';
            await writeFile(docPath, docContent);
            // Create a task
            const result = await task({
                document: '/test-existing.md',
                operations: [
                    {
                        operation: 'create',
                        title: 'New Task',
                        content: 'Status: pending\n\nTask content'
                    }
                ]
            }, sessionState, manager);
            // Verify task was created successfully
            expect(result.success).toBe(true);
            expect(result.operations_completed).toBe(1);
            // Verify only ONE Tasks section exists
            const document = await manager.getDocument('/test-existing.md');
            expect(document).not.toBeNull();
            if (document != null) {
                const tasksSections = document.headings.filter(h => h.slug === 'tasks' || h.title.toLowerCase() === 'tasks');
                expect(tasksSections).toHaveLength(1);
            }
        });
        it('should create Tasks section at correct depth (H2)', async () => {
            // Create document with H1 title only
            const docPath = resolve(testDir, 'docs', 'test-depth.md');
            const docContent = '# Document Title\n\nSome overview content.\n\n';
            await writeFile(docPath, docContent);
            // Create a task (auto-creates Tasks)
            const result = await task({
                document: '/test-depth.md',
                operations: [
                    {
                        operation: 'create',
                        title: 'Test Task',
                        content: 'Status: pending\n\nTask content'
                    }
                ]
            }, sessionState, manager);
            // Verify success
            expect(result.success).toBe(true);
            // Verify Tasks section is H2 (depth 2)
            const document = await manager.getDocument('/test-depth.md');
            expect(document).not.toBeNull();
            if (document != null) {
                const tasksSection = document.headings.find(h => h.slug === 'tasks' || h.title.toLowerCase() === 'tasks');
                expect(tasksSection).toBeDefined();
                expect(tasksSection?.depth).toBe(2);
            }
        });
        it('should handle case-insensitive Tasks section detection', async () => {
            // Create document with lowercase "tasks" section
            const docPath = resolve(testDir, 'docs', 'test-case.md');
            const docContent = '# Test Document\n\n## tasks\n\n';
            await writeFile(docPath, docContent);
            // Create a task
            const result = await task({
                document: '/test-case.md',
                operations: [
                    {
                        operation: 'create',
                        title: 'Task One',
                        content: 'Status: pending\n\nContent'
                    }
                ]
            }, sessionState, manager);
            // Should not create duplicate, should use existing
            expect(result.success).toBe(true);
            expect(result.operations_completed).toBe(1);
            // Verify only ONE tasks section exists
            const document = await manager.getDocument('/test-case.md');
            expect(document).not.toBeNull();
            if (document != null) {
                const tasksSections = document.headings.filter(h => h.slug === 'tasks' || h.title.toLowerCase() === 'tasks');
                expect(tasksSections).toHaveLength(1);
            }
        });
        it('should throw error if document has no title heading (H1)', async () => {
            // Create document WITHOUT H1 title
            const docPath = resolve(testDir, 'docs', 'test-notitle.md');
            const docContent = '## Section One\n\nSome content.\n\n';
            await writeFile(docPath, docContent);
            // Try to create a task - should fail with helpful error
            const result = await task({
                document: '/test-notitle.md',
                operations: [
                    {
                        operation: 'create',
                        title: 'Test Task',
                        content: 'Status: pending\n\nContent'
                    }
                ]
            }, sessionState, manager);
            // Should have error result
            expect(result.results[0]?.status).toBe('error');
            expect(result.results[0]?.error).toContain('title heading');
        });
        it('should create Tasks section with proper content on auto-create', async () => {
            // Create document without Tasks section
            const docPath = resolve(testDir, 'docs', 'test-content.md');
            const docContent = '# My Document\n\nOverview content.\n\n';
            await writeFile(docPath, docContent);
            // Create a task (auto-creates Tasks)
            await task({
                document: '/test-content.md',
                operations: [
                    {
                        operation: 'create',
                        title: 'First Task',
                        content: 'Status: pending\n\nTask details'
                    }
                ]
            }, sessionState, manager);
            // Verify Tasks section content
            const sectionContent = await manager.getSectionContent('/test-content.md', 'tasks');
            expect(sectionContent).toBeDefined();
            expect(sectionContent).toContain('Task list for this document');
        });
        it('should handle multiple task creates with auto-created Tasks section', async () => {
            // Create document without Tasks section
            const docPath = resolve(testDir, 'docs', 'test-multiple.md');
            const docContent = '# Test Doc\n\nContent.\n\n';
            await writeFile(docPath, docContent);
            // Create multiple tasks in one call
            const result = await task({
                document: '/test-multiple.md',
                operations: [
                    { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent 1' },
                    { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' },
                    { operation: 'create', title: 'Task 3', content: 'Status: pending\n\nContent 3' }
                ]
            }, sessionState, manager);
            // All should succeed
            expect(result.success).toBe(true);
            expect(result.operations_completed).toBe(3);
            expect(result.results.every(r => r.status === 'created')).toBe(true);
            // Verify Tasks section exists and contains all tasks
            const document = await manager.getDocument('/test-multiple.md');
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
});
//# sourceMappingURL=task.test.js.map