/**
 * Schema definitions for start_coordinator_task tool
 *
 * The start_coordinator_task tool signals "I'm starting work on this task" for
 * coordinator tasks. Provides full context including main workflow (from first task),
 * task-specific workflow, and referenced documents.
 *
 * COORDINATOR MODE:
 * - Sequential only (NO #slug allowed)
 * - Works with /coordinator/ namespace
 * - Injects Main-Workflow from first task + task workflow
 * - Auto-finds next pending task
 */

export interface StartCoordinatorTaskInputSchema {
  type: 'object';
  properties: Record<string, never>;
  required: never[];
  additionalProperties: false;
}

/**
 * Get the input schema for start_coordinator_task tool
 */
export function getStartCoordinatorTaskSchema(): StartCoordinatorTaskInputSchema {
  return {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  };
}
