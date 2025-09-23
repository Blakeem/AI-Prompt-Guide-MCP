/**
 * Schema definitions for complete_task tool
 */

export interface CompleteTaskInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/search-api.md")';
    };
    task: {
      type: 'string';
      description: 'Task slug to complete (e.g., "#initialize-config", "#database-setup")';
    };
    note: {
      type: 'string';
      description: 'Completion notes or implementation details';
    };
  };
  required: ['document', 'task', 'note'];
  additionalProperties: false;
}

/**
 * Schema constants for complete_task tool
 */
export const COMPLETE_TASK_CONSTANTS = {
  MAX_NOTE_LENGTH: 1000,
} as const;

/**
 * Helper functions for complete_task validation
 */
export function isValidTaskSlug(slug: string): boolean {
  return slug.startsWith('#') && slug.length > 1;
}

/**
 * Get the input schema for complete_task tool
 */
export function getCompleteTaskSchema(): CompleteTaskInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/search-api.md")',
      },
      task: {
        type: 'string',
        description: 'Task slug to complete (e.g., "#initialize-config", "#database-setup")',
      },
      note: {
        type: 'string',
        description: 'Completion notes or implementation details',
      },
    },
    required: ['document', 'task', 'note'],
    additionalProperties: false,
  };
}