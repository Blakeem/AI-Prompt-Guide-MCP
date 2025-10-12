/**
 * Implementation for the search_documents tool
 * Full-text and regex search across all documents with structured results
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import { AddressingError, ToolIntegration } from '../../shared/addressing-system.js';
import { pathToNamespace } from '../../shared/utilities.js';
import { SEARCH_DOCUMENTS_CONSTANTS } from '../schemas/search-documents-schemas.js';

interface SearchMatch {
  section: string;
  line_number: number;
  match_text: string;
  context_before?: string;
  context_after?: string;
  type: 'heading' | 'content' | 'task';
}

interface DocumentResult {
  document: {
    path: string;
    title: string;
    namespace: string;
    slug: string;
  };
  matches: SearchMatch[];
  match_count: number;
}

interface SearchResponse {
  query: string;
  search_type: 'fulltext' | 'regex';
  scope: string | null;
  results: DocumentResult[];
  total_matches: number;
  total_documents: number;
  truncated: boolean;
  timestamp: string;
}

/**
 * Validates a numeric parameter with range constraints
 */
function validateNumericParameter(
  value: unknown,
  paramName: string,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (value == null) return defaultValue;

  const num = Number(value);

  if (!Number.isFinite(num)) {
    throw new AddressingError(
      `${paramName} must be a finite number`,
      'INVALID_PARAMETER',
      { value, paramName }
    );
  }

  if (num < min || num > max) {
    throw new AddressingError(
      `${paramName} must be between ${min} and ${max}`,
      'INVALID_PARAMETER',
      { value: num, min, max, paramName }
    );
  }

  return Math.floor(num);
}

/**
 * Detect match type based on line content
 */
function detectMatchType(line: string): 'heading' | 'content' | 'task' {
  const trimmed = line.trim();
  if (trimmed.startsWith('#')) return 'heading';
  if (/^-\s*\[[ x]\]/.test(trimmed)) return 'task';
  return 'content';
}

/**
 * Extract context lines around a match
 */
function extractContext(
  lines: string[],
  matchLineIndex: number,
  contextLines: number
): { before: string; after: string } {
  const startIndex = Math.max(0, matchLineIndex - contextLines);
  const endIndex = Math.min(lines.length - 1, matchLineIndex + contextLines);

  return {
    before: lines.slice(startIndex, matchLineIndex).join('\n'),
    after: lines.slice(matchLineIndex + 1, endIndex + 1).join('\n')
  };
}

/**
 * Find current section for a line index
 */
