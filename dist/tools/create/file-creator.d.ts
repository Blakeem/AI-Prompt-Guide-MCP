/**
 * File creator for create-document pipeline
 * Handles Stage 1 (Creation) file system operations and finalization
 */
import type { DocumentManager } from '../../document-manager.js';
/**
 * Document creation result - simplified response
 */
export interface DocumentCreationResult {
    success: boolean;
    document: string;
    slug: string;
    next_step: string;
}
/**
 * File creation error result
 */
export interface FileCreationError {
    error: string;
    details: string;
    provided_parameters: {
        namespace: string;
        title: string;
        overview: string;
    };
}
/**
 * Create document with structured content
 */
export declare function createDocumentFile(namespace: string, title: string, overview: string, manager: DocumentManager, content: string, docPath: string, slug: string): Promise<DocumentCreationResult | FileCreationError>;
/**
 * Validate document creation prerequisites
 */
export declare function validateCreationPrerequisites(namespace: string, title: string, overview: string, _manager: DocumentManager): Promise<string | null>;
//# sourceMappingURL=file-creator.d.ts.map