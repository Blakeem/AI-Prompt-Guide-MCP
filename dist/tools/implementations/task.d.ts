/**
 * Implementation for the task tool
 * Unified tool for creating, editing, completing, and listing tasks
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
import { type TaskHierarchicalContext } from '../../shared/task-operations.js';
/**
 * Individual task operation result
 */
interface TaskOperationResult {
    operation: 'create' | 'edit' | 'list';
    status: 'created' | 'updated' | 'listed' | 'error';
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
    error?: string;
}
/**
 * Bulk task operations response
 */
interface TaskBulkResponse {
    success: boolean;
    document: string;
    operations_completed: number;
    results: TaskOperationResult[];
    timestamp: string;
}
/**
 * MCP tool for comprehensive task management with bulk operations support
 *
 * Supports bulk task operations including creation, editing, and listing in a single call.
 * Always pass operations as an array, even for single task operations.
 *
 * @param args - Object with document path and operations array
 * @param _state - MCP session state (unused in current implementation)
 * @returns Bulk operation results with created/edited tasks and filtered lists
 *
 * @example
 * // Single task creation (uses operations array)
 * const result = await task({
 *   document: "/project/setup.md",
 *   operations: [{
 *     operation: "create",
 *     title: "Initialize Database",
 *     content: "Status: pending\n\nSet up PostgreSQL database"
 *   }]
 * });
 *
 * // Multiple operations in one call
 * const result = await task({
 *   document: "/project/setup.md",
 *   operations: [
 *     { operation: "create", title: "Task 1", content: "Status: pending\n\nContent 1" },
 *     { operation: "create", title: "Task 2", content: "Status: pending\n\nContent 2" },
 *     { operation: "list" }
 *   ]
 * });
 *
 * @throws {AddressingError} When document or task addresses are invalid or not found
 * @throws {Error} When task operations fail due to content constraints or structural issues
 */
export declare function task(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<TaskBulkResponse>;
export {};
//# sourceMappingURL=task.d.ts.map