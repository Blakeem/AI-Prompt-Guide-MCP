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
export declare function getMoveDocumentSchema(): MoveDocumentInputSchema;
//# sourceMappingURL=move-document-schemas.d.ts.map