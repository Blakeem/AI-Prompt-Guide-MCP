/**
 * Standardized parameter validation utilities
 *
 * Provides consistent parameter validation across all MCP tools to ensure
 * uniform error handling and type safety.
 *
 * @module validation-utils
 */

/**
 * Validate required string parameter
 *
 * Ensures parameter is a non-null, non-empty string with consistent error messaging.
 * Throws on null, undefined, empty strings, or wrong types.
 *
 * @param value - Value to validate
 * @param paramName - Parameter name for error messages
 * @returns Validated, trimmed string
 * @throws {Error} When value is null, undefined, empty string, or wrong type
 *
 * @example Valid string
 * ```typescript
 * const title = validateRequiredString('Task Title', 'title');
 * // Returns: 'Task Title'
 * ```
 *
 * @example Empty string (throws)
 * ```typescript
 * try {
 *   validateRequiredString('', 'title');
 * } catch (error) {
 *   // Error: "title is required and cannot be empty"
 * }
 * ```
 *
 * @example Wrong type (throws)
 * ```typescript
 * try {
 *   validateRequiredString(123, 'title');
 * } catch (error) {
 *   // Error: "title must be a string"
 * }
 * ```
 */
export function validateRequiredString(value: unknown, paramName: string): string {
  if (value == null || value === '') {
    throw new Error(`${paramName} is required and cannot be empty`);
  }
  if (typeof value !== 'string') {
    throw new Error(`${paramName} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(`${paramName} is required and cannot be empty`);
  }
  return trimmed;
}

/**
 * Validate optional string parameter
 *
 * Ensures parameter is a string if provided, returns undefined for null/undefined/empty.
 * Allows graceful handling of optional parameters with consistent type checking.
 *
 * @param value - Value to validate
 * @param paramName - Parameter name for error messages
 * @returns Validated, trimmed string or undefined if not provided
 * @throws {Error} When value is wrong type (but not null/undefined/empty)
 *
 * @example Valid optional string
 * ```typescript
 * const note = validateOptionalString('Completion note', 'note');
 * // Returns: 'Completion note'
 * ```
 *
 * @example Null/undefined (returns undefined)
 * ```typescript
 * const note = validateOptionalString(null, 'note');
 * // Returns: undefined
 *
 * const note2 = validateOptionalString(undefined, 'note');
 * // Returns: undefined
 * ```
 *
 * @example Empty string (returns undefined)
 * ```typescript
 * const note = validateOptionalString('', 'note');
 * // Returns: undefined
 * ```
 *
 * @example Wrong type (throws)
 * ```typescript
 * try {
 *   validateOptionalString(123, 'note');
 * } catch (error) {
 *   // Error: "note must be a string if provided"
 * }
 * ```
 */
export function validateOptionalString(value: unknown, paramName: string): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${paramName} must be a string if provided`);
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
