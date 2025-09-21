/**
 * Implementation for the edit_section tool
 */

import type { SessionState } from '../../session/types.js';
import { getDocumentManager, performSectionEdit } from '../../shared/utilities.js';

export async function editSection(
  args: Record<string, unknown>,
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
      }>;

      if (operations.length === 0) {
        throw new Error('Batch operations array cannot be empty');
      }

      const batchResults: Array<{success: boolean; section: string; error?: string}> = [];
      let sectionsModified = 0;
      const documentsModified = new Set<string>();

      // Process each operation sequentially
      for (const op of operations) {
        try {
          const docPath = op.document ?? '';
          const sectionSlug = op.section ?? '';
          const content = op.content ?? '';
          const operation = op.operation ?? 'replace';

          if (!docPath || !sectionSlug || !content) {
            throw new Error('Missing required parameters: document, section, and content');
          }

          const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;
          documentsModified.add(normalizedPath);

          // Perform the same validation and operation as single mode
          await performSectionEdit(manager, normalizedPath, sectionSlug, content, operation);

          batchResults.push({
            success: true,
            section: sectionSlug
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

      return {
        batch_results: batchResults,
        document: Array.from(documentsModified).length === 1 ? Array.from(documentsModified)[0] : undefined,
        sections_modified: sectionsModified,
        total_operations: operations.length,
        timestamp: new Date().toISOString()
      };

    } else {
      // Handle single operation
      const singleOp = args as {
        document: string;
        section: string;
        content: string;
        operation?: string;
      };

      const docPath = singleOp.document ?? '';
      const sectionSlug = singleOp.section ?? '';
      const content = singleOp.content ?? '';
      const operation = singleOp.operation ?? 'replace';

      if (!docPath || !sectionSlug || !content) {
        throw new Error('Missing required parameters: document, section, and content');
      }

      const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;

      await performSectionEdit(manager, normalizedPath, sectionSlug, content, operation);

      return {
        updated: true,
        document: normalizedPath,
        section: sectionSlug,
        operation,
        timestamp: new Date().toISOString()
      };
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