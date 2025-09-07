/**
 * Centralized error handling middleware
 */

import { getGlobalLogger } from '../../utils/logger.js';
import { 
  createErrorResponse, 
  formatLogError, 
  withErrorHandling 
} from '../../utils/error-formatter.js';

/**
 * Error response formatting utilities
 */
export class ErrorResponseFormatter {
  /**
   * Format error for tool call responses
   */
  static formatToolCallError(error: unknown, toolName: string): { content: Array<{ type: string; text: string }> } {
    const { message, context } = formatLogError(error, `tool_call:${toolName}`);
    const logger = getGlobalLogger();
    logger.error(message, context);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            createErrorResponse(error, `tool_call:${toolName}`),
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Format unknown tool error
   */
  static formatUnknownToolError(toolName: string): { content: Array<{ type: string; text: string }> } {
    const logger = getGlobalLogger();
    logger.warn('Unknown tool requested', { toolName });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            createErrorResponse(`Unknown tool: ${toolName}`, 'tool_call'),
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Wrap function with error handling
   */
  static async wrapWithErrorHandling<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<{ success: true; data: T } | { success: false; error: string; code?: string | undefined; context?: Record<string, unknown> | undefined }> {
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
  static setupGlobalHandlers(): void {
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
  static handleStartupError(error: unknown): never {
    const { message, context } = formatLogError(error, 'server_startup');
    const logger = getGlobalLogger();
    logger.error(message, context);
    process.exit(1);
  }
}