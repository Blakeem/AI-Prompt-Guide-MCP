/**
 * Tool request handlers for MCP server
 */
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { SessionStore } from '../../session/session-store.js';
import type { ServerConfig } from '../../types/index.js';
/**
 * Registers tool-related request handlers with dependency injection
 */
export declare function registerToolHandlers(server: Server, sessionStore: SessionStore, _serverConfig: ServerConfig): void;
//# sourceMappingURL=tool-handlers.d.ts.map