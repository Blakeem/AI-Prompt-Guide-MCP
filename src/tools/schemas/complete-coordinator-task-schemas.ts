/**
 * Schema definitions for complete_coordinator_task tool
 *
 * COORDINATOR MODE:
 * - Sequential only (NO #slug allowed)
 * - Works with /coordinator/ namespace
 * - Completes next pending task automatically
 * - Returns next task with workflow (no main workflow)
 * - Auto-archives when all tasks complete
 */

export interface CompleteCoordinatorTaskInputSchema {
  type: 'object';
  properties: {
    note: {
      type: 'string';
      description: 'Completion notes or implementation details';
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
    },
    required: ['note'],
    additionalProperties: false,
  };
}
