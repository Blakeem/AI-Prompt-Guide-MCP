/**
 * Tool execution dispatcher that routes tool calls to their implementations
 */

import type { SessionState } from '../session/types.js';
import {
  createDocument,
  listDocuments,
  searchDocuments,
  editSection,
  archiveDocument,
  insertSection,
  addTask,
  completeTask,
  reopenTask,
  viewDocument,
  removeSection
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

    case 'list_documents':
      return await listDocuments(args, state);

    case 'search_documents':
      return await searchDocuments(args, state);

    case 'edit_section':
      return await editSection(args, state);

    case 'archive_document':
      return await archiveDocument(args, state);

    case 'insert_section':
      return await insertSection(args, state);

    case 'add_task':
      return await addTask(args, state);

    case 'complete_task':
      return await completeTask(args, state);

    case 'reopen_task':
      return await reopenTask(args, state);

    case 'view_document':
      return await viewDocument(args, state);

    case 'remove_section':
      return await removeSection(args, state);

    default:
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        })
      );
  }
}