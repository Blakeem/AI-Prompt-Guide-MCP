/**
 * Consistent error formatting utilities
 */

import type { SpecDocsError } from '../types/index.js';

/**
 * Formats an error for MCP tool responses
 */
function formatMCPError(error: unknown): { error: string; code?: string | undefined; context?: Record<string, unknown> | undefined } {
  if (error instanceof Error) {
    const specError = error as SpecDocsError;

    const result: { error: string; code?: string | undefined; context?: Record<string, unknown> | undefined } = {
      error: error.message,
    };

    if ('code' in specError) {
      result.code = specError.code;
    }

    if ('context' in specError && specError.context != null) {
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
      message: operation != null && operation.length > 0 ? `${operation}: ${error.message}` : error.message,
      context: {
        name: error.name,
        stack: error.stack,
        code: 'code' in specError ? specError.code : 'UNKNOWN_ERROR',
        ...(('context' in specError && specError.context != null) ? specError.context : {}),
      },
    };
  }

  return {
    message: operation != null && operation.length > 0 ? `${operation}: ${String(error)}` : String(error),
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
    error: operation != null && operation.length > 0 ? `${operation}: ${formatted.error}` : formatted.error,
  };
  
  if (formatted.code != null && formatted.code.length > 0) {
    result.code = formatted.code;
  }
  
  if (formatted.context != null) {
    result.context = formatted.context;
  }
  
  return result;
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

