/**
 * Schema definitions for the edit_document tool
 */
export interface EditDocumentInputSchema {
    type: 'object';
    properties: {
        document: {
            type: 'string';
            description: string;
        };
        title: {
            type: 'string';
            description: string;
        };
        overview: {
            type: 'string';
            description: string;
        };
    };
    required: string[];
    additionalProperties: false;
}
/**
 * Returns the JSON schema for edit_document tool input
 */
export declare function getEditDocumentSchema(): EditDocumentInputSchema;
//# sourceMappingURL=edit-document-schemas.d.ts.map