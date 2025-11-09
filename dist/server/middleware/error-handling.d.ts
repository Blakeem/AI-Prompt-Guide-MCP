/**
 * Centralized error handling middleware
 */
/**
 * Error response formatting utilities
 */
export declare class ErrorResponseFormatter {
    /**
     * Format error for tool call responses
     */
    static formatToolCallError(error: unknown, toolName: string): {
        content: Array<{
            type: string;
            text: string;
        }>;
    };
    /**
     * Format unknown tool error
     */
    static formatUnknownToolError(toolName: string): {
        content: Array<{
            type: string;
            text: string;
        }>;
    };
    /**
     * Wrap function with error handling
     */
    static wrapWithErrorHandling<T>(fn: () => Promise<T>, context: string): Promise<{
        success: true;
        data: T;
    } | {
        success: false;
        error: string;
        code?: string | undefined;
        context?: Record<string, unknown> | undefined;
    }>;
}
/**
 * Global error handlers for process-level errors
 */
export declare class ProcessErrorHandler {
    /**
     * Set up global error handlers
     */
    static setupGlobalHandlers(): void;
    /**
     * Handle server startup errors
     */
    static handleStartupError(error: unknown): never;
}
//# sourceMappingURL=error-handling.d.ts.map