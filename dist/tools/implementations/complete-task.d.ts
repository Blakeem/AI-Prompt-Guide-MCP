/**
 * Implementation for the complete_task tool
 * Mark tasks as completed and show next available task
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
interface CompleteTaskResult {
    mode: 'sequential' | 'adhoc';
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
            whenToUse: string[];
        };
        referenced_documents?: HierarchicalContent[];
    };
    timestamp: string;
}
export declare function completeTask(args: Record<string, unknown>, _state: SessionState, manager: DocumentManager): Promise<CompleteTaskResult>;
export {};
//# sourceMappingURL=complete-task.d.ts.map