/**
 * Schema definitions for task tool
 */

export interface TaskInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/search-api.md")';
    };
    task: {
      type: 'string';
      description: 'Task slug to target (e.g., "#initialize-config", "#database-setup") or reference task for new task placement';
    };
    content: {
      type: 'string';
      description: 'Task content including link, status, priority, dependencies';
    };
    operation: {
      type: 'string';
      enum: ['create', 'edit', 'list'];
      default: 'list';
      description: 'create: new task, edit: modify task, list: show tasks';
    };
    title: {
      type: 'string';
      description: 'Title for new task (required for create operation)';
    };
    status: {
      type: 'string';
      enum: ['pending', 'in_progress', 'completed', 'blocked'];
      description: 'Task status filter for list operation or new status for edit operation';
    };
    priority: {
      type: 'string';
      enum: ['low', 'medium', 'high'];
      description: 'Priority filter for list operation or priority for new task';
    };
  };
  required: ['document'];
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
  PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
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

export function isValidTaskPriority(priority: string): boolean {
  return Object.values(TASK_CONSTANTS.PRIORITIES).includes(priority as 'high' | 'medium' | 'low');
}

/**
 * Get the input schema for task tool
 */
export function getTaskSchema(): TaskInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/search-api.md")',
      },
      task: {
        type: 'string',
        description: 'Task slug to target (e.g., "#initialize-config", "#database-setup") or reference task for new task placement',
      },
      content: {
        type: 'string',
        description: 'Task content including link, status, priority, dependencies',
      },
      operation: {
        type: 'string',
        enum: ['create', 'edit', 'list'],
        default: 'list',
        description: 'create: new task, edit: modify task, list: show tasks',
      },
      title: {
        type: 'string',
        description: 'Title for new task (required for create operation)',
      },
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed', 'blocked'],
        description: 'Task status filter for list operation or new status for edit operation',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Priority filter for list operation or priority for new task',
      },
    },
    required: ['document'],
    additionalProperties: false,
  };
}