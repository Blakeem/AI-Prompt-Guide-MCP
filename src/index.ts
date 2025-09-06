#!/usr/bin/env node

/**
 * MCP server entry point for Spec-Docs markdown CRUD operations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config.js';
import { createLogger, setGlobalLogger, getGlobalLogger } from './utils/logger.js';
import {
  createErrorResponse,
  withErrorHandling,
  formatLogError,
} from './utils/error-formatter.js';
import { ensureDirectoryExists, fileExists } from './fsio.js';
import { MCP_TOOL_NAMES } from './constants/defaults.js';
import type { ServerConfig } from './types/index.js';
import { 
  SessionStore, 
  getVisibleTools, 
  getVisiblePrompts, 
  getPromptTemplate,
  executeTool 
} from './welcome-gate.js';
import { 
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Global server configuration
 */
let serverConfig: ServerConfig;

/**
 * Session store for tracking acknowledgments
 */
const sessionStore = new SessionStore();

/**
 * MCP Server instance
 */
const server = new Server(
  {
    name: 'spec-docs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {
        listChanged: true,  // We support dynamic tool list changes
      },
      prompts: {
        listChanged: true,  // We support dynamic prompt list changes
      },
    },
  }
);

/**
 * Test connection tool - validates server configuration and environment
 */
async function handleTestConnection(args: Record<string, unknown>): Promise<unknown> {
  const includeServerInfo = Boolean(args['includeServerInfo']);
  const includeSystemInfo = Boolean(args['includeSystemInfo']);

  return withErrorHandling(async () => {
    const logger = getGlobalLogger();
    logger.info('Testing connection', { includeServerInfo, includeSystemInfo });

    // Basic connectivity test
    const connectionTest = {
      status: 'connected',
      timestamp: new Date().toISOString(),
      serverName: serverConfig.serverName,
      serverVersion: serverConfig.serverVersion,
    };

    // Validate docs directory
    const docsPathExists = await fileExists(serverConfig.docsBasePath);
    if (!docsPathExists) {
      logger.warn('Docs directory does not exist, will create on first use', {
        path: serverConfig.docsBasePath,
      });
    }

    const result: Record<string, unknown> = {
      connection: connectionTest,
      docsPath: {
        path: serverConfig.docsBasePath,
        exists: docsPathExists,
      },
    };

    if (includeServerInfo) {
      result['serverInfo'] = {
        name: serverConfig.serverName,
        version: serverConfig.serverVersion,
        logLevel: serverConfig.logLevel,
        limits: {
          maxFileSize: serverConfig.maxFileSize,
          maxFilesPerOperation: serverConfig.maxFilesPerOperation,
        },
        features: {
          fileSafetyChecks: serverConfig.enableFileSafetyChecks,
          mtimePrecondition: serverConfig.enableMtimePrecondition,
        },
      };
    }

    if (includeSystemInfo) {
      result['systemInfo'] = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      };
    }

    logger.info('Connection test successful');
    return result;
  }, 'test_connection');
}

/**
 * Registers all MCP tools
 */
function registerTools(): void {
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
      hasAcknowledged: sessionState.hasAcknowledged,
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
              text: JSON.stringify(await handleTestConnection(args ?? {}), null, 2),
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
      }
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

  // Register prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug('Listing available prompts');
    
    const sessionId = 'default';
    const sessionState = sessionStore.getSession(sessionId);
    const prompts = getVisiblePrompts(sessionState);
    
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    
    logger.debug('Getting prompt', { promptName: name });
    
    const sessionId = 'default';
    const sessionState = sessionStore.getSession(sessionId);
    const prompts = getVisiblePrompts(sessionState);
    
    const prompt = prompts.find(p => p.name === name);
    if (prompt == null) {
      throw new Error(`Unknown prompt: ${name}`);
    }
    
    const template = getPromptTemplate(name);
    if (template == null) {
      throw new Error(`No template for prompt: ${name}`);
    }
    
    return {
      ...prompt,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: template,
          },
        },
      ],
    };
  });

  logger.info('MCP tools and prompts registered successfully');
}

/**
 * Initializes the server
 */
async function initializeServer(): Promise<void> {
  try {
    // Load configuration
    serverConfig = loadConfig();

    // Initialize logger
    const logger = createLogger(serverConfig);
    setGlobalLogger(logger);

    logger.info('Starting Spec-Docs MCP Server', {
      name: serverConfig.serverName,
      version: serverConfig.serverVersion,
      docsPath: serverConfig.docsBasePath,
      logLevel: serverConfig.logLevel,
    });

    // Ensure docs directory exists
    await ensureDirectoryExists(serverConfig.docsBasePath);
    logger.debug('Docs directory ready', { path: serverConfig.docsBasePath });

    // Register MCP tools
    registerTools();

    logger.info('Server initialization complete');
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  await initializeServer();

  const logger = getGlobalLogger();

  // Create transport
  const transport = new StdioServerTransport();
  
  // Handle graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down server...');
    try {
      await server.close();
      logger.info('Server shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', { error });
    }
    process.exit(0);
  };

  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });

  // Connect and run server
  try {
    logger.info('Connecting to MCP transport...');
    await server.connect(transport);
    logger.info('MCP server connected and running');
  } catch (error) {
    const { message, context } = formatLogError(error, 'server_startup');
    logger.error(message, context);
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  const logger = getGlobalLogger();
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  const logger = getGlobalLogger();
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}