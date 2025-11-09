/**
 * Schema definitions for start_task tool
 *
 * The start_task tool signals "I'm starting work on this task" and provides
 * full context including main workflow, task workflow, and referenced documents.
 * This is the primary tool for initiating work or resuming after context compression.
 */
/**
 * Get the input schema for start_task tool
 */
export function getStartTaskSchema() {
    return {
        type: 'object',
        properties: {
            document: {
                type: 'string',
                description: `Document path with optional task slug.

TWO MODES:
1. Sequential: "/project/tasks.md"
   → Starts first pending/in_progress task
   → Injects main workflow + task workflow + references
   → Use for systematic work through a project

2. Ad-hoc: "/project/tasks.md#implement-auth"
   → Starts ONLY the specified task
   → Injects task workflow ONLY (no main workflow)
   → Use when a specific task was assigned to you

⚠️ IMPORTANT: If you were assigned a specific task, ALWAYS include the full path with #slug!
Example: If assigned "#implement-auth", use "/project/tasks.md#implement-auth"
Otherwise you will start the WRONG TASK!`,
            },
        },
        required: ['document'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=start-task-schemas.js.map