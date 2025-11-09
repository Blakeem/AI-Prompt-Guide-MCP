/**
 * Implementation for view_subagent_task tool
 * Provides clean task viewing for subagent tasks in /docs/ namespace
 * For coordinator tasks, use view_coordinator_task instead
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
/**
 * Clean response format for view_subagent_task
 * Optimized for context efficiency - removed redundant fields
 */
interface ViewSubagentTaskResponse {
    tasks: Array<{
        slug: string;
        title: string;
        status: string;
        depth?: number;
        content?: string;
        parent?: string;
        linked_document?: string;
        referenced_documents?: HierarchicalContent[];
        word_count?: number;
        workflow_name?: string;
        main_workflow_name?: string;
        has_workflow?: boolean;
    }>;
}
/**
 * Execute view_subagent_task tool
 * Works with subagent tasks in /docs/ namespace only
 * For coordinator tasks, use view_coordinator_task instead
 */
export declare function viewSubagentTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<ViewSubagentTaskResponse>;
export {};
//# sourceMappingURL=view-subagent-task.d.ts.map