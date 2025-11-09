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
export declare function getMoveSchema(): MoveInputSchema;
/**
 * Position type for move operations
 */
export type MovePosition = 'before' | 'after' | 'child';
/**
 * Type guard for position validation
 */
export declare function isValidMovePosition(value: unknown): value is MovePosition;
//# sourceMappingURL=move-schemas.d.ts.map