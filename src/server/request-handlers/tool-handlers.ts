/**
 * Tool request handlers for MCP server
 */

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getGlobalLogger } from '../../utils/logger.js';
import { MCP_TOOL_NAMES } from '../../constants/defaults.js';
import type { SessionStore } from '../../welcome-gate.js';
import type { ServerConfig } from '../../types/index.js';
import { 
  getVisibleTools, 
  executeTool 
} from '../../welcome-gate.js';
import {
  createErrorResponse,
  formatLogError,
} from '../../utils/error-formatter.js';

// Import connection handler
import { handleTestConnection as handleConnectionTest } from './connection-handler.js';

/**
 * Registers tool-related request handlers
 */
export function registerToolHandlers(
  server: Server, 
  sessionStore: SessionStore, 
  serverConfig: ServerConfig
): void {
  const logger = getGlobalLogger();

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
    
    // Add the static test_connection tool
    const allTools = [
      {
        name: MCP_TOOL_NAMES.TEST_CONNECTION,
        description: 'Test server connection and validate configuration',
        inputSchema: {
          type: 'object',
          properties: {
            includeServerInfo: {
              type: 'boolean',
              description: 'Include detailed server configuration information',
              default: false,
            },
            includeSystemInfo: {
              type: 'boolean',
              description: 'Include system information (Node.js, platform, etc.)',
              default: false,
            },
          },
          additionalProperties: false,
        },
      },
      ...tools,
    ];
    
    return { tools: allTools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    logger.debug('Handling tool call', { toolName: name, args });

    try {
      // Handle static tools first
      if (name === MCP_TOOL_NAMES.TEST_CONNECTION) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await handleConnectionTest(args ?? {}, serverConfig),
                null,
                2
              ),
            },
          ],
        };
      }

      // Handle dynamic tools from welcome-gate
      const sessionId = 'default';
      const sessionState = sessionStore.getSession(sessionId);
      
      // Check if this is a dynamic tool
      const availableTools = getVisibleTools(sessionState);
      const toolExists = availableTools.some(t => t.name === name);
      
      if (toolExists) {
        const result = await executeTool(
          name, 
          args ?? {}, 
          sessionState,
          () => {
            // Send list_changed notifications
            logger.info('Sending list_changed notifications');
            void server.notification({
              method: 'notifications/tools/list_changed',
              params: {},
            });
            void server.notification({
              method: 'notifications/prompts/list_changed',
              params: {},
            });
          }
        );
        
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
            text: JSON.stringify(
              createErrorResponse(`Unknown tool: ${name}`, 'tool_call'),
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const { message, context } = formatLogError(error, `tool_call:${name}`);
      logger.error(message, context);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              createErrorResponse(error, `tool_call:${name}`),
              null,
              2
            ),
          },
        ],
      };
    }
  });

  logger.debug('Tool handlers registered successfully');
}