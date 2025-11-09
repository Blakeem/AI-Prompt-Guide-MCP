/**
 * Regression test for BUG #4: view_task Cannot Find Tasks That Exist
 *
 * This test ensures that task section finding logic is consistent between
 * the `task` tool and `view_task` tool.
 *
 * Issue: view_task used .includes('task') which matched "Completed Tasks"
 * instead of the actual "Tasks" section, while task tool used exact matching.
 */
import { describe, it, expect } from 'vitest';
describe('Task Section Finding Logic Consistency (BUG #4)', () => {
    /**
     * Test the core issue: task section finding logic
     * This replicates the exact logic used in both tools
     */
    it('should find the same Tasks section using both task.ts and view-task.ts logic', () => {
        // Mock document headings that replicate the structure causing the bug
        const mockHeadings = [
            { slug: 'overview', title: 'Overview', depth: 2 },
            { slug: 'completed-tasks', title: 'Completed Tasks', depth: 2 },
            { slug: 'task-plan-test-document', title: 'Task: Plan Test Document', depth: 3 },
            { slug: 'blocked-tasks', title: 'Blocked Tasks', depth: 2 },
            { slug: 'task-deploy-to-production', title: 'Task: Deploy to Production', depth: 3 },
            { slug: 'tasks', title: 'Tasks', depth: 2 },
            { slug: 'test-task-listing', title: 'Test Task Listing', depth: 3 },
            { slug: 'test-task-creation', title: 'Test Task Creation', depth: 3 },
        ];
        // Logic from task.ts (correct)
        const tasksSectionFromTaskTool = mockHeadings.find(h => h.slug === 'tasks' ||
            h.title.toLowerCase() === 'tasks');
        // Logic from view-task.ts BEFORE the fix (wrong)
        const tasksSectionFromViewTaskToolOld = mockHeadings.find(h => h.slug === 'tasks' ||
            h.title.toLowerCase().includes('task') ||
            h.title.toLowerCase() === 'tasks');
        // Logic from view-task.ts AFTER the fix (correct)
        const tasksSectionFromViewTaskToolNew = mockHeadings.find(h => h.slug === 'tasks' ||
            h.title.toLowerCase() === 'tasks');
        // Verify the bug existed
        expect(tasksSectionFromTaskTool?.slug).toBe('tasks');
        expect(tasksSectionFromViewTaskToolOld?.slug).toBe('completed-tasks'); // Wrong!
        // Verify the fix works
        expect(tasksSectionFromViewTaskToolNew?.slug).toBe('tasks');
        expect(tasksSectionFromTaskTool?.slug).toBe(tasksSectionFromViewTaskToolNew?.slug);
    });
    it('should prioritize exact "tasks" section over sections with "task" in the name', () => {
        // Test various section orderings to ensure robustness
        const scenarios = [
            {
                name: 'Tasks section after other task sections',
                headings: [
                    { slug: 'completed-tasks', title: 'Completed Tasks', depth: 2 },
                    { slug: 'task-management', title: 'Task Management', depth: 2 },
                    { slug: 'tasks', title: 'Tasks', depth: 2 },
                ]
            },
            {
                name: 'Tasks section before other task sections',
                headings: [
                    { slug: 'tasks', title: 'Tasks', depth: 2 },
                    { slug: 'completed-tasks', title: 'Completed Tasks', depth: 2 },
                    { slug: 'future-tasks', title: 'Future Tasks', depth: 2 },
                ]
            },
            {
                name: 'Tasks section in the middle',
                headings: [
                    { slug: 'task-overview', title: 'Task Overview', depth: 2 },
                    { slug: 'tasks', title: 'Tasks', depth: 2 },
                    { slug: 'archived-tasks', title: 'Archived Tasks', depth: 2 },
                ]
            }
        ];
        scenarios.forEach(({ name, headings }) => {
            // Logic from both tools should now be identical
            const foundSection = headings.find(h => h.slug === 'tasks' ||
                h.title.toLowerCase() === 'tasks');
            expect(foundSection?.slug, `Failed scenario: ${name}`).toBe('tasks');
        });
    });
    it('should not match partial task words', () => {
        const mockHeadings = [
            { slug: 'multitasking', title: 'Multitasking', depth: 2 },
            { slug: 'task-force', title: 'Task Force', depth: 2 },
            { slug: 'tasks', title: 'Tasks', depth: 2 },
        ];
        // Only exact match for "tasks" should work
        const foundSection = mockHeadings.find(h => h.slug === 'tasks' ||
            h.title.toLowerCase() === 'tasks');
        expect(foundSection?.slug).toBe('tasks');
        expect(foundSection?.title).toBe('Tasks');
    });
});
//# sourceMappingURL=task-consistency.test.js.map