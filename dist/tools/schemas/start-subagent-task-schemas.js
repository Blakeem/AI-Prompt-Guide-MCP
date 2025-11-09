/**
 * Schema definitions for start_subagent_task tool
 *
 * The start_subagent_task tool signals "I'm starting work on this task" for
 * subagent tasks. Provides full context including task workflow and referenced
 * documents. This is the primary tool for initiating subagent work or resuming
 * after context compression.
 *
 * SUBAGENT MODE:
 * - REQUIRES #slug (ad-hoc mode only)
 * - Works with /docs/ namespace
 * - Injects task workflow only (no main workflow)
 */
/**
 * Get the input schema for start_subagent_task tool
 */
export function getStartSubagentTaskSchema() {
    return {
        type: 'object',
        properties: {
            document: {
                type: 'string',
                description: `Document path with task slug (REQUIRED).

SUBAGENT MODE (AD-HOC ONLY):
Format: "/docs/project/tasks.md#implement-auth"
   → Starts the specified task
   → Injects task workflow + references
   → Use for assigned subagent tasks

⚠️ IMPORTANT: Subagent tasks REQUIRE #slug (ad-hoc mode only)!
Example: "/docs/project/tasks.md#implement-auth"
Must be in /docs/ namespace.`,
            },
        },
        required: ['document'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=start-subagent-task-schemas.js.map