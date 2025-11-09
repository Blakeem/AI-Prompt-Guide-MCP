/**
 * Implementation for the search_documents tool
 * Full-text and regex search across all documents with structured results
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
interface SearchMatch {
    section: string;
    line_number: number;
    match_text: string;
    context_before?: string;
    context_after?: string;
    type: 'task' | 'section';
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
    results: DocumentResult[];
    total_matches: number;
    truncated: boolean;
}
/**
 * Search documents implementation
 */
export declare function searchDocuments(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<SearchResponse>;
export {};
//# sourceMappingURL=search-documents.d.ts.map