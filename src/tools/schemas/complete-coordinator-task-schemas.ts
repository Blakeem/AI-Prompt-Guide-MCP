/**
 * Schema definitions for complete_coordinator_task tool
 *
 * COORDINATOR MODE:
 * - Sequential only (NO #slug allowed)
 * - Works with /coordinator/ namespace
 * - Completes next pending task automatically
 * - Conditionally returns next task based on return_next_task parameter (default: false)
 * - When returning next task: includes task workflow only (NO main_workflow - use start_coordinator_task for full context)
 * - Auto-archives when all tasks complete
 */

export interface CompleteCoordinatorTaskInputSchema {
  type: 'object';
  properties: {
    note: {
      type: 'string';
      description: 'Completion notes or implementation details';
    };
    return_next_task: {
      type: 'boolean';
      description: 'Return next task with workflow (default: false). Set to true to get next task info across context compression. When true, returns task workflow only (NOT main_workflow - use start_coordinator_task for full context after compression).';
    };
  };
  required: ['note'];
  additionalProperties: false;
}

/**
 * Schema constants for complete_coordinator_task tool
 */
export const COMPLETE_COORDINATOR_TASK_CONSTANTS = {
  MAX_NOTE_LENGTH: 1000,
} as const;

/**
 * Get the input schema for complete_coordinator_task tool
 */
export function getCompleteCoordinatorTaskSchema(): CompleteCoordinatorTaskInputSchema {
  return {
    type: 'object',
    properties: {
      note: {
        type: 'string',
        description: 'Completion notes or implementation details',
      },
      return_next_task: {
        type: 'boolean',
        description: 'Return next task with workflow (default: false). Set to true to get next task info across context compression. When true, returns task workflow only (NOT main_workflow - use start_coordinator_task for full context after compression).',
      },
    },
    required: ['note'],
    additionalProperties: false,
  };
}
