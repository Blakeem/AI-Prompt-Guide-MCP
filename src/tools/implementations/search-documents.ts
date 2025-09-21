/**
 * Implementation for the search_documents tool
 */

import type { SessionState } from '../../session/types.js';
import { getDocumentManager } from '../../shared/utilities.js';

export async function searchDocuments(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<unknown> {
  try {
    const manager = await getDocumentManager();
    const query = (args['query'] as string) ?? '';
    const pathFilter = args['path_filter'] as string | undefined;
    const limit = Math.max(1, Math.min(50, Number(args['limit']) || 10));

    if (query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const results = await manager.searchDocuments(query, {
      searchIn: ['title', 'headings', 'content', 'code'],
      fuzzy: true,
      boost: {
        title: 2.0,
        headings: 1.5,
        code: 1.2
      },
      highlight: true,
      groupByDocument: true
    });

    // Apply path filter if specified
    const filteredResults = (pathFilter != null && pathFilter !== '')
      ? results.filter(r => r.documentPath.startsWith(pathFilter))
      : results;

    const limitedResults = filteredResults.slice(0, limit);

    return {
      success: true,
      message: `Found ${limitedResults.length} matching documents`,
      query,
      pathFilter,
      results: limitedResults.map(result => ({
        document: {
          path: result.documentPath,
          title: result.documentTitle
        },
        matches: result.matches.map(match => ({
          type: match.type,
          section: match.slug,
          snippet: match.snippet,
          relevance: Math.round(match.score * 10) / 10
        }))
      })),
      totalMatches: filteredResults.length,
      suggestions: limitedResults.length === 0 ? [
        'Try broader search terms',
        'Check spelling and try synonyms',
        'Use browse_documents to explore available content'
      ] : []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      JSON.stringify({
        code: -32603,
        message: 'Search failed',
        data: {
          reason: 'SEARCH_ERROR',
          details: message,
          query: args['query'],
        },
      })
    );
  }
}