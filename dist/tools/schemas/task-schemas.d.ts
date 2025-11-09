/**
 * Schema definitions for task tool - Bulk operations only
 */
/**
 * Individual task operation within the operations array
 */
export interface TaskOperationSchema {
    operation: 'create' | 'edit' | 'list';
    title?: string;
    content?: string;
    task?: string;
    status?: string;
}
/**
 * Main input schema for bulk task operations
 */
export interface TaskInputSchema {
    type: 'object';
    properties: {
        document: {
            type: 'string';
            description: 'Document path (e.g., "/specs/search-api.md"). ALWAYS required - provides default context for all operations. Individual task fields can override with full path "/other.md#slug" for multi-document operations.';
        };
        operations: {
            type: 'array';
            description: 'Array of task operations to perform';
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
                        description: 'Task content with optional @references and workflow metadata (Workflow: workflow_name, Main-Workflow: workflow_name). Use the get_workflow tool to discover available workflow names.';
                    };
                    task: {
                        type: 'string';
                        description: 'Task slug or full path with override support. THREE FORMATS: 1) "slug" - uses document parameter as context, 2) "#slug" - uses document parameter as context (with # prefix), 3) "/other.md#slug" - overrides document parameter for this operation. Example multi-document: document="/project/main.md" with task="/project/sub.md#task-1" creates task in sub.md instead. Required for edit operation.';
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
    required: ['document', 'operations'];
    additionalProperties: false;
}
/**
 * Schema constants for task tool
 */
export declare const TASK_CONSTANTS: {
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
};
/**
 * Helper functions for task validation
 */
export declare function isValidTaskOperation(operation: string): boolean;
export declare function isValidTaskStatus(status: string): boolean;
/**
 * Get the input schema for task tool (bulk operations only)
 */
export declare function getTaskSchema(): TaskInputSchema;
//# sourceMappingURL=task-schemas.d.ts.map