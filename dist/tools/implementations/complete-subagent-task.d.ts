/**
 * Implementation for the complete_subagent_task tool
 * Mark subagent tasks as completed (requires #slug)
 *
 * SUBAGENT MODE:
 * - REQUIRES #slug (ad-hoc mode only)
 * - Works with /docs/ namespace
 * - No next task returned (subagents work on assigned tasks only)
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
interface CompleteSubagentTaskResult {
    completed_task: {
        slug: string;
        title: string;
        note: string;
        completed_date: string;
    };
    next_task?: {
        slug: string;
        title: string;
        link?: string;
        workflow?: {
            name: string;
            description: string;
            content: string;
            whenToUse: string;
        };
        referenced_documents?: HierarchicalContent[];
    };
}
/**
 * Complete a subagent task
 *
 * VALIDATION: Requires #slug (ad-hoc mode), enforces /docs/ namespace (explicit path prefix required)
 *
 * @param args - Tool arguments containing document path with task slug (format: /docs/path.md#task-slug)
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to completion result
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export declare function completeSubagentTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<CompleteSubagentTaskResult>;
export {};
//# sourceMappingURL=complete-subagent-task.d.ts.map