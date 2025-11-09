/**
 * Implementation for view_coordinator_task tool
 * Dedicated tool for viewing coordinator tasks from /coordinator/active.md
 *
 * This tool provides clean task viewing for coordinator tasks only.
 * For subagent tasks in /docs/ namespace, use view_subagent_task instead.
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
/**
 * Clean response format for view_coordinator_task
 * Optimized for context efficiency - no redundant fields
 */
interface ViewCoordinatorTaskResponse {
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
 * Execute view_coordinator_task tool
 *
 * @param args - Tool arguments (slug optional)
 * @param _state - Session state (unused)
 * @param manager - Document manager instance
 * @returns Promise resolving to ViewCoordinatorTaskResponse
 *
 * @example
 * // Overview mode
 * const overview = await viewCoordinatorTask({}, state, manager);
 * // Returns all coordinator tasks with minimal data
 *
 * @example
 * // Detail mode
 * const detail = await viewCoordinatorTask({ slug: "phase-1" }, state, manager);
 * // Returns full content for phase-1 task
 */
export declare function viewCoordinatorTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<ViewCoordinatorTaskResponse>;
export {};
//# sourceMappingURL=view-coordinator-task.d.ts.map