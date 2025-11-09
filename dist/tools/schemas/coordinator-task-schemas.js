/**
 * Schema definitions for coordinator_task tool - Bulk operations only
 * Works with /coordinator/ namespace for sequential task management
 * Sequential only - NO #slug allowed (use task reordering instead)
 */
import { PATH_PREFIXES } from '../../shared/namespace-constants.js';
/**
 * Schema constants for coordinator task tool
 */
export const COORDINATOR_TASK_CONSTANTS = {
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
    FIXED_DOCUMENT_PATH: `${PATH_PREFIXES.COORDINATOR}active.md`,
};
/**
 * Helper functions for coordinator task validation
 */
export function isValidCoordinatorTaskOperation(operation) {
    return Object.values(COORDINATOR_TASK_CONSTANTS.OPERATIONS).includes(operation);
}
export function isValidCoordinatorTaskStatus(status) {
    return Object.values(COORDINATOR_TASK_CONSTANTS.STATUSES).includes(status);
}
/**
 * Get the input schema for coordinator_task tool (bulk operations only)
 */
export function getCoordinatorTaskSchema() {
    return {
        type: 'object',
        properties: {
            operations: {
                type: 'array',
                description: 'Array of task operations to perform. Document is always /coordinator/active.md (no document parameter needed).',
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
                            description: 'Task content with optional @references and workflow metadata (Workflow: workflow_name, Main-Workflow: workflow_name for first task only). Use the get_workflow tool to discover available workflow names.'
                        },
                        task: {
                            type: 'string',
                            description: 'Task slug (e.g., "initialize-project"). Required for edit operation. Sequential tasks only - NO #slug prefix allowed.'
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
        required: ['operations'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=coordinator-task-schemas.js.map