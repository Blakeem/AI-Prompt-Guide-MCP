/**
 * Link context loading functionality
 */
import type { DocumentManager } from '../document-manager.js';
/**
 * Load linked document context for enhanced view_document responses
 *
 * @param manager - DocumentManager instance
 * @param documentPath - Path to the source document
 * @param sectionSlug - Optional section slug to limit scope
 * @param linkDepth - Maximum depth for recursive context loading (1-3)
 * @returns Array of linked context objects
 */
export declare function loadLinkedDocumentContext(manager: DocumentManager, documentPath: string, sectionSlug?: string, linkDepth?: number): Promise<Array<{
    source_link: string;
    document_path: string;
    section_slug?: string;
    content: string;
    namespace: string;
    title: string;
    relevance: 'primary' | 'secondary' | 'tertiary';
}>>;
//# sourceMappingURL=link-context.d.ts.map