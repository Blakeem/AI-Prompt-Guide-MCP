/**
 * Server factory for creating and configuring MCP server with dependency inversion
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { formatLogError } from '../utils/error-formatter.js';
import type { ServerConfig, Logger } from '../types/index.js';
import type { ServerOptions } from './dependencies.js';
import { mergeDependencies } from './default-dependencies.js';

/**
 * Result of server creation containing server instance and control methods
 */
export interface ServerResult {
  /** MCP server instance */
  readonly server: Server;
  /** Transport for server communication */
  readonly transport: StdioServerTransport;
  /** Server configuration used */
  readonly config: ServerConfig;
  /** Logger instance */
  readonly logger: Logger;
  /** Start the server */
  start(): Promise<void>;
  /** Close the server */
  close(): Promise<void>;
}

/**
 * Create and configure MCP server with dependency injection
 *
 * This factory function creates a fully configured MCP server using the
 * dependency inversion principle. All external dependencies can be injected
 * for testing or customization, while maintaining backward compatibility
 * through default implementations.
 *
 * @param options Configuration options and dependency overrides
 * @returns Promise resolving to configured server with control methods
 *
 * @example
 * ```typescript
 * // Basic usage (backward compatible)
 * const serverResult = await createMCPServer();
 * await serverResult.start();
 *
 * // With custom dependencies for testing
 * const serverResult = await createMCPServer({
 *   dependencies: {
 *     config: mockConfigProvider,
 *     logger: mockLoggerProvider
 *   }
 * });
 * ```
 */
export async function createMCPServer(
  options: ServerOptions = {}
): Promise<ServerResult> {
  // Merge custom dependencies with defaults
  const dependencies = mergeDependencies(options.dependencies);

  // Load configuration through dependency
  const serverConfig: ServerConfig = dependencies.config.loadConfig();

  // Initialize logger through dependency
  const logger = dependencies.logger.createLogger(serverConfig);
  dependencies.logger.setGlobalLogger(logger);

  logger.info('Starting Spec-Docs MCP Server', {
    name: serverConfig.serverName,
    version: serverConfig.serverVersion,
    docsPath: serverConfig.docsBasePath,
    logLevel: serverConfig.logLevel,
  });

  // Ensure docs directory exists through dependency
  await dependencies.fileSystem.ensureDirectoryExists(serverConfig.docsBasePath);
  logger.debug('Docs directory ready', { path: serverConfig.docsBasePath });

  // Create server instance through dependency
  const server = dependencies.server.createServer(
    serverConfig.serverName,
    serverConfig.serverVersion
  );

  // Create session store through dependency
  const sessionStore = dependencies.session.getSessionStore();

  // Register all handlers through dependency
  dependencies.handlers.registerToolHandlers(server, sessionStore, serverConfig);

  // Create transport through dependency
  const transport = dependencies.server.createTransport();

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

  // Configure process signal handling if enabled
  const handleProcessSignals = options.handleProcessSignals ?? true;
  if (handleProcessSignals) {
    process.on('SIGINT', () => { void shutdown(); });
    process.on('SIGTERM', () => { void shutdown(); });
  }

  // Configure unhandled error handling if enabled
  const handleUnhandledErrors = options.handleUnhandledErrors ?? true;
  if (handleUnhandledErrors) {
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', { reason, promise });
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });
  }

  logger.info('Server initialization complete');

  // Create server result with all dependencies injected
  const serverResult: ServerResult = {
    server,
    transport,
    config: serverConfig,
    logger,
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

  return serverResult;
}

/**
 * Backward compatibility wrapper for the original createMCPServer API
 *
 * This function maintains the exact same interface as the original implementation
 * while using the new dependency injection system internally. This ensures that
 * existing code continues to work without any changes.
 *
 * @returns Promise resolving to server components for backward compatibility
 * @deprecated Use createMCPServer() directly for better type safety and additional features
 */
export async function createMCPServerLegacy(): Promise<{
  server: Server;
  transport: StdioServerTransport;
  start: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const result = await createMCPServer();

  return {
    server: result.server,
    transport: result.transport,
    start: result.start,
    close: result.close,
  };
}