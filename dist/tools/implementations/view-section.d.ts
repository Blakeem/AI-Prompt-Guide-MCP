/**
 * Implementation for view_section tool
 * Provides clean section viewing without stats overhead
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
/**
 * Enhanced response format for view_section with hierarchical support
 * Mode is deterministic from input (has # = detail, no # = overview)
 * Document path is already known by caller from their input
 */
interface ViewSectionResponse {
    sections: Array<{
        slug: string;
        title: string;
        content?: string;
        depth: number;
        parent?: string;
        word_count?: number;
        links?: string[];
    }>;
}
/**
 * Execute view_section tool
 */
export declare function viewSection(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<ViewSectionResponse>;
export {};
//# sourceMappingURL=view-section.d.ts.map