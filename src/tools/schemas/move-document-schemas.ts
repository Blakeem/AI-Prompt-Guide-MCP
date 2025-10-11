/**
 * Schema definitions for move_document tool
 * Provides document relocation functionality within the filesystem
 */

export interface MoveDocumentInputSchema {
  type: 'object';
  properties: {
    from: {
      type: 'string';
      description: string;
    };
    to: {
      type: 'string';
      description: string;
    };
  };
  required: ['from', 'to'];
  additionalProperties: false;
}

/**
 * Returns the schema for move_document tool
 * Validates source and destination paths
 */
export function getMoveDocumentSchema(): MoveDocumentInputSchema {
  return {
    type: 'object',
    properties: {
      from: {
        type: 'string',
        description: 'Source document path (e.g., "/api/auth.md")',
      },
      to: {
        type: 'string',
        description: 'Destination document path (e.g., "/api/security/auth.md")',
      },
    },
    required: ['from', 'to'],
    additionalProperties: false,
  };
}
