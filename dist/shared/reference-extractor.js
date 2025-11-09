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
import { titleToSlug } from '../slug.js';
/**
 * Reference extraction and normalization system
 *
 * Provides unified handling of @reference extraction and path resolution
 * across the document management system.
 */
export class ReferenceExtractor {
    /** Regex pattern for extracting @references in all supported formats */
    static REFERENCE_PATTERN = /@(?:\/[^\s\]),;:!?]+(?:#[^\s\]),;:!?]*)?|#[^\s\]),;:!?]*)/g;
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
    extractReferences(content) {
        // Input validation
        if (typeof content !== 'string') {
            return [];
        }
        // Extract all matches using regex
        const matches = content.match(ReferenceExtractor.REFERENCE_PATTERN);
        if (matches == null) {
            return [];
        }
        // Clean up trailing punctuation and return unique references
        const cleanedMatches = matches.map(match => {
            // Remove trailing punctuation that might be captured
            return match.replace(/[.!?]+$/, '');
        });
        return [...new Set(cleanedMatches)];
    }
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
    normalizeReferences(refs, contextPath) {
        // Input validation
        if (!Array.isArray(refs)) {
            return [];
        }
        if (typeof contextPath !== 'string' || contextPath.trim() === '') {
            throw new Error('Context path is required for reference normalization');
        }
        const normalizedContextPath = this.ensureAbsolutePath(contextPath);
        const results = [];
        for (const ref of refs) {
            if (typeof ref !== 'string' || ref.trim() === '') {
                continue;
            }
            try {
                const normalized = this.normalizeReference(ref, normalizedContextPath);
                results.push(normalized);
            }
            catch (error) {
                // Skip invalid references but continue processing others
                console.warn(`Failed to normalize reference "${ref}":`, error);
            }
        }
        return results;
    }
    /**
     * Normalize a single reference string to structured reference data
     *
     * @param ref - Reference string to normalize
     * @param contextPath - Current document path for resolution
     * @returns Normalized reference object
     */
    normalizeReference(ref, contextPath) {
        const trimmed = ref.trim();
        // Remove @ prefix for processing
        if (!trimmed.startsWith('@')) {
            throw new Error(`Invalid reference format: ${ref} (must start with @)`);
        }
        const refContent = trimmed.slice(1);
        // Handle within-document references (@#section)
        if (refContent.startsWith('#')) {
            const sectionSlug = refContent.slice(1);
            return {
                originalRef: ref,
                resolvedPath: `${contextPath}#${sectionSlug}`,
                documentPath: contextPath,
                sectionSlug: sectionSlug !== '' ? titleToSlug(sectionSlug) : undefined
            };
        }
        // Handle cross-document references (@/path/doc or @/path/doc#section)
        const hashIndex = refContent.indexOf('#');
        let documentPath;
        let sectionSlug;
        if (hashIndex === -1) {
            // No section specified
            documentPath = refContent;
            sectionSlug = undefined;
        }
        else {
            // Section specified
            documentPath = refContent.slice(0, hashIndex);
            const sectionPart = refContent.slice(hashIndex + 1);
            sectionSlug = sectionPart !== '' ? titleToSlug(sectionPart) : undefined;
        }
        // Normalize document path
        const normalizedDocPath = this.normalizeDocumentPath(documentPath);
        // Build resolved path
        const resolvedPath = sectionSlug != null
            ? `${normalizedDocPath}#${sectionSlug}`
            : normalizedDocPath;
        return {
            originalRef: ref,
            resolvedPath,
            documentPath: normalizedDocPath,
            sectionSlug
        };
    }
    /**
     * Normalize document path by ensuring absolute path and .md extension
     *
     * @param docPath - Document path to normalize
     * @returns Normalized absolute document path
     */
    normalizeDocumentPath(docPath) {
        if (docPath === '') {
            throw new Error('Document path cannot be empty');
        }
        // Ensure absolute path
        let normalized = this.ensureAbsolutePath(docPath);
        // Add .md extension if missing
        if (!normalized.endsWith('.md')) {
            normalized = `${normalized}.md`;
        }
        return normalized;
    }
    /**
     * Ensure path starts with / for absolute addressing
     *
     * @param path - Path to make absolute
     * @returns Absolute path starting with /
     */
    ensureAbsolutePath(path) {
        const trimmed = path.trim();
        if (trimmed === '') {
            return '/';
        }
        // Ensure path starts with /
        if (!trimmed.startsWith('/')) {
            return `/${trimmed}`;
        }
        // Remove duplicate slashes
        return trimmed.replace(/\/+/g, '/');
    }
}
//# sourceMappingURL=reference-extractor.js.map