/**
 * Shared task operations layer
 *
 * Provides core CRUD operations for tasks that can be used by both
 * subagent (ad-hoc) and coordinator (sequential) task systems.
 *
 * These operations are extracted from the original task.ts, complete-task.ts,
 * and start-task.ts to eliminate duplication and provide a clean foundation
 * for the dual task system architecture.
 */
import type { DocumentManager } from '../document-manager.js';
import type { HierarchicalContent } from './reference-loader.js';
/**
 * Hierarchical context for tasks
 */
export interface TaskHierarchicalContext {
    full_path: string;
    parent_path: string;
    phase: string;
    category: string;
    task_name: string;
    depth: number;
}
/**
 * Task data structure returned by operations
 */
export interface TaskData {
    slug: string;
    title: string;
    status: string;
    link?: string;
    dependencies?: string[];
    hierarchical_context?: TaskHierarchicalContext;
    referenced_documents?: HierarchicalContent[];
    has_references?: boolean;
}
/**
 * Result of list tasks operation
 */
export interface ListTasksResult {
    tasks: TaskData[];
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
}
/**
 * Result of create task operation
 */
export interface CreateTaskResult {
    slug: string;
    title: string;
    hierarchical_context?: TaskHierarchicalContext;
}
/**
 * Result of complete task operation
 */
export interface CompleteTaskResult {
    slug: string;
    title: string;
    note: string;
    completed_date: string;
}
/**
 * Create a new task in the Tasks section
 *
 * @param manager - Document manager instance
 * @param documentPath - Path to the document
 * @param title - Task title
 * @param content - Task content (should include Status field)
 * @param referenceSlug - Optional slug to insert after (or undefined to append to Tasks section)
 * @returns Created task slug and title
 * @throws {AddressingError} When task creation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export declare function createTaskOperation(manager: DocumentManager, documentPath: string, title: string, content: string, referenceSlug?: string): Promise<CreateTaskResult>;
/**
 * Edit an existing task
 *
 * @param manager - Document manager instance
 * @param documentPath - Path to the document
 * @param taskSlug - Task slug to edit
 * @param content - New task content
 * @throws {AddressingError} When task edit fails
 */
export declare function editTaskOperation(manager: DocumentManager, documentPath: string, taskSlug: string, content: string): Promise<void>;
/**
 * List tasks from Tasks section with optional filtering
 *
 * @param manager - Document manager instance
 * @param documentPath - Path to the document
 * @param statusFilter - Optional status filter (pending, in_progress, completed, blocked)
 * @param loadReferences - Whether to load referenced documents (default: false for list operations)
 * @returns List of tasks with metadata and optional hierarchical summary
 * @throws {AddressingError} When task listing fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export declare function listTasksOperation(manager: DocumentManager, documentPath: string, statusFilter?: string, loadReferences?: boolean): Promise<ListTasksResult>;
/**
 * Complete a task by updating its status and adding completion metadata
 *
 * @param manager - Document manager instance
 * @param documentPath - Path to the document
 * @param taskSlug - Task slug to complete
 * @param note - Completion note
 * @returns Completion metadata
 * @throws {AddressingError} When task completion fails
 */
export declare function completeTaskOperation(manager: DocumentManager, documentPath: string, taskSlug: string, note: string): Promise<CompleteTaskResult>;
/**
 * Ensure Tasks section exists in document, creating it if necessary
 *
 * @param manager - Document manager instance
 * @param docPath - Path to the document
 * @throws {AddressingError} When Tasks section creation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export declare function ensureTasksSectionOperation(manager: DocumentManager, docPath: string): Promise<void>;
/**
 * Update task status with completion metadata
 *
 * Supports multiple status field formats:
 * - Bold format: `**Status:** pending`
 * - List format: `- Status: pending` or `* Status: pending`
 * - Plain format: `Status: pending`
 *
 * Preserves the original format style when updating.
 *
 * @param content - Task content containing status field
 * @param newStatus - New status value (e.g., 'completed', 'in_progress')
 * @param note - Completion note to append
 * @param completedDate - Completion date in YYYY-MM-DD format
 * @returns Updated content with new status and completion metadata
 */
export declare function updateTaskStatus(content: string, newStatus: string, note: string, completedDate: string): string;
//# sourceMappingURL=task-operations.d.ts.map