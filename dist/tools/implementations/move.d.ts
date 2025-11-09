/**
 * Move tool implementation
 *
 * Moves sections or tasks between documents or within the same document.
 * Data-safe approach: Creates in new location BEFORE deleting from old location.
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
/**
 * Move a section or task to a new location
 *
 * Implementation follows data-safe pattern:
 * 1. Validate all inputs (source, destination, reference)
 * 2. Read source content and title
 * 3. Create in new location FIRST
 * 4. Delete from old location ONLY after successful creation
 *
 * @param args - Tool arguments with from, to, reference, position
 * @param _state - Session state (unused)
 * @param manager - Document manager instance
 * @returns Move result with source and destination info
 */
export declare function move(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<unknown>;
//# sourceMappingURL=move.d.ts.map