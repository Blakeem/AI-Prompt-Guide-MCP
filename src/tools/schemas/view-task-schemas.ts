/**
 * Schema definitions for view_task tool
 */

export interface ViewTaskInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/auth-api.md")';
    };
    task: {
      type: 'string' | 'array';
      description: 'Task slug(s) to view (e.g., "#initialize-config" or ["#initialize-config", "#database-setup"] for multiple)';
    };
  };
  required: ['document', 'task'];
  additionalProperties: false;
}

/**
 * Schema constants for view_task tool
 */
export const VIEW_TASK_CONSTANTS = {
  MAX_TASKS: 10,  // Limit for multiple task viewing
} as const;

/**
 * Helper functions for task validation
 */
export function normalizeTask(task: string): string {
  return task.startsWith('#') ? task : `#${task}`;
}

export function parseTasks(task: string | string[]): string[] {
  if (Array.isArray(task)) {
    return task.map(normalizeTask);
  }
  return [normalizeTask(task)];
}

export function validateTaskCount(tasks: string[]): boolean {
  return tasks.length > 0 && tasks.length <= VIEW_TASK_CONSTANTS.MAX_TASKS;
}

/**
 * Get the input schema for view_task tool
 */
export function getViewTaskSchema(): ViewTaskInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/auth-api.md")',
      },
      task: {
        type: 'string',
        description: 'Task slug(s) to view (e.g., "#initialize-config" or ["#initialize-config", "#database-setup"] for multiple)',
      },
    },
    required: ['document', 'task'],
    additionalProperties: false,
  };
}