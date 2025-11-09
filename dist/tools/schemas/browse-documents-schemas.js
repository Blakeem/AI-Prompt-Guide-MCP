/**
 * Schema definitions for browse_documents tool
 */
/**
 * Schema constants for browse_documents tool
 */
export const BROWSE_DOCUMENTS_CONSTANTS = {
    LINK_DEPTH: {
        MIN: 1,
        MAX: 6,
        DEFAULT: 2,
    },
    DEFAULT_PATH: '/',
};
/**
 * Get the input schema for browse_documents tool
 */
export function getBrowseDocumentsSchema() {
    return {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'Directory to browse (e.g., "/api", "/guides") or document path to view basic metadata',
                default: BROWSE_DOCUMENTS_CONSTANTS.DEFAULT_PATH,
            },
            include_related: {
                type: 'boolean',
                description: 'Whether to include related document analysis (forward/backward links, content similarity, dependency chains)',
                default: false,
            },
            link_depth: {
                type: 'number',
                description: 'Maximum depth for link traversal analysis (1-6)',
                minimum: BROWSE_DOCUMENTS_CONSTANTS.LINK_DEPTH.MIN,
                maximum: BROWSE_DOCUMENTS_CONSTANTS.LINK_DEPTH.MAX,
                default: BROWSE_DOCUMENTS_CONSTANTS.LINK_DEPTH.DEFAULT,
            },
            verbose: {
                type: 'boolean',
                description: 'Show full section details (default: false for compact overview with section_count and word_count only)',
                default: false,
            },
        },
        additionalProperties: false,
    };
}
//# sourceMappingURL=browse-documents-schemas.js.map