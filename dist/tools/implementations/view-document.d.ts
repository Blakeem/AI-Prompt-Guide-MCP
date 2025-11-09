/**
 * Enhanced view_document tool implementation with namespace support and linked document context loading
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
/**
 * Enhanced response format for view_document (supports multiple documents)
 */
interface ViewDocumentResponse {
    documents: Array<{
        path: string;
        slug: string;
        title: string;
        namespace: string;
        sections: Array<{
            slug: string;
            title: string;
            depth: number;
        }>;
        documentLinks: {
            total: number;
            internal: number;
            external: number;
            broken: number;
            sectionsWithoutLinks: string[];
        };
        tasks?: {
            total: number;
            completed: number;
            pending: number;
            sections_with_tasks: string[];
        };
        lastModified: string;
        wordCount: number;
        headingCount: number;
    }>;
    summary: {
        total_documents: number;
        total_sections: number;
        total_words: number;
        total_tasks?: number;
    };
    linked_context?: Array<{
        source_link: string;
        document_path: string;
        section_slug?: string;
        content: string;
        namespace: string;
        title: string;
        relevance: 'primary' | 'secondary' | 'tertiary';
    }>;
}
/**
 * MCP tool for enhanced document viewing with comprehensive metadata and linked document context
 *
 * Provides detailed document inspection including content, structure analysis, statistics,
 * and automatic loading of linked document context. Supports both single and multiple document viewing.
 *
 * @param args - Parameters object containing document path(s) and viewing options
 * @param _state - MCP session state (unused in current implementation)
 * @returns Enhanced document information with metadata, content, statistics, and linked context
 *
 * @example
 * // Single document view
 * const result = await viewDocument({
 *   document: "/docs/api/authentication.md"
 * });
 *
 * // Multiple documents with linked context loading
 * const result = await viewDocument({
 *   documents: ["/docs/api/auth.md", "/docs/api/users.md"],
 *   include_linked_context: true
 * });
 *
 * // Access comprehensive document information
 * console.log(result.documents[0].title);
 * console.log(result.documents[0].statistics.word_count);
 * console.log(result.documents[0].headings.length);
 *
 * @throws {DocumentNotFoundError} When documents cannot be loaded
 */
export declare function viewDocument(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<ViewDocumentResponse>;
export {};
//# sourceMappingURL=view-document.d.ts.map