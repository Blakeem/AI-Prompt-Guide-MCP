/**
 * Schema definitions for view_document tool
 *
 * This module defines the input validation schema for the view_document MCP tool,
 * including parameter definitions, validation rules, and usage examples.
 * The tool supports both single and multiple document viewing with optional
 * linked document context loading.
 */
/**
 * Schema constants for view_document tool
 */
export const VIEW_DOCUMENT_CONSTANTS = {
    LINK_DEPTH: {
        MIN: 1,
        MAX: 6,
        DEFAULT: 2,
    },
    DEFAULTS: {
        INCLUDE_LINKED: false,
    },
    MAX_DOCUMENTS: 5, // Limit for multiple document viewing
};
/**
 * Helper functions for document parsing
 */
export function parseDocuments(document) {
    if (Array.isArray(document)) {
        return document.map(normalizePath);
    }
    return [normalizePath(document)];
}
export function normalizePath(path) {
    return path.startsWith('/') ? path : `/${path}`;
}
export function validateDocumentCount(documents) {
    return documents.length > 0 && documents.length <= VIEW_DOCUMENT_CONSTANTS.MAX_DOCUMENTS;
}
export function isValidLinkDepth(depth) {
    return depth >= VIEW_DOCUMENT_CONSTANTS.LINK_DEPTH.MIN &&
        depth <= VIEW_DOCUMENT_CONSTANTS.LINK_DEPTH.MAX;
}
/**
 * Get the input schema for view_document tool
 */
export function getViewDocumentSchema() {
    return {
        type: 'object',
        properties: {
            document: {
                type: 'string',
                description: 'Document path(s) to view (e.g., "/docs/specs/auth-api.md" or ["/docs/specs/auth-api.md", "/docs/specs/user-api.md"] for multiple)',
            },
            include_linked: {
                type: 'boolean',
                description: 'Whether to load context from linked documents referenced via @ syntax',
                default: VIEW_DOCUMENT_CONSTANTS.DEFAULTS.INCLUDE_LINKED,
            },
            link_depth: {
                type: 'number',
                description: 'Maximum depth for recursive context loading from linked documents (1-6)',
                minimum: VIEW_DOCUMENT_CONSTANTS.LINK_DEPTH.MIN,
                maximum: VIEW_DOCUMENT_CONSTANTS.LINK_DEPTH.MAX,
                default: VIEW_DOCUMENT_CONSTANTS.LINK_DEPTH.DEFAULT,
            },
        },
        required: ['document'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=view-document-schemas.js.map