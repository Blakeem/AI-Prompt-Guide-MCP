/**
 * Implementation for the list_documents tool
 */

import type { SessionState } from '../../session/types.js';
import { getDocumentManager } from '../../shared/utilities.js';

export async function listDocuments(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<unknown> {
  try {
    const manager = await getDocumentManager();
    const path = (args['path'] as string) ?? '/';
    const depth = Math.max(1, Math.min(5, Number(args['depth']) || 2));

    const documents = await manager.listDocuments();

    // Filter by path if specified
    const filteredDocs = path === '/'
      ? documents
      : documents.filter(doc => doc.path.startsWith(path));

    return {
      success: true,
      message: `Found ${filteredDocs.length} documents`,
      path,
      depth,
      documents: filteredDocs.slice(0, 50).map(doc => ({
        path: doc.path,
        title: doc.title,
        lastModified: doc.lastModified.toISOString(),
        stats: {
          headings: doc.headingCount,
          words: doc.wordCount
        }
      })),
      totalFound: filteredDocs.length,
      actions: [
        'Use search_documents to find specific content',
        'Use create_document to add new documentation',
        'Use update_document_section to modify existing content'
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Failed to browse documents',
      error: message,
      fallback: 'Try using search_documents with a specific query'
    };
  }
}