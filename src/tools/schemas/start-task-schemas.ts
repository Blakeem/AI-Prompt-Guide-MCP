/**
 * Schema definitions for start_task tool
 *
 * The start_task tool signals "I'm starting work on this task" and provides
 * full context including main workflow, task workflow, and referenced documents.
 * This is the primary tool for initiating work or resuming after context compression.
 */

export interface StartTaskInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string';
      description: 'Document path (e.g., "/project/setup.md")';
    };
    task: {
      type: 'string';
      description: 'Task slug to start (e.g., "#initialize-project", "#database-setup")';
    };
  };
  required: ['document', 'task'];
  additionalProperties: false;
}

/**
 * Get the input schema for start_task tool
 */
export function getStartTaskSchema(): StartTaskInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/project/setup.md")',
      },
      task: {
        type: 'string',
        description: 'Task slug to start (e.g., "#initialize-project", "#database-setup")',
      },
    },
    required: ['document', 'task'],
    additionalProperties: false,
  };
}
