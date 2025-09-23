/**
 * Implementation for the manage_document tool
 */

import type { SessionState } from '../../session/types.js';
import { getDocumentManager, pathToNamespace, pathToSlug } from '../../shared/utilities.js';

export async function manageDocument(
  args: Record<string, unknown> | Array<Record<string, unknown>>,
  _state: SessionState
): Promise<unknown> {
  try {
    const manager = await getDocumentManager();

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

      if (operations.length === 0) {
        throw new Error('Batch operations array cannot be empty');
      }

      const batchResults: Array<{success: boolean; action?: string; document?: string; error?: string}> = [];
      let operationsCompleted = 0;

      // Process each operation sequentially
      for (const op of operations) {
        try {
          const operation = op.operation ?? '';
          const docPath = op.document ?? '';

          if (operation === '' || docPath === '') {
            throw new Error('Missing required parameters: operation and document');
          }

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

      const operation = singleOp.operation ?? '';
      const docPath = singleOp.document ?? '';

      if (operation === '' || docPath === '') {
        throw new Error('Missing required parameters: operation and document');
      }

      const result = await performDocumentOperation(manager, operation, docPath, singleOp);

      return {
        ...result,
        timestamp: new Date().toISOString()
      };
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      JSON.stringify({
        code: -32603,
        message: 'Failed to manage document',
        data: {
          reason: 'MANAGE_ERROR',
          details: message,
          args,
        },
      })
    );
  }
}

/**
 * Perform a single document management operation
 */
async function performDocumentOperation(
  manager: Awaited<ReturnType<typeof getDocumentManager>>,
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
  document_info?: { path: string; slug: string; title: string; namespace: string };
}> {

  const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;

  // Check if document exists
  const document = await manager.getDocument(normalizedPath);
  if (document === null) {
    throw new Error(`Document not found: ${normalizedPath}`);
  }

  // Helper function to create document info object
  const createDocumentInfo = (docPath: string, doc?: Awaited<ReturnType<typeof manager.getDocument>>): { path: string; slug: string; title: string; namespace: string } => {
    const currentDoc = doc ?? document;
    return {
      path: docPath,
      slug: pathToSlug(docPath),
      title: currentDoc?.metadata.title ?? 'Untitled',
      namespace: pathToNamespace(docPath)
    };
  };

  switch (operation) {
    case 'archive': {
      // Archive document (move to archive folder with audit trail)
      await manager.archiveDocument(normalizedPath);

      // Build archive paths
      const archiveBasePath = normalizedPath.replace(/^\//, '/archived/');
      const auditPath = archiveBasePath.replace(/\.md$/, '.audit.json');

      return {
        action: 'archived',
        document: normalizedPath,
        from: normalizedPath,
        to: archiveBasePath,
        audit_file: auditPath,
        document_info: createDocumentInfo(normalizedPath)
      };
    }

    case 'delete': {
      // Permanent deletion (requires confirmation)
      if (options.confirm !== true) {
        throw new Error('Permanent deletion requires confirm: true');
      }

      // Use the file system directly for permanent deletion
      const { promises: fs } = await import('node:fs');
      const { loadConfig } = await import('../../config.js');
      const path = await import('node:path');
      const config = loadConfig();
      const deleteAbsolutePath = path.join(config.docsBasePath, normalizedPath);
      await fs.unlink(deleteAbsolutePath);

      return {
        action: 'deleted',
        document: normalizedPath,
        document_info: createDocumentInfo(normalizedPath)
      };
    }

    case 'rename': {
      // Rename document title
      if (options.new_title === null || options.new_title === undefined || options.new_title === '') {
        throw new Error('new_title is required for rename operation');
      }

      // Get current title
      const oldTitle = document.headings.find(h => h.depth === 1)?.title ?? 'Untitled';

      // Update the document title (first heading)
      const { renameHeading } = await import('../../sections.js');
      const { readFileSnapshot, writeFileIfUnchanged } = await import('../../fsio.js');

      const { loadConfig } = await import('../../config.js');
      const path = await import('node:path');
      const config = loadConfig();
      const renameAbsolutePath = path.join(config.docsBasePath, normalizedPath);
      const snapshot = await readFileSnapshot(renameAbsolutePath);

      // Find the first heading (title) and rename it
      const titleHeadings = document.headings.filter(h => h.depth === 1);
      if (titleHeadings.length > 0) {
        const firstHeading = titleHeadings[0];
        if (firstHeading != null) {
          const updatedContent = renameHeading(snapshot.content, firstHeading.slug, options.new_title as string);
          await writeFileIfUnchanged(renameAbsolutePath, snapshot.mtimeMs, updatedContent);
        }
      }

      // Refresh cache and get updated document info
      const { getGlobalCache } = await import('../../document-cache.js');
      const cache = getGlobalCache();
      cache.invalidateDocument(normalizedPath);
      const updatedDocument = await manager.getDocument(normalizedPath);

      return {
        action: 'renamed',
        document: normalizedPath,
        old_title: oldTitle,
        new_title: options.new_title as string,
        document_info: createDocumentInfo(normalizedPath, updatedDocument)
      };
    }

    case 'move': {
      // Move document to new path
      if (options.new_path === null || options.new_path === undefined || options.new_path === '') {
        throw new Error('new_path is required for move operation');
      }

      const newNormalizedPath = options.new_path.startsWith('/') ? options.new_path : `/${options.new_path}`;

      // Ensure new path ends with .md
      const finalNewPath = newNormalizedPath.endsWith('.md') ? newNormalizedPath : `${newNormalizedPath}.md`;

      // Use file system to move the file
      const { promises: moveFs } = await import('node:fs');
      const path = await import('node:path');

      const { loadConfig } = await import('../../config.js');
      const config = loadConfig();
      const oldAbsolutePath = path.join(config.docsBasePath, normalizedPath);
      const newAbsolutePath = path.join(config.docsBasePath, finalNewPath);

      // Create directory if it doesn't exist
      const newDir = path.dirname(newAbsolutePath);
      await moveFs.mkdir(newDir, { recursive: true });

      // Move the file
      await moveFs.rename(oldAbsolutePath, newAbsolutePath);

      // Get the document from the new location
      const movedDocument = await manager.getDocument(finalNewPath);

      return {
        action: 'moved',
        document: finalNewPath,
        from: normalizedPath,
        to: finalNewPath,
        document_info: createDocumentInfo(finalNewPath, movedDocument)
      };
    }

    default:
      throw new Error(`Invalid operation: ${operation}. Must be one of: archive, delete, rename, move`);
  }
}