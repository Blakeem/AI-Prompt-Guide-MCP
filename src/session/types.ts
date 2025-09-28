/**
 * Session-related type definitions for the Spec-Docs MCP server
 *
 * This module defines session management interfaces for tracking state across
 * MCP connection lifecycles, enabling progressive discovery workflows and
 * stateful tool interactions.
 */

/**
 * Session state tracking for each MCP connection
 *
 * Maintains session-specific state to enable progressive discovery patterns,
 * where tools reveal parameters and capabilities based on previous interactions.
 * Each session is isolated and maintains independent state throughout the
 * connection lifecycle.
 *
 * @example Basic session initialization
 * ```typescript
 * const sessionStore = getGlobalSessionStore();
 * const newSession: SessionState = {
 *   sessionId: 'session_' + Date.now(),
 *   createDocumentStage: 0
 * };
 * sessionStore.createSession(newSession.sessionId, newSession);
 * ```
 *
 * @example Progressive discovery workflow
 * ```typescript
 * // Stage 0: User provides namespace
 * let session = sessionStore.getSession(sessionId);
 * session.createDocumentStage = 0; // Show namespace parameter only
 *
 * // Stage 1: After namespace provided, show title parameter
 * session.createDocumentStage = 1; // Show namespace + title
 *
 * // Stage 2.5: After title provided, show overview parameter
 * session.createDocumentStage = 2.5; // Show namespace + title + overview
 *
 * // Stage 3: Full schema with all parameters
 * session.createDocumentStage = 3; // Show all parameters
 * ```
 *
 * @example Session state management
 * ```typescript
 * function updateSessionStage(
 *   sessionId: string,
 *   newStage: number,
 *   onStageChange?: () => void
 * ): void {
 *   const sessionStore = getGlobalSessionStore();
 *   const session = sessionStore.getSession(sessionId);
 *
 *   if (session.createDocumentStage !== newStage) {
 *     session.createDocumentStage = newStage;
 *     sessionStore.updateSession(sessionId, session);
 *
 *     // Notify tool registry to update schema
 *     onStageChange?.();
 *   }
 * }
 * ```
 *
 * @example Multi-tool session state
 * ```typescript
 * interface ExtendedSessionState extends SessionState {
 *   createDocumentStage: number;
 *   browseDocumentsFilters?: string[];
 *   lastViewedDocument?: string;
 *   preferredNamespace?: string;
 * }
 * ```
 *
 * @see {@link SessionStore} Session storage implementation
 * @see {@link getGlobalSessionStore} Global session store access
 */
export interface SessionState {
  /** Unique identifier for this session connection */
  sessionId: string;

  /**
   * Progressive discovery stage for create_document tool
   *
   * Controls which parameters are revealed in the tool schema:
   * - Stage 0: namespace only
   * - Stage 1: namespace + title
   * - Stage 2.5: namespace + title + overview
   * - Stage 3: full schema with all parameters
   *
   * @example Stage progression
   * ```typescript
   * // User provides namespace -> advance to stage 1
   * // User provides title -> advance to stage 2.5
   * // User provides overview -> advance to stage 3
   * ```
   */
  createDocumentStage: number;
}