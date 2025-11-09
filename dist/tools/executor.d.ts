/**
 * Tool execution dispatcher using registry-based pattern for Open/Closed Principle compliance
 *
 * Updated to support dependency injection of DocumentManager
 */
import type { SessionState } from '../session/types.js';
import type { DocumentManager } from '../document-manager.js';
/**
 * Execute tool based on name and session state using registry pattern with dependency injection
 *
 * @param toolName - Name of the tool to execute
 * @param args - Tool arguments
 * @param state - Session state
 * @param manager - DocumentManager instance (injected dependency)
 * @param onListChanged - Optional callback for tool list changes
 * @returns Tool execution result
 */
export declare function executeTool(toolName: string, args: Record<string, unknown>, state: SessionState, manager: DocumentManager, onListChanged?: () => void): Promise<unknown>;
//# sourceMappingURL=executor.d.ts.map