/**
 * Schema definitions for section tool
 */

export interface SectionInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/search-api.md")';
    };
    section: {
      type: 'string';
      description: 'Section slug to edit or reference section for new section placement (e.g., "#endpoints", "#authentication")';
    };
    content: {
      type: 'string';
      description: 'Content for the section';
    };
    operation: {
      type: 'string';
      enum: ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'];
      default: 'replace';
      description: 'Edit: replace/append/prepend. Create: insert_before/insert_after/append_child (auto-depth). Delete: remove';
    };
    title: {
      type: 'string';
      description: 'Title for new section (required for create operations: insert_before, insert_after, append_child)';
    };
  };
  required: ['document', 'section', 'content'];
  additionalProperties: false;
}

/**
 * Schema constants for section tool
 */
export const SECTION_CONSTANTS = {
  OPERATIONS: {
    // Edit existing sections
    REPLACE: 'replace',
    APPEND: 'append',
    PREPEND: 'prepend',
    // Create new sections
    INSERT_BEFORE: 'insert_before',
    INSERT_AFTER: 'insert_after',
    APPEND_CHILD: 'append_child',
    // Delete sections
    REMOVE: 'remove',
  },
  EDIT_OPERATIONS: ['replace', 'append', 'prepend'] as const,
  CREATE_OPERATIONS: ['insert_before', 'insert_after', 'append_child'] as const,
  DELETE_OPERATIONS: ['remove'] as const,
  DEFAULT_OPERATION: 'replace',
} as const;

/**
 * Type definitions for section operations
 */
export type SectionOperation =
  | 'replace'
  | 'append'
  | 'prepend'
  | 'insert_before'
  | 'insert_after'
  | 'append_child'
  | 'remove';

export type EditOperation = 'replace' | 'append' | 'prepend';
export type CreateOperation = 'insert_before' | 'insert_after' | 'append_child';
export type DeleteOperation = 'remove';

/**
 * Helper functions for operation validation
 */
export function isEditOperation(operation: string): operation is EditOperation {
  return SECTION_CONSTANTS.EDIT_OPERATIONS.includes(operation as EditOperation);
}

export function isCreateOperation(operation: string): operation is CreateOperation {
  return SECTION_CONSTANTS.CREATE_OPERATIONS.includes(operation as CreateOperation);
}

export function isDeleteOperation(operation: string): operation is DeleteOperation {
  return SECTION_CONSTANTS.DELETE_OPERATIONS.includes(operation as DeleteOperation);
}

/**
 * Get the input schema for section tool
 */
export function getSectionSchema(): SectionInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/search-api.md")',
      },
      section: {
        type: 'string',
        description: 'Section slug to edit or reference section for new section placement (e.g., "#endpoints", "#authentication")',
      },
      content: {
        type: 'string',
        description: 'Content for the section',
      },
      operation: {
        type: 'string',
        enum: ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'],
        default: SECTION_CONSTANTS.DEFAULT_OPERATION,
        description: 'Edit: replace/append/prepend. Create: insert_before/insert_after/append_child (auto-depth). Delete: remove',
      },
      title: {
        type: 'string',
        description: 'Title for new section (required for create operations: insert_before, insert_after, append_child)',
      },
    },
    required: ['document', 'section', 'content'],
    additionalProperties: false,
  };
}