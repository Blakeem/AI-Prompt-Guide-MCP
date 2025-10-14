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
    include_context: {
      type: 'boolean';
      description: 'Show surrounding lines (default: true)';
      default: true;
    };
    context_lines: {
      type: 'number';
      description: 'Context line count (default: 2)';
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
  };
  required: ['query'];
  additionalProperties: false;
}

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
  SEARCH_TYPES: ['fulltext', 'regex'] as const,
  DEFAULT_SEARCH_TYPE: 'fulltext' as const,
} as const;

/**
 * Get the input schema for search_documents tool
 */
export function getSearchDocumentsSchema(): SearchDocumentsInputSchema {
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
      include_context: {
        type: 'boolean',
        description: 'Show surrounding lines (default: true)',
        default: true,
      },
      context_lines: {
        type: 'number',
        description: 'Context line count (default: 2)',
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
    },
    required: ['query'],
    additionalProperties: false,
  };
}
