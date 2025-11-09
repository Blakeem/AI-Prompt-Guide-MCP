/**
 * Schema definitions for the edit_document tool
 */
/**
 * Returns the JSON schema for edit_document tool input
 */
export function getEditDocumentSchema() {
    return {
        type: 'object',
        properties: {
            document: {
                type: 'string',
                description: 'Document path (e.g., "/docs/api/auth.md")',
            },
            title: {
                type: 'string',
                description: 'New title for the document (updates first H1 heading)',
            },
            overview: {
                type: 'string',
                description: 'New overview content (content between title and first H2 section)',
            },
        },
        required: ['document'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=edit-document-schemas.js.map