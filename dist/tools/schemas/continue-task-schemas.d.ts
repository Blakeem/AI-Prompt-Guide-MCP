/**
 * Schema definitions for continue_task tool
 *
 * The continue_task tool signals "I'm starting work on this task" and provides
 * full context including main workflow, task workflow, and referenced documents.
 * This is the primary tool for initiating work or resuming after context compression.
 */
export interface ContinueTaskInputSchema {
    type: 'object';
    properties: {
        document: {
            type: 'string';
            description: 'Document path (e.g., "/project/setup.md")';
        };
        task: {
            type: 'string';
            description: 'Task slug to continue (e.g., "#initialize-project", "#database-setup")';
        };
    };
    required: ['document', 'task'];
    additionalProperties: false;
}
/**
 * Get the input schema for continue_task tool
 */
export declare function getContinueTaskSchema(): ContinueTaskInputSchema;
//# sourceMappingURL=continue-task-schemas.d.ts.map