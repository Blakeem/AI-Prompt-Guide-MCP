/**
 * Schema definitions for start_coordinator_task tool
 *
 * The start_coordinator_task tool signals "I'm starting work on this task" for
 * coordinator tasks. Provides full context including main workflow (from first task),
 * task-specific workflow, and referenced documents.
 *
 * COORDINATOR MODE:
 * - Sequential only (NO #slug allowed)
 * - Works with /coordinator/ namespace
 * - Conditionally returns task context based on return_task_context parameter (default: false)
 * - When returning context: includes Main-Workflow from first task + task workflow + references
 * - Auto-finds next pending task
 */
export interface StartCoordinatorTaskInputSchema {
    type: 'object';
    properties: {
        return_task_context: {
            type: 'boolean';
            description: 'Return task with full context (default: false). ⚠️ ONLY use when: resuming after context compression OR after a few subagent calls when context feels stale. DO NOT use on first task start (wastes ~1000 tokens). When true: injects Main-Workflow, task workflow, and @references.';
        };
    };
    required: never[];
    additionalProperties: false;
}
/**
 * Get the input schema for start_coordinator_task tool
 */
export declare function getStartCoordinatorTaskSchema(): StartCoordinatorTaskInputSchema;
//# sourceMappingURL=start-coordinator-task-schemas.d.ts.map