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
      description: 'Document path (e.g., "/specs/search-api.md")';
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
            description: 'Task content with optional @references';
          };
          task: {
            type: 'string';
            description: 'Task slug to edit (required for edit operation)';
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
} as const;

/**
 * Helper functions for task validation
 */
export function isValidTaskOperation(operation: string): boolean {
  return Object.values(TASK_CONSTANTS.OPERATIONS).includes(operation as 'list' | 'create' | 'edit');
}

export function isValidTaskStatus(status: string): boolean {
  return Object.values(TASK_CONSTANTS.STATUSES).includes(status as 'pending' | 'in_progress' | 'completed' | 'blocked');
}

/**
 * Get the input schema for task tool (bulk operations only)
 */
export function getTaskSchema(): TaskInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/search-api.md")',
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
              description: 'Task content with optional @references'
            },
            task: {
              type: 'string',
              description: 'Task slug to edit (required for edit operation)'
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