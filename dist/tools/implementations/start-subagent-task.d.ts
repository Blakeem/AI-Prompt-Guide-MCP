/**
 * Implementation for the start_subagent_task tool
 *
 * Signals "I'm starting work on this task" and provides FULL CONTEXT including:
 * - Task-specific workflow (if present in task metadata)
 * - Referenced documents (hierarchical @reference loading)
 *
 * AD-HOC MODE ONLY:
 * - REQUIRES #slug (format: /docs/path.md#task-slug)
 * - Works exclusively with /docs/ namespace
 * - Task workflow only (NO main workflow injection)
 *
 * This tool is used for:
 * - Starting work on an assigned subagent task
 * - Resuming work after context compression
 *
 * Unlike view_subagent_task (passive inspection) or complete_subagent_task (work continuation),
 * start_subagent_task provides full workflow injection for new/resumed sessions.
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { WorkflowPrompt } from '../../prompts/workflow-prompts.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
/**
 * Response interface for start_subagent_task tool
 * Ad-hoc mode only - task workflow only, NO main workflow
 */
export interface StartSubagentTaskResponse {
    document: string;
    task: {
        slug: string;
        title: string;
        content: string;
        status: string;
        full_path: string;
        workflow?: WorkflowPrompt;
        referenced_documents?: HierarchicalContent[];
    };
}
/**
 * Start work on a subagent task with full context injection
 *
 * AD-HOC MODE ONLY: Requires #slug, enforces /docs/ namespace
 *
 * @param args - Tool arguments containing document path with task slug (format: /docs/path.md#task-slug)
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to enriched task data with task workflow and references (NO main workflow)
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export declare function startSubagentTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<StartSubagentTaskResponse>;
//# sourceMappingURL=start-subagent-task.d.ts.map