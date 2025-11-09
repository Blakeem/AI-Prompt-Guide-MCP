/**
 * Unit tests for complete_task tool
 *
 * Tests the complete_task tool which marks a task as completed and returns
 * the next available task with task-specific workflow injection (if present).
 *
 * Key behaviors tested:
 * - Task workflow injection for next task (if Workflow field present)
 * - NO main workflow injection (different from start_task)
 * - Graceful degradation for invalid workflow names
 * - Edge cases (no next task, empty workflow fields)
 */
export {};
//# sourceMappingURL=complete-subagent-task.test.d.ts.map