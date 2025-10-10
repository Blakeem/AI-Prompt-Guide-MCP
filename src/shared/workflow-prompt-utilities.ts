/**
 * Workflow Prompt Utilities
 *
 * Utilities for extracting, resolving, and enriching tasks with workflow prompts.
 * Supports two workflow types:
 * - Main-Workflow: Project-level methodology for entire task series
 * - Workflow: Task-specific process guidance
 */

import type { TaskViewData } from './task-view-utilities.js';
import { getWorkflowPrompt, type WorkflowPrompt } from '../prompts/workflow-prompts.js';
import { getTaskHeadings } from './task-utilities.js';
import type { DocumentManager } from '../document-manager.js';
import type { CachedDocument } from '../document-cache.js';
import { getGlobalLogger } from '../utils/logger.js';

const logger = getGlobalLogger();

/**
 * Extract workflow prompt name from task content
 * Parses "Workflow:" field from task metadata
 * Returns empty string if field exists but has no value
 *
 * @param content - Task content to parse
 * @returns Workflow name, empty string if field exists with no value, or null if not found
 */
export function extractWorkflowName(content: string): string | null {
  // Check if field exists with or without value using flexible regex
  // Use [ \t]* instead of \s* to avoid matching newlines
  const fieldRegex = /^[\s*-]+Workflow:[ \t]*(.*)$/m;
  const match = content.match(fieldRegex);

  if (match != null) {
    // Field exists - return trimmed value (may be empty string)
    const value = match[1]?.trim() ?? '';
    return value;
  }

  // Field does not exist at all
  return null;
}

/**
 * Extract main workflow prompt name from task content
 * Parses "Main-Workflow:" field from task metadata
 * Returns empty string if field exists but has no value
 *
 * @param content - Task content to parse
 * @returns Main workflow name, empty string if field exists with no value, or null if not found
 */
export function extractMainWorkflowName(content: string): string | null {
  // Check if field exists with or without value using flexible regex
  // Use [ \t]* instead of \s* to avoid matching newlines
  const fieldRegex = /^[\s*-]+Main-Workflow:[ \t]*(.*)$/m;
  const match = content.match(fieldRegex);

  if (match != null) {
    // Field exists - return trimmed value (may be empty string)
    return match[1]?.trim() ?? '';
  }

  // Field does not exist at all
  return null;
}

/**
 * Resolve and load workflow prompt by name
 * Wraps getWorkflowPrompt with error handling
 *
 * @param workflowName - Name of workflow to resolve
 * @returns WorkflowPrompt object or null if not found or error occurs
 */
export function resolveWorkflowPrompt(workflowName: string): WorkflowPrompt | null {
  // Return null for empty/invalid names
  if (workflowName == null || workflowName === '') {
    return null;
  }

  try {
    const prompt = getWorkflowPrompt(workflowName);
    return prompt ?? null;
  } catch {
    // Return null on any error (prompts not loaded, etc.)
    return null;
  }
}

/**
 * Enrich task with task-specific workflow (if specified)
 * Does NOT mutate original taskData
 *
 * @param taskData - Base task data to enrich
 * @param taskContent - Raw task content to extract workflow from
 * @returns Enriched task data with workflow field (if found)
 */
export function enrichTaskWithWorkflow(
  taskData: TaskViewData,
  taskContent: string
): TaskViewData & { workflow?: WorkflowPrompt } {
  const workflowName = extractWorkflowName(taskContent);

  // Return new object (not same reference) if no workflow field or empty value
  if (workflowName == null || workflowName === '') {
    return { ...taskData };
  }

  const workflow = resolveWorkflowPrompt(workflowName);

  // Log warning for invalid workflow names
  if (workflow == null) {
    logger.warn('Workflow prompt not found', {
      workflowName,
      taskSlug: taskData.slug
    });
    return { ...taskData };
  }

  // Return new object with workflow added (do not mutate original)
  return {
    ...taskData,
    workflow
  };
}

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
export async function enrichTaskWithMainWorkflow(
  manager: DocumentManager,
  document: CachedDocument,
  taskData: TaskViewData
): Promise<TaskViewData & { mainWorkflow?: WorkflowPrompt }> {
  try {
    // Find tasks section (slug 'tasks' or title.toLowerCase() === 'tasks')
    const tasksSection = document.headings.find(h =>
      h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
    );

    if (tasksSection == null) {
      return { ...taskData };
    }

    // Get first task using getTaskHeadings
    const taskHeadings = await getTaskHeadings(document, tasksSection);
    const firstTask = taskHeadings[0];

    if (firstTask == null) {
      return { ...taskData };
    }

    // Load first task content
    const firstTaskContent = await manager.getSectionContent(
      document.metadata.path,
      firstTask.slug
    );

    if (firstTaskContent == null) {
      return { ...taskData };
    }

    // Extract main workflow name
    const mainWorkflowName = extractMainWorkflowName(firstTaskContent);

    if (mainWorkflowName == null || mainWorkflowName === '') {
      return { ...taskData };
    }

    // Resolve main workflow
    const mainWorkflow = resolveWorkflowPrompt(mainWorkflowName);

    if (mainWorkflow == null) {
      logger.warn('Main workflow prompt not found', {
        mainWorkflowName,
        firstTaskSlug: firstTask.slug
      });
      return { ...taskData };
    }

    // Return new object with mainWorkflow added (do not mutate original)
    return {
      ...taskData,
      mainWorkflow
    };
  } catch {
    // Return new object (not same reference) on any failure
    return { ...taskData };
  }
}
