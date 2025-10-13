/**
 * Dependency interfaces for the MCP server factory
 *
 * This module defines interfaces for all external dependencies used by the server,
 * enabling dependency inversion and improving testability. By abstracting dependencies
 * behind interfaces, the server factory becomes loosely coupled and easily testable
 * with mock implementations.
 *
 * ## Architecture Benefits
 *
 * - **Testability**: Dependencies can be mocked for unit testing
 * - **Flexibility**: Different implementations can be swapped without code changes
 * - **Separation of Concerns**: Business logic is separated from infrastructure
 * - **Configuration**: Behavior can be customized through dependency injection
 *
 * ## Usage Patterns
 *
 * ### Basic Usage (Default Dependencies)
 * ```typescript
 * const server = await createMCPServer();
 * ```
 *
 * ### Custom Dependencies (Testing)
 * ```typescript
 * const server = await createMCPServer({
 *   dependencies: {
 *     config: mockConfigProvider,
 *     logger: mockLoggerProvider
 *   }
 * });
 * ```
 *
 * ### Complete Custom Configuration
 * ```typescript
 * const customDependencies: ServerDependencies = {
 *   config: new CustomConfigProvider(),
 *   logger: new CustomLoggerProvider(),
 *   fileSystem: new CustomFileSystemProvider(),
 *   session: new CustomSessionProvider(),
 *   server: new CustomServerProvider(),
 *   handlers: new CustomHandlerProvider()
 * };
 *
 * const server = await createMCPServer({
 *   dependencies: customDependencies
 * });
 * ```
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { SessionStore } from '../session/session-store.js';
import type { ServerConfig, Logger } from '../types/index.js';

/**
 * Interface for configuration management
 */
export interface ConfigProvider {
  /**
   * Loads and validates server configuration
   * @returns Validated server configuration
   * @throws Error if configuration is invalid or missing
   */
  loadConfig(): ServerConfig;
}

/**
 * Interface for logger creation and management
 */
export interface LoggerProvider {
  /**
   * Creates a logger instance with the given configuration
   * @param config Server configuration containing log level
   * @returns Configured logger instance
   */
  createLogger(config: ServerConfig): Logger;

  /**
   * Sets the global logger instance for the application
   * @param logger Logger instance to set as global
   */
  setGlobalLogger(logger: Logger): void;
}

/**
 * Interface for file system operations
 */
export interface FileSystemProvider {
  /**
   * Ensures a directory exists, creating it if necessary
   * @param path Directory path to ensure exists
   * @throws Error if directory cannot be created
   */
  ensureDirectoryExists(path: string): Promise<void>;
}

/**
 * Interface for session management
 */
export interface SessionProvider {
  /**
   * Gets or creates a session store instance
   * @returns Session store for managing client sessions
   */
  getSessionStore(): SessionStore;
}

/**
 * Interface for MCP server creation
 */
export interface ServerProvider {
  /**
   * Creates an MCP server instance with the given configuration
   * @param name Server name from configuration
   * @param version Server version from configuration
   * @returns Configured MCP server instance
   */
  createServer(name: string, version: string): Server;

  /**
   * Creates a transport for the MCP server
   * @returns Transport instance for server communication
   */
  createTransport(): StdioServerTransport;
}

/**
 * Interface for request handler registration
 */
export interface HandlerProvider {
  /**
   * Registers tool handlers on the MCP server
   * @param server MCP server instance
   * @param sessionStore Session store for state management
   * @param config Server configuration
   */
  registerToolHandlers(
    server: Server,
    sessionStore: SessionStore,
    config: ServerConfig
  ): void;
}

/**
 * Container for all server dependencies
 *
 * This interface aggregates all dependencies needed by the server factory,
 * enabling easy injection and testing with mock implementations.
 */
export interface ServerDependencies {
  /** Configuration provider */
  readonly config: ConfigProvider;

  /** Logger provider */
  readonly logger: LoggerProvider;

  /** File system provider */
  readonly fileSystem: FileSystemProvider;

  /** Session provider */
  readonly session: SessionProvider;

  /** Server provider */
  readonly server: ServerProvider;

  /** Handler provider */
  readonly handlers: HandlerProvider;
}

/**
 * Options for customizing server behavior
 */
export interface ServerOptions {
  /** Custom dependencies (for testing or configuration) */
  dependencies?: Partial<ServerDependencies>;

  /** Whether to handle process signals for graceful shutdown */
  handleProcessSignals?: boolean;

  /** Whether to handle unhandled errors and rejections */
  handleUnhandledErrors?: boolean;
}