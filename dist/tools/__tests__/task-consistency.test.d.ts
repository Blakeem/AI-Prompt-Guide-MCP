/**
 * Regression test for BUG #4: view_task Cannot Find Tasks That Exist
 *
 * This test ensures that task section finding logic is consistent between
 * the `task` tool and `view_task` tool.
 *
 * Issue: view_task used .includes('task') which matched "Completed Tasks"
 * instead of the actual "Tasks" section, while task tool used exact matching.
 */
export {};
//# sourceMappingURL=task-consistency.test.d.ts.map