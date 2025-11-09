/**
 * Server factory for creating and configuring MCP server with dependency inversion
 */
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ServerConfig, Logger } from '../types/index.js';
import type { ServerOptions } from './dependencies.js';
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
export declare function createMCPServer(options?: ServerOptions): Promise<ServerResult>;
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
export declare function createMCPServerLegacy(): Promise<{
    server: Server;
    transport: StdioServerTransport;
    start: () => Promise<void>;
    close: () => Promise<void>;
}>;
//# sourceMappingURL=server-factory.d.ts.map