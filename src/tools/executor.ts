/**
 * Tool execution dispatcher that routes tool calls to their implementations
 */

import type { SessionState } from '../session/types.js';
import {
  createDocument,
  listDocuments,
  searchDocuments,
  browseDocuments,
  section,
  manageDocument,
  archiveDocument,
  addTask,
  completeTask,
  reopenTask,
  viewDocument
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

    case 'list_documents':
      return await listDocuments(args, state);

    case 'search_documents':
      return await searchDocuments(args, state);

    case 'section':
      return await section(args, state);

    case 'manage_document':
      return await manageDocument(args, state);

    case 'archive_document':
      return await archiveDocument(args, state);

    case 'add_task':
      return await addTask(args, state);

    case 'complete_task':
      return await completeTask(args, state);

    case 'reopen_task':
      return await reopenTask(args, state);

    case 'view_document':
      return await viewDocument(args, state);

    default:
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        })
      );
  }
}