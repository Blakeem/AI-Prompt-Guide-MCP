/**
 * Section editing operations
 */
import type { DocumentManager } from '../document-manager.js';
/**
 * Helper function to perform a single section edit operation
 */
export declare function performSectionEdit(manager: DocumentManager, normalizedPath: string, sectionSlug: string, content: string, operation: string, title?: string): Promise<{
    action: 'edited' | 'created' | 'removed';
    section: string;
    depth?: number;
    removedContent?: string;
}>;
//# sourceMappingURL=section-operations.d.ts.map