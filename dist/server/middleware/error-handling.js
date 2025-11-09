/**
 * Centralized error handling middleware
 */
import { getGlobalLogger } from '../../utils/logger.js';
import { createErrorResponse, formatLogError, withErrorHandling } from '../../utils/error-formatter.js';
/**
 * Error response formatting utilities
 */
export class ErrorResponseFormatter {
    /**
     * Format error for tool call responses
     */
    static formatToolCallError(error, toolName) {
        const { message, context } = formatLogError(error, `tool_call:${toolName}`);
        const logger = getGlobalLogger();
        logger.error(message, context);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(createErrorResponse(error, `tool_call:${toolName}`), null, 2),
                },
            ],
        };
    }
    /**
     * Format unknown tool error
     */
    static formatUnknownToolError(toolName) {
        const logger = getGlobalLogger();
        logger.warn('Unknown tool requested', { toolName });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(createErrorResponse(`Unknown tool: ${toolName}`, 'tool_call'), null, 2),
                },
            ],
        };
    }
    /**
     * Wrap function with error handling
     */
    static async wrapWithErrorHandling(fn, context) {
        return withErrorHandling(fn, context);
    }
}
/**
 * Global error handlers for process-level errors
 */
export class ProcessErrorHandler {
    /**
     * Set up global error handlers
     */
    static setupGlobalHandlers() {
        const logger = getGlobalLogger();
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled promise rejection', { reason, promise });
            process.exit(1);
        });
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception', { error });
            process.exit(1);
        });
    }
    /**
     * Handle server startup errors
     */
    static handleStartupError(error) {
        const { message, context } = formatLogError(error, 'server_startup');
        const logger = getGlobalLogger();
        logger.error(message, context);
        process.exit(1);
    }
}
//# sourceMappingURL=error-handling.js.map