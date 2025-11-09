/**
 * Consistent error formatting utilities
 */
/**
 * Formats an error for logging
 */
export declare function formatLogError(error: unknown, operation?: string): {
    message: string;
    context: Record<string, unknown>;
};
/**
 * Creates a standardized error response for MCP tools
 */
export declare function createErrorResponse(error: unknown, operation?: string): {
    success: false;
    error: string;
    code?: string | undefined;
    context?: Record<string, unknown> | undefined;
};
/**
 * Wraps an async operation with standardized error handling
 */
export declare function withErrorHandling<T>(operation: () => Promise<T>, operationName?: string): Promise<{
    success: true;
    data: T;
} | {
    success: false;
    error: string;
    code?: string | undefined;
    context?: Record<string, unknown> | undefined;
}>;
//# sourceMappingURL=error-formatter.d.ts.map