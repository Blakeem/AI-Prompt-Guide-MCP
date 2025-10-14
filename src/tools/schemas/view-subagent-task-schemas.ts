/**
 * Schema definitions for view_subagent_task tool
 */

export interface ViewSubagentTaskInputSchema {
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
 * Schema constants for view_subagent_task tool
 */
export const VIEW_SUBAGENT_TASK_CONSTANTS = {
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
  return tasks.length > 0 && tasks.length <= VIEW_SUBAGENT_TASK_CONSTANTS.MAX_TASKS;
}

/**
 * Get the input schema for view_subagent_task tool
 */
export function getViewSubagentTaskSchema(): ViewSubagentTaskInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: `Document path with optional task slug(s) for subagent tasks in /docs/ namespace.

⚠️ IMPORTANT: This tool is for subagent tasks ONLY. For coordinator tasks, use view_coordinator_task instead.

TWO MODES:
1. Overview: "/docs/project/tasks.md"
   → Returns list of ALL tasks with slug, title, and status (no content)
   → Use for browsing available tasks in a document

2. Detail: "/docs/project/tasks.md#implement-auth"
   → Returns FULL task content for the specified task
   → Supports multiple tasks: "/docs/api/tasks.md#task1,task2,task3"
   → Use for viewing specific task details

DOCUMENT FORMAT:
- Must be in /docs/ namespace: "/docs/{namespace}/{doc}.md"
- Supports hierarchical namespace structure
- Document parameter is REQUIRED (unlike coordinator version)

Examples:
- Subagent overview: "/docs/api/tasks.md" → All tasks (titles + status only)
- Subagent detail: "/docs/api/tasks.md#implement-auth" → Full task content
- Multiple tasks: "/docs/api/tasks.md#task1,task2" → Multiple full contents

NOTE: Coordinator tasks should use view_coordinator_task tool instead.`,
      },
    },
    required: ['document'],
    additionalProperties: false,
  };
}