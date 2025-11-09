/**
 * Default implementations of server dependencies
 *
 * This module provides concrete implementations of the dependency interfaces,
 * maintaining backward compatibility while enabling dependency injection. These
 * implementations wrap the existing modules and utilities to provide the same
 * behavior as the original tightly-coupled implementation.
 *
 * ## Implementation Strategy
 *
 * Each default provider is a thin wrapper around existing functionality:
 *
 * - **DefaultConfigProvider**: Wraps the existing config.ts module
 * - **DefaultLoggerProvider**: Wraps the existing logger utilities
 * - **DefaultFileSystemProvider**: Wraps the existing fsio.ts module
 * - **DefaultSessionProvider**: Wraps the existing session store singleton
 * - **DefaultServerProvider**: Wraps the MCP SDK server and transport creation
 * - **DefaultHandlerProvider**: Wraps the existing request handler registration
 *
 * ## Backward Compatibility
 *
 * The `createDefaultDependencies()` function ensures that using the new
 * dependency injection system produces exactly the same behavior as the
 * original implementation. This allows for a gradual migration strategy.
 *
 * ## Testing Strategy
 *
 * For testing, create mock implementations of the interfaces:
 *
 * ```typescript
 * const mockConfig: ConfigProvider = {
 *   loadConfig: () => ({
 *     serverName: 'test-server',
 *     serverVersion: '1.0.0',
 *     logLevel: 'debug',
 *     docsBasePath: '/tmp/test-docs',
 *     // ... other config fields
 *   })
 * };
 *
 * const server = await createMCPServer({
 *   dependencies: { config: mockConfig }
 * });
 * ```
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from '../config.js';
import { createLogger, setGlobalLogger } from '../utils/logger.js';
import { getGlobalSessionStore } from '../session/session-store.js';
import { registerToolHandlers } from './request-handlers/index.js';
import type { ConfigProvider, LoggerProvider, FileSystemProvider, SessionProvider, ServerProvider, HandlerProvider, ServerDependencies } from './dependencies.js';
/**
 * Default configuration provider using the existing config module
 */
export declare class DefaultConfigProvider implements ConfigProvider {
    /**
     * Loads configuration using the existing config system
     */
    loadConfig(): ReturnType<typeof loadConfig>;
}
/**
 * Default logger provider using the existing logger utilities
 */
export declare class DefaultLoggerProvider implements LoggerProvider {
    /**
     * Creates a logger using the existing logger factory
     */
    createLogger(config: Parameters<typeof createLogger>[0]): ReturnType<typeof createLogger>;
    /**
     * Sets the global logger using the existing utility
     */
    setGlobalLogger(logger: Parameters<typeof setGlobalLogger>[0]): void;
}
/**
 * Default file system provider using the existing fsio module
 */
export declare class DefaultFileSystemProvider implements FileSystemProvider {
    /**
     * Ensures directory exists using the existing fsio utility
     */
    ensureDirectoryExists(path: string): Promise<void>;
}
/**
 * Default session provider using the existing session store
 */
export declare class DefaultSessionProvider implements SessionProvider {
    /**
     * Gets the global session store instance
     */
    getSessionStore(): ReturnType<typeof getGlobalSessionStore>;
}
/**
 * Default server provider using the MCP SDK
 */
export declare class DefaultServerProvider implements ServerProvider {
    /**
     * Creates an MCP server instance with standard configuration
     */
    createServer(name: string, version: string): Server;
    /**
     * Creates a standard stdio transport
     */
    createTransport(): StdioServerTransport;
}
/**
 * Default handler provider using the existing request handlers
 */
export declare class DefaultHandlerProvider implements HandlerProvider {
    /**
     * Registers tool handlers using the existing registration function
     */
    registerToolHandlers(server: Parameters<typeof registerToolHandlers>[0], sessionStore: Parameters<typeof registerToolHandlers>[1], config: Parameters<typeof registerToolHandlers>[2]): void;
}
/**
 * Creates a complete set of default dependencies
 *
 * This factory function provides the standard implementations of all
 * dependencies, ensuring backward compatibility with existing behavior.
 *
 * @returns Complete dependency container with default implementations
 */
export declare function createDefaultDependencies(): ServerDependencies;
/**
 * Merges custom dependencies with defaults
 *
 * This utility allows partial dependency injection while falling back
 * to defaults for unspecified dependencies.
 *
 * @param customDependencies Partial dependency overrides
 * @returns Complete dependency container with custom and default implementations
 */
export declare function mergeDependencies(customDependencies?: Partial<ServerDependencies>): ServerDependencies;
//# sourceMappingURL=default-dependencies.d.ts.map