/**
 * File I/O utilities with comprehensive security validation and mtime precondition checking
 *
 * Security Features:
 * - Path traversal protection (prevents ../ and absolute paths outside docs root)
 * - File size limits and validation
 * - File name sanitization (removes dangerous characters)
 * - File extension validation
 * - Content length validation
 * - Path length validation
 * - Character encoding normalization
 */
import type { FileSnapshot } from './types/index.js';
/**
 * Reads a file and returns its content with modification time
 *
 * Security Features:
 * - Path validation and sanitization
 * - File size validation
 * - Extension validation
 * - Path traversal protection
 *
 * @param path - File path to read (will be validated and sanitized)
 * @param options - Optional configuration for trusted internal callers
 * @returns FileSnapshot with content and modification time
 * @throws SpecDocsError for security violations or file system errors
 */
export declare function readFileSnapshot(path: string, options?: {
    bypassValidation?: boolean;
}): Promise<FileSnapshot>;
/**
 * Writes a file only if the modification time matches the expected value
 * This prevents concurrent modification conflicts
 *
 * Security Features:
 * - Path validation and sanitization
 * - Content size validation
 * - Extension validation
 * - Path traversal protection
 * - Atomic write operations
 *
 * @param path - File path to write (will be validated and sanitized)
 * @param expectedMtimeMs - Expected modification time to prevent conflicts
 * @param content - Content to write (will be validated for size)
 * @param options - Optional configuration for trusted internal callers
 * @throws SpecDocsError for security violations or file system errors
 */
export declare function writeFileIfUnchanged(path: string, expectedMtimeMs: number, content: string, options?: {
    bypassValidation?: boolean;
}): Promise<void>;
/**
 * Checks if a file exists and is readable
 *
 * Security Features:
 * - Path validation and sanitization
 * - Extension validation
 * - Path traversal protection
 *
 * @param path - File path to check (will be validated and sanitized)
 * @returns Promise<boolean> indicating if file exists and is readable
 * @throws SpecDocsError for security violations
 */
export declare function fileExists(path: string): Promise<boolean>;
/**
 * Creates directory if it doesn't exist
 *
 * Security Features:
 * - Path validation and sanitization
 * - Path traversal protection
 * - Parent directory validation
 *
 * @param dirPath - Directory path to create (will be validated and sanitized)
 * @throws SpecDocsError for security violations or file system errors
 */
export declare function ensureDirectoryExists(dirPath: string): Promise<void>;
//# sourceMappingURL=fsio.d.ts.map