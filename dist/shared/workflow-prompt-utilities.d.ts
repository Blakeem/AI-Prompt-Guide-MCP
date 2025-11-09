/**
 * Workflow Prompt Utilities
 *
 * Utilities for extracting, resolving, and enriching tasks with workflow prompts.
 * Supports two workflow types:
 * - Main-Workflow: Project-level methodology for entire task series
 * - Workflow: Task-specific process guidance
 */
import type { TaskViewData } from './task-view-utilities.js';
import { type WorkflowPrompt } from '../prompts/workflow-prompts.js';
import type { DocumentManager } from '../document-manager.js';
import type { CachedDocument } from '../document-cache.js';
/**
 * Extract workflow prompt name from task content
 * Parses "Workflow:" field from task metadata
 * Returns empty string if field exists but has no value
 *
 * @param content - Task content to parse
 * @returns Workflow name, empty string if field exists with no value, or null if not found
 */
export declare function extractWorkflowName(content: string): string | null;
/**
 * Extract main workflow prompt name from task content
 * Parses "Main-Workflow:" field from task metadata
 * Returns empty string if field exists but has no value
 *
 * @param content - Task content to parse
 * @returns Main workflow name, empty string if field exists with no value, or null if not found
 */
export declare function extractMainWorkflowName(content: string): string | null;
/**
 * Resolve and load workflow prompt by name
 * Wraps getWorkflowPrompt with error handling
 *
 * @param workflowName - Name of workflow to resolve
 * @returns WorkflowPrompt object or null if not found or error occurs
 */
export declare function resolveWorkflowPrompt(workflowName: string): WorkflowPrompt | null;
/**
 * Enrich task with task-specific workflow (if specified)
 * Does NOT mutate original taskData
 *
 * @param taskData - Base task data to enrich
 * @param taskContent - Raw task content to extract workflow from
 * @returns Enriched task data with workflow field (if found)
 */
export declare function enrichTaskWithWorkflow(taskData: TaskViewData, taskContent: string): TaskViewData & {
    workflow?: WorkflowPrompt;
};
/**
 * Enrich task with main workflow from first task in series
 * Locates the Tasks section, finds the first task, extracts Main-Workflow field,
 * and resolves the workflow prompt.
 * Does NOT mutate original taskData
 *
 * @param manager - Document manager for loading task content
 * @param document - Document containing the task
 * @param taskData - Base task data to enrich
 * @returns Promise resolving to enriched task data with mainWorkflow field (if found)
 */
export declare function enrichTaskWithMainWorkflow(manager: DocumentManager, document: CachedDocument, taskData: TaskViewData): Promise<TaskViewData & {
    mainWorkflow?: WorkflowPrompt;
}>;
//# sourceMappingURL=workflow-prompt-utilities.d.ts.map