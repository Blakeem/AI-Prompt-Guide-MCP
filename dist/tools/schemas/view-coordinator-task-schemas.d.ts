/**
 * Schema definitions for view_coordinator_task tool
 * Dedicated tool for viewing coordinator tasks from /coordinator/active.md
 */
export interface ViewCoordinatorTaskInputSchema {
    type: 'object';
    properties: {
        slug?: {
            type: 'string';
            description: string;
        };
    };
    required: never[];
    additionalProperties: false;
}
/**
 * Schema constants for view_coordinator_task tool
 */
export declare const VIEW_COORDINATOR_TASK_CONSTANTS: {
    readonly MAX_TASKS: 10;
    readonly COORDINATOR_PATH: "/coordinator/active.md";
};
/**
 * Get the input schema for view_coordinator_task tool
 */
export declare function getViewCoordinatorTaskSchema(): ViewCoordinatorTaskInputSchema;
//# sourceMappingURL=view-coordinator-task-schemas.d.ts.map