function getCurrentSection(lines: string[], lineIndex: number): string {
  // Walk backwards to find the most recent heading
  for (let i = lineIndex; i >= 0; i--) {
    const line = lines[i];
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (line != null && line.trim().startsWith('#')) {
      // Extract slug from heading
      const title = line.replace(/^#+\s*/, '').trim();
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  }
  return 'document-root';
}

/**
 * Perform full-text search
 */
function performFullTextSearch(content: string, query: string): boolean {
  return content.toLowerCase().includes(query.toLowerCase());
}

/**
 * Perform regex search
 */
function performRegexSearch(content: string, pattern: string): RegExpMatchArray[] | null {
  try {
    const regex = new RegExp(pattern, 'gim');
    const matches: RegExpMatchArray[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      matches.push(match);
    }

    return matches.length > 0 ? matches : null;
  } catch {
    return null;
  }
}

/**
 * Search documents implementation
 */
export async function searchDocuments(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<SearchResponse> {
  // Extract and validate parameters
  const query = args['query'] as string | undefined;

  if (query == null || query.trim() === '') {
    throw new AddressingError(
      'query parameter is required and cannot be empty',
      'MISSING_PARAMETER',
      { parameter: 'query' }
    );
  }

  const scope = (args['scope'] as string | undefined) ?? null;
  const searchType = (args['type'] as 'fulltext' | 'regex' | undefined) ?? 'fulltext';
  const includeContext = (args['include_context'] as boolean | undefined) ?? true;
  const contextLines = validateNumericParameter(
    args['context_lines'],
    'context_lines',
    SEARCH_DOCUMENTS_CONSTANTS.CONTEXT_LINES.MIN,
    SEARCH_DOCUMENTS_CONSTANTS.CONTEXT_LINES.MAX,
    SEARCH_DOCUMENTS_CONSTANTS.CONTEXT_LINES.DEFAULT
  );
  const maxResults = validateNumericParameter(
    args['max_results'],
    'max_results',
    SEARCH_DOCUMENTS_CONSTANTS.MAX_RESULTS.MIN,
    SEARCH_DOCUMENTS_CONSTANTS.MAX_RESULTS.MAX,
    SEARCH_DOCUMENTS_CONSTANTS.MAX_RESULTS.DEFAULT
  );

  // Validate search type
  if (searchType !== 'fulltext' && searchType !== 'regex') {
    throw new AddressingError(
      'type must be either "fulltext" or "regex"',
      'INVALID_PARAMETER',
      { value: searchType, parameter: 'type' }
    );
  }

  // Validate regex pattern if regex search
  if (searchType === 'regex') {
    try {
      new RegExp(query);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new AddressingError(
        `Invalid regex pattern: ${errorMessage}`,
        'INVALID_REGEX',
        { query, error: errorMessage }
      );
    }
  }

  // Validate scope path if provided
  if (scope != null && scope !== '' && !scope.startsWith('/')) {
    throw new AddressingError(
      'scope must start with /',
      'INVALID_SCOPE',
      { scope }
    );
  }

  // Get all documents
  const { documents: allDocuments } = await manager.listDocuments();

  // Apply scope filter if provided
  const documentsToSearch = (scope != null && scope !== '')
    ? allDocuments.filter(doc => {
        const docNamespace = pathToNamespace(doc.path);
        return doc.path.startsWith(scope) || docNamespace.startsWith(scope.substring(1));
      })
    : allDocuments;

  // Search through documents
  const results: DocumentResult[] = [];
  let totalMatches = 0;
  let truncated = false;

  for (const docInfo of documentsToSearch) {
    try {
      const content = await manager.getDocumentContent(docInfo.path);
      if (content == null) continue;

      const document = await manager.getDocument(docInfo.path);
      if (document == null) continue;

      const lines = content.split('\n');

      // Check if document matches query
      let documentMatches = false;
      let regexMatches: RegExpMatchArray[] | null = null;

      if (searchType === 'fulltext') {
        documentMatches = performFullTextSearch(content, query);
      } else {
        regexMatches = performRegexSearch(content, query);
        documentMatches = regexMatches !== null;
      }

      if (!documentMatches) continue;

      // Extract matches with context
      const matches: SearchMatch[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line == null) continue;

        let lineMatches = false;
        let matchText = '';

        if (searchType === 'fulltext') {
          lineMatches = line.toLowerCase().includes(query.toLowerCase());
          if (lineMatches) {
            // Extract the matching portion with some context
            const lowerLine = line.toLowerCase();
            const lowerQuery = query.toLowerCase();
            const matchIndex = lowerLine.indexOf(lowerQuery);
            const start = Math.max(0, matchIndex - 20);
            const end = Math.min(line.length, matchIndex + query.length + 20);
            matchText = (start > 0 ? '...' : '') + line.substring(start, end) + (end < line.length ? '...' : '');
          }
        } else {
          try {
            const regex = new RegExp(query, 'i');
            const match = line.match(regex);
            if (match != null) {
              lineMatches = true;
              matchText = line.trim();
            }
          } catch {
            // Invalid regex for this line, skip
          }
        }

        if (lineMatches) {
          const matchType = detectMatchType(line);
          const currentSection = getCurrentSection(lines, i);

          const matchData: SearchMatch = {
            section: `#${currentSection}`,
            line_number: i + 1,
            match_text: matchText,
            type: matchType
          };

          if (includeContext && contextLines > 0) {
            const context = extractContext(lines, i, contextLines);
            if (context.before !== '') {
              matchData.context_before = context.before;
            }
            if (context.after !== '') {
              matchData.context_after = context.after;
            }
          }

          matches.push(matchData);
          totalMatches++;

          // Check if we've hit max results
          if (totalMatches >= maxResults) {
            truncated = true;
            break;
          }
        }
      }

      if (matches.length > 0) {
        // Get document address for consistent formatting
        const { addresses } = ToolIntegration.validateAndParse({
          document: docInfo.path
        });

        const docInfo_formatted = ToolIntegration.formatDocumentInfo(addresses.document, {
          title: document.metadata.title
        });

        results.push({
          document: {
            path: addresses.document.path,
            ...docInfo_formatted
          },
          matches,
          match_count: matches.length
        });
      }

      if (truncated) break;

    } catch {
      // Skip documents that fail to load
      continue;
    }
  }

  // Get current date in ISO format (date only)
  const timestamp = new Date().toISOString().split('T')[0] ?? new Date().toISOString();

  return {
    query,
    search_type: searchType,
    scope,
    results,
    total_matches: totalMatches,
    total_documents: results.length,
    truncated,
    timestamp
  };
}
