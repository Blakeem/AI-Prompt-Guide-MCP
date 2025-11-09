/**
 * Schema definitions for view_task tool
 */
/**
 * Schema constants for view_task tool
 */
export const VIEW_TASK_CONSTANTS = {
    MAX_TASKS: 10, // Limit for multiple task viewing
};
/**
 * Helper functions for task validation
 */
export function normalizeTask(task) {
    return task.startsWith('#') ? task : `#${task}`;
}
export function parseTasks(task) {
    if (Array.isArray(task)) {
        return task.map(normalizeTask);
    }
    return [normalizeTask(task)];
}
export function validateTaskCount(tasks) {
    return tasks.length > 0 && tasks.length <= VIEW_TASK_CONSTANTS.MAX_TASKS;
}
/**
 * Get the input schema for view_task tool
 */
export function getViewTaskSchema() {
    return {
        type: 'object',
        properties: {
            document: {
                type: 'string',
                description: `Document path with optional task slug(s). Works for BOTH coordinator and subagent tasks.

TWO MODES:
1. Overview: "/docs/project/tasks.md" or "/coordinator/active.md"
   → Returns list of ALL tasks with slug, title, and status (no content)
   → Use for browsing available tasks in a document

2. Detail: "/docs/project/tasks.md#implement-auth" or "/coordinator/active.md#phase-1"
   → Returns FULL task content for the specified task
   → Supports multiple tasks: "/docs/api/tasks.md#task1,task2,task3"
   → Use for viewing specific task details

TASK TYPES:
- Coordinator tasks: "/coordinator/active.md" (sequential project orchestration)
- Subagent tasks: "/docs/{namespace}/{doc}.md" (ad-hoc task management)

Examples:
- Coordinator overview: "/coordinator/active.md" → All coordinator tasks
- Coordinator detail: "/coordinator/active.md#phase-1" → Full coordinator task
- Subagent overview: "/docs/api/tasks.md" → All subagent tasks in doc
- Subagent detail: "/docs/api/tasks.md#implement-auth" → Full subagent task
- Multiple tasks: "/docs/api/tasks.md#task1,task2" → Multiple full contents`,
            },
        },
        required: ['document'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=view-task-schemas.js.map