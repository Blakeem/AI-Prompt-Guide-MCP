/**
 * Implementation for the coordinator_task tool
 * Manages sequential coordinator task lists in /coordinator/ namespace
 *
 * Sequential only - NO #slug allowed (use task reordering instead)
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import { type TaskHierarchicalContext } from '../../shared/task-operations.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
/**
 * Individual task operation result
 */
interface TaskOperationResult {
    task?: {
        slug: string;
        title: string;
        hierarchical_context?: TaskHierarchicalContext;
    };
    tasks?: Array<{
        slug: string;
        title: string;
        status: string;
        link?: string;
        referenced_documents?: HierarchicalContent[];
        hierarchical_context?: TaskHierarchicalContext;
    }>;
    count?: number;
    hierarchical_summary?: {
        by_phase: Record<string, {
            total: number;
            pending: number;
            in_progress: number;
            completed: number;
        }>;
        by_category: Record<string, {
            total: number;
            pending: number;
            in_progress?: number;
            completed?: number;
        }>;
        critical_path: string[];
    };
    next_task?: {
        slug: string;
        title: string;
        link?: string;
    };
    next_step?: string;
    error?: string;
}
/**
 * Bulk task operations response
 */
interface TaskBulkResponse {
    operations_completed: number;
    results: TaskOperationResult[];
}
/**
 * Coordinator task tool - sequential task management
 *
 * Automatically creates /coordinator/active.md if it doesn't exist
 * Validates coordinator namespace and sequential-only mode
 *
 * @param args - Tool arguments with operations array
 * @param _state - Session state (unused)
 * @param manager - Document manager
 * @returns Bulk operation results
 */
export declare function coordinatorTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<TaskBulkResponse>;
export {};
//# sourceMappingURL=coordinator-task.d.ts.map