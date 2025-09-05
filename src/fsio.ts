/**
 * File I/O utilities with mtime precondition checking
 */

import { promises as fs } from 'node:fs';
import { ERROR_CODES } from './constants/defaults.js';
import type { FileSnapshot, SpecDocsError } from './types/index.js';

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
 * Reads a file and returns its content with modification time
 */
export async function readFileSnapshot(path: string): Promise<FileSnapshot> {
  try {
    const [stat, buffer] = await Promise.all([
      fs.stat(path),
      fs.readFile(path)
    ]);

    return {
      content: buffer.toString('utf8'),
      mtimeMs: stat.mtimeMs,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw createError(
        `File not found: ${path}`,
        ERROR_CODES.FILE_NOT_FOUND,
        { path }
      );
    }
    throw error;
  }
}

/**
 * Writes a file only if the modification time matches the expected value
 * This prevents concurrent modification conflicts
 */
export async function writeFileIfUnchanged(
  path: string,
  expectedMtimeMs: number,
  content: string
): Promise<void> {
  try {
    const stat = await fs.stat(path);
    
    if (stat.mtimeMs !== expectedMtimeMs) {
      throw createError(
        'File has been modified by another process',
        ERROR_CODES.PRECONDITION_FAILED,
        {
          path,
          expectedMtimeMs,
          actualMtimeMs: stat.mtimeMs,
        }
      );
    }

    await fs.writeFile(path, content, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'ENOENT') {
        throw createError(
          `File not found: ${path}`,
          ERROR_CODES.FILE_NOT_FOUND,
          { path }
        );
      }
      if (error.code === ERROR_CODES.PRECONDITION_FAILED) {
        throw error; // Re-throw our custom error
      }
    }
    throw error;
  }
}

/**
 * Checks if a file exists and is readable
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file size in bytes
 */
export async function getFileSize(path: string): Promise<number> {
  try {
    const stat = await fs.stat(path);
    return stat.size;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw createError(
        `File not found: ${path}`,
        ERROR_CODES.FILE_NOT_FOUND,
        { path }
      );
    }
    throw error;
  }
}

/**
 * Validates file size against maximum limit
 */
export async function validateFileSize(path: string, maxSize: number): Promise<void> {
  const size = await getFileSize(path);
  
  if (size > maxSize) {
    throw createError(
      `File too large: ${size} bytes (max: ${maxSize} bytes)`,
      ERROR_CODES.FILE_TOO_LARGE,
      {
        path,
        size,
        maxSize,
      }
    );
  }
}

/**
 * Creates directory if it doesn't exist
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore EEXIST errors
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      return;
    }
    throw error;
  }
}