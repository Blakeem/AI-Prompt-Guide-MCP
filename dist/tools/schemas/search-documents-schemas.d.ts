/**
 * Schema definitions for search_documents tool
 */
export interface SearchDocumentsInputSchema {
    type: 'object';
    properties: {
        query: {
            type: 'string';
            description: 'Search term or regex pattern';
        };
        scope: {
            type: 'string';
            description: 'Optional namespace path like "/docs/api/" to limit search';
        };
        type: {
            type: 'string';
            enum: ['fulltext', 'regex'];
            description: 'Search mode (default: "fulltext")';
            default: 'fulltext';
        };
        verbose: {
            type: 'boolean';
            description: 'Show context lines around matches (default: false). When false, only match_text is included. When true, context_before and context_after are included.';
            default: false;
        };
        context_lines: {
            type: 'number';
            description: 'Context line count when verbose=true (default: 2)';
            minimum: 0;
            maximum: 10;
            default: 2;
        };
        max_results: {
            type: 'number';
            description: 'Limit total results (default: 50)';
            minimum: 1;
            maximum: 500;
            default: 50;
        };
        max_match_length: {
            type: 'number';
            description: 'Maximum length for match_text field (default: 80). Longer matches will be truncated with "..."';
            minimum: 20;
            maximum: 500;
            default: 80;
        };
    };
    required: ['query'];
    additionalProperties: false;
}
/**
 * Schema constants for search_documents tool
 */
export declare const SEARCH_DOCUMENTS_CONSTANTS: {
    readonly CONTEXT_LINES: {
        readonly MIN: 0;
        readonly MAX: 10;
        readonly DEFAULT: 2;
    };
    readonly MAX_RESULTS: {
        readonly MIN: 1;
        readonly MAX: 500;
        readonly DEFAULT: 50;
    };
    readonly MAX_MATCH_LENGTH: {
        readonly MIN: 20;
        readonly MAX: 500;
        readonly DEFAULT: 80;
    };
    readonly SEARCH_TYPES: readonly ["fulltext", "regex"];
    readonly DEFAULT_SEARCH_TYPE: "fulltext";
};
/**
 * Get the input schema for search_documents tool
 */
export declare function getSearchDocumentsSchema(): SearchDocumentsInputSchema;
//# sourceMappingURL=search-documents-schemas.d.ts.map