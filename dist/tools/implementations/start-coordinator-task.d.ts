/**
 * Implementation for the start_coordinator_task tool
 *
 * Start work on coordinator task (sequential mode ONLY)
 *
 * - Finds next pending task automatically
 * - Injects Main-Workflow from first task
 * - Loads task-specific Workflow
 * - Loads hierarchical references
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { WorkflowPrompt } from '../../prompts/workflow-prompts.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
/**
 * Response interface for start_coordinator_task tool
 */
export interface StartCoordinatorTaskResponse {
    document: string;
    task: {
        slug: string;
        title: string;
        content: string;
        status: string;
        full_path: string;
        workflow?: WorkflowPrompt;
        main_workflow?: WorkflowPrompt;
        referenced_documents?: HierarchicalContent[];
    };
}
/**
 * Start work on coordinator task with optional context injection
 *
 * VALIDATION: Sequential only (no #slug allowed), enforces /coordinator/ namespace
 *
 * @param args - Tool arguments (return_task_context optional, defaults to false)
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to task data (minimal or enriched based on return_task_context)
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export declare function startCoordinatorTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<StartCoordinatorTaskResponse>;
//# sourceMappingURL=start-coordinator-task.d.ts.map