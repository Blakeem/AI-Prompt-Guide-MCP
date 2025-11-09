/**
 * Schema definitions for task tool - Bulk operations only
 */
/**
 * Schema constants for task tool
 */
export const TASK_CONSTANTS = {
    OPERATIONS: {
        CREATE: 'create',
        EDIT: 'edit',
        LIST: 'list',
    },
    STATUSES: {
        PENDING: 'pending',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        BLOCKED: 'blocked',
    },
    MAX_TITLE_LENGTH: 200,
    MAX_CONTENT_LENGTH: 2000,
    MAX_NOTE_LENGTH: 1000,
};
/**
 * Helper functions for task validation
 */
export function isValidTaskOperation(operation) {
    return Object.values(TASK_CONSTANTS.OPERATIONS).includes(operation);
}
export function isValidTaskStatus(status) {
    return Object.values(TASK_CONSTANTS.STATUSES).includes(status);
}
/**
 * Get the input schema for task tool (bulk operations only)
 */
export function getTaskSchema() {
    return {
        type: 'object',
        properties: {
            document: {
                type: 'string',
                description: 'Document path (e.g., "/specs/search-api.md"). ALWAYS required - provides default context for all operations. Individual task fields can override with full path "/other.md#slug" for multi-document operations.',
            },
            operations: {
                type: 'array',
                description: 'Array of task operations to perform',
                items: {
                    type: 'object',
                    properties: {
                        operation: {
                            type: 'string',
                            enum: ['create', 'edit', 'list'],
                            description: 'Task operation type'
                        },
                        title: {
                            type: 'string',
                            description: 'Task title (required for create)'
                        },
                        content: {
                            type: 'string',
                            description: 'Task content with optional @references and workflow metadata (Workflow: workflow_name, Main-Workflow: workflow_name). Use the get_workflow tool to discover available workflow names.'
                        },
                        task: {
                            type: 'string',
                            description: 'Task slug or full path with override support. THREE FORMATS: 1) "slug" - uses document parameter as context, 2) "#slug" - uses document parameter as context (with # prefix), 3) "/other.md#slug" - overrides document parameter for this operation. Example multi-document: document="/project/main.md" with task="/project/sub.md#task-1" creates task in sub.md instead. Required for edit operation.'
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'in_progress', 'completed', 'blocked'],
                            description: 'Filter by status for list operation'
                        }
                    },
                    required: ['operation']
                }
            }
        },
        required: ['document', 'operations'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=task-schemas.js.map