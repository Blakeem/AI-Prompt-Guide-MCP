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
 *   document: '/docs/api/authentication.md'
 * };
 * ```
 *
 * @example Multiple document viewing
 * ```typescript
 * const multiInput = {
 *   document: ['/docs/api/auth.md', '/docs/api/users.md', '/docs/api/tokens.md']
 * };
 * ```
 *
 * @example Section-specific viewing
 * ```typescript
 * const sectionInput = {
 *   document: '/docs/api/authentication.md',
 *   section: 'jwt-tokens'  // or '#jwt-tokens'
 * };
 * ```
 *
 * @example Linked context loading
 * ```typescript
 * const linkedInput = {
 *   document: '/docs/api/overview.md',
 *   include_linked: true,
 *   link_depth: 3  // Load links up to 3 levels deep
 * };
 * ```
 *
 * @example Hierarchical section addressing
 * ```typescript
 * const hierarchicalInput = {
 *   document: '/docs/specs/api-design.md',
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
         * "/docs/specs/authentication.md"
         *
         * @example Multiple documents
         * ["/docs/specs/auth.md", "/docs/specs/users.md"]
         *
         * @example Namespace paths
         * "/docs/api/specs/oauth-flows.md"
         */
        document: {
            type: 'string' | 'array';
            description: 'Document path(s) to view (e.g., "/docs/specs/auth-api.md" or ["/docs/specs/auth-api.md", "/docs/specs/user-api.md"] for multiple)';
        };
        /**
         * Enable linked document context loading
         *
         * When true, automatically loads content from documents referenced
         * using @ syntax (@/path/to/doc.md#section). Provides comprehensive
         * context for understanding document relationships.
         *
         * @example Link syntax patterns
         * "See @/docs/api/auth.md#tokens for details"
         * "References: @/docs/specs/oauth.md and @/docs/guides/setup.md#config"
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
export declare const VIEW_DOCUMENT_CONSTANTS: {
    readonly LINK_DEPTH: {
        readonly MIN: 1;
        readonly MAX: 6;
        readonly DEFAULT: 2;
    };
    readonly DEFAULTS: {
        readonly INCLUDE_LINKED: false;
    };
    readonly MAX_DOCUMENTS: 5;
};
/**
 * Helper functions for document parsing
 */
export declare function parseDocuments(document: string | string[]): string[];
export declare function normalizePath(path: string): string;
export declare function validateDocumentCount(documents: string[]): boolean;
export declare function isValidLinkDepth(depth: number): boolean;
/**
 * Get the input schema for view_document tool
 */
export declare function getViewDocumentSchema(): ViewDocumentInputSchema;
//# sourceMappingURL=view-document-schemas.d.ts.map