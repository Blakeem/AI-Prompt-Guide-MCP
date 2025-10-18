/**
 * Validation utilities for workflow prompt files
 */

import type { PromptFrontmatter } from './types.js';

/**
 * Valid filename pattern: kebab-case, snake_case, or dots
 * Examples: multi-option-tradeoff, spec_first_integration, causal.flow.mapping
 */
const VALID_FILENAME_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

/**
 * Validates a prompt filename (without extension)
 * @param filename - The filename to validate (without .md extension)
 * @returns true if valid, false otherwise
 */
export function isValidFilename(filename: string): boolean {
  return VALID_FILENAME_PATTERN.test(filename);
}

/**
 * Gets a human-readable error message for an invalid filename
 * @param filename - The invalid filename
 * @returns Error message explaining the validation failure
 */
export function getFilenameErrorMessage(filename: string): string {
  return `Invalid filename "${filename}". Filenames must be lowercase alphanumeric with optional separators (-, _, .). Examples: multi-option-tradeoff, spec_first_integration, causal.flow.mapping`;
}

/**
 * Validates frontmatter structure
 * @param frontmatter - The frontmatter object to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateFrontmatter(frontmatter: unknown): string[] {
  const errors: string[] = [];

  if (frontmatter == null || typeof frontmatter !== 'object') {
    // Empty or non-object frontmatter is allowed (will use defaults)
    return errors;
  }

  const fm = frontmatter as Record<string, unknown>;

  // Validate title if present
  if (fm['title'] != null && typeof fm['title'] !== 'string') {
    errors.push('title must be a string');
  }

  // Validate description if present
  if (fm['description'] != null && typeof fm['description'] !== 'string') {
    errors.push('description must be a string');
  }

  // Validate whenToUse if present
  if (fm['whenToUse'] != null && typeof fm['whenToUse'] !== 'string') {
    errors.push('whenToUse must be a string');
  }

  return errors;
}

/**
 * Normalizes frontmatter data with defaults
 * @param frontmatter - Raw frontmatter object
 * @param filename - Filename to use as fallback for title
 * @returns Normalized frontmatter with all fields populated
 */
export function normalizeFrontmatter(
  frontmatter: unknown,
  filename: string
): PromptFrontmatter {
  const fm = (frontmatter ?? {}) as Record<string, unknown>;

  return {
    title: typeof fm['title'] === 'string' ? fm['title'] : filename,
    description: typeof fm['description'] === 'string' ? fm['description'] : '',
    whenToUse: typeof fm['whenToUse'] === 'string' ? fm['whenToUse'] : ''
  };
}
