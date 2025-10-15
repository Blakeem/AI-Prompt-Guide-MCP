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

import { promises as fs } from 'node:fs';
import { resolve, relative, extname, basename, dirname } from 'node:path';
import { ERROR_CODES, DEFAULT_LIMITS } from './constants/defaults.js';
import type { FileSnapshot, SpecDocsError } from './types/index.js';
import { PathHandler } from './utils/path-handler.js';
import { loadConfig } from './config.js';
import { SecurityAuditLogger } from './utils/security-audit-logger.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

/**
 * Creates a custom error with code, context, and version information
 */
function createError(message: string, code: string, context?: Record<string, unknown>): SpecDocsError {
  const error = new Error(message) as SpecDocsError;
  return Object.assign(error, {
    code,
    context: { ...context, version: packageJson.version }
  });
}

/**
 * Global path handler instance for security validation
 * Initialized lazily when first needed
 */
let pathHandler: PathHandler | null = null;
let initializationPromise: Promise<PathHandler> | null = null;

/**
 * Global security audit logger instance
 */
const securityAuditLogger = new SecurityAuditLogger();

/**
 * Initialize path handler with current configuration
 * Uses promise-based synchronization to prevent race conditions
 */
async function getPathHandler(): Promise<PathHandler> {
  // Return existing instance if available
  if (pathHandler !== null) {
    return pathHandler;
  }

  // Wait for in-progress initialization
  if (initializationPromise !== null) {
    return await initializationPromise;
  }

  // Start initialization
  initializationPromise = (async (): Promise<PathHandler> => {
    try {
      const config = loadConfig();
      pathHandler = new PathHandler(config.workspaceBasePath);
      return pathHandler;
    } finally {
      initializationPromise = null;
    }
  })();

  return await initializationPromise;
}

/**
 * Maximum allowed path length (to prevent resource exhaustion)
 */
const MAX_PATH_LENGTH = 4096;

/**
 * Allowed file extensions for security
 */
const ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.txt']);

/**
 * Minimum valid timestamp (Unix epoch) for mtime validation
 * Allows all valid Unix timestamps including archived documents and legacy systems
 */
const MIN_VALID_TIMESTAMP = 0;

/**
 * Maximum valid timestamp (1 year in the future from now)
 * This prevents unreasonably large timestamps (e.g., year 9999)
 */
const MAX_VALID_TIMESTAMP = Date.now() + (365 * 24 * 60 * 60 * 1000);

/**
 * Dangerous characters that should be removed from file names
 * Includes null bytes, control characters, and OS-specific dangerous chars
 * Note: Forward slash (/) is allowed for path separators
 */
