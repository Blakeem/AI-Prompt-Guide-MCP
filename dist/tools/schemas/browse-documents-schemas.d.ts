/**
 * Schema definitions for browse_documents tool
 */
export interface BrowseDocumentsInputSchema {
    type: 'object';
    properties: {
        path: {
            type: 'string';
            description: 'Directory to browse (e.g., "/api", "/guides") or document path to view basic metadata';
            default: '/';
        };
        include_related: {
            type: 'boolean';
            description: 'Whether to include related document analysis (forward/backward links, content similarity, dependency chains)';
            default: false;
        };
        link_depth: {
            type: 'number';
            description: 'Maximum depth for link traversal analysis (1-6)';
            minimum: 1;
            maximum: 6;
            default: 2;
        };
        verbose: {
            type: 'boolean';
            description: 'Show full section details (default: false for compact overview with section_count and word_count only)';
            default: false;
        };
    };
    additionalProperties: false;
}
/**
 * Schema constants for browse_documents tool
 */
export declare const BROWSE_DOCUMENTS_CONSTANTS: {
    readonly LINK_DEPTH: {
        readonly MIN: 1;
        readonly MAX: 6;
        readonly DEFAULT: 2;
    };
    readonly DEFAULT_PATH: "/";
};
/**
 * Get the input schema for browse_documents tool
 */
export declare function getBrowseDocumentsSchema(): BrowseDocumentsInputSchema;
//# sourceMappingURL=browse-documents-schemas.d.ts.map