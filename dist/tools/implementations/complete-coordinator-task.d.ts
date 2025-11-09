/**
 * Implementation for the complete_coordinator_task tool
 *
 * Complete coordinator task and auto-archive if all complete
 *
 * - Completes current task with note and date
 * - Conditionally returns next task based on return_next_task parameter (default: false)
 * - When returning next task: includes task workflow only (NO main_workflow)
 * - Auto-archives when all tasks complete to /archived/coordinator/
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { WorkflowPrompt } from '../../prompts/workflow-prompts.js';
/**
 * Compact workflow metadata (without full content)
 */
export interface CompactWorkflowMetadata {
    name: string;
    description: string;
    whenToUse: string;
}
/**
 * Response interface for complete_coordinator_task tool
 */
export interface CompleteCoordinatorTaskResponse {
    completed_task: {
        slug: string;
        title: string;
        note: string;
        completed_date: string;
    };
    next_task?: {
        slug: string;
        title: string;
        workflow?: WorkflowPrompt | CompactWorkflowMetadata;
    };
    archived?: boolean;
    archived_to?: string;
}
/**
 * Complete coordinator task with auto-archive when all complete
 *
 * VALIDATION: Sequential only (no #slug allowed), enforces /coordinator/ namespace
 *
 * @param args - Tool arguments with note parameter
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to completion result with optional auto-archive
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export declare function completeCoordinatorTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<CompleteCoordinatorTaskResponse>;
//# sourceMappingURL=complete-coordinator-task.d.ts.map