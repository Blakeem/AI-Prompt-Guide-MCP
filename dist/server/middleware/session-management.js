/**
 * Session management middleware
 */
import { getGlobalSessionStore } from '../../session/session-store.js';
import { getGlobalLogger } from '../../utils/logger.js';
/**
 * Session manager for handling MCP session state
 */
export class SessionManager {
    sessionStore;
    constructor() {
        this.sessionStore = getGlobalSessionStore();
    }
    /**
     * Get the global session store instance
     */
    getSessionStore() {
        return this.sessionStore;
    }
    /**
     * Extract session ID from request context
     * For now, using a default session ID until multi-session support is implemented
     */
    extractSessionId( /* request?: any */) {
        // TODO: In the future, extract from transport or request headers
        return 'default';
    }
    /**
     * Get session state for a given session ID
     */
    getSessionState(sessionId) {
        const id = sessionId ?? this.extractSessionId();
        return this.sessionStore.getSession(id);
    }
    /**
     * Initialize session management
     */
    initialize() {
        const logger = getGlobalLogger();
        logger.debug('Session management initialized');
    }
}
/**
 * Global session manager instance
 */
let globalSessionManager = null;
/**
 * Initialize global session manager
 */
export function initializeSessionManager() {
    if (globalSessionManager == null) {
        globalSessionManager = new SessionManager();
        globalSessionManager.initialize();
    }
    return globalSessionManager;
}
/**
 * Get global session manager instance
 */
export function getSessionManager() {
    if (globalSessionManager == null) {
        throw new Error('Session manager not initialized. Call initializeSessionManager() first.');
    }
    return globalSessionManager;
}
//# sourceMappingURL=session-management.js.map