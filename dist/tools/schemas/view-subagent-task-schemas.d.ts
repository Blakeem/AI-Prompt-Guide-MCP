/**
 * Schema definitions for view_subagent_task tool
 */
export interface ViewSubagentTaskInputSchema {
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
 * Schema constants for view_subagent_task tool
 */
export declare const VIEW_SUBAGENT_TASK_CONSTANTS: {
    readonly MAX_TASKS: 10;
};
/**
 * Helper functions for task validation
 */
export declare function normalizeTask(task: string): string;
export declare function parseTasks(task: string | string[]): string[];
export declare function validateTaskCount(tasks: string[]): boolean;
/**
 * Get the input schema for view_subagent_task tool
 */
export declare function getViewSubagentTaskSchema(): ViewSubagentTaskInputSchema;
//# sourceMappingURL=view-subagent-task-schemas.d.ts.map