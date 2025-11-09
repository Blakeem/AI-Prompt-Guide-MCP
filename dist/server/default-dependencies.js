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
import { ensureDirectoryExists } from '../fsio.js';
import { getGlobalSessionStore } from '../session/session-store.js';
import { registerToolHandlers } from './request-handlers/index.js';
/**
 * Default configuration provider using the existing config module
 */
export class DefaultConfigProvider {
    /**
     * Loads configuration using the existing config system
     */
    loadConfig() {
        return loadConfig();
    }
}
/**
 * Default logger provider using the existing logger utilities
 */
export class DefaultLoggerProvider {
    /**
     * Creates a logger using the existing logger factory
     */
    createLogger(config) {
        return createLogger(config);
    }
    /**
     * Sets the global logger using the existing utility
     */
    setGlobalLogger(logger) {
        setGlobalLogger(logger);
    }
}
/**
 * Default file system provider using the existing fsio module
 */
export class DefaultFileSystemProvider {
    /**
     * Ensures directory exists using the existing fsio utility
     */
    async ensureDirectoryExists(path) {
        await ensureDirectoryExists(path);
    }
}
/**
 * Default session provider using the existing session store
 */
export class DefaultSessionProvider {
    /**
     * Gets the global session store instance
     */
    getSessionStore() {
        return getGlobalSessionStore();
    }
}
/**
 * Default server provider using the MCP SDK
 */
export class DefaultServerProvider {
    /**
     * Creates an MCP server instance with standard configuration
     */
    createServer(name, version) {
        return new Server({
            name,
            version,
        }, {
            capabilities: {
                tools: {},
            },
        });
    }
    /**
     * Creates a standard stdio transport
     */
    createTransport() {
        return new StdioServerTransport();
    }
}
/**
 * Default handler provider using the existing request handlers
 */
export class DefaultHandlerProvider {
    /**
     * Registers tool handlers using the existing registration function
     */
    registerToolHandlers(server, sessionStore, config) {
        registerToolHandlers(server, sessionStore, config);
    }
}
/**
 * Creates a complete set of default dependencies
 *
 * This factory function provides the standard implementations of all
 * dependencies, ensuring backward compatibility with existing behavior.
 *
 * @returns Complete dependency container with default implementations
 */
export function createDefaultDependencies() {
    return {
        config: new DefaultConfigProvider(),
        logger: new DefaultLoggerProvider(),
        fileSystem: new DefaultFileSystemProvider(),
        session: new DefaultSessionProvider(),
        server: new DefaultServerProvider(),
        handlers: new DefaultHandlerProvider(),
    };
}
/**
 * Merges custom dependencies with defaults
 *
 * This utility allows partial dependency injection while falling back
 * to defaults for unspecified dependencies.
 *
 * @param customDependencies Partial dependency overrides
 * @returns Complete dependency container with custom and default implementations
 */
export function mergeDependencies(customDependencies = {}) {
    const defaults = createDefaultDependencies();
    return {
        config: customDependencies.config ?? defaults.config,
        logger: customDependencies.logger ?? defaults.logger,
        fileSystem: customDependencies.fileSystem ?? defaults.fileSystem,
        session: customDependencies.session ?? defaults.session,
        server: customDependencies.server ?? defaults.server,
        handlers: customDependencies.handlers ?? defaults.handlers,
    };
}
//# sourceMappingURL=default-dependencies.js.map