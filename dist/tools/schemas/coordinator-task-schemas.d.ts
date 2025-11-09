/**
 * Schema definitions for coordinator_task tool - Bulk operations only
 * Works with /coordinator/ namespace for sequential task management
 * Sequential only - NO #slug allowed (use task reordering instead)
 */
/**
 * Individual task operation within the operations array
 */
export interface CoordinatorTaskOperationSchema {
    operation: 'create' | 'edit' | 'list';
    title?: string;
    content?: string;
    task?: string;
    status?: string;
}
/**
 * Main input schema for bulk coordinator task operations
 */
export interface CoordinatorTaskInputSchema {
    type: 'object';
    properties: {
        operations: {
            type: 'array';
            description: 'Array of task operations to perform. Document is always /coordinator/active.md (no document parameter needed).';
            items: {
                type: 'object';
                properties: {
                    operation: {
                        type: 'string';
                        enum: ['create', 'edit', 'list'];
                        description: 'Task operation type';
                    };
                    title: {
                        type: 'string';
                        description: 'Task title (required for create)';
                    };
                    content: {
                        type: 'string';
                        description: 'Task content with optional @references and workflow metadata (Workflow: workflow_name, Main-Workflow: workflow_name for first task only). Use the get_workflow tool to discover available workflow names.';
                    };
                    task: {
                        type: 'string';
                        description: 'Task slug (e.g., "initialize-project"). Required for edit operation. Sequential tasks only - NO #slug prefix allowed.';
                    };
                    status: {
                        type: 'string';
                        enum: ['pending', 'in_progress', 'completed', 'blocked'];
                        description: 'Filter by status for list operation';
                    };
                };
                required: ['operation'];
            };
        };
    };
    required: ['operations'];
    additionalProperties: false;
}
/**
 * Schema constants for coordinator task tool
 */
export declare const COORDINATOR_TASK_CONSTANTS: {
    readonly OPERATIONS: {
        readonly CREATE: "create";
        readonly EDIT: "edit";
        readonly LIST: "list";
    };
    readonly STATUSES: {
        readonly PENDING: "pending";
        readonly IN_PROGRESS: "in_progress";
        readonly COMPLETED: "completed";
        readonly BLOCKED: "blocked";
    };
    readonly MAX_TITLE_LENGTH: 200;
    readonly MAX_CONTENT_LENGTH: 2000;
    readonly MAX_NOTE_LENGTH: 1000;
    readonly FIXED_DOCUMENT_PATH: "/coordinator/active.md";
};
/**
 * Helper functions for coordinator task validation
 */
export declare function isValidCoordinatorTaskOperation(operation: string): boolean;
export declare function isValidCoordinatorTaskStatus(status: string): boolean;
/**
 * Get the input schema for coordinator_task tool (bulk operations only)
 */
export declare function getCoordinatorTaskSchema(): CoordinatorTaskInputSchema;
//# sourceMappingURL=coordinator-task-schemas.d.ts.map