/**
 * Session state management for MCP connections
 */
import type { SessionState } from './types.js';
/**
 * Get the global SessionStore singleton instance
 */
export declare function getGlobalSessionStore(): SessionStore;
/**
 * Manages per-session state with TTL and LRU eviction
 */
export declare class SessionStore {
    private readonly sessions;
    private readonly sessionLastAccess;
    private readonly MAX_SESSIONS;
    private readonly SESSION_TTL;
    private cleanupInterval;
    constructor();
    /**
     * Get or create session state for the given session ID
     *
     * Retrieves existing session state or creates a new one if it doesn't exist.
     * Automatically updates the last access timestamp for TTL tracking and
     * enforces the maximum session limit using LRU eviction.
     *
     * @param sessionId - Unique identifier for the session
     * @returns Session state object with current stage information
     */
    getSession(sessionId: string): SessionState;
    /**
     * Update session state with partial updates
     *
     * Merges the provided updates into the existing session state.
     * Creates a new session if one doesn't exist for the given ID.
     *
     * @param sessionId - Unique identifier for the session
     * @param updates - Partial session state updates (excluding sessionId)
     */
    updateSession(sessionId: string, updates: Partial<Omit<SessionState, 'sessionId'>>): void;
    /**
     * Reset session state for testing purposes
     *
     * Completely removes the session and its access tracking.
     * Primarily used in test scenarios to ensure clean state.
     *
     * @param sessionId - Unique identifier for the session to reset
     */
    reset(sessionId: string): void;
    /**
     * Get all active sessions for debugging and monitoring
     *
     * Returns a snapshot of all current session states.
     * Useful for debugging, monitoring, and diagnostics.
     *
     * @returns Array of all active session state objects
     */
    getAllSessions(): SessionState[];
    /**
     * Clean up expired sessions based on TTL
     */
    private cleanupExpiredSessions;
    /**
     * Evict the oldest session (LRU)
     */
    private evictOldestSession;
    /**
     * Destroy session store and clean up all resources
     *
     * Stops the cleanup interval timer and clears all session data.
     * Should be called when shutting down the server to prevent resource leaks.
     */
    destroy(): void;
}
//# sourceMappingURL=session-store.d.ts.map