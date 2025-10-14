/**
 * Schema definitions for the move tool
 *
 * Moves sections or tasks between documents or within the same document.
 * Creates in new location BEFORE deleting from old location to prevent data loss.
 */

export interface MoveInputSchema {
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
    reference: {
      type: 'string';
      description: string;
    };
    position: {
      type: 'string';
      enum: ['before', 'after', 'child'];
      description: string;
    };
  };
  required: ['from', 'to', 'reference', 'position'];
  additionalProperties: false;
}

/**
 * Get the JSON schema for the move tool
 */
export function getMoveSchema(): MoveInputSchema {
  return {
    type: 'object',
    properties: {
      from: {
        type: 'string',
        description:
          'Source section/task path including document and section slug (e.g., "/docs/api/auth.md#jwt-tokens"). Must include both document path and section slug separated by #.',
      },
      to: {
        type: 'string',
        description:
          'Destination document path where section/task will be moved (e.g., "/docs/api/security.md"). Can be same document as source for within-document moves.',
      },
      reference: {
        type: 'string',
        description:
          'Reference section slug in destination document for positioning (e.g., "#tokens" or "tokens"). The moved content will be positioned relative to this section.',
      },
      position: {
        type: 'string',
        enum: ['before', 'after', 'child'],
        description:
          'Position relative to reference section: "before" (insert before reference), "after" (insert after reference), or "child" (append as child of reference with auto-depth calculation)',
      },
    },
    required: ['from', 'to', 'reference', 'position'],
    additionalProperties: false,
  };
}

/**
 * Position type for move operations
 */
export type MovePosition = 'before' | 'after' | 'child';

/**
 * Type guard for position validation
 */
export function isValidMovePosition(value: unknown): value is MovePosition {
  return (
    typeof value === 'string' &&
    (value === 'before' || value === 'after' || value === 'child')
  );
}
