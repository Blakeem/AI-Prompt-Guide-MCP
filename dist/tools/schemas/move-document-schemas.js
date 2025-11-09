/**
 * Schema definitions for move_document tool
 * Provides document relocation functionality within the filesystem
 */
/**
 * Returns the schema for move_document tool
 * Validates source and destination paths
 */
export function getMoveDocumentSchema() {
    return {
        type: 'object',
        properties: {
            from: {
                type: 'string',
                description: 'Source document path (e.g., "/docs/api/auth.md")',
            },
            to: {
                type: 'string',
                description: 'Destination document path (e.g., "/docs/api/security/auth.md")',
            },
        },
        required: ['from', 'to'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=move-document-schemas.js.map