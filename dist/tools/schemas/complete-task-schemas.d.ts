/**
 * Schema definitions for complete_task tool
 */
export interface CompleteTaskInputSchema {
    type: 'object';
    properties: {
        document: {
            type: 'string';
            description: 'Document path with optional task slug.\n\nTWO MODES:\n1. Sequential: "/project/tasks.md" \n   → Completes next pending/in_progress task sequentially\n   → Returns completed task AND next available task\n\n2. Ad-hoc: "/project/tasks.md#implement-auth"\n   → Completes ONLY the specified task\n   → Returns completed task ONLY (no next task)\n   \n⚠️ IMPORTANT: If you were assigned a specific task, ALWAYS include the full path with #slug!\nExample: If assigned "#implement-auth", use "/project/tasks.md#implement-auth"\nOtherwise you will complete the WRONG TASK!';
        };
        note: {
            type: 'string';
            description: 'Completion notes or implementation details';
        };
    };
    required: ['document', 'note'];
    additionalProperties: false;
}
/**
 * Schema constants for complete_task tool
 */
export declare const COMPLETE_TASK_CONSTANTS: {
    readonly MAX_NOTE_LENGTH: 1000;
};
/**
 * Helper functions for complete_task validation
 */
export declare function isValidTaskSlug(slug: string): boolean;
/**
 * Get the input schema for complete_task tool
 */
export declare function getCompleteTaskSchema(): CompleteTaskInputSchema;
//# sourceMappingURL=complete-task-schemas.d.ts.map