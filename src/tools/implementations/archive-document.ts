/**
 * Implementation for the archive_document tool
 */

import type { SessionState } from '../../session/types.js';
import { getDocumentManager } from '../../shared/utilities.js';

export async function archiveDocument(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<unknown> {
  try {
    const manager = await getDocumentManager();
    const userPath = (args['path'] as string) ?? '';

    if (userPath === '') {
      throw new Error('Path is required');
    }

    const result = await manager.archiveDocument(userPath);

    return {
      success: true,
      message: `${result.wasFolder ? 'Folder' : 'Document'} archived successfully: ${result.originalPath}`,
      archived: {
        originalPath: result.originalPath,
        archivePath: result.archivePath,
        type: result.wasFolder ? 'folder' : 'file',
        archivedAt: new Date().toISOString()
      },
      note: 'Archived items can be restored by moving them back from the archive folder. Duplicate handling ensures no data loss.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      JSON.stringify({
        code: -32603,
        message: 'Failed to archive document',
        data: {
          reason: 'ARCHIVE_ERROR',
          details: message,
          path: args['path'],
        },
      })
    );
  }
}