/**
 * Session-related type definitions for the Spec-Docs MCP server
 */

/**
 * Session state tracking for each connection
 */
export interface SessionState {
  sessionId: string;
  createDocumentStage: number; // Supports 0, 1, 2.5, 3 for create_document progressive discovery
}