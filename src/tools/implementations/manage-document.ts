/**
 * Implementation for the manage_document tool
 * Updated to use central addressing system for consistent document addressing
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';

/**
 * Maximum number of operations allowed in a single batch request
 * Prevents performance issues and potential DoS attacks
 */
const MAX_BATCH_SIZE = 100;

export async function manageDocument(
  args: Record<string, unknown> | Array<Record<string, unknown>>,
  _state: SessionState,
  manager: DocumentManager
): Promise<unknown> {
  try {

    // Detect if this is a batch operation (array input) or single operation
    const isBatch = Array.isArray(args);

    if (isBatch) {
      // Handle batch operations
      const operations = args as Array<{
        operation: string;
        document: string;
        new_path?: string;
        new_title?: string;
        confirm?: boolean;
      }>;

      // Comprehensive array validation
      if (!Array.isArray(operations)) {
        throw new AddressingError(
          'Operations parameter must be an array',
          'INVALID_BATCH',
          { receivedType: typeof operations }
        );
      }

      if (operations.length === 0) {
        throw new AddressingError(
          'Batch operations array cannot be empty',
          'EMPTY_BATCH'
        );
      }

      if (operations.length > MAX_BATCH_SIZE) {
        throw new AddressingError(
          `Batch size ${operations.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
          'BATCH_TOO_LARGE',
          { batchSize: operations.length, maxSize: MAX_BATCH_SIZE }
        );
      }

      // Validate array contents
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (op == null || typeof op !== 'object' || Array.isArray(op)) {
          throw new AddressingError(
            `Invalid operation at index ${i}: must be a non-null object`,
            'INVALID_BATCH_ITEM',
            { index: i, value: op, type: typeof op }
          );
        }
      }

      const batchResults: Array<{success: boolean; action?: string; document?: string; error?: string}> = [];
      let operationsCompleted = 0;

      // Process each operation sequentially using addressing system validation
      for (const op of operations) {
        try {
          const operation = ToolIntegration.validateStringParameter(op.operation, 'operation');
          const docPath = ToolIntegration.validateDocumentParameter(op.document);

          const result = await performDocumentOperation(manager, operation, docPath, op);

          batchResults.push({
            success: true,
            action: result.action,
            document: result.document ?? docPath
          });
          operationsCompleted++;

        } catch (opError) {
          const message = opError instanceof Error ? opError.message : String(opError);
          batchResults.push({
            success: false,
            document: op.document ?? 'unknown',
            error: message
          });
        }
      }

      return {
        batch_results: batchResults,
        operations_completed: operationsCompleted,
        total_operations: operations.length,
        timestamp: new Date().toISOString()
      };

    } else {
      // Handle single operation
      const singleOp = args as {
        operation: string;
        document: string;
        new_path?: string;
        new_title?: string;
        confirm?: boolean;
      };

      const operation = ToolIntegration.validateStringParameter(singleOp.operation, 'operation');
      const docPath = ToolIntegration.validateDocumentParameter(singleOp.document);

      const result = await performDocumentOperation(manager, operation, docPath, singleOp);

      return {
        ...result,
        timestamp: new Date().toISOString()
      };
    }

  } catch (error) {
    // Handle addressing errors appropriately - re-throw to maintain error structure
    if (error instanceof AddressingError) {
      throw error;
    }

    // Handle other errors - wrap in AddressingError for proper MCP handling
    const message = error instanceof Error ? error.message : String(error);
    throw new AddressingError(
      `Failed to manage document: ${message}`,
      'DOCUMENT_MANAGE_ERROR',
      { args, originalError: message }
    );
  }
}

/**
 * Perform a single document management operation
 */
async function performDocumentOperation(
  manager: DocumentManager,
  operation: string,
  docPath: string,
  options: {
    new_path?: string;
    new_title?: string;
    confirm?: boolean;
  }
): Promise<{
  action: string;
  document?: string;
  from?: string;
  to?: string;
  old_title?: string;
  new_title?: string;
  audit_file?: string;
  document_info?: { slug: string; title: string; namespace: string };
}> {

  // Use addressing system for validation and parsing
  const { addresses } = ToolIntegration.validateAndParse({
    document: docPath
  });

  // Check if document exists using validated addresses
  const document = await manager.getDocument(addresses.document.path);
  if (document == null) {
    throw new DocumentNotFoundError(addresses.document.path);
  }

  // Helper function to create document info object using addressing system
  const createDocumentInfo = (docAddress: typeof addresses.document, doc?: Awaited<ReturnType<typeof manager.getDocument>>): { slug: string; title: string; namespace: string } => {
    const currentDoc = doc ?? document;
    return ToolIntegration.formatDocumentInfo(docAddress, {
      title: currentDoc?.metadata.title ?? 'Untitled'
    });
  };

  // Validate operation using standardized utilities
  const validatedOperation = ToolIntegration.validateOperation(
    operation,
    ['archive', 'delete', 'rename', 'move'] as const,
    'manage-document'
  );

  switch (validatedOperation) {
    case 'archive': {
      // Archive document (move to archive folder with audit trail) using validated addresses
      const archiveResult = await manager.archiveDocument(addresses.document.path);

      // Use the actual paths returned by archiveDocument (handles duplicates correctly)
      const auditPath = `${archiveResult.archivePath}.audit`;

      return {
        action: 'archived',
        document: addresses.document.path,
        from: archiveResult.originalPath,
        to: archiveResult.archivePath,
        audit_file: auditPath,
        document_info: createDocumentInfo(addresses.document)
      };
    }

    case 'delete': {
      // Permanent deletion (requires confirmation)
      if (options.confirm !== true) {
        throw new AddressingError('Permanent deletion requires confirm: true', 'CONFIRMATION_REQUIRED', {
          document: addresses.document.path
        });
      }

      // Use the file system directly for permanent deletion with validated addresses
      const { promises: fs } = await import('node:fs');
      const { loadConfig } = await import('../../config.js');
      const path = await import('node:path');
      const config = loadConfig();
      const deleteAbsolutePath = path.join(config.docsBasePath, addresses.document.path);
      await fs.unlink(deleteAbsolutePath);

      return {
        action: 'deleted',
        document: addresses.document.path,
        document_info: createDocumentInfo(addresses.document)
      };
    }

    case 'rename': {
      // Rename document title
      const newTitle = ToolIntegration.validateStringParameter(options.new_title, 'new_title');

      // Get current title
      const oldTitle = document.headings.find(h => h.depth === 1)?.title ?? 'Untitled';

      // Update the document title (first heading) using validated addresses
      const { renameHeading } = await import('../../sections.js');
      const { readFileSnapshot, writeFileIfUnchanged } = await import('../../fsio.js');

      const { loadConfig } = await import('../../config.js');
      const path = await import('node:path');
      const config = loadConfig();
      const renameAbsolutePath = path.join(config.docsBasePath, addresses.document.path);
      const snapshot = await readFileSnapshot(renameAbsolutePath);

      // Find the first heading (title) and rename it
      const titleHeadings = document.headings.filter(h => h.depth === 1);
      if (titleHeadings.length > 0) {
        const firstHeading = titleHeadings[0];
        if (firstHeading != null) {
          const updatedContent = renameHeading(snapshot.content, firstHeading.slug, newTitle);
          await writeFileIfUnchanged(renameAbsolutePath, snapshot.mtimeMs, updatedContent);
        }
      }

      // Refresh cache and get updated document info using validated addresses
      const { getGlobalCache } = await import('../../document-cache.js');
      const cache = getGlobalCache();
      cache.invalidateDocument(addresses.document.path);
      const updatedDocument = await manager.getDocument(addresses.document.path);

      return {
        action: 'renamed',
        document: addresses.document.path,
        old_title: oldTitle,
        new_title: options.new_title as string,
        document_info: createDocumentInfo(addresses.document, updatedDocument)
      };
    }

    case 'move': {
      // Move document to new path
      const rawNewPath = ToolIntegration.validateStringParameter(options.new_path, 'new_path');

      // Parse and validate the new path using addressing system
      const newPath = rawNewPath.startsWith('/') ? rawNewPath : `/${rawNewPath}`;
      const finalNewPath = newPath.endsWith('.md') ? newPath : `${newPath}.md`;

      // Validate the new path format using addressing system
      const { addresses: newAddresses } = ToolIntegration.validateAndParse({
        document: finalNewPath
      });

      // Use file system to move the file with validated addresses
      const { promises: moveFs } = await import('node:fs');
      const path = await import('node:path');

      const { loadConfig } = await import('../../config.js');
      const config = loadConfig();
      const oldAbsolutePath = path.join(config.docsBasePath, addresses.document.path);
      const newAbsolutePath = path.join(config.docsBasePath, newAddresses.document.path);

      // Create directory if it doesn't exist
      const newDir = path.dirname(newAbsolutePath);
      await moveFs.mkdir(newDir, { recursive: true });

      // Move the file
      await moveFs.rename(oldAbsolutePath, newAbsolutePath);

      // Get the document from the new location
      const movedDocument = await manager.getDocument(newAddresses.document.path);

      return {
        action: 'moved',
        document: newAddresses.document.path,
        from: addresses.document.path,
        to: newAddresses.document.path,
        document_info: createDocumentInfo(newAddresses.document, movedDocument)
      };
    }

    default:
      throw new AddressingError(`Invalid operation: ${operation}. Must be one of: archive, delete, rename, move`, 'INVALID_OPERATION', {
        document: addresses.document.path,
        operation
      });
  }
}