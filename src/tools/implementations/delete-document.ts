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

    // Format document info for response
    const documentInfo = ToolIntegration.formatDocumentInfo(addresses.document, {
      title: document.metadata.title
    });

    // Execute appropriate deletion strategy
    if (shouldArchive) {
      // Archive with audit trail
      const archiveResult = await manager.archiveDocument(addresses.document.path);
      const auditPath = `${archiveResult.archivePath}.audit`;

      return {
        action: 'archived',
        document: addresses.document.path,
        from: archiveResult.originalPath,
        to: archiveResult.archivePath,
        audit_file: auditPath,
        document_info: documentInfo,
        timestamp: new Date().toISOString()
      };
    } else {
      // Permanent deletion
      const { promises: fs } = await import('node:fs');
      const { loadConfig } = await import('../../config.js');
      const path = await import('node:path');

      const config = loadConfig();
      const absolutePath = path.join(config.docsBasePath, addresses.document.path);

      await fs.unlink(absolutePath);

      // Invalidate cache after deletion
      manager.cache.invalidateDocument(addresses.document.path);

      return {
        action: 'deleted',
        document: addresses.document.path,
        document_info: documentInfo,
        timestamp: new Date().toISOString()
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
