/**
 * Implementation for the subagent_task tool
 * Unified tool for creating, editing, completing, and listing tasks in ad-hoc mode
 * (requires #slug for assigned subagent tasks)
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
import { type TaskHierarchicalContext } from '../../shared/task-operations.js';
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
        has_references?: boolean;
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
    document_created?: boolean;
}
/**
 * MCP tool for subagent task management with bulk operations support
 *
 * Supports bulk task operations including creation, editing, and listing in a single call.
 * Always pass operations as an array, even for single task operations.
 *
 * VALIDATION: Requires document to be in /docs/ namespace (explicit path prefix required).
 *
 * @param args - Object with document path and operations array
 * @param _state - MCP session state (unused in current implementation)
 * @returns Bulk operation results with created/edited tasks and filtered lists
 *
 * @example
 * // Single task creation (uses operations array)
 * const result = await subagentTask({
 *   document: "/docs/project/setup.md",
 *   operations: [{
 *     operation: "create",
 *     title: "Initialize Database",
 *     content: "Status: pending\n\nSet up PostgreSQL database"
 *   }]
 * });
 *
 * // Multiple operations in one call
 * const result = await subagentTask({
 *   document: "/docs/project/setup.md",
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
export declare function subagentTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<TaskBulkResponse>;
export {};
//# sourceMappingURL=subagent-task.d.ts.map