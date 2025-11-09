/**
 * Markdown sections CRUD operations using heading ranges
 */
import type { HeadingDepth, InsertMode, Heading } from './types/index.js';
/**
 * Result object for hierarchical heading matching with detailed diagnostic information
 */
export interface HierarchicalMatchResult {
    /** Whether a matching heading was found */
    found: boolean;
    /** The matched heading (only present when found is true) */
    heading?: Heading;
    /** Reason for match failure (only present when found is false) */
    reason?: 'PATH_NOT_FOUND' | 'DISAMBIGUATION_FAILED' | 'INVALID_PATH';
    /** How far the path matched before failing */
    partialMatch?: string;
    /** Suggested alternative paths that might match */
    suggestions?: string[];
    /** All available section slugs in the document */
    availableSections?: string[];
}
/**
 * Extracts the content of a specific section from a markdown document
 *
 * Supports both flat slug addressing (e.g., "overview") and hierarchical addressing
 * (e.g., "api/auth/jwt-tokens") with comprehensive security validation and disambiguation handling.
 *
 * @param markdown - The complete markdown content to search
 * @param slug - Section identifier (flat slug or hierarchical path)
 * @returns The section content (heading + body) or null if not found
 *
 * @example
 * // Flat addressing
 * const content = readSection(markdownContent, "overview");
 *
 * // Hierarchical addressing
 * const content = readSection(markdownContent, "api/auth/jwt-tokens");
 *
 * // Returns the heading and body content:
 * // "## Overview\n\nThis section covers..."
 *
 * @throws {Error} When slug is invalid, contains dangerous characters, or violates security constraints
 * @throws {Error} When hierarchical path validation fails (too long, dangerous chars, etc.)
 */
export declare function readSection(markdown: string, slug: string): string | null;
/**
 * Replaces the body of a section while keeping the heading
 */
export declare function replaceSectionBody(markdown: string, slug: string, newBodyMarkdown: string): string;
/**
 * Inserts a new section relative to an existing heading
 */
export declare function insertRelative(markdown: string, refSlug: string, mode: InsertMode, newDepth: HeadingDepth, newTitle: string, bodyMarkdown?: string): string;
/**
 * Renames a heading (changes its title and thus its slug)
 */
export declare function renameHeading(markdown: string, slug: string, newTitle: string): string;
/**
 * Gets the content that would be removed by a deleteSection operation
 * This excludes the end boundary marker to match actual removal behavior
 */
export declare function getSectionContentForRemoval(markdown: string, slug: string): string | null;
/**
 * Deletes an entire section (heading and its content)
 */
export declare function deleteSection(markdown: string, slug: string): string;
//# sourceMappingURL=sections.d.ts.map