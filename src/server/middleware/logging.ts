/**
 * Logging middleware for request/response tracking
 */

import { getGlobalLogger } from '../../utils/logger.js';

/**
 * Request/Response logging utilities
 */
export class RequestLogger {
  /**
   * Log incoming tool request
   */
  static logToolRequest(toolName: string, args: Record<string, unknown>): void {
    const logger = getGlobalLogger();
    logger.debug('Handling tool call', { toolName, args });
  }

  /**
   * Log tool request completion
   */
  static logToolSuccess(toolName: string): void {
    const logger = getGlobalLogger();
    logger.debug('Tool call completed successfully', { toolName });
  }

  /**
   * Log prompt request
   */
  static logPromptRequest(promptName: string): void {
    const logger = getGlobalLogger();
    logger.debug('Getting prompt', { promptName });
  }

  /**
   * Log list tools request
   */
  static logListToolsRequest(sessionId: string, toolCount: number, hasStartedWorkflow: boolean): void {
    const logger = getGlobalLogger();
    logger.debug('Returning visible tools', { 
      sessionId, 
      hasStartedWorkflow,
      toolCount 
    });
  }

  /**
   * Log list prompts request
   */
  static logListPromptsRequest(): void {
    const logger = getGlobalLogger();
    logger.debug('Listing available prompts');
  }

  /**
   * Log connection test
   */
  static logConnectionTest(includeServerInfo: boolean, includeSystemInfo: boolean): void {
    const logger = getGlobalLogger();
    logger.info('Testing connection', { includeServerInfo, includeSystemInfo });
  }

  /**
   * Log connection test success
   */
  static logConnectionSuccess(): void {
    const logger = getGlobalLogger();
    logger.info('Connection test successful');
  }
}