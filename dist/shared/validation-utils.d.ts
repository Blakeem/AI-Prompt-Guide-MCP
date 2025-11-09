/**
 * Domain-specific parameter validation utilities
 *
 * Provides validation for domain-specific types like HeadingDepth.
 * For general parameter validation (strings, arrays, etc.), use ToolIntegration from addressing-system.
 *
 * @module validation-utils
 */
import type { HeadingDepth } from '../types/index.js';
/**
 * Validate and sanitize heading depth to ensure it's a valid HeadingDepth (1-6)
 *
 * Ensures depth is a valid integer between 1 and 6, clamping to valid range and
 * using Math.floor() to handle non-integer inputs safely.
 *
 * @param depth - The depth value to validate (can be any number)
 * @returns Valid HeadingDepth between 1 and 6
 * @throws {Error} If depth is not a finite number
 *
 * @example Valid depth
 * ```typescript
 * const depth = validateHeadingDepth(3);
 * // Returns: 3
 * ```
 *
 * @example Out of range (clamped to valid range)
 * ```typescript
 * const depth = validateHeadingDepth(10);
 * // Returns: 6 (clamped to max)
 *
 * const depth2 = validateHeadingDepth(0);
 * // Returns: 1 (clamped to min)
 * ```
 *
 * @example Non-integer (floored to integer)
 * ```typescript
 * const depth = validateHeadingDepth(2.7);
 * // Returns: 2 (floored to integer)
 * ```
 *
 * @example Invalid input (throws)
 * ```typescript
 * try {
 *   validateHeadingDepth(NaN);
 * } catch (error) {
 *   // Error: "Invalid depth: NaN. Must be a finite number."
 * }
 *
 * try {
 *   validateHeadingDepth(Infinity);
 * } catch (error) {
 *   // Error: "Invalid depth: Infinity. Must be a finite number."
 * }
 * ```
 */
export declare function validateHeadingDepth(depth: number): HeadingDepth;
//# sourceMappingURL=validation-utils.d.ts.map