/**
 * move_document tool implementation
 * Relocates documents within the filesystem
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError,
} from '../../shared/addressing-system.js';
import { loadConfig } from '../../config.js';

/**
 * Move a document from one location to another
 * Creates destination directories as needed and invalidates caches
 */
export async function moveDocument(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<unknown> {
  // Variables
  let fromPath: string;
  let toPath: string;
  let normalizedToPath: string;
  let finalToPath: string;

  try {
    // Input validation
    fromPath = ToolIntegration.validateStringParameter(args['from'], 'from');
    toPath = ToolIntegration.validateStringParameter(args['to'], 'to');

    // Parse and validate source path
    const { addresses: fromAddresses } = ToolIntegration.validateAndParse({
      document: fromPath,
    });

    // Validate source document exists
    const sourceDoc = await manager.getDocument(fromAddresses.document.path);
    if (sourceDoc == null) {
      throw new DocumentNotFoundError(fromAddresses.document.path);
    }

    // Parse and validate destination path
    // Normalize destination: ensure it starts with / and ends with .md
    normalizedToPath = toPath.startsWith('/') ? toPath : `/${toPath}`;
    finalToPath = normalizedToPath.endsWith('.md')
      ? normalizedToPath
      : `${normalizedToPath}.md`;

    const { addresses: toAddresses } = ToolIntegration.validateAndParse({
      document: finalToPath,
    });

    // Check if destination already exists
    const destDoc = await manager.getDocument(toAddresses.document.path);
    if (destDoc != null) {
      throw new AddressingError(
        `Destination document already exists: ${toAddresses.document.path}`,
        'DESTINATION_EXISTS',
        { to: toAddresses.document.path }
      );
    }

    // Processing - perform the filesystem move
    const config = loadConfig();
    const sourceAbsPath = path.join(
      config.workspaceBasePath,
      fromAddresses.document.path
    );
    const destAbsPath = path.join(config.workspaceBasePath, toAddresses.document.path);

    // Create destination directory if needed
    const destDir = path.dirname(destAbsPath);
    await fs.mkdir(destDir, { recursive: true });

    // Move the file
    await fs.rename(sourceAbsPath, destAbsPath);

    // Invalidate caches for both old and new paths
    manager.cache.invalidateDocument(fromAddresses.document.path);
    manager.cache.invalidateDocument(toAddresses.document.path);

    // Get the moved document from new location
    const movedDoc = await manager.getDocument(toAddresses.document.path);

    // Output construction
    return {
      action: 'moved',
      from: fromAddresses.document.path,
      to: toAddresses.document.path,
      document_info: ToolIntegration.formatDocumentInfo(toAddresses.document, {
        title: movedDoc?.metadata.title ?? 'Untitled',
      }),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AddressingError) {
      throw error;
    }
    if (error instanceof DocumentNotFoundError) {
      throw error;
    }
    throw new AddressingError(
      `Failed to move document: ${error instanceof Error ? error.message : String(error)}`,
      'MOVE_DOCUMENT_FAILED',
      { from: args['from'], to: args['to'] }
    );
  }
}
