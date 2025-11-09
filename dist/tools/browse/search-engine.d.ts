/**
 * Search operations and query processing for document discovery
 */
import type { DocumentManager } from '../../document-manager.js';
export interface SearchMatch {
    document: string;
    section: string;
    snippet: string;
    relevance: number;
}
export interface DocumentInfo {
    path: string;
    slug: string;
    title: string;
    namespace: string;
    sections?: Array<{
        slug: string;
        title: string;
        depth: number;
        parent?: string;
        hasContent: boolean;
    }>;
    section_count?: number;
    word_count?: number;
    tasks?: {
        total: number;
        completed: number;
        pending: string[];
    };
    lastModified: string;
    relevance?: number;
}
export interface SectionInfo {
    slug: string;
    title: string;
    depth: number;
    parent?: string;
    content_preview?: string;
    subsection_count: number;
    has_code_blocks: boolean;
    has_links: boolean;
}
/**
 * Perform search across documents
 * Note: This function is currently unused after refactoring browse_documents to remove search mode.
 * It's kept here for future use by search_documents tool or other potential search features.
 */
export declare function performSearch(manager: DocumentManager, query: string, pathFilter?: string): Promise<{
    documents: DocumentInfo[];
    matches: SearchMatch[];
}>;
/**
 * Get section-level structure for a document
 */
export declare function getSectionStructure(manager: DocumentManager, documentPath: string, analyzeSectionContent: (content: string) => {
    has_code_blocks: boolean;
    has_links: boolean;
    content_preview: string;
}, targetSectionSlug?: string): Promise<{
    sections: SectionInfo[];
    document_context: {
        path: string;
        title: string;
        namespace: string;
        slug: string;
        current_section?: string;
    } | null;
}>;
//# sourceMappingURL=search-engine.d.ts.map