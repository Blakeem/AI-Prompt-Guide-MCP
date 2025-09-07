/**
 * Session management middleware
 */

import { SessionStore } from '../../welcome-gate.js';
import type { SessionState } from '../../welcome-gate.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getGlobalLogger } from '../../utils/logger.js';

/**
 * Session manager for handling MCP session state
 */
export class SessionManager {
  private readonly sessionStore: SessionStore;

  constructor() {
    this.sessionStore = new SessionStore();
  }

  /**
   * Get the global session store instance
   */
  getSessionStore(): SessionStore {
    return this.sessionStore;
  }

  /**
   * Extract session ID from request context
   * For now, using a default session ID until multi-session support is implemented
   */
  extractSessionId(/* request?: any */): string {
    // TODO: In the future, extract from transport or request headers
    return 'default';
  }

  /**
   * Get session state for a given session ID
   */
  getSessionState(sessionId?: string): SessionState {
    const id = sessionId ?? this.extractSessionId();
    return this.sessionStore.getSession(id);
  }

  /**
   * Initialize session management
   */
  initialize(): void {
    const logger = getGlobalLogger();
    logger.debug('Session management initialized');
  }

  /**
   * Send list changed notifications
   */
  sendListChangedNotifications(server: Server): void {
    const logger = getGlobalLogger();
    logger.info('Sending list_changed notifications');
    
    void server.notification({
      method: 'notifications/tools/list_changed',
      params: {},
    });
    
    void server.notification({
      method: 'notifications/prompts/list_changed',
      params: {},
    });
  }
}

/**
 * Global session manager instance
 */
let globalSessionManager: SessionManager | null = null;

/**
 * Initialize global session manager
 */
export function initializeSessionManager(): SessionManager {
  if (globalSessionManager == null) {
    globalSessionManager = new SessionManager();
    globalSessionManager.initialize();
  }
  return globalSessionManager;
}

/**
 * Get global session manager instance
 */
export function getSessionManager(): SessionManager {
  if (globalSessionManager == null) {
    throw new Error('Session manager not initialized. Call initializeSessionManager() first.');
  }
  return globalSessionManager;
}