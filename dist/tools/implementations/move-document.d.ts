/**
 * move_document tool implementation
 * Relocates documents within the filesystem
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
/**
 * Move a document from one location to another
 * Creates destination directories as needed and invalidates caches
 */
export declare function moveDocument(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<unknown>;
//# sourceMappingURL=move-document.d.ts.map