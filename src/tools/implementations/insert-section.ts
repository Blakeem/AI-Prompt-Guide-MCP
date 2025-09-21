/**
 * Implementation for the insert_section tool
 */

import type { SessionState } from '../../session/types.js';
import type { HeadingDepth } from '../../types/index.js';
import { getDocumentManager } from '../../shared/utilities.js';

export async function insertSection(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<unknown> {
  try {
    const manager = await getDocumentManager();
    const docPath = (args['path'] as string) ?? '';
    const referenceSection = (args['reference_section'] as string) ?? '';
    const position = (args['position'] as string) ?? 'after';
    const title = (args['title'] as string) ?? '';
    const content = (args['content'] as string) ?? '';
    const explicitDepth = args['depth'] as number | undefined;

    if (!docPath || !referenceSection || !title) {
      throw new Error('Missing required parameters: path, reference_section, and title');
    }

    const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;

    // Map position to our insert mode
    const insertMode = position === 'before' ? 'insert_before'
      : position === 'child' ? 'append_child'
      : 'insert_after';

    await manager.insertSection(
      normalizedPath,
      referenceSection,
      insertMode,
      explicitDepth as HeadingDepth | undefined,
      title,
      content,
      { updateToc: true }
    );

    return {
      success: true,
      message: `Section "${title}" inserted successfully`,
      section: {
        path: normalizedPath,
        title,
        position: `${position} ${referenceSection}`,
        insertedAt: new Date().toISOString()
      },
      nextSteps: [
        'Use update_document_section to add more content',
        'Use browse_documents to see the updated structure',
        'Use search_documents to verify content is discoverable'
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      JSON.stringify({
        code: -32603,
        message: 'Failed to insert section',
        data: {
          reason: 'INSERT_ERROR',
          details: message,
          path: args['path'],
          title: args['title'],
        },
      })
    );
  }
}