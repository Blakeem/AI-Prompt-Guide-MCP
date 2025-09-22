/**
 * Schema definitions for browse_documents tool
 */

export interface BrowseDocumentsInputSchema {
  type: 'object';
  properties: {
    path: {
      type: 'string';
      description: 'Directory to browse or limit search scope (e.g., "/api", "/guides")';
      default: '/';
    };
    query: {
      type: 'string';
      description: 'Search terms (if empty, browse mode). When provided, performs content search across documents.';
    };
    depth: {
      type: 'number';
      description: 'Maximum traversal depth for browsing (1-5)';
      minimum: 1;
      maximum: 5;
      default: 2;
    };
    limit: {
      type: 'number';
      description: 'Maximum results for search mode';
      minimum: 1;
      maximum: 50;
      default: 10;
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
  };
  additionalProperties: false;
}

/**
 * Schema constants for browse_documents tool
 */
export const BROWSE_DOCUMENTS_CONSTANTS = {
  DEPTH: {
    MIN: 1,
    MAX: 5,
    DEFAULT: 2,
  },
  LIMIT: {
    MIN: 1,
    MAX: 50,
    DEFAULT: 10,
  },
  LINK_DEPTH: {
    MIN: 1,
    MAX: 6,
    DEFAULT: 2,
  },
  DEFAULT_PATH: '/',
} as const;

/**
 * Get the input schema for browse_documents tool
 */
export function getBrowseDocumentsSchema(): BrowseDocumentsInputSchema {
  return {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory to browse or limit search scope (e.g., "/api", "/guides")',
        default: BROWSE_DOCUMENTS_CONSTANTS.DEFAULT_PATH,
      },
      query: {
        type: 'string',
        description: 'Search terms (if empty, browse mode). When provided, performs content search across documents.',
      },
      depth: {
        type: 'number',
        description: 'Maximum traversal depth for browsing (1-5)',
        minimum: BROWSE_DOCUMENTS_CONSTANTS.DEPTH.MIN,
        maximum: BROWSE_DOCUMENTS_CONSTANTS.DEPTH.MAX,
        default: BROWSE_DOCUMENTS_CONSTANTS.DEPTH.DEFAULT,
      },
      limit: {
        type: 'number',
        description: 'Maximum results for search mode',
        minimum: BROWSE_DOCUMENTS_CONSTANTS.LIMIT.MIN,
        maximum: BROWSE_DOCUMENTS_CONSTANTS.LIMIT.MAX,
        default: BROWSE_DOCUMENTS_CONSTANTS.LIMIT.DEFAULT,
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
    },
    additionalProperties: false,
  };
}