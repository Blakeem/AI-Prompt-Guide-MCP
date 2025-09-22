/**
 * Hierarchical slug utilities for the Document Linking System
 */

import type { HierarchicalSlug, SlugPathOperation } from '../types/linking.js';
import { titleToSlug } from '../slug.js';

/**
 * Generate a hierarchical slug by combining parent slug with child title
 *
 * @param parentSlug - Parent slug path (e.g., "api/endpoints")
 * @param childTitle - Title to convert to slug and append
 * @returns Combined hierarchical slug (e.g., "api/endpoints/users")
 */
export function generateHierarchicalSlug(parentSlug: string, childTitle: string): string {
  // Input validation
  if (typeof childTitle !== 'string' || childTitle.trim() === '') {
    throw new Error('Child title is required for hierarchical slug generation');
  }

  const childSlug = titleToSlug(childTitle);

  // Handle empty or invalid parent slug
  if (typeof parentSlug !== 'string' || parentSlug.trim() === '') {
    return childSlug;
  }

  const normalizedParent = normalizeSlugPath(parentSlug);

  // Combine parent and child with separator
  return normalizedParent === '' ? childSlug : `${normalizedParent}/${childSlug}`;
}

/**
 * Split a hierarchical slug path into component parts
 *
 * @param slugPath - Hierarchical slug path (e.g., "api/authentication/jwt-tokens")
 * @returns Array of slug components (e.g., ["api", "authentication", "jwt-tokens"])
 */
export function splitSlugPath(slugPath: string): string[] {
  if (typeof slugPath !== 'string') {
    return [];
  }

  const normalized = normalizeSlugPath(slugPath);

  if (normalized === '') {
    return [];
  }

  return normalized.split('/').filter(part => part !== '');
}

/**
 * Join slug path components into a hierarchical slug
 *
 * @param parts - Array of slug components
 * @returns Combined slug path with normalized separators
 */
export function joinSlugPath(parts: string[]): string {
  if (!Array.isArray(parts)) {
    return '';
  }

  // Filter out empty parts and join with separator
  const validParts = parts.filter(part =>
    typeof part === 'string' && part.trim() !== ''
  );

  return validParts.join('/');
}

/**
 * Get the depth (nesting level) of a hierarchical slug
 *
 * @param slugPath - Hierarchical slug path
 * @returns Number of levels in the hierarchy (e.g., "api/auth/jwt" returns 3)
 */
export function getSlugDepth(slugPath: string): number {
  const parts = splitSlugPath(slugPath);
  return parts.length;
}

/**
 * Get the parent slug from a hierarchical slug path
 *
 * @param slugPath - Hierarchical slug path (e.g., "api/auth/jwt")
 * @returns Parent slug path (e.g., "api/auth") or undefined for top-level
 */
export function getParentSlug(slugPath: string): string | undefined {
  const parts = splitSlugPath(slugPath);

  if (parts.length <= 1) {
    return undefined;
  }

  return joinSlugPath(parts.slice(0, -1));
}

/**
 * Get the leaf (final) component of a hierarchical slug
 *
 * @param slugPath - Hierarchical slug path (e.g., "api/auth/jwt-tokens")
 * @returns Leaf component (e.g., "jwt-tokens")
 */
export function getSlugLeaf(slugPath: string): string {
  const parts = splitSlugPath(slugPath);
  return parts[parts.length - 1] ?? '';
}

/**
 * Create a complete hierarchical slug structure with metadata
 *
 * @param slugPath - Hierarchical slug path
 * @returns HierarchicalSlug object with full structure information
 */
export function createHierarchicalSlug(slugPath: string): HierarchicalSlug {
  const normalized = normalizeSlugPath(slugPath);
  const parts = splitSlugPath(normalized);
  const depth = parts.length;
  const parent = getParentSlug(normalized);

  const result: HierarchicalSlug = {
    full: normalized,
    parts,
    depth
  };

  if (parent != null) {
    result.parent = parent;
  }

  return result;
}

/**
 * Check if one slug is an ancestor of another
 *
 * @param ancestorSlug - Potential ancestor slug path
 * @param descendantSlug - Potential descendant slug path
 * @returns True if ancestor is a parent/grandparent/etc. of descendant
 */
export function isSlugAncestor(ancestorSlug: string, descendantSlug: string): boolean {
  const ancestorParts = splitSlugPath(ancestorSlug);
  const descendantParts = splitSlugPath(descendantSlug);

  // Ancestor must be shorter than descendant
  if (ancestorParts.length >= descendantParts.length) {
    return false;
  }

  // Check if all ancestor parts match descendant parts
  return ancestorParts.every((part, index) => part === descendantParts[index]);
}

