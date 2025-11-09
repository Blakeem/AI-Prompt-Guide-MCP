/**
 * Hierarchical slug utilities for the Document Linking System
 */
import type { HierarchicalSlug, SlugPathOperation } from '../types/linking.js';
/**
 * Generate a hierarchical slug by combining parent slug with child title
 *
 * @param parentSlug - Parent slug path (e.g., "api/endpoints")
 * @param childTitle - Title to convert to slug and append
 * @returns Combined hierarchical slug (e.g., "api/endpoints/users")
 */
export declare function generateHierarchicalSlug(parentSlug: string, childTitle: string): string;
/**
 * Split a hierarchical slug path into component parts
 *
 * @param slugPath - Hierarchical slug path (e.g., "api/authentication/jwt-tokens")
 * @returns Array of slug components (e.g., ["api", "authentication", "jwt-tokens"])
 */
export declare function splitSlugPath(slugPath: string): string[];
/**
 * Join slug path components into a hierarchical slug
 *
 * @param parts - Array of slug components
 * @returns Combined slug path with normalized separators
 */
export declare function joinSlugPath(parts: string[]): string;
/**
 * Get the depth (nesting level) of a hierarchical slug
 *
 * @param slugPath - Hierarchical slug path
 * @returns Number of levels in the hierarchy (e.g., "api/auth/jwt" returns 3)
 */
export declare function getSlugDepth(slugPath: string): number;
/**
 * Get the parent slug from a hierarchical slug path
 *
 * @param slugPath - Hierarchical slug path (e.g., "api/auth/jwt")
 * @returns Parent slug path (e.g., "api/auth") or undefined for top-level
 */
export declare function getParentSlug(slugPath: string): string | undefined;
/**
 * Get the leaf (final) component of a hierarchical slug
 *
 * @param slugPath - Hierarchical slug path (e.g., "api/auth/jwt-tokens")
 * @returns Leaf component (e.g., "jwt-tokens")
 */
export declare function getSlugLeaf(slugPath: string): string;
/**
 * Create a complete hierarchical slug structure with metadata
 *
 * @param slugPath - Hierarchical slug path
 * @returns HierarchicalSlug object with full structure information
 */
export declare function createHierarchicalSlug(slugPath: string): HierarchicalSlug;
/**
 * Check if one slug is an ancestor of another
 *
 * @param ancestorSlug - Potential ancestor slug path
 * @param descendantSlug - Potential descendant slug path
 * @returns True if ancestor is a parent/grandparent/etc. of descendant
 */
export declare function isSlugAncestor(ancestorSlug: string, descendantSlug: string): boolean;
/**
 * Check if one slug is a direct child of another
 *
 * @param parentSlug - Potential parent slug path
 * @param childSlug - Potential child slug path
 * @returns True if child is a direct child of parent (one level deeper)
 */
export declare function isDirectChild(parentSlug: string, childSlug: string): boolean;
/**
 * Get all direct children of a slug from a list of slugs
 *
 * @param parentSlug - Parent slug path
 * @param allSlugs - Array of all available slug paths
 * @returns Array of direct child slug paths
 */
export declare function getDirectChildren(parentSlug: string, allSlugs: string[]): string[];
/**
 * Get all descendants (children, grandchildren, etc.) of a slug
 *
 * @param ancestorSlug - Ancestor slug path
 * @param allSlugs - Array of all available slug paths
 * @returns Array of descendant slug paths
 */
export declare function getAllDescendants(ancestorSlug: string, allSlugs: string[]): string[];
/**
 * Calculate the relative path between two slug paths
 *
 * @param fromSlug - Source slug path
 * @param toSlug - Target slug path
 * @returns Relative path or operation result with error details
 */
export declare function getRelativeSlugPath(fromSlug: string, toSlug: string): SlugPathOperation;
/**
 * Validate a hierarchical slug path structure
 *
 * @param slugPath - Slug path to validate
 * @returns Validation result with success status and details
 */
export declare function validateSlugPath(slugPath: string): SlugPathOperation;
/**
 * Normalize a slug path by removing extra separators and ensuring consistent format
 *
 * @param slugPath - Raw slug path to normalize
 * @returns Normalized slug path
 */
export declare function normalizeSlugPath(slugPath: string): string;
//# sourceMappingURL=slug-utils.d.ts.map