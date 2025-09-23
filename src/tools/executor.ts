/**
 * Tool execution dispatcher that routes tool calls to their implementations
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
 * Execute tool based on name and session state
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  state: SessionState,
  onListChanged?: () => void
): Promise<unknown> {
  switch (toolName) {
    case 'create_document':
      return await createDocument(args, state, onListChanged);

    case 'browse_documents':
      return await browseDocuments(args, state);

    case 'section':
      return await section(args, state);

    case 'manage_document':
      return await manageDocument(args, state);


    case 'view_document':
      return await viewDocument(args, state);

    case 'view_section':
      return await viewSection(args, state);

    case 'view_task':
      return await viewTask(args, state);

    case 'task':
      return await task(args, state);

    case 'complete_task':
      return await completeTask(args, state);

    default:
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        })
      );
  }
}