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
export interface StartSubagentTaskInputSchema {
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
 * Get the input schema for start_subagent_task tool
 */
export declare function getStartSubagentTaskSchema(): StartSubagentTaskInputSchema;
//# sourceMappingURL=start-subagent-task-schemas.d.ts.map