/**
 * Tests for shared task operations
 * Phase 1 preparation for dual task system
 *
 * These tests verify that the shared operations are exported and callable.
 * Full integration tests exist in the existing task.test.ts files.
 */
import { describe, it, expect } from 'vitest';
import { createTaskOperation, editTaskOperation, listTasksOperation, completeTaskOperation, ensureTasksSectionOperation, updateTaskStatus } from '../task-operations.js';
describe('Shared Task Operations', () => {
    describe('Type exports', () => {
        it('should export CreateTaskResult type', () => {
            const result = {
                slug: 'test',
                title: 'Test'
            };
            expect(result).toBeDefined();
        });
        it('should export CompleteTaskResult type', () => {
            const result = {
                slug: 'test',
                title: 'Test',
                note: 'Note',
                completed_date: '2025-01-01'
            };
            expect(result).toBeDefined();
        });
        it('should export ListTasksResult type', () => {
            const result = {
                tasks: []
            };
            expect(result).toBeDefined();
        });
        it('should export TaskData type', () => {
            const data = {
                slug: 'test',
                title: 'Test',
                status: 'pending'
            };
            expect(data).toBeDefined();
        });
        it('should export TaskHierarchicalContext type', () => {
            const context = {
                full_path: 'phase/category/task',
                parent_path: 'phase/category',
                phase: 'phase',
                category: 'category',
                task_name: 'task',
                depth: 3
            };
            expect(context).toBeDefined();
        });
    });
    describe('Function exports', () => {
        it('should export ensureTasksSectionOperation function', () => {
            expect(ensureTasksSectionOperation).toBeTypeOf('function');
        });
        it('should export createTaskOperation function', () => {
            expect(createTaskOperation).toBeTypeOf('function');
        });
        it('should export editTaskOperation function', () => {
            expect(editTaskOperation).toBeTypeOf('function');
        });
        it('should export listTasksOperation function', () => {
            expect(listTasksOperation).toBeTypeOf('function');
        });
        it('should export completeTaskOperation function', () => {
            expect(completeTaskOperation).toBeTypeOf('function');
        });
        it('should export updateTaskStatus function', () => {
            expect(updateTaskStatus).toBeTypeOf('function');
        });
    });
    describe('updateTaskStatus', () => {
        const testNote = 'Task completed successfully';
        const testDate = '2025-10-18';
        describe('Bold format support', () => {
            it('should update bold format status field correctly', () => {
                const content = '**Status:** pending\n\nTask description here.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('**Status:** completed');
                expect(result).not.toContain('**Status:** pending');
                expect(result).toContain(`- Completed: ${testDate}`);
                expect(result).toContain(`- Note: ${testNote}`);
            });
            it('should preserve bold format style', () => {
                const content = '**Status:** in_progress\n\nSome content.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                // Should maintain bold formatting
                expect(result).toMatch(/^\*\*Status:\*\* completed/m);
            });
            it('should handle bold format with extra whitespace', () => {
                const content = '**Status:**   pending  \n\nContent.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('**Status:** completed');
            });
        });
        describe('List format support', () => {
            it('should update hyphen list format status field', () => {
                const content = '- Status: pending\n\nTask description.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('- Status: completed');
                expect(result).not.toContain('- Status: pending');
                expect(result).toContain(`- Completed: ${testDate}`);
                expect(result).toContain(`- Note: ${testNote}`);
            });
            it('should update asterisk list format status field', () => {
                const content = '* Status: pending\n\nTask description.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('* Status: completed');
                expect(result).not.toContain('* Status: pending');
            });
            it('should preserve list marker style (hyphen)', () => {
                const content = '- Status: in_progress\n\nContent.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                // Should use hyphen marker
                expect(result).toMatch(/^- Status: completed/m);
            });
            it('should preserve list marker style (asterisk)', () => {
                const content = '* Status: in_progress\n\nContent.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                // Should use asterisk marker
                expect(result).toMatch(/^\* Status: completed/m);
            });
        });
        describe('Plain format support', () => {
            it('should update plain format status field', () => {
                const content = 'Status: pending\n\nTask description.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('Status: completed');
                expect(result).not.toContain('Status: pending');
                expect(result).toContain(`- Completed: ${testDate}`);
                expect(result).toContain(`- Note: ${testNote}`);
            });
        });
        describe('Missing status field', () => {
            it('should add status field when missing', () => {
                const content = 'Task description with no status field.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('**Status:** completed');
                expect(result).toContain(content);
                expect(result).toContain(`- Completed: ${testDate}`);
                expect(result).toContain(`- Note: ${testNote}`);
            });
            it('should prepend status field to existing content', () => {
                const content = 'Existing task content.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                // Status should come before existing content
                const statusIndex = result.indexOf('**Status:**');
                const contentIndex = result.indexOf('Existing task content.');
                expect(statusIndex).toBeLessThan(contentIndex);
            });
        });
        describe('Completion metadata', () => {
            it('should append completion date and note', () => {
                const content = '**Status:** pending\n\nTask content.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('- Completed: 2025-10-18');
                expect(result).toContain('- Note: Task completed successfully');
            });
            it('should append metadata at the end of content', () => {
                const content = '**Status:** pending\n\nTask content.\n\nMore content.';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                // Completion metadata should be at the end
                expect(result.endsWith(`- Note: ${testNote}`)).toBe(true);
            });
            it('should use consistent list format for metadata', () => {
                const boldContent = '**Status:** pending\n\nContent.';
                const listContent = '* Status: pending\n\nContent.';
                const boldResult = updateTaskStatus(boldContent, 'completed', testNote, testDate);
                const listResult = updateTaskStatus(listContent, 'completed', testNote, testDate);
                // Both should use hyphen for metadata (standard format)
                expect(boldResult).toMatch(/- Completed:/);
                expect(boldResult).toMatch(/- Note:/);
                expect(listResult).toMatch(/- Completed:/);
                expect(listResult).toMatch(/- Note:/);
            });
        });
        describe('Real-world scenarios', () => {
            it('should handle complex task content with multiple paragraphs', () => {
                const content = `**Status:** pending

This task involves multiple steps:

1. Step one
2. Step two
3. Step three

**References:**
- @/docs/guide.md

Additional context here.`;
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('**Status:** completed');
                expect(result).toContain('This task involves multiple steps:');
                expect(result).toContain('- @/docs/guide.md');
                expect(result).toContain(`- Completed: ${testDate}`);
                expect(result).toContain(`- Note: ${testNote}`);
            });
            it('should handle task with workflow metadata', () => {
                const content = `**Status:** pending

**Workflow:** develop-staged-tdd

Task implementation details.

@/docs/spec.md`;
                const result = updateTaskStatus(content, 'completed', 'All tests passing', testDate);
                expect(result).toContain('**Status:** completed');
                expect(result).toContain('**Workflow:** develop-staged-tdd');
                expect(result).toContain('- Note: All tests passing');
            });
            it('should handle status change from in_progress to completed', () => {
                const content = `**Status:** in_progress

Work is currently ongoing.`;
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).not.toContain('**Status:** in_progress');
                expect(result).toContain('**Status:** completed');
            });
        });
        describe('Edge cases', () => {
            it('should handle empty content', () => {
                const content = '';
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('**Status:** completed');
                expect(result).toContain(`- Completed: ${testDate}`);
                expect(result).toContain(`- Note: ${testNote}`);
            });
            it('should handle status on different lines', () => {
                const content = `Some content before.

**Status:** pending

Some content after.`;
                const result = updateTaskStatus(content, 'completed', testNote, testDate);
                expect(result).toContain('**Status:** completed');
                expect(result).not.toContain('**Status:** pending');
                expect(result).toContain('Some content before.');
                expect(result).toContain('Some content after.');
            });
            it('should handle special characters in note', () => {
                const specialNote = 'Completed with 100% coverage & all tests passing!';
                const content = '**Status:** pending\n\nContent.';
                const result = updateTaskStatus(content, 'completed', specialNote, testDate);
                expect(result).toContain(`- Note: ${specialNote}`);
            });
            it('should handle multiline note content', () => {
                const multilineNote = 'Completed successfully.\nAll acceptance criteria met.\nReady for review.';
                const content = '**Status:** pending\n\nContent.';
                const result = updateTaskStatus(content, 'completed', multilineNote, testDate);
                expect(result).toContain(`- Note: ${multilineNote}`);
            });
        });
    });
});
//# sourceMappingURL=task-operations.test.js.map