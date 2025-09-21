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
 * Manages per-session state
 */
export class SessionStore {
  private readonly sessions = new Map<string, SessionState>();

  /**
   * Get or create session state
   */
  getSession(sessionId: string): SessionState {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        createDocumentStage: 0, // Start at discovery stage
      });
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found - this should not happen`);
    }
    return session;
  }

  /**
   * Update session state
   */
  updateSession(sessionId: string, updates: Partial<Omit<SessionState, 'sessionId'>>): void {
    const session = this.getSession(sessionId);
    Object.assign(session, updates);
  }

  /**
   * Reset session (for testing)
   */
  reset(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get all sessions (for debugging)
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }
}