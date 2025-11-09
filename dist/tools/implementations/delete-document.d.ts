/**
 * Implementation for the delete_document tool
 * Simplified focused tool for document deletion with optional archive
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
/**
 * Delete a document permanently or archive with audit trail
 *
 * @param args - Tool arguments containing document path and optional archive flag
 * @param _state - Session state (unused)
 * @param manager - Document manager instance
 * @returns Result object with deletion details
 */
export declare function deleteDocument(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<unknown>;
//# sourceMappingURL=delete-document.d.ts.map