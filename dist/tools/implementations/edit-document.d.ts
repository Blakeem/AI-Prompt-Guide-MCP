/**
 * Implementation of edit_document tool
 * Allows editing a document's title (first H1) and/or overview (content before first H2)
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
export declare function editDocument(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<unknown>;
//# sourceMappingURL=edit-document.d.ts.map