/**
 * Schema definitions for complete_subagent_task tool
 *
 * SUBAGENT MODE:
 * - REQUIRES #slug (ad-hoc mode only)
 * - Works with /docs/ namespace
 * - Completes the specified task only (no next task)
 */
export interface CompleteSubagentTaskInputSchema {
    type: 'object';
    properties: {
        document: {
            type: 'string';
            description: 'Document path with task slug (REQUIRED).\n\nSUBAGENT MODE (AD-HOC ONLY):\nFormat: "/docs/project/tasks.md#implement-auth"\n   → Completes the specified task\n   → Returns completed task ONLY (no next task)\n   \n⚠️ IMPORTANT: Subagent tasks REQUIRE #slug (ad-hoc mode only)!\nExample: "/docs/project/tasks.md#implement-auth"\nMust be in /docs/ namespace.';
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
 * Schema constants for complete_subagent_task tool
 */
export declare const COMPLETE_SUBAGENT_TASK_CONSTANTS: {
    readonly MAX_NOTE_LENGTH: 1000;
};
/**
 * Helper functions for complete_subagent_task validation
 */
export declare function isValidSubagentTaskSlug(slug: string): boolean;
/**
 * Get the input schema for complete_subagent_task tool
 */
export declare function getCompleteSubagentTaskSchema(): CompleteSubagentTaskInputSchema;
//# sourceMappingURL=complete-subagent-task-schemas.d.ts.map