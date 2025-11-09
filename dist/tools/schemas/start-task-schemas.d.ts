/**
 * Schema definitions for start_task tool
 *
 * The start_task tool signals "I'm starting work on this task" and provides
 * full context including main workflow, task workflow, and referenced documents.
 * This is the primary tool for initiating work or resuming after context compression.
 */
export interface StartTaskInputSchema {
    type: 'object';
    properties: {
        document: {
            type: 'string';
            description: string;
        };
    };
    required: ['document'];
    additionalProperties: false;
}
/**
 * Get the input schema for start_task tool
 */
export declare function getStartTaskSchema(): StartTaskInputSchema;
//# sourceMappingURL=start-task-schemas.d.ts.map