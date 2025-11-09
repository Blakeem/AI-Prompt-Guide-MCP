/**
 * Reference extraction system for unified @reference handling
 *
 * This module provides a standardized approach to extracting and normalizing
 * @references from document content, replacing scattered reference/link handling
 * throughout the codebase.
 *
 * Key Features:
 * - Regex-based extraction of all @reference formats
 * - Path normalization with .md extension handling
 * - Context-aware relative path resolution
 * - Type-safe interfaces for structured reference data
 */
/**
 * Normalized reference with resolved paths and optional section targeting
 *
 * @example Basic document reference
 * ```typescript
 * {
 *   originalRef: '@/api/auth',
 *   resolvedPath: '/api/auth.md',
 *   documentPath: '/api/auth.md',
 *   sectionSlug: undefined
 * }
 * ```
 *
 * @example Section-targeted reference
 * ```typescript
 * {
 *   originalRef: '@/api/auth.md#overview',
 *   resolvedPath: '/api/auth.md#overview',
 *   documentPath: '/api/auth.md',
 *   sectionSlug: 'overview'
 * }
 * ```
 */
export interface NormalizedReference {
    /** Original @reference text as found in content */
    readonly originalRef: string;
    /** Fully resolved path with section if specified */
    readonly resolvedPath: string;
    /** Document path portion only (no section) */
    readonly documentPath: string;
    /** Section slug if reference targets a specific section */
    readonly sectionSlug?: string | undefined;
}
/**
 * Reference extraction and normalization system
 *
 * Provides unified handling of @reference extraction and path resolution
 * across the document management system.
 */
export declare class ReferenceExtractor {
    /** Regex pattern for extracting @references in all supported formats */
    private static readonly REFERENCE_PATTERN;
    /**
     * Extract all @references from content using standardized regex pattern
     *
     * Supports formats:
     * - @#section (within-document)
     * - @/path/doc.md (cross-document)
     * - @/path/doc (cross-document, will add .md)
     * - @/path/doc.md#section (cross-document with section)
     *
     * @param content - Document content to extract references from
     * @returns Array of reference strings found in content
     *
     * @example Basic extraction
     * ```typescript
     * const extractor = new ReferenceExtractor();
     * const refs = extractor.extractReferences(
     *   'See @/api/auth.md#overview and @#local-section for details.'
     * );
     * // Returns: ['@/api/auth.md#overview', '@#local-section']
     * ```
     */
    extractReferences(content: string): string[];
    /**
     * Normalize references to resolved paths with context-aware resolution
     *
     * Handles path resolution, .md extension addition, and section parsing
     * relative to the provided context document path.
     *
     * @param refs - Array of reference strings to normalize
     * @param contextPath - Current document path for relative resolution
     * @returns Array of normalized reference objects
     *
     * @example Reference normalization
     * ```typescript
     * const extractor = new ReferenceExtractor();
     * const normalized = extractor.normalizeReferences(
     *   ['@/api/auth', '@#overview', '@/docs/guide.md#setup'],
     *   '/current/doc.md'
     * );
     * ```
     */
    normalizeReferences(refs: string[], contextPath: string): NormalizedReference[];
    /**
     * Normalize a single reference string to structured reference data
     *
     * @param ref - Reference string to normalize
     * @param contextPath - Current document path for resolution
     * @returns Normalized reference object
     */
    private normalizeReference;
    /**
     * Normalize document path by ensuring absolute path and .md extension
     *
     * @param docPath - Document path to normalize
     * @returns Normalized absolute document path
     */
    private normalizeDocumentPath;
    /**
     * Ensure path starts with / for absolute addressing
     *
     * @param path - Path to make absolute
     * @returns Absolute path starting with /
     */
    private ensureAbsolutePath;
}
//# sourceMappingURL=reference-extractor.d.ts.map