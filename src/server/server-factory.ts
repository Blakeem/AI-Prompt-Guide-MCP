/**
 * Server factory for creating and configuring MCP server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from '../config.js';
import { createLogger, setGlobalLogger } from '../utils/logger.js';
import { formatLogError } from '../utils/error-formatter.js';
import { ensureDirectoryExists } from '../fsio.js';
import { SessionStore } from '../welcome-gate.js';
import { registerToolHandlers, registerPromptHandlers } from './request-handlers/index.js';
import type { ServerConfig } from '../types/index.js';

/**
 * Create and configure MCP server
 */
export async function createMCPServer(): Promise<{
  server: Server;
  transport: StdioServerTransport;
  start: () => Promise<void>;
  close: () => Promise<void>;
}> {
  // Load configuration
  const serverConfig: ServerConfig = loadConfig();

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

  // Create server instance with package.json name and version
  const server = new Server(
    {
      name: serverConfig.serverName,
      version: serverConfig.serverVersion,
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

  // Create session store
  const sessionStore = new SessionStore();

  // Register all handlers
  registerToolHandlers(server, sessionStore, serverConfig);
  registerPromptHandlers(server, sessionStore);

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

  // Handle unhandled errors
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise });
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    process.exit(1);
  });

  logger.info('Server initialization complete');

  return {
    server,
    transport,
    start: async (): Promise<void> => {
      try {
        logger.info('Connecting to MCP transport...');
        await server.connect(transport);
        logger.info('MCP server connected and running');
      } catch (error) {
        const { message, context } = formatLogError(error, 'server_startup');
        logger.error(message, context);
        process.exit(1);
      }
    },
    close: async (): Promise<void> => {
      await shutdown();
    },
  };
}