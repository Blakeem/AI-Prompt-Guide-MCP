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

/**
 * Global server configuration
 */
let serverConfig: ServerConfig;

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
      tools: {},
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

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing available tools');
    
    return {
      tools: [
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
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    logger.debug('Handling tool call', { toolName: name, args });

    try {
      switch (name) {
        case MCP_TOOL_NAMES.TEST_CONNECTION:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await handleTestConnection(args ?? {}), null, 2),
              },
            ],
          };

        default:
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

  logger.info('MCP tools registered successfully');
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