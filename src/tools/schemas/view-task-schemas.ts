/**
 * Schema definitions for view_task tool
 */

export interface ViewTaskInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string';
      description: string;
    };
  };
  required: ['document'];
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
        description: `Document path with optional task slug(s).

TWO MODES:
1. Overview: "/docs/project/tasks.md"
   → Returns list of ALL tasks with slug, title, and status (no content)
   → Use for browsing available tasks in a document

2. Detail: "/docs/project/tasks.md#implement-auth"
   → Returns FULL task content for the specified task
   → Supports multiple tasks: "/docs/project/tasks.md#task1,task2,task3"
   → Use for viewing specific task details

Examples:
- Overview: "/docs/api/tasks.md" → All tasks (titles + status only)
- Single detail: "/docs/api/tasks.md#implement-auth" → Full task content
- Multiple detail: "/docs/api/tasks.md#task1,task2" → Multiple full contents`,
      },
    },
    required: ['document'],
    additionalProperties: false,
  };
}