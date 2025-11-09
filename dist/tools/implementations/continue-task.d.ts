/**
 * Implementation for the continue_task tool
 *
 * Signals "I'm starting work on this task" and provides FULL CONTEXT including:
 * - Task-specific workflow (if present in task metadata)
 * - Main workflow from first task (if present in first task metadata)
 * - Referenced documents (hierarchical @reference loading)
 *
 * This tool is used for:
 * - Starting work on a task (new session)
 * - Resuming work after context compression
 *
 * Unlike view_task (passive inspection) or complete_task (work continuation),
 * continue_task provides full workflow injection for new/resumed sessions.
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { WorkflowPrompt } from '../../prompts/workflow-prompts.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
/**
 * Response interface for continue_task tool
 */
export interface ContinueTaskResponse {
    document: string;
    task: {
        slug: string;
        title: string;
        content: string;
        status: string;
        priority: string;
        full_path: string;
        workflow?: WorkflowPrompt;
        main_workflow?: WorkflowPrompt;
        referenced_documents?: HierarchicalContent[];
    };
}
/**
 * Continue work on a task with full context injection
 *
 * @param args - Tool arguments containing document path and task slug
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to enriched task data with full workflow context
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export declare function continueTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<ContinueTaskResponse>;
//# sourceMappingURL=continue-task.d.ts.map