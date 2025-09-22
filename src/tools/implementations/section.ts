/**
 * Implementation for the section tool
 */

import type { SessionState } from '../../session/types.js';
import { getDocumentManager, performSectionEdit, pathToNamespace, pathToSlug } from '../../shared/utilities.js';

export async function section(
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
        document: string;
        section: string;
        content: string;
        operation?: string;
        title?: string;
      }>;

      if (operations.length === 0) {
        throw new Error('Batch operations array cannot be empty');
      }

      const batchResults: Array<{success: boolean; section: string; action?: 'edited' | 'created' | 'removed'; depth?: number; error?: string; removed_content?: string}> = [];
      let sectionsModified = 0;
      const documentsModified = new Set<string>();

      // Process each operation sequentially
      for (const op of operations) {
        try {
          const docPath = op.document ?? '';
          const sectionSlug = op.section ?? '';
          const content = op.content ?? '';
          const operation = op.operation ?? 'replace';
          const title = op.title;

          if (!docPath || !sectionSlug) {
            throw new Error('Missing required parameters: document and section');
          }

          // Content is not required for remove operations
          if (operation !== 'remove' && !content) {
            throw new Error('Content is required for all operations except remove');
          }

          const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;
          documentsModified.add(normalizedPath);

          // Perform the enhanced operation
          const result = await performSectionEdit(manager, normalizedPath, sectionSlug, content, operation, title);

          batchResults.push({
            success: true,
            section: result.section,
            action: result.action,
            ...(result.depth !== undefined && { depth: result.depth }),
            ...(result.removedContent !== undefined && { removed_content: result.removedContent })
          });
          sectionsModified++;

        } catch (opError) {
          const message = opError instanceof Error ? opError.message : String(opError);
          batchResults.push({
            success: false,
            section: op.section ?? 'unknown',
            error: message
          });
        }
      }

      // Get document info for single document batches
      let documentInfo;
      if (Array.from(documentsModified).length === 1) {
        const singleDocPath = Array.from(documentsModified)[0] as string;
        const doc = await manager.getDocument(singleDocPath);
        if (doc != null) {
          documentInfo = {
            path: singleDocPath,
            slug: pathToSlug(singleDocPath),
            title: doc.metadata.title,
            namespace: pathToNamespace(singleDocPath)
          };
        }
      }

      return {
        batch_results: batchResults,
        document: Array.from(documentsModified).length === 1 ? Array.from(documentsModified)[0] : undefined,
        sections_modified: sectionsModified,
        total_operations: operations.length,
        timestamp: new Date().toISOString(),
        ...(documentInfo && {
          document_info: {
            slug: documentInfo.slug,
            title: documentInfo.title,
            namespace: documentInfo.namespace
          }
        })
      };

    } else {
      // Handle single operation
      const singleOp = args as {
        document: string;
        section: string;
        content: string;
        operation?: string;
        title?: string;
      };

      const docPath = singleOp.document ?? '';
      const sectionSlug = singleOp.section ?? '';
      const content = singleOp.content ?? '';
      const operation = singleOp.operation ?? 'replace';
      const title = singleOp.title;

      if (!docPath || !sectionSlug) {
        throw new Error('Missing required parameters: document and section');
      }

      // Content is not required for remove operations
      if (operation !== 'remove' && !content) {
        throw new Error('Content is required for all operations except remove');
      }

      const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;

      const result = await performSectionEdit(manager, normalizedPath, sectionSlug, content, operation, title);

      // Get document information for response
      const document = await manager.getDocument(normalizedPath);
      const documentInfo = document != null ? {
        path: normalizedPath,
        slug: pathToSlug(normalizedPath),
        title: document.metadata.title,
        namespace: pathToNamespace(normalizedPath)
      } : undefined;

      // Return different response based on action
      if (result.action === 'created') {
        return {
          created: true,
          document: normalizedPath,
          new_section: result.section,
          ...(result.depth !== undefined && { depth: result.depth }),
          operation,
          timestamp: new Date().toISOString(),
          ...(documentInfo && {
            document_info: {
              slug: documentInfo.slug,
              title: documentInfo.title,
              namespace: documentInfo.namespace
            }
          })
        };
      } else if (result.action === 'removed') {
        return {
          removed: true,
          document: normalizedPath,
          section: result.section,
          removed_content: result.removedContent,
          operation,
          timestamp: new Date().toISOString(),
          ...(documentInfo && {
            document_info: {
              slug: documentInfo.slug,
              title: documentInfo.title,
              namespace: documentInfo.namespace
            }
          })
        };
      } else {
        return {
          updated: true,
          document: normalizedPath,
          section: result.section,
          operation,
          timestamp: new Date().toISOString(),
          ...(documentInfo && {
            document_info: {
              slug: documentInfo.slug,
              title: documentInfo.title,
              namespace: documentInfo.namespace
            }
          })
        };
      }
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      JSON.stringify({
        code: -32603,
        message: 'Failed to edit section',
        data: {
          reason: 'EDIT_ERROR',
          details: message,
          args,
        },
      })
    );
  }
}