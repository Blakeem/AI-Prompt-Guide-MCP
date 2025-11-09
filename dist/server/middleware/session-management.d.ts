/**
 * Session management middleware
 */
import type { SessionStore } from '../../session/session-store.js';
import type { SessionState } from '../../session/types.js';
/**
 * Session manager for handling MCP session state
 */
export declare class SessionManager {
    private readonly sessionStore;
    constructor();
    /**
     * Get the global session store instance
     */
    getSessionStore(): SessionStore;
    /**
     * Extract session ID from request context
     * For now, using a default session ID until multi-session support is implemented
     */
    extractSessionId(): string;
    /**
     * Get session state for a given session ID
     */
    getSessionState(sessionId?: string): SessionState;
    /**
     * Initialize session management
     */
    initialize(): void;
}
/**
 * Initialize global session manager
 */
export declare function initializeSessionManager(): SessionManager;
/**
 * Get global session manager instance
 */
export declare function getSessionManager(): SessionManager;
//# sourceMappingURL=session-management.d.ts.map