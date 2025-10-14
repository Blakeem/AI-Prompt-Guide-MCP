/**
 * Tool execution dispatcher using registry-based pattern for Open/Closed Principle compliance
 *
 * Updated to support dependency injection of DocumentManager
 */

import type { SessionState } from '../session/types.js';
import type { DocumentManager } from '../document-manager.js';
import {
  createDocument,
  browseDocuments,
  searchDocuments,
  section,
  move,
  deleteDocument,
  moveDocument,
  viewDocument,
  viewSection,
  viewSubagentTask,
  viewCoordinatorTask,
  subagentTask,
  completeSubagentTask,
  startSubagentTask,
  coordinatorTask,
  completeCoordinatorTask,
  startCoordinatorTask,
  editDocument,
  executeGetWorkflow,
  executeGetGuide
} from './implementations/index.js';

/**
 * Tool implementation function signature with dependency injection
 */
type ToolImplementation = (
  args: Record<string, unknown>,
  state: SessionState,
  manager: DocumentManager,
  onListChanged?: () => void
) => Promise<unknown>;

/**
 * Registry of tool implementations - follows Open/Closed Principle
 * New tools can be added without modifying the executor logic
 */
const TOOL_REGISTRY: Record<string, ToolImplementation> = {
  'create_document': createDocument,
  'edit_document': editDocument,
  'browse_documents': browseDocuments,
  'search_documents': searchDocuments,
  section,
  move,
  'delete_document': deleteDocument,
  'move_document': moveDocument,
  'view_document': viewDocument,
  'view_section': viewSection,
  'view_subagent_task': viewSubagentTask,
  'view_coordinator_task': viewCoordinatorTask,
  'subagent_task': subagentTask,
  'complete_subagent_task': completeSubagentTask,
  'start_subagent_task': startSubagentTask,
  'coordinator_task': coordinatorTask,
  'complete_coordinator_task': completeCoordinatorTask,
  'start_coordinator_task': startCoordinatorTask,
  'get_workflow': executeGetWorkflow,
  'get_guide': executeGetGuide
};

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
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  state: SessionState,
  manager: DocumentManager,
  onListChanged?: () => void
): Promise<unknown> {
  const implementation = TOOL_REGISTRY[toolName];

  if (implementation == null) {
    throw new Error(
      JSON.stringify({
        code: -32601,
        message: `Unknown tool: ${toolName}`,
      })
    );
  }

  return await implementation(args, state, manager, onListChanged);
}

