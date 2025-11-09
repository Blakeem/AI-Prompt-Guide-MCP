/**
 * Implementation for the browse_documents tool
 * Unified browsing and searching with namespace awareness
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import { type FolderInfo, type DocumentInfo, type SectionInfo, type RelatedDocuments } from '../browse/index.js';
interface BrowseResponse {
    path?: string;
    structure: {
        folders: FolderInfo[];
        documents: DocumentInfo[];
    };
    document_context?: {
        path: string;
        title: string;
        namespace: string;
        slug: string;
        current_section?: string;
    };
    sections?: SectionInfo[];
    relatedTasks?: Array<{
        taskId: string;
        title: string;
        status: string;
    }>;
    related_documents?: RelatedDocuments;
    breadcrumb?: string[];
    totalItems: number;
}
/**
 * Browse documents implementation with dependency injection
 */
export declare function browseDocuments(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<BrowseResponse>;
export {};
//# sourceMappingURL=browse-documents.d.ts.map