/**
 * Schema definitions for view_document tool
 */

export interface ViewDocumentInputSchema {
  type: 'object';
  properties: {
    path: {
      type: 'string';
      description: 'Document path or document#section for section-specific viewing (e.g., "/api/specs/auth-api.md", "/api/specs/auth-api.md#api/authentication")';
    };
    include_linked: {
      type: 'boolean';
      description: 'Whether to load context from linked documents referenced via @ syntax';
      default: false;
    };
    link_depth: {
      type: 'number';
      description: 'Maximum depth for recursive context loading from linked documents (1-6)';
      minimum: 1;
      maximum: 6;
      default: 2;
    };
  };
  required: ['path'];
  additionalProperties: false;
}

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
  PATH_SEPARATOR: '#',
} as const;

/**
 * Helper functions for path parsing
 */
export function parseDocumentPath(path: string): { documentPath: string; sectionSlug?: string } {
  const parts = path.split(VIEW_DOCUMENT_CONSTANTS.PATH_SEPARATOR);
  const documentPath = parts[0] ?? '';

  if (parts.length > 1 && parts[1] != null) {
    return { documentPath, sectionSlug: `#${parts[1]}` };
  }

  return { documentPath };
}

export function isValidLinkDepth(depth: number): boolean {
  return depth >= VIEW_DOCUMENT_CONSTANTS.LINK_DEPTH.MIN &&
         depth <= VIEW_DOCUMENT_CONSTANTS.LINK_DEPTH.MAX;
}

/**
 * Get the input schema for view_document tool
 */
export function getViewDocumentSchema(): ViewDocumentInputSchema {
  return {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Document path or document#section for section-specific viewing (e.g., "/api/specs/auth-api.md", "/api/specs/auth-api.md#api/authentication")',
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
    required: ['path'],
    additionalProperties: false,
  };
}