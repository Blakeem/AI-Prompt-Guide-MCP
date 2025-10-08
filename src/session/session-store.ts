/**
 * Session state management for MCP connections
 */

import type { SessionState } from './types.js';

// Global singleton instance
let globalSessionStore: SessionStore | null = null;

/**
 * Get the global SessionStore singleton instance
 */
export function getGlobalSessionStore(): SessionStore {
  globalSessionStore ??= new SessionStore();
  return globalSessionStore;
}

/**
 * Manages per-session state with TTL and LRU eviction
 */
export class SessionStore {
  private readonly sessions = new Map<string, SessionState>();
  private readonly sessionLastAccess = new Map<string, number>();
  private readonly MAX_SESSIONS = 1000;
  private readonly SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

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
  getSession(sessionId: string): SessionState {
    if (!this.sessions.has(sessionId)) {
      // Enforce maximum session limit with LRU eviction
      if (this.sessions.size >= this.MAX_SESSIONS) {
        this.evictOldestSession();
      }

      this.sessions.set(sessionId, {
        sessionId,
        createDocumentStage: 0, // Start at discovery stage
      });
    }

    // Update last access time for TTL tracking
    this.sessionLastAccess.set(sessionId, Date.now());

    const session = this.sessions.get(sessionId);
    if (session == null) {
      throw new Error(`Session ${sessionId} not found - this should not happen`);
    }
    return session;
  }

  /**
   * Update session state with partial updates
   *
   * Merges the provided updates into the existing session state.
   * Creates a new session if one doesn't exist for the given ID.
   *
   * @param sessionId - Unique identifier for the session
   * @param updates - Partial session state updates (excluding sessionId)
   */
  updateSession(sessionId: string, updates: Partial<Omit<SessionState, 'sessionId'>>): void {
    const session = this.getSession(sessionId);
    Object.assign(session, updates);
  }

  /**
   * Reset session state for testing purposes
   *
   * Completely removes the session and its access tracking.
   * Primarily used in test scenarios to ensure clean state.
   *
   * @param sessionId - Unique identifier for the session to reset
   */
  reset(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.sessionLastAccess.delete(sessionId);
  }

  /**
   * Get all active sessions for debugging and monitoring
   *
   * Returns a snapshot of all current session states.
   * Useful for debugging, monitoring, and diagnostics.
   *
   * @returns Array of all active session state objects
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up expired sessions based on TTL
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    // Find all expired sessions
    for (const [sessionId, lastAccess] of this.sessionLastAccess.entries()) {
      if (now - lastAccess > this.SESSION_TTL) {
        expiredSessions.push(sessionId);
      }
    }

    // Remove expired sessions
    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
      this.sessionLastAccess.delete(sessionId);
    }

    // Log cleanup only if sessions were removed (informational warning)
    if (expiredSessions.length > 0) {
      console.warn(`[SessionStore] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Evict the oldest session (LRU)
   */
  private evictOldestSession(): void {
    let oldestSessionId: string | null = null;
    let oldestAccess = Date.now();

    // Find session with oldest last access time
    for (const [sessionId, lastAccess] of this.sessionLastAccess.entries()) {
      if (lastAccess < oldestAccess) {
        oldestAccess = lastAccess;
        oldestSessionId = sessionId;
      }
    }

    // Evict oldest session
    if (oldestSessionId != null) {
      this.sessions.delete(oldestSessionId);
      this.sessionLastAccess.delete(oldestSessionId);
      console.warn(`[SessionStore] Evicted oldest session: ${oldestSessionId} (max sessions: ${this.MAX_SESSIONS})`);
    }
  }

  /**
   * Destroy session store and clean up all resources
   *
   * Stops the cleanup interval timer and clears all session data.
   * Should be called when shutting down the server to prevent resource leaks.
   */
  destroy(): void {
    if (this.cleanupInterval != null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
    this.sessionLastAccess.clear();
  }
}