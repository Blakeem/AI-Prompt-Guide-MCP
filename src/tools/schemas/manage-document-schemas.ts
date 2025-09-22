/**
 * Schema definitions for manage_document tool
 */

export interface ManageDocumentInputSchema {
  type: 'object';
  properties: {
    operation: {
      type: 'string';
      enum: ['archive', 'delete', 'rename', 'move'];
      description: 'Operation to perform: archive (with audit), delete (permanent), rename (title), move (relocate)';
    };
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/api.md")';
    };
    new_path: {
      type: 'string';
      description: 'New path for move operation';
    };
    new_title: {
      type: 'string';
      description: 'New title for rename operation';
    };
    confirm: {
      type: 'boolean';
      description: 'Required confirmation for delete operation';
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
    MOVE: 'move',
  },
  DESTRUCTIVE_OPERATIONS: ['delete'] as const,
  NON_DESTRUCTIVE_OPERATIONS: ['archive', 'rename', 'move'] as const,
} as const;

/**
 * Type definitions for document management operations
 */
export type DocumentOperation = 'archive' | 'delete' | 'rename' | 'move';
export type DestructiveOperation = 'delete';
export type NonDestructiveOperation = 'archive' | 'rename' | 'move';

/**
 * Helper functions for operation validation
 */
export function isDestructiveOperation(operation: string): operation is DestructiveOperation {
  return MANAGE_DOCUMENT_CONSTANTS.DESTRUCTIVE_OPERATIONS.includes(operation as DestructiveOperation);
}

export function isNonDestructiveOperation(operation: string): operation is NonDestructiveOperation {
  return MANAGE_DOCUMENT_CONSTANTS.NON_DESTRUCTIVE_OPERATIONS.includes(operation as NonDestructiveOperation);
}

export function requiresConfirmation(operation: string): boolean {
  return isDestructiveOperation(operation);
}

export function requiresNewPath(operation: string): boolean {
  return operation === MANAGE_DOCUMENT_CONSTANTS.OPERATIONS.MOVE;
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
  newPath?: string,
  newTitle?: string,
  confirm?: boolean
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required document parameter
  if (document == null || document === '') {
    errors.push('Document path is required');
  }

  // Operation-specific validations
  switch (operation) {
    case MANAGE_DOCUMENT_CONSTANTS.OPERATIONS.DELETE:
      if (confirm !== true) {
        errors.push('Delete operation requires explicit confirmation (confirm: true)');
      }
      break;
    case MANAGE_DOCUMENT_CONSTANTS.OPERATIONS.MOVE:
      if (newPath == null || newPath === '') {
        errors.push('Move operation requires new_path parameter');
      }
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
        enum: ['archive', 'delete', 'rename', 'move'],
        description: 'Operation to perform: archive (with audit), delete (permanent), rename (title), move (relocate)',
      },
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/api.md")',
      },
      new_path: {
        type: 'string',
        description: 'New path for move operation',
      },
      new_title: {
        type: 'string',
        description: 'New title for rename operation',
      },
      confirm: {
        type: 'boolean',
        description: 'Required confirmation for delete operation',
      },
    },
    required: ['operation', 'document'],
    additionalProperties: false,
  };
}