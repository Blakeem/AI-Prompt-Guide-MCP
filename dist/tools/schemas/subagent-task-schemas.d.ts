/**
 * Schema definitions for subagent_task tool - Bulk operations only
 * Works with /docs/ namespace for ad-hoc subagent task management
 */
/**
 * Individual task operation within the operations array
 *
 * NOTE: List operations return tasks with has_references flag (boolean)
 * but do NOT load full referenced_documents to prevent context bloat.
 * Use view_subagent_task or start_subagent_task to load full references.
 */
export interface SubagentTaskOperationSchema {
    operation: 'create' | 'edit' | 'list';
    title?: string;
    content?: string;
    task?: string;
    status?: string;
}
/**
 * Main input schema for bulk subagent task operations
 */
export interface SubagentTaskInputSchema {
    type: 'object';
    properties: {
        document: {
            type: 'string';
            description: 'Document path (e.g., "/docs/project/tasks.md"). ALWAYS required - provides context for all operations. NOTE: Subagent tasks should use /docs/ namespace.';
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
                        description: 'Task slug. TWO FORMATS: 1) "slug" - uses document parameter as context, 2) "#slug" - uses document parameter as context (with # prefix). Required for edit operation.';
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
 * Schema constants for subagent task tool
 */
export declare const SUBAGENT_TASK_CONSTANTS: {
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
 * Helper functions for subagent task validation
 */
export declare function isValidSubagentTaskOperation(operation: string): boolean;
export declare function isValidSubagentTaskStatus(status: string): boolean;
/**
 * Get the input schema for subagent_task tool (bulk operations only)
 */
export declare function getSubagentTaskSchema(): SubagentTaskInputSchema;
//# sourceMappingURL=subagent-task-schemas.d.ts.map