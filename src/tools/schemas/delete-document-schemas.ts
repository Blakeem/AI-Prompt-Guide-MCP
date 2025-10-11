/**
 * Schema definitions for delete_document tool
 */

export interface DeleteDocumentInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/api.md")';
    };
    archive: {
      type: 'boolean';
      description: 'Archive document with audit trail instead of permanent deletion (default: false)';
      default: false;
    };
  };
  required: ['document'];
  additionalProperties: false;
}

/**
 * Get the input schema for delete_document tool
 */
export function getDeleteDocumentSchema(): DeleteDocumentInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/api.md")',
      },
      archive: {
        type: 'boolean',
        description: 'Archive document with audit trail instead of permanent deletion (default: false)',
        default: false,
      },
    },
    required: ['document'],
    additionalProperties: false,
  };
}