/**
 * Check if one slug is a direct child of another
 *
 * @param parentSlug - Potential parent slug path
 * @param childSlug - Potential child slug path
 * @returns True if child is a direct child of parent (one level deeper)
 */
export function isDirectChild(parentSlug: string, childSlug: string): boolean {
  const parentParts = splitSlugPath(parentSlug);
  const childParts = splitSlugPath(childSlug);

  // Child must be exactly one level deeper
  if (childParts.length !== parentParts.length + 1) {
    return false;
  }

  // Check if all parent parts match child parts
  return parentParts.every((part, index) => part === childParts[index]);
}

/**
 * Get all direct children of a slug from a list of slugs
 *
 * @param parentSlug - Parent slug path
 * @param allSlugs - Array of all available slug paths
 * @returns Array of direct child slug paths
 */
export function getDirectChildren(parentSlug: string, allSlugs: string[]): string[] {
  if (!Array.isArray(allSlugs)) {
    return [];
  }

  return allSlugs.filter(slug => isDirectChild(parentSlug, slug));
}

/**
 * Get all descendants (children, grandchildren, etc.) of a slug
 *
 * @param ancestorSlug - Ancestor slug path
 * @param allSlugs - Array of all available slug paths
 * @returns Array of descendant slug paths
 */
export function getAllDescendants(ancestorSlug: string, allSlugs: string[]): string[] {
  if (!Array.isArray(allSlugs)) {
    return [];
  }

  return allSlugs.filter(slug => isSlugAncestor(ancestorSlug, slug));
}

/**
 * Calculate the relative path between two slug paths
 *
 * @param fromSlug - Source slug path
 * @param toSlug - Target slug path
 * @returns Relative path or operation result with error details
 */
export function getRelativeSlugPath(fromSlug: string, toSlug: string): SlugPathOperation {
  try {
    const fromParts = splitSlugPath(fromSlug);
    const toParts = splitSlugPath(toSlug);

    // Find common ancestor
    let commonLength = 0;
    while (
      commonLength < fromParts.length &&
      commonLength < toParts.length &&
      fromParts[commonLength] === toParts[commonLength]
    ) {
      commonLength++;
    }

    // Calculate relative path
    const upLevels = fromParts.length - commonLength;
    const downParts = toParts.slice(commonLength);

    let relativePath = '';

    // Add "up" navigation if needed
    if (upLevels > 0) {
      relativePath = '../'.repeat(upLevels);
    }

    // Add "down" navigation
    if (downParts.length > 0) {
      relativePath += downParts.join('/');
    }

    // Handle same-level case
    if (relativePath === '') {
      relativePath = '.';
    }

    return {
      success: true,
      result: relativePath
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      context: { fromSlug, toSlug }
    };
  }
}

/**
 * Validate a hierarchical slug path structure
 *
 * @param slugPath - Slug path to validate
 * @returns Validation result with success status and details
 */
export function validateSlugPath(slugPath: string): SlugPathOperation {
  if (typeof slugPath !== 'string') {
    return {
      success: false,
      error: 'Slug path must be a string',
      context: { slugPath, type: typeof slugPath }
    };
  }

  if (slugPath.trim() === '') {
    return {
      success: false,
      error: 'Slug path cannot be empty',
      context: { slugPath }
    };
  }

  const normalized = normalizeSlugPath(slugPath);
  const parts = splitSlugPath(normalized);

  // Check each part is a valid slug
  for (const part of parts) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part)) {
      return {
        success: false,
        error: `Invalid slug component: ${part}. Must contain only lowercase letters, numbers, and hyphens`,
        context: { slugPath, invalidPart: part }
      };
    }
  }

  // Check reasonable depth limit
  if (parts.length > 10) {
    return {
      success: false,
      error: 'Slug path too deep (maximum 10 levels)',
      context: { slugPath, depth: parts.length }
    };
  }

  return {
    success: true,
    result: normalized
  };
}

/**
 * Normalize a slug path by removing extra separators and ensuring consistent format
 *
 * @param slugPath - Raw slug path to normalize
 * @returns Normalized slug path
 */
function normalizeSlugPath(slugPath: string): string {
  if (typeof slugPath !== 'string') {
    return '';
  }

  let normalized = slugPath.trim();

  // Remove leading/trailing slashes
  normalized = normalized.replace(/^\/+|\/+$/g, '');

  // Replace multiple slashes with single slash
  normalized = normalized.replace(/\/+/g, '/');

  return normalized;
}