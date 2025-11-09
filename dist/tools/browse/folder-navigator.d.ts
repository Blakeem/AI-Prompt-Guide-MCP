/**
 * Folder navigation, breadcrumb generation, and file system operations
 */
import type { DocumentManager } from '../../document-manager.js';
import type { DocumentInfo } from './search-engine.js';
export interface FolderInfo {
    name: string;
    path: string;
    namespace: string;
    documentCount: number;
    hasSubfolders: boolean;
}
/**
 * Parse section path into document path and section slug
 */
export declare function parseSectionPath(fullPath: string): {
    documentPath: string;
    sectionSlug?: string;
};
/**
 * Generate breadcrumb trail for a path (including section context)
 */
export declare function generateBreadcrumb(docPath: string): string[];
/**
 * Check if a directory exists
 */
export declare function directoryExists(dirPath: string): Promise<boolean>;
/**
 * Get folder structure at specified path
 */
export declare function getFolderStructure(manager: DocumentManager, basePath: string, targetPath: string, verbose?: boolean): Promise<{
    folders: FolderInfo[];
    documents: DocumentInfo[];
}>;
//# sourceMappingURL=folder-navigator.d.ts.map