/**
 * Implementation for the delete_document tool
 * Simplified focused tool for document deletion with optional archive
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';

/**
 * Delete a document permanently or archive with audit trail
 *
 * @param args - Tool arguments containing document path and optional archive flag
 * @param _state - Session state (unused)
 * @param manager - Document manager instance
 * @returns Result object with deletion details
 */
export async function deleteDocument(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<unknown> {
  // Input validation
  let documentPath: string;
  let shouldArchive: boolean;

  try {
    // Validate and extract parameters
    documentPath = ToolIntegration.validateStringParameter(args['document'], 'document');
    shouldArchive = args['archive'] === true; // Default to false if not provided

    // Parse and validate document address
    const { addresses } = ToolIntegration.validateAndParse({
      document: documentPath
    });

    // Check if document exists
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    // Execute appropriate deletion strategy
    if (shouldArchive) {
      // Archive with audit trail
      const archiveResult = await manager.archiveDocument(addresses.document.path);
      const auditPath = `${archiveResult.archivePath}.audit`;

      return {
        success: true,
        operation: 'archived' as const,
        archived_to: archiveResult.archivePath,
        audit_file: auditPath
      };
    } else {
      // Permanent deletion
      const { promises: fs } = await import('node:fs');
      const path = await import('node:path');

      // Use manager's internal routing to get correct base path (docs vs coordinator)
      const relativePath = addresses.document.path.startsWith('/') ? addresses.document.path.slice(1) : addresses.document.path;
      const isCoordinatorPath = relativePath.startsWith('coordinator/');
      const baseRoot = isCoordinatorPath
        ? manager['coordinatorRoot'] as string
        : manager['docsRoot'] as string;
      const pathWithoutPrefix = isCoordinatorPath
        ? relativePath.slice('coordinator/'.length)
        : relativePath;
      const absolutePath = path.join(baseRoot, pathWithoutPrefix);

      await fs.unlink(absolutePath);

      // Invalidate cache after deletion
      manager.cache.invalidateDocument(addresses.document.path);

      return {
        success: true,
        operation: 'deleted' as const
      };
    }

  } catch (error) {
    // Re-throw addressing errors with original context
    if (error instanceof AddressingError) {
      throw error;
    }

    // Wrap unexpected errors
    const message = error instanceof Error ? error.message : String(error);
    throw new AddressingError(
      `Failed to delete document: ${message}`,
      'DELETE_DOCUMENT_FAILED',
      {
        document: args['document'],
        archive: args['archive'],
        error: message
      }
    );
  }
}
