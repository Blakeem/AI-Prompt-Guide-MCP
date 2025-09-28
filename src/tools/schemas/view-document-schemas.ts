/**
 * Schema definitions for view_document tool
 *
 * This module defines the input validation schema for the view_document MCP tool,
 * including parameter definitions, validation rules, and usage examples.
 * The tool supports both single and multiple document viewing with optional
 * linked document context loading.
 */

/**
 * Input schema interface for view_document tool
 *
 * Defines the structure and validation rules for view_document tool parameters.
 * Supports flexible document viewing with context loading from linked documents
 * using the @ reference syntax.
 *
 * @example Basic document viewing
 * ```typescript
 * const basicInput = {
 *   document: '/api/authentication.md'
 * };
 * ```
 *
 * @example Multiple document viewing
 * ```typescript
 * const multiInput = {
 *   document: ['/api/auth.md', '/api/users.md', '/api/tokens.md']
 * };
 * ```
 *
 * @example Section-specific viewing
 * ```typescript
 * const sectionInput = {
 *   document: '/api/authentication.md',
 *   section: 'jwt-tokens'  // or '#jwt-tokens'
 * };
 * ```
 *
 * @example Linked context loading
 * ```typescript
 * const linkedInput = {
 *   document: '/api/overview.md',
 *   include_linked: true,
 *   link_depth: 3  // Load links up to 3 levels deep
 * };
 * ```
 *
 * @example Hierarchical section addressing
 * ```typescript
 * const hierarchicalInput = {
 *   document: '/specs/api-design.md',
 *   section: 'authentication/oauth/flows',
 *   include_linked: true
 * };
 * ```
 */
export interface ViewDocumentInputSchema {
  /** Schema type, always 'object' for MCP tools */
  type: 'object';

  /** Parameter definitions with validation and examples */
  properties: {
    /**
     * Document path(s) to view
     *
     * Supports single document path as string or multiple documents as array.
     * Paths should be absolute from document root and include .md extension.
     *
     * @example Single document
     * "/specs/authentication.md"
     *
     * @example Multiple documents
     * ["/specs/auth.md", "/specs/users.md"]
     *
     * @example Namespace paths
     * "/api/specs/oauth-flows.md"
     */
    document: {
      type: 'string' | 'array';
      description: 'Document path(s) to view (e.g., "/specs/auth-api.md" or ["/specs/auth-api.md", "/specs/user-api.md"] for multiple)';
    };

    /**
     * Optional section slug for targeted viewing
     *
     * When specified, limits view to specific section and its subsections.
     * Supports both flat slugs and hierarchical addressing patterns.
     *
     * @example Flat section slug
     * "authentication"
     *
     * @example Hierarchical section path
     * "api/endpoints/users"
     *
     * @example With hash prefix (normalized automatically)
     * "#jwt-tokens"
     */
    section: {
      type: 'string';
      description: 'Optional section slug for section-specific viewing (e.g., "#authentication", "#endpoints", "api/auth/flows")';
    };

    /**
     * Enable linked document context loading
     *
     * When true, automatically loads content from documents referenced
     * using @ syntax (@/path/to/doc.md#section). Provides comprehensive
     * context for understanding document relationships.
     *
     * @example Link syntax patterns
     * "See @/api/auth.md#tokens for details"
     * "References: @/specs/oauth.md and @/guides/setup.md#config"
     *
     * @default false
     */
    include_linked: {
      type: 'boolean';
      description: 'Whether to load context from linked documents referenced via @ syntax';
      default: false;
    };

    /**
     * Maximum depth for recursive link loading
     *
     * Controls how many levels deep to follow @ references when
     * include_linked is true. Higher values provide more context
     * but increase processing time and response size.
     *
     * @example Depth behaviors
     * - Depth 1: Load direct @ references only
     * - Depth 2: Load references and their references
     * - Depth 3+: Continue recursively up to limit
     *
     * @minimum 1
     * @maximum 6
     * @default 2
     */
    link_depth: {
      type: 'number';
      description: 'Maximum depth for recursive context loading from linked documents (1-6)';
      minimum: 1;
      maximum: 6;
      default: 2;
    };
  };

  /** Required parameters - only document path is mandatory */
  required: ['document'];

  /** Prevent additional properties for strict validation */
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
  // Remove # prefix if present, since document headings are stored without #
  return section.startsWith('#') ? section.substring(1) : section;
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
        description: 'Optional section slug for section-specific viewing (e.g., "#authentication", "#endpoints", "api/auth/flows")',
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