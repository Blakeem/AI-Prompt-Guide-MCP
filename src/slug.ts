/**
 * Slug generation utilities using github-slugger
 */

import GithubSlugger from 'github-slugger';
import { ERROR_CODES } from './constants/defaults.js';
import type { SpecDocsError } from './types/index.js';

/**
 * Creates a custom error with code and context
 */
function createError(message: string, code: string, context?: Record<string, unknown>): SpecDocsError {
  const error = new Error(message) as SpecDocsError;
  (error as any).code = code;
  if (context) {
    (error as any).context = context;
  }
  return error;
}

/**
 * Converts a title to a URL-safe slug using github-slugger
 * Uses static transform (no internal counters) for deterministic results
 */
export function titleToSlug(title: string): string {
  if (typeof title !== 'string') {
    throw createError(
      'Title must be a string',
      ERROR_CODES.INVALID_TITLE,
      { title, type: typeof title }
    );
  }

  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw createError(
      'Title cannot be empty',
      ERROR_CODES.INVALID_TITLE,
      { title }
    );
  }

  try {
    // Use static slug method for deterministic behavior
    const slugger = new GithubSlugger();
    return slugger.slug(trimmed);
  } catch (error) {
    throw createError(
      'Failed to generate slug from title',
      ERROR_CODES.INVALID_TITLE,
      { title, error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Validates that a slug follows expected format
 */
export function validateSlug(slug: string): boolean {
  if (typeof slug !== 'string') {
    return false;
  }

  // Check if slug matches github-slugger format
  // Should be lowercase, with hyphens, no spaces or special chars
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length > 0 && slug.length <= 200;
}

/**
 * Ensures a slug is valid, throws if not
 */
export function ensureValidSlug(slug: string): void {
  if (!validateSlug(slug)) {
    throw createError(
      'Invalid slug format',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }
}

/**
 * Creates a slugger instance for batch operations
 * Useful when you need to track duplicates within a single operation
 */
export function createSlugger(): GithubSlugger {
  return new GithubSlugger();
}

/**
 * Regenerates a slug to ensure it matches current slugger behavior
 * Useful for validating existing slugs
 */
export function regenerateSlug(title: string): string {
  return titleToSlug(title);
}

/**
 * Checks if a title would generate the expected slug
 */
export function titleMatchesSlug(title: string, expectedSlug: string): boolean {
  try {
    const generatedSlug = titleToSlug(title);
    return generatedSlug === expectedSlug;
  } catch {
    return false;
  }
}