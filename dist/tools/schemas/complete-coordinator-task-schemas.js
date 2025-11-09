/**
 * Schema definitions for complete_coordinator_task tool
 *
 * COORDINATOR MODE:
 * - Sequential only (NO #slug allowed)
 * - Works with /coordinator/ namespace
 * - Completes next pending task automatically
 * - Conditionally returns next task based on return_next_task parameter (default: false)
 * - When returning next task: includes task workflow only (NO main_workflow - use start_coordinator_task for full context)
 * - Auto-archives when all tasks complete
 */
/**
 * Schema constants for complete_coordinator_task tool
 */
export const COMPLETE_COORDINATOR_TASK_CONSTANTS = {
    MAX_NOTE_LENGTH: 1000,
};
/**
 * Get the input schema for complete_coordinator_task tool
 */
export function getCompleteCoordinatorTaskSchema() {
    return {
        type: 'object',
        properties: {
            note: {
                type: 'string',
                description: 'Completion notes or implementation details',
            },
            return_next_task: {
                type: 'boolean',
                description: 'Return next task with workflow (default: false). Set to true to get next task info across context compression. When true, returns task workflow only (NOT main_workflow - use start_coordinator_task for full context after compression).',
            },
            include_full_workflow: {
                type: 'boolean',
                description: 'Include full workflow content in next_task response (default: false). When false, returns only workflow name and description, saving 3,000+ characters. When true, includes full workflow.content field. Only applies when return_next_task is true.',
            },
        },
        required: ['note'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=complete-coordinator-task-schemas.js.map