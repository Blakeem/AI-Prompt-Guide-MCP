/**
 * Schema definitions for task-related tools (add_task, complete_task, reopen_task)
 */

export interface AddTaskInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/search-api.md")';
    };
    title: {
      type: 'string';
      description: 'Task title';
    };
    criteria: {
      type: 'string';
      description: 'Measurable completion criteria';
    };
    links: {
      type: 'array';
      items: { type: 'string' };
      description: 'References to specification documents';
    };
  };
  required: ['document', 'title'];
  additionalProperties: false;
}

export interface CompleteTaskInputSchema {
  type: 'object';
  properties: {
    task_id: {
      type: 'string';
      description: 'Task identifier (e.g., "search-api.md#tasks[3]")';
    };
    note: {
      type: 'string';
      description: 'Completion notes or implementation details';
    };
  };
  required: ['task_id'];
  additionalProperties: false;
}

export interface ReopenTaskInputSchema {
  type: 'object';
  properties: {
    task_id: {
      type: 'string';
      description: 'Task identifier (e.g., "api.md#tasks[0]")';
    };
  };
  required: ['task_id'];
  additionalProperties: false;
}

/**
 * Schema constants for task tools
 */
export const TASK_CONSTANTS = {
  TASK_ID_PATTERN: /^.+\.md#tasks\[\d+\]$/,
  LINK_PROTOCOLS: ['http://', 'https://', '/'] as const,
  MAX_LINKS: 20,
  MAX_TITLE_LENGTH: 200,
  MAX_CRITERIA_LENGTH: 1000,
  MAX_NOTE_LENGTH: 2000,
} as const;

/**
 * Helper functions for task validation
 */
export function isValidTaskId(taskId: string): boolean {
  return TASK_CONSTANTS.TASK_ID_PATTERN.test(taskId);
}

export function parseTaskId(taskId: string): { document: string; index: number } | null {
  const match = taskId.match(/^(.+\.md)#tasks\[(\d+)\]$/);
  if (match?.[1] == null || match?.[2] == null) {
    return null;
  }

  const document = match[1];
  const index = parseInt(match[2], 10);

  return { document, index };
}

export function isValidLink(link: string): boolean {
  return TASK_CONSTANTS.LINK_PROTOCOLS.some(protocol => link.startsWith(protocol));
}

export function validateTaskLinks(links?: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (links == null) {
    return { valid: true, errors: [] };
  }

  if (links.length > TASK_CONSTANTS.MAX_LINKS) {
    errors.push(`Too many links: ${links.length} (maximum: ${TASK_CONSTANTS.MAX_LINKS})`);
  }

  for (const [index, link] of links.entries()) {
    if (!isValidLink(link)) {
      errors.push(`Invalid link at index ${index}: ${link} (must start with http://, https://, or /)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the input schema for add_task tool
 */
export function getAddTaskSchema(): AddTaskInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/search-api.md")',
      },
      title: {
        type: 'string',
        description: 'Task title',
      },
      criteria: {
        type: 'string',
        description: 'Measurable completion criteria',
      },
      links: {
        type: 'array',
        items: { type: 'string' },
        description: 'References to specification documents',
      },
    },
    required: ['document', 'title'],
    additionalProperties: false,
  };
}

/**
 * Get the input schema for complete_task tool
 */
export function getCompleteTaskSchema(): CompleteTaskInputSchema {
  return {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'Task identifier (e.g., "search-api.md#tasks[3]")',
      },
      note: {
        type: 'string',
        description: 'Completion notes or implementation details',
      },
    },
    required: ['task_id'],
    additionalProperties: false,
  };
}

/**
 * Get the input schema for reopen_task tool
 */
export function getReopenTaskSchema(): ReopenTaskInputSchema {
  return {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'Task identifier (e.g., "api.md#tasks[0]")',
      },
    },
    required: ['task_id'],
    additionalProperties: false,
  };
}