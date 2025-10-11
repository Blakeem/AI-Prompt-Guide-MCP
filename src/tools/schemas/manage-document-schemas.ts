/**
 * Schema definitions for manage_document tool
 */

export interface ManageDocumentInputSchema {
  type: 'object';
  properties: {
    operation: {
      type: 'string';
      enum: ['archive', 'delete', 'rename'];
      description: 'Operation to perform: archive (with audit), delete (permanent), rename (title)';
    };
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/api.md")';
    };
    new_title: {
      type: 'string';
      description: 'New title for rename operation';
    };
  };
  required: ['operation', 'document'];
  additionalProperties: false;
}

/**
 * Schema constants for manage_document tool
 */
export const MANAGE_DOCUMENT_CONSTANTS = {
  OPERATIONS: {
    ARCHIVE: 'archive',
    DELETE: 'delete',
    RENAME: 'rename',
  },
  DESTRUCTIVE_OPERATIONS: ['delete'] as const,
  NON_DESTRUCTIVE_OPERATIONS: ['archive', 'rename'] as const,
} as const;

/**
 * Type definitions for document management operations
 */
export type DocumentOperation = 'archive' | 'delete' | 'rename';
export type DestructiveOperation = 'delete';
export type NonDestructiveOperation = 'archive' | 'rename';

/**
 * Helper functions for operation validation
 */
export function isDestructiveOperation(operation: string): operation is DestructiveOperation {
  return MANAGE_DOCUMENT_CONSTANTS.DESTRUCTIVE_OPERATIONS.includes(operation as DestructiveOperation);
}

export function isNonDestructiveOperation(operation: string): operation is NonDestructiveOperation {
  return MANAGE_DOCUMENT_CONSTANTS.NON_DESTRUCTIVE_OPERATIONS.includes(operation as NonDestructiveOperation);
}

export function requiresNewTitle(operation: string): boolean {
  return operation === MANAGE_DOCUMENT_CONSTANTS.OPERATIONS.RENAME;
}

/**
 * Validation functions for operation parameters
 */
export function validateOperationParameters(
  operation: string,
  document: string,
  newTitle?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required document parameter
  if (document == null || document === '') {
    errors.push('Document path is required');
  }

  // Operation-specific validations
  switch (operation) {
    case MANAGE_DOCUMENT_CONSTANTS.OPERATIONS.DELETE:
      // Delete requires no additional parameters
      break;
    case MANAGE_DOCUMENT_CONSTANTS.OPERATIONS.RENAME:
      if (newTitle == null || newTitle === '') {
        errors.push('Rename operation requires new_title parameter');
      }
      break;
    case MANAGE_DOCUMENT_CONSTANTS.OPERATIONS.ARCHIVE:
      // Archive requires no additional parameters
      break;
    default:
      errors.push(`Unknown operation: ${operation}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the input schema for manage_document tool
 */
export function getManageDocumentSchema(): ManageDocumentInputSchema {
  return {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['archive', 'delete', 'rename'],
        description: 'Operation to perform: archive (with audit), delete (permanent), rename (title)',
      },
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/api.md")',
      },
      new_title: {
        type: 'string',
        description: 'New title for rename operation',
      },
    },
    required: ['operation', 'document'],
    additionalProperties: false,
  };
}