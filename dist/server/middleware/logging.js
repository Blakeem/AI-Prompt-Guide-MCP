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
    static logToolRequest(toolName, args) {
        const logger = getGlobalLogger();
        logger.debug('Handling tool call', { toolName, args });
    }
    /**
     * Log tool request completion
     */
    static logToolSuccess(toolName) {
        const logger = getGlobalLogger();
        logger.debug('Tool call completed successfully', { toolName });
    }
    /**
     * Log prompt request
     */
    static logPromptRequest(promptName) {
        const logger = getGlobalLogger();
        logger.debug('Getting prompt', { promptName });
    }
    /**
     * Log list tools request
     */
    static logListToolsRequest(sessionId, toolCount, hasStartedWorkflow) {
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
    static logListPromptsRequest() {
        const logger = getGlobalLogger();
        logger.debug('Listing available prompts');
    }
}
//# sourceMappingURL=logging.js.map