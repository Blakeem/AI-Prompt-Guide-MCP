/**
 * Tool request handlers for MCP server
 */
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { getGlobalLogger } from '../../utils/logger.js';
import { getVisibleTools, executeTool } from '../../tools-manager.js';
import { createErrorResponse, formatLogError, } from '../../utils/error-formatter.js';
import { createDocumentManager } from '../../shared/utilities.js';
/**
 * Registers tool-related request handlers with dependency injection
 */
export function registerToolHandlers(server, sessionStore, _serverConfig) {
    const logger = getGlobalLogger();
    // Create DocumentManager instance once for all tool calls (dependency injection)
    const documentManager = createDocumentManager();
    logger.debug('DocumentManager created for tool handlers');
    // List available tools (dynamic based on session state)
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        logger.debug('Listing available tools');
        // For now, use a default session ID (in production, this would come from the transport)
        const sessionId = 'default';
        const sessionState = sessionStore.getSession(sessionId);
        const tools = getVisibleTools(sessionState);
        logger.debug('Returning visible tools', {
            sessionId,
            toolCount: tools.length
        });
        const allTools = [...tools];
        return { tools: allTools };
    });
    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        logger.debug('Handling tool call', { toolName: name, args });
        try {
            // Handle dynamic tools from tools-manager
            const sessionId = 'default';
            const sessionState = sessionStore.getSession(sessionId);
            // Check if this is a dynamic tool
            const availableTools = getVisibleTools(sessionState);
            const toolExists = availableTools.some(t => t.name === name);
            if (toolExists) {
                const result = await executeTool(name, args ?? {}, sessionState, documentManager, () => {
                    // Send list_changed notifications for tool list updates
                    void server.notification({
                        method: 'notifications/tools/list_changed',
                        params: {},
                    });
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            // Unknown tool
            logger.warn('Unknown tool requested', { toolName: name });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(createErrorResponse(`Unknown tool: ${name}`, 'tool_call'), null, 2),
                    },
                ],
            };
        }
        catch (error) {
            const { message, context } = formatLogError(error, `tool_call:${name}`);
            logger.error(message, context);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(createErrorResponse(error, `tool_call:${name}`), null, 2),
                    },
                ],
            };
        }
    });
    logger.debug('Tool handlers registered successfully');
}
//# sourceMappingURL=tool-handlers.js.map