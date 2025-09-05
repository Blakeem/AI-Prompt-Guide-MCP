/**
 * Consistent error formatting utilities
 */

import { ERROR_CODES } from '../constants/defaults.js';
import type { SpecDocsError } from '../types/index.js';

/**
 * Formats an error for MCP tool responses
 */
export function formatMCPError(error: unknown): { error: string; code?: string | undefined; context?: Record<string, unknown> | undefined } {
  if (error instanceof Error) {
    const specError = error as SpecDocsError;
    
    const result: { error: string; code?: string | undefined; context?: Record<string, unknown> | undefined } = {
      error: error.message,
    };
    
    if ('code' in specError) {
      result.code = specError.code;
    }
    
    if ('context' in specError && specError.context) {
      result.context = specError.context;
    }
    
    return result;
  }

  return {
    error: String(error),
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Formats an error for logging
 */
export function formatLogError(error: unknown, operation?: string): { message: string; context: Record<string, unknown> } {
  if (error instanceof Error) {
    const specError = error as SpecDocsError;
    
    return {
      message: operation ? `${operation}: ${error.message}` : error.message,
      context: {
        name: error.name,
        stack: error.stack,
        code: 'code' in specError ? specError.code : 'UNKNOWN_ERROR',
        ...(('context' in specError && specError.context) ? specError.context : {}),
      },
    };
  }

  return {
    message: operation ? `${operation}: ${String(error)}` : String(error),
    context: {
      error: String(error),
      code: 'UNKNOWN_ERROR',
    },
  };
}

/**
 * Creates a standardized error response for MCP tools
 */
export function createErrorResponse(error: unknown, operation?: string): {
  success: false;
  error: string;
  code?: string | undefined;
  context?: Record<string, unknown> | undefined;
} {
  const formatted = formatMCPError(error);
  
  const result: {
    success: false;
    error: string;
    code?: string | undefined;
    context?: Record<string, unknown> | undefined;
  } = {
    success: false,
    error: operation ? `${operation}: ${formatted.error}` : formatted.error,
  };
  
  if (formatted.code) {
    result.code = formatted.code;
  }
  
  if (formatted.context) {
    result.context = formatted.context;
  }
  
  return result;
}

/**
 * Creates a success response for MCP tools
 */
export function createSuccessResponse<T>(data: T, metadata?: Record<string, unknown>): {
  success: true;
  data: T;
  metadata?: Record<string, unknown>;
} {
  const response: { success: true; data: T; metadata?: Record<string, unknown> } = {
    success: true,
    data,
  };

  if (metadata) {
    response.metadata = metadata;
  }

  return response;
}

/**
 * Wraps an async operation with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<{ success: true; data: T } | { success: false; error: string; code?: string | undefined; context?: Record<string, unknown> | undefined }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return createErrorResponse(error, operationName);
  }
}

/**
 * Wraps a sync operation with standardized error handling
 */
export function withSyncErrorHandling<T>(
  operation: () => T,
  operationName?: string
): { success: true; data: T } | { success: false; error: string; code?: string | undefined; context?: Record<string, unknown> | undefined } {
  try {
    const data = operation();
    return { success: true, data };
  } catch (error) {
    return createErrorResponse(error, operationName);
  }
}

/**
 * Checks if an error has a specific error code
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  if (error instanceof Error) {
    const specError = error as SpecDocsError;
    return 'code' in specError && specError.code === code;
  }
  return false;
}

/**
 * Extracts error context if available
 */
export function getErrorContext(error: unknown): Record<string, unknown> | undefined {
  if (error instanceof Error) {
    const specError = error as SpecDocsError;
    return 'context' in specError ? specError.context : undefined;
  }
  return undefined;
}

/**
 * Checks if error is a known application error
 */
export function isSpecDocsError(error: unknown): error is SpecDocsError {
  return error instanceof Error && 'code' in error && typeof (error as any).code === 'string';
}

/**
 * Gets all known error codes
 */
export function getAllErrorCodes(): readonly string[] {
  return Object.values(ERROR_CODES);
}

/**
 * Validates that an error code is known
 */
export function isKnownErrorCode(code: string): boolean {
  return getAllErrorCodes().includes(code);
}