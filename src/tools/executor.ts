/**
 * Tool execution dispatcher using registry-based pattern for Open/Closed Principle compliance
 */

import type { SessionState } from '../session/types.js';
import {
  createDocument,
  browseDocuments,
  section,
  manageDocument,
  viewDocument,
  viewSection,
  viewTask,
  task,
  completeTask
} from './implementations/index.js';

/**
 * Tool implementation function signature
 */
type ToolImplementation = (
  args: Record<string, unknown>,
  state: SessionState,
  onListChanged?: () => void
) => Promise<unknown>;

/**
 * Registry of tool implementations - follows Open/Closed Principle
 * New tools can be added without modifying the executor logic
 */
const TOOL_REGISTRY: Record<string, ToolImplementation> = {
  'create_document': createDocument,
  'browse_documents': browseDocuments,
  section,
  'manage_document': manageDocument,
  'view_document': viewDocument,
  'view_section': viewSection,
  'view_task': viewTask,
  task,
  'complete_task': completeTask
};

/**
 * Execute tool based on name and session state using registry pattern
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  state: SessionState,
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

  return await implementation(args, state, onListChanged);
}

