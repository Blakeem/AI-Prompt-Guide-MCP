/**
 * Schema definitions for view_coordinator_task tool
 * Dedicated tool for viewing coordinator tasks from /coordinator/active.md
 */
/**
 * Schema constants for view_coordinator_task tool
 */
export const VIEW_COORDINATOR_TASK_CONSTANTS = {
    MAX_TASKS: 10, // Limit for multiple task viewing
    COORDINATOR_PATH: '/coordinator/active.md' // Fixed path for coordinator tasks
};
/**
 * Get the input schema for view_coordinator_task tool
 */
export function getViewCoordinatorTaskSchema() {
    return {
        type: 'object',
        properties: {
            slug: {
                type: 'string',
                description: `Optional task slug(s) to view. Controls output mode:

TWO MODES:
1. Overview (no slug): Returns list of ALL coordinator tasks
   → Shows: slug, title, status, has_workflow
   → Use for browsing available coordinator tasks

2. Detail (with slug): Returns FULL task content for specified task(s)
   → Shows: complete task content with references and metadata
   → Supports multiple tasks: "phase-1,phase-2,phase-3"
   → Use for viewing specific task details

Examples:
- Overview: {} → All coordinator tasks (minimal data)
- Single task: { slug: "phase-1" } → Full content for phase-1
- Multiple tasks: { slug: "phase-1,phase-2" } → Full content for both tasks

NOTE: This tool ONLY works with coordinator tasks from /coordinator/active.md.
For subagent tasks in /docs/ namespace, use view_subagent_task instead.`,
            },
        },
        required: [],
        additionalProperties: false,
    };
}
//# sourceMappingURL=view-coordinator-task-schemas.js.map