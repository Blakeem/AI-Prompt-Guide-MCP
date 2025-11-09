/**
 * Schema definitions for subagent_task tool - Bulk operations only
 * Works with /docs/ namespace for ad-hoc subagent task management
 */
/**
 * Schema constants for subagent task tool
 */
export const SUBAGENT_TASK_CONSTANTS = {
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
 * Helper functions for subagent task validation
 */
export function isValidSubagentTaskOperation(operation) {
    return Object.values(SUBAGENT_TASK_CONSTANTS.OPERATIONS).includes(operation);
}
export function isValidSubagentTaskStatus(status) {
    return Object.values(SUBAGENT_TASK_CONSTANTS.STATUSES).includes(status);
}
/**
 * Get the input schema for subagent_task tool (bulk operations only)
 */
export function getSubagentTaskSchema() {
    return {
        type: 'object',
        properties: {
            document: {
                type: 'string',
                description: 'Document path (e.g., "/docs/project/tasks.md"). ALWAYS required - provides context for all operations. NOTE: Subagent tasks should use /docs/ namespace.',
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
                            description: 'Task slug. TWO FORMATS: 1) "slug" - uses document parameter as context, 2) "#slug" - uses document parameter as context (with # prefix). Required for edit operation.'
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
//# sourceMappingURL=subagent-task-schemas.js.map