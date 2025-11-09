/**
 * Type definitions for the Document Linking System
 */
/**
 * Parsed link reference with structural information
 */
export interface ParsedLink {
    /** Type of link reference */
    type: 'cross-doc' | 'within-doc' | 'external';
    /** Full document path (for cross-doc links) */
    document?: string;
    /** Hierarchical section slug (for section links) */
    section?: string;
    /** Original link text as provided */
    raw: string;
}
/**
 * Link validation result with detailed feedback
 */
export interface LinkValidation {
    /** Whether the link is valid and accessible */
    valid: boolean;
    /** Whether the referenced document exists */
    documentExists?: boolean;
    /** Whether the referenced section exists (if specified) */
    sectionExists?: boolean;
    /** Error message if validation failed */
    error?: string;
    /** Suggested correction or alternative if available */
    suggestion?: string;
}
/**
 * Hierarchical slug structure with path components
 */
export interface HierarchicalSlug {
    /** Complete slug path (e.g., "api/authentication/jwt-tokens") */
    full: string;
    /** Split components of the slug path */
    parts: string[];
    /** Nesting level (depth) of the slug */
    depth: number;
    /** Parent slug path (undefined for top-level) */
    parent?: string;
}
/**
 * Link context information for automatic loading
 */
export interface LinkContext {
    /** Primary document being edited */
    primaryDocument: string;
    /** Current section being modified */
    currentSection?: string;
    /** Linked documents with relevant content */
    linkedDocuments: unknown[];
    /** Suggested related documents */
    suggestions: unknown[];
}
/**
 * Options for link resolution and validation
 */
export interface LinkOptions {
    /** Maximum depth for context loading */
    maxDepth?: number;
    /** Whether to include suggested links */
    includeSuggestions?: boolean;
    /** Whether to validate existence during parsing */
    validateExistence?: boolean;
    /** Base path for resolving relative links */
    basePath?: string;
}
/**
 * Result of link resolution with full context
 */
export interface LinkResolution {
    /** Parsed link structure */
    parsed: ParsedLink;
    /** Validation result */
    validation: LinkValidation;
    /** Resolved absolute path */
    resolvedPath: string;
    /** Loaded context (if requested) */
    context?: LinkContext;
}
/**
 * Slug path manipulation result
 */
export interface SlugPathOperation {
    /** Whether the operation was successful */
    success: boolean;
    /** Resulting slug path */
    result?: string;
    /** Error message if operation failed */
    error?: string;
    /** Additional context about the operation */
    context?: Record<string, unknown>;
}
//# sourceMappingURL=linking.d.ts.map