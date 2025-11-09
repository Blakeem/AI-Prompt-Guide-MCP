/**
 * Schema definitions for search_documents tool
 */
/**
 * Schema constants for search_documents tool
 */
export const SEARCH_DOCUMENTS_CONSTANTS = {
    CONTEXT_LINES: {
        MIN: 0,
        MAX: 10,
        DEFAULT: 2,
    },
    MAX_RESULTS: {
        MIN: 1,
        MAX: 500,
        DEFAULT: 50,
    },
    MAX_MATCH_LENGTH: {
        MIN: 20,
        MAX: 500,
        DEFAULT: 80,
    },
    SEARCH_TYPES: ['fulltext', 'regex'],
    DEFAULT_SEARCH_TYPE: 'fulltext',
};
/**
 * Get the input schema for search_documents tool
 */
export function getSearchDocumentsSchema() {
    return {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search term or regex pattern',
            },
            scope: {
                type: 'string',
                description: 'Optional namespace path like "/docs/api/" to limit search',
            },
            type: {
                type: 'string',
                enum: ['fulltext', 'regex'],
                description: 'Search mode (default: "fulltext")',
                default: SEARCH_DOCUMENTS_CONSTANTS.DEFAULT_SEARCH_TYPE,
            },
            verbose: {
                type: 'boolean',
                description: 'Show context lines around matches (default: false). When false, only match_text is included. When true, context_before and context_after are included.',
                default: false,
            },
            context_lines: {
                type: 'number',
                description: 'Context line count when verbose=true (default: 2)',
                minimum: SEARCH_DOCUMENTS_CONSTANTS.CONTEXT_LINES.MIN,
                maximum: SEARCH_DOCUMENTS_CONSTANTS.CONTEXT_LINES.MAX,
                default: SEARCH_DOCUMENTS_CONSTANTS.CONTEXT_LINES.DEFAULT,
            },
            max_results: {
                type: 'number',
                description: 'Limit total results (default: 50)',
                minimum: SEARCH_DOCUMENTS_CONSTANTS.MAX_RESULTS.MIN,
                maximum: SEARCH_DOCUMENTS_CONSTANTS.MAX_RESULTS.MAX,
                default: SEARCH_DOCUMENTS_CONSTANTS.MAX_RESULTS.DEFAULT,
            },
            max_match_length: {
                type: 'number',
                description: 'Maximum length for match_text field (default: 80). Longer matches will be truncated with "..."',
                minimum: SEARCH_DOCUMENTS_CONSTANTS.MAX_MATCH_LENGTH.MIN,
                maximum: SEARCH_DOCUMENTS_CONSTANTS.MAX_MATCH_LENGTH.MAX,
                default: SEARCH_DOCUMENTS_CONSTANTS.MAX_MATCH_LENGTH.DEFAULT,
            },
        },
        required: ['query'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=search-documents-schemas.js.map