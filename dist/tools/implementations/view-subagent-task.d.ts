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
 */
interface ViewSubagentTaskResponse {
    mode: 'overview' | 'detail';
    document: string;
    tasks: Array<{
        slug: string;
        title: string;
        content?: string;
        depth: number;
        full_path: string;
        parent?: string;
        status: string;
        linked_document?: string;
        referenced_documents?: HierarchicalContent[];
        word_count?: number;
        workflow_name?: string;
        main_workflow_name?: string;
        has_workflow: boolean;
    }>;
    summary: {
        total_tasks: number;
        by_status: Record<string, number>;
        with_links: number;
        with_references: number;
        tasks_with_workflows: number;
        tasks_with_main_workflow: number;
    };
}
/**
 * Execute view_subagent_task tool
 * Works with subagent tasks in /docs/ namespace only
 * For coordinator tasks, use view_coordinator_task instead
 */
export declare function viewSubagentTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<ViewSubagentTaskResponse>;
export {};
//# sourceMappingURL=view-subagent-task.d.ts.map