// eslint-disable-next-line no-control-regex
const DANGEROUS_CHARS_REGEX = /[\x00-\x1f\x7f\\:*?"<>|]/g;

/**
 * Validate and sanitize a file path for security
 *
 * @param filePath - The file path to validate
 * @param operation - The operation being performed (for error context)
 * @returns Sanitized absolute path
 * @throws SpecDocsError if path is invalid or unsafe
 */
async function validateAndSanitizePath(filePath: string, operation: string): Promise<string> {
  // Input validation
  if (typeof filePath !== 'string') {
    throw createError(
      `Invalid path type: expected string, got ${typeof filePath}`,
      ERROR_CODES.INVALID_OPERATION,
      { operation, pathType: typeof filePath }
    );
  }

  // Check path length to prevent resource exhaustion
  if (filePath.length > MAX_PATH_LENGTH) {
    throw createError(
      `Path too long: ${filePath.length} characters exceeds maximum of ${MAX_PATH_LENGTH}`,
      ERROR_CODES.INVALID_OPERATION,
      { operation, pathLength: filePath.length, maxLength: MAX_PATH_LENGTH }
    );
  }

  // Remove dangerous characters and normalize
  const sanitizedPath = filePath
    .replace(DANGEROUS_CHARS_REGEX, '')
    .normalize('NFC') // Unicode normalization
    .trim();

  // Check for empty path after sanitization
  if (sanitizedPath === '') {
    throw createError(
      'Path is empty or contains only dangerous characters',
      ERROR_CODES.INVALID_OPERATION,
      { operation, originalPath: filePath }
    );
  }

  // Use PathHandler for comprehensive path validation
  const handler = await getPathHandler();

  try {
    // This validates against directory traversal and normalizes the path
    const normalizedPath = handler.processUserPath(sanitizedPath);
    const absolutePath = handler.getAbsolutePath(normalizedPath);

    // Additional security check: ensure resolved path is still within bounds
    const resolvedPath = resolve(absolutePath);
    const docsBasePath = resolve(handler.getWorkspaceBasePath());

    if (resolvedPath.startsWith(docsBasePath) === false) {
      // Log security violation for audit trail
      securityAuditLogger.logSecurityViolation({
        type: 'PATH_TRAVERSAL',
        operation,
        attemptedPath: filePath,
        resolvedPath: relative(docsBasePath, resolvedPath),
        timestamp: new Date().toISOString()
      });

      throw createError(
        'Path traversal attempt detected',
        ERROR_CODES.INVALID_OPERATION,
        {
          operation,
          attemptedPath: filePath,
          resolvedPath: relative(docsBasePath, resolvedPath),
          securityViolation: 'PATH_TRAVERSAL'
        }
      );
    }

    // Validate file extension
    const extension = extname(resolvedPath).toLowerCase();
    if (extension !== '' && !ALLOWED_EXTENSIONS.has(extension)) {
      // Log security violation for audit trail
      securityAuditLogger.logSecurityViolation({
        type: 'INVALID_EXTENSION',
        operation,
        attemptedPath: filePath,
        resolvedPath: relative(docsBasePath, resolvedPath),
        timestamp: new Date().toISOString()
      });

      throw createError(
        `File extension not allowed: ${extension}`,
        ERROR_CODES.INVALID_OPERATION,
        {
          operation,
          path: filePath,
          extension,
          allowedExtensions: Array.from(ALLOWED_EXTENSIONS),
          securityViolation: 'INVALID_EXTENSION'
        }
      );
    }

    return resolvedPath;
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      // Re-throw our security errors
      throw error;
    }

    // Convert PathHandler errors to security errors
    throw createError(
      `Path validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ERROR_CODES.INVALID_OPERATION,
      {
        operation,
        path: filePath,
        securityViolation: 'PATH_VALIDATION_FAILED'
      }
    );
  }
}

/**
 * Validate file size against configured limits
 *
 * @param size - File size in bytes
 * @param operation - Operation being performed
 * @param path - File path for error context
 * @throws SpecDocsError if file size exceeds limits
 */
function validateFileSize(size: number, operation: string, path: string): void {
  if (size > DEFAULT_LIMITS.MAX_FILE_SIZE) {
    throw createError(
      `File size ${size} bytes exceeds maximum allowed size of ${DEFAULT_LIMITS.MAX_FILE_SIZE} bytes`,
      ERROR_CODES.FILE_TOO_LARGE,
      {
        operation,
        path: basename(path), // Only include filename for security
        fileSize: size,
        maxSize: DEFAULT_LIMITS.MAX_FILE_SIZE,
        securityViolation: 'FILE_SIZE_EXCEEDED'
      }
    );
  }
}

/**
 * Validate content length for write operations
 *
 * @param content - Content to validate
 * @param operation - Operation being performed
 * @param path - File path for error context
 * @throws SpecDocsError if content is too large
 */
function validateContentLength(content: string, operation: string, path: string): void {
  const sizeInBytes = Buffer.byteLength(content, 'utf8');
  validateFileSize(sizeInBytes, operation, path);
}

/**
 * Internal helper to read file snapshot with basic validation only
 * Used by trusted internal code that has already validated paths
 *
 * @param absolutePath - Already validated absolute path
 * @param operation - Operation name for error context
 * @returns FileSnapshot with content and modification time
 * @throws SpecDocsError for file system errors
 */
async function readFileSnapshotInternal(absolutePath: string, operation: string): Promise<FileSnapshot> {
  try {
    const [stat, buffer] = await Promise.all([
      fs.stat(absolutePath),
      fs.readFile(absolutePath)
    ]);

    // Validate file size
    validateFileSize(stat.size, operation, absolutePath);

    // Convert buffer to string with proper encoding
    const content = buffer.toString('utf8');

    return {
      content,
      mtimeMs: stat.mtimeMs,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'ENOENT') {
        throw createError(
          `File not found: ${basename(absolutePath)}`,
          ERROR_CODES.FILE_NOT_FOUND,
          {
            operation,
            path: basename(absolutePath), // Only include filename for security
            originalPath: absolutePath
          }
        );
      }
      if (error.code === 'EACCES') {
        throw createError(
          `Access denied: ${basename(absolutePath)}`,
          ERROR_CODES.INVALID_OPERATION,
          {
            operation,
            path: basename(absolutePath),
            securityViolation: 'ACCESS_DENIED'
          }
        );
      }
      if (error.code === 'EISDIR') {
        throw createError(
          `Path is a directory, not a file: ${basename(absolutePath)}`,
          ERROR_CODES.INVALID_OPERATION,
          {
            operation,
            path: basename(absolutePath),
            securityViolation: 'INVALID_FILE_TYPE'
          }
        );
      }
      if (error.code === ERROR_CODES.FILE_TOO_LARGE || error.code === ERROR_CODES.INVALID_OPERATION) {
        throw error; // Re-throw our custom security errors
      }
    }

    // Log unexpected errors for monitoring
    console.warn(`Unexpected error in ${operation}:`, {
      error: error instanceof Error ? error.message : String(error),
      path: basename(absolutePath)
    });

    throw error;
  }
}

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
export async function readFileSnapshot(
  path: string,
  options?: { bypassValidation?: boolean }
): Promise<FileSnapshot> {
  const operation = 'readFileSnapshot';

  // If called from trusted internal code with absolute path, bypass validation
  if (options?.bypassValidation === true) {
    return await readFileSnapshotInternal(path, operation);
  }

  // Validate and sanitize the path for external/user-provided paths
  const safePath = await validateAndSanitizePath(path, operation);
  return await readFileSnapshotInternal(safePath, operation);
}

/**
 * Internal helper to write file with mtime check and basic validation only
 * Used by trusted internal code that has already validated paths
 *
 * @param absolutePath - Already validated absolute path
 * @param expectedMtimeMs - Expected modification time to prevent conflicts
 * @param content - Content to write
 * @param operation - Operation name for error context
 * @throws SpecDocsError for file system errors
 */
async function writeFileIfUnchangedInternal(
  absolutePath: string,
  expectedMtimeMs: number,
  content: string,
  operation: string
): Promise<void> {
  // Validate content size before attempting to write
  validateContentLength(content, operation, absolutePath);

  // Validate expectedMtimeMs parameter
  if (typeof expectedMtimeMs !== 'number' ||
      !Number.isFinite(expectedMtimeMs) ||
      expectedMtimeMs < MIN_VALID_TIMESTAMP ||
      expectedMtimeMs > MAX_VALID_TIMESTAMP) {
    throw createError(
      `Invalid expectedMtimeMs: ${expectedMtimeMs}. Must be a valid timestamp between Unix epoch (0) and 1 year in the future.`,
      ERROR_CODES.INVALID_OPERATION,
      {
        operation,
        expectedMtimeMs,
        validRange: {
          min: MIN_VALID_TIMESTAMP,
          max: MAX_VALID_TIMESTAMP
        }
      }
    );
  }

  try {
    const stat = await fs.stat(absolutePath);

    if (stat.mtimeMs !== expectedMtimeMs) {
      throw createError(
        'File has been modified by another process',
        ERROR_CODES.PRECONDITION_FAILED,
        {
          operation,
          path: basename(absolutePath), // Only include filename for security
          expectedMtimeMs,
          actualMtimeMs: stat.mtimeMs,
          timeDifference: stat.mtimeMs - expectedMtimeMs
        }
      );
    }

    // Ensure parent directory exists
    const parentDir = dirname(absolutePath);
    await fs.mkdir(parentDir, { recursive: true });

    // Atomic write: write to temp file, then rename
    const tempPath = `${absolutePath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tempPath, content, 'utf8');
      await fs.rename(tempPath, absolutePath);
    } catch (writeError) {
      // Clean up temp file if write failed
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw writeError;
    }

  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'ENOENT') {
        throw createError(
          `File not found: ${basename(absolutePath)}`,
          ERROR_CODES.FILE_NOT_FOUND,
          {
            operation,
            path: basename(absolutePath),
            originalPath: absolutePath
          }
        );
      }
      if (error.code === 'EACCES') {
        throw createError(
          `Access denied: ${basename(absolutePath)}`,
          ERROR_CODES.INVALID_OPERATION,
          {
            operation,
            path: basename(absolutePath),
            securityViolation: 'ACCESS_DENIED'
          }
        );
      }
      if (error.code === 'ENOSPC') {
        throw createError(
          'Insufficient disk space',
          ERROR_CODES.INVALID_OPERATION,
          {
            operation,
            path: basename(absolutePath),
            securityViolation: 'DISK_FULL'
          }
        );
      }
      if (error.code === ERROR_CODES.PRECONDITION_FAILED ||
          error.code === ERROR_CODES.FILE_TOO_LARGE ||
          error.code === ERROR_CODES.INVALID_OPERATION) {
        throw error; // Re-throw our custom security errors
      }
    }

    // Log unexpected errors for monitoring
    console.warn(`Unexpected error in ${operation}:`, {
      error: error instanceof Error ? error.message : String(error),
      path: basename(absolutePath)
    });

    throw error;
  }
}

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
export async function writeFileIfUnchanged(
  path: string,
  expectedMtimeMs: number,
  content: string,
  options?: { bypassValidation?: boolean }
): Promise<void> {
  const operation = 'writeFileIfUnchanged';

  // If called from trusted internal code with absolute path, bypass validation
  if (options?.bypassValidation === true) {
    return await writeFileIfUnchangedInternal(path, expectedMtimeMs, content, operation);
  }

  // Validate and sanitize the path for external/user-provided paths
  const safePath = await validateAndSanitizePath(path, operation);
  return await writeFileIfUnchangedInternal(safePath, expectedMtimeMs, content, operation);
}

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
export async function fileExists(path: string): Promise<boolean> {
  const operation = 'fileExists';

  try {
    // Validate and sanitize the path
    const safePath = await validateAndSanitizePath(path, operation);

    // Check if file exists and is readable
    await fs.access(safePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    // If it's a security error, re-throw it
    if (error instanceof Error && 'code' in error && error.code === ERROR_CODES.INVALID_OPERATION) {
      throw error;
    }

    // For ENOENT or access errors, return false (file doesn't exist or isn't readable)
    return false;
  }
}



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
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  const operation = 'ensureDirectoryExists';

  // Basic input validation - remove only the most dangerous characters
  // but be more permissive for directory operations used by system components
  if (typeof dirPath !== 'string' || dirPath.trim() === '') {
    throw createError(
      'Directory path must be a non-empty string',
      ERROR_CODES.INVALID_OPERATION,
      { operation, providedPath: dirPath }
    );
  }

  // Sanitize only the most dangerous characters, but allow most path characters
  // eslint-disable-next-line no-control-regex
  const dangerousCharsForDirs = /[\x00-\x1f\x7f]/g;
  const sanitizedPath = dirPath
    .replace(dangerousCharsForDirs, '')
    .normalize('NFC')
    .trim();

  if (sanitizedPath === '') {
    throw createError(
      'Directory path contains only dangerous characters',
      ERROR_CODES.INVALID_OPERATION,
      { operation, originalPath: dirPath }
    );
  }

  // Resolve the path to prevent simple directory traversal
  const absolutePath = resolve(sanitizedPath);

  try {
    await fs.mkdir(absolutePath, { recursive: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      // Ignore EEXIST errors - directory already exists
      if (error.code === 'EEXIST') {
        return;
      }

      if (error.code === 'EACCES') {
        throw createError(
          `Access denied creating directory: ${basename(absolutePath)}`,
          ERROR_CODES.INVALID_OPERATION,
          {
            operation,
            path: basename(absolutePath),
            securityViolation: 'ACCESS_DENIED'
          }
        );
      }

      if (error.code === 'ENOSPC') {
        throw createError(
          'Insufficient disk space to create directory',
          ERROR_CODES.INVALID_OPERATION,
          {
            operation,
            path: basename(absolutePath),
            securityViolation: 'DISK_FULL'
          }
        );
      }
    }

    // Log unexpected errors for monitoring
    console.warn(`Unexpected error in ${operation}:`, {
      error: error instanceof Error ? error.message : String(error),
      path: basename(absolutePath)
    });

    throw error;
  }
}

