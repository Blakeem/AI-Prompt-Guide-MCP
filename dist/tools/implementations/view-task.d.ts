/**
 * Implementation for view_task tool
 * Provides clean task viewing without stats overhead
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
/**
 * Clean response format for view_task
 */
interface ViewTaskResponse {
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
 * Execute view_task tool
 */
export declare function viewTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<ViewTaskResponse>;
export {};
//# sourceMappingURL=view-task.d.ts.map