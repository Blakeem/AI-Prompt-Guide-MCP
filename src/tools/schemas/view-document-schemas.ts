/**
 * Schema definitions for view_document tool
 */

export interface ViewDocumentInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string' | 'array';
      description: 'Document path(s) to view (e.g., "/specs/auth-api.md" or ["/specs/auth-api.md", "/specs/user-api.md"] for multiple)';
    };
    section: {
      type: 'string';
      description: 'Optional section slug for section-specific viewing (e.g., "#authentication", "#endpoints")';
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
  required: ['document'];
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
  MAX_DOCUMENTS: 5,  // Limit for multiple document viewing
} as const;

/**
 * Helper functions for document parsing
 */
export function parseDocuments(document: string | string[]): string[] {
  if (Array.isArray(document)) {
    return document.map(normalizePath);
  }
  return [normalizePath(document)];
}

export function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function normalizeSection(section?: string): string | undefined {
  if (section == null || section === '') return undefined;
  return section.startsWith('#') ? section : `#${section}`;
}

export function validateDocumentCount(documents: string[]): boolean {
  return documents.length > 0 && documents.length <= VIEW_DOCUMENT_CONSTANTS.MAX_DOCUMENTS;
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
      document: {
        type: 'string',
        description: 'Document path(s) to view (e.g., "/specs/auth-api.md" or ["/specs/auth-api.md", "/specs/user-api.md"] for multiple)',
      },
      section: {
        type: 'string',
        description: 'Optional section slug for section-specific viewing (e.g., "#authentication", "#endpoints")',
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