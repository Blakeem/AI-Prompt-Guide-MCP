/**
 * Validation utilities for workflow prompt files
 */
import type { PromptFrontmatter } from './types.js';
/**
 * Validates a prompt filename (without extension)
 * @param filename - The filename to validate (without .md extension)
 * @returns true if valid, false otherwise
 */
export declare function isValidFilename(filename: string): boolean;
/**
 * Gets a human-readable error message for an invalid filename
 * @param filename - The invalid filename
 * @returns Error message explaining the validation failure
 */
export declare function getFilenameErrorMessage(filename: string): string;
/**
 * Validates frontmatter structure
 * @param frontmatter - The frontmatter object to validate
 * @returns Array of validation error messages (empty if valid)
 */
export declare function validateFrontmatter(frontmatter: unknown): string[];
/**
 * Normalizes frontmatter data with defaults
 * @param frontmatter - Raw frontmatter object
 * @param filename - Filename to use as fallback for title
 * @returns Normalized frontmatter with all fields populated
 */
export declare function normalizeFrontmatter(frontmatter: unknown, filename: string): PromptFrontmatter;
//# sourceMappingURL=prompt-validator.d.ts.map