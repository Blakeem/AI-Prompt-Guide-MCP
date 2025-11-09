/**
 * Implementation for the section tool
 *
 * Migrated to use central addressing system for consistent document/section addressing
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
/**
 * MCP tool for comprehensive section management with support for all CRUD operations
 *
 * Supports bulk operations only - always pass operations as an array, even for single edits.
 * Uses the central addressing system for consistent hierarchical and flat addressing patterns.
 *
 * @param args - Object with document path and operations array
 * @param _state - MCP session state (unused in current implementation)
 * @returns Operation results with document info, affected sections, and status details
 *
 * @example
 * // Single section edit (uses operations array)
 * const result = await section({
 *   document: "/docs/api/auth.md",
 *   operations: [{
 *     section: "overview",
 *     content: "Updated content",
 *     operation: "replace"
 *   }]
 * });
 *
 * // Multiple operations
 * const result = await section({
 *   document: "/docs/api/auth.md",
 *   operations: [
 *     { section: "overview", content: "New content", operation: "replace" },
 *     { section: "examples", content: "Example content", operation: "append_child", title: "Examples" }
 *   ]
 * });
 *
 * @throws {AddressingError} When document or section addresses are invalid or not found
 * @throws {Error} When section operations fail due to content constraints or filesystem errors
 */
export declare function section(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<unknown>;
//# sourceMappingURL=section.d.ts.map