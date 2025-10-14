/**
 * Implementation for the start_subagent_task tool
 *
 * Signals "I'm starting work on this task" and provides FULL CONTEXT including:
 * - Task-specific workflow (if present in task metadata)
 * - Main workflow from first task (if present in first task metadata, ONLY in sequential mode)
 * - Referenced documents (hierarchical @reference loading)
 *
 * SUBAGENT MODE:
 * - REQUIRES #slug (ad-hoc mode only)
 * - Works with /docs/ namespace
 * - No main workflow injection (task workflow only)
 *
 * This tool is used for:
 * - Starting work on an assigned subagent task
 * - Resuming work after context compression
 *
 * Unlike view_task (passive inspection) or complete_subagent_task (work continuation),
 * start_subagent_task provides full workflow injection for new/resumed sessions.
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';
import { validateSubagentTaskAccess } from '../../shared/task-validation.js';
import {
  enrichTaskWithReferences,
  extractTaskField,
  type TaskViewData
} from '../../shared/task-view-utilities.js';
import {
  enrichTaskWithWorkflow,
  enrichTaskWithMainWorkflow
} from '../../shared/workflow-prompt-utilities.js';
import type { WorkflowPrompt } from '../../prompts/workflow-prompts.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
import { getTaskHeadings } from '../../shared/task-utilities.js';

/**
 * Response interface for start_subagent_task tool
 */
export interface StartSubagentTaskResponse {
  mode: 'sequential' | 'adhoc';
  document: string;
  task: {
    slug: string;
    title: string;
    content: string;
    status: string;
    full_path: string;
    workflow?: WorkflowPrompt;
    main_workflow?: WorkflowPrompt;  // Only in sequential mode
    referenced_documents?: HierarchicalContent[];
  };
}

/**
 * Start work on a subagent task with full context injection
 *
 * VALIDATION: Requires #slug (ad-hoc mode), enforces /docs/ namespace (explicit path prefix required)
 *
 * @param args - Tool arguments containing document path with task slug (format: /docs/path.md#task-slug)
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to enriched task data with full workflow context
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export async function startSubagentTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<StartSubagentTaskResponse> {
  try {
    // ===== INPUT VALIDATION AND MODE DETECTION =====
    const documentParam = ToolIntegration.validateStringParameter(args['document'], 'document');

    let mode: 'sequential' | 'adhoc';
    let docPath: string;
    let taskSlug: string | undefined;

    if (documentParam.includes('#')) {
      // Ad-hoc mode: Parse document + slug
      const parts = documentParam.split('#');
      docPath = parts[0] ?? documentParam;
      taskSlug = parts[1];
      mode = 'adhoc';

      if (taskSlug == null || taskSlug === '') {
        throw new AddressingError(
          'Task slug cannot be empty after #',
          'EMPTY_TASK_SLUG'
        );
      }
    } else {
      // Sequential mode: Document only
      docPath = documentParam;
      taskSlug = undefined;
      mode = 'sequential';
    }

    // ===== SUBAGENT-SPECIFIC VALIDATION =====
    // Enforce ad-hoc mode with #slug and /docs/ namespace
    validateSubagentTaskAccess(docPath, taskSlug);

    // ===== ADDRESS PARSING =====
    const { addresses } = ToolIntegration.validateAndParse({
      document: docPath,
      ...(taskSlug != null && { task: taskSlug })
    });

    // ===== DOCUMENT LOADING =====
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    // ===== TASK VALIDATION =====
    // Find tasks section
    const tasksSection = document.headings.find(h =>
      h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
    );

    if (tasksSection == null) {
      throw new AddressingError(
        'No tasks section found in document',
        'NO_TASKS_SECTION',
        {
          document: addresses.document.path,
          available_sections: document.headings.map(h => h.slug)
        }
      );
    }

    // ===== TASK RESOLUTION =====
    // Determine target task based on mode
    let targetTaskSlug: string;

    if (mode === 'adhoc') {
      // Ad-hoc mode: Use the provided task slug directly
      if (addresses.task == null) {
        throw new AddressingError(
          'Task address is required in ad-hoc mode',
          'MISSING_TASK_ADDRESS'
        );
      }

      const taskAddress = addresses.task;
      const tasksIndex = document.headings.findIndex(h => h.slug === tasksSection.slug);
      const taskIndex = document.headings.findIndex(h => h.slug === taskAddress.slug);

      // Check if task exists after tasks section and is deeper than tasks section
      const taskHeading = document.headings[taskIndex];
      const isUnderTasksSection = taskIndex > tasksIndex &&
        taskHeading != null &&
        taskHeading.depth > tasksSection.depth;

      if (!isUnderTasksSection) {
        // Build list of available tasks for helpful error message
        const taskHeadings = await getTaskHeadings(document, tasksSection);
        throw new AddressingError(
          `Task not found: ${taskAddress.slug}`,
          'TASK_NOT_FOUND',
          {
            document: addresses.document.path,
            task: taskAddress.slug,
            available_tasks: taskHeadings.map(h => h.slug)
          }
        );
      }

      // Check if the next heading at same or shallower depth is still under tasks section
      // This ensures we haven't gone past the tasks section boundary
      let withinTasksSection = true;
      for (let i = taskIndex + 1; i < document.headings.length; i++) {
        const nextHeading = document.headings[i];
        if (nextHeading != null && nextHeading.depth <= tasksSection.depth) {
          // Hit a heading at same or shallower depth as tasks section
          withinTasksSection = true;
          break;
        }
      }

      if (!withinTasksSection) {
        throw new AddressingError(
          `Section ${taskAddress.slug} is not under tasks section`,
          'NOT_A_TASK',
          {
            document: addresses.document.path,
            section: taskAddress.slug
          }
        );
      }

      targetTaskSlug = taskAddress.slug;
    } else {
      // Sequential mode: Find first pending/in_progress task
      const { findNextAvailableTask } = await import('../../shared/task-view-utilities.js');
      const nextTask = await findNextAvailableTask(manager, document, undefined);

      if (nextTask == null) {
        const taskHeadings = await getTaskHeadings(document, tasksSection);
        if (taskHeadings.length === 0) {
          throw new AddressingError(
            'No tasks found in document',
            'NO_TASKS_FOUND',
            {
              document: addresses.document.path
            }
          );
        }

        throw new AddressingError(
          'No pending or in_progress tasks found in document',
          'NO_AVAILABLE_TASKS',
          {
            document: addresses.document.path,
            suggestion: 'All tasks may be completed. Use view_task to check task status.'
          }
        );
      }

      targetTaskSlug = nextTask.slug;
    }

    // ===== TASK CONTENT LOADING =====
    const taskContent = await manager.getSectionContent(addresses.document.path, targetTaskSlug);
    if (taskContent == null) {
      throw new AddressingError(
        `Task content not found for ${targetTaskSlug}`,
        'TASK_CONTENT_NOT_FOUND',
        {
          document: addresses.document.path,
          task: targetTaskSlug
        }
      );
    }

    // ===== BASE TASK DATA EXTRACTION =====
    const heading = document.headings.find(h => h.slug === targetTaskSlug);
    const title = heading?.title ?? targetTaskSlug;
    const status = extractTaskField(taskContent, 'Status') ?? 'pending';

    // Build base task data
    const baseTaskData: TaskViewData = {
      slug: targetTaskSlug,
      title,
      content: taskContent,
      status
    };

    // ===== WORKFLOW ENRICHMENT =====
    // Enrich with task-specific workflow (if present in task metadata)
    const taskWithWorkflow = enrichTaskWithWorkflow(baseTaskData, taskContent);

    // Enrich with main workflow from first task (ONLY in sequential mode)
    let taskWithBothWorkflows = taskWithWorkflow;
    if (mode === 'sequential') {
      taskWithBothWorkflows = await enrichTaskWithMainWorkflow(manager, document, taskWithWorkflow);
    }
    // In ad-hoc mode, skip main workflow injection

    // ===== REFERENCE ENRICHMENT =====
    // Create task address for enrichment functions
    const taskAddressForEnrichment = addresses.task ?? {
      document: addresses.document,
      slug: targetTaskSlug,
      fullPath: `${addresses.document.path}#${targetTaskSlug}`,
      isTask: true as const,
      cacheKey: `${addresses.document.path}#${targetTaskSlug}`
    };

    // Enrich with hierarchical references from task content
    const enrichedTask = await enrichTaskWithReferences(
      manager,
      addresses.document.path,
      targetTaskSlug,
      taskContent,
      heading,
      taskAddressForEnrichment
    );

    // Merge workflow data with reference-enriched data
    // Extract workflow data with explicit typing
    const workflow: WorkflowPrompt | undefined = 'workflow' in taskWithBothWorkflows
      ? taskWithBothWorkflows.workflow as WorkflowPrompt | undefined
      : undefined;
    const mainWorkflow: WorkflowPrompt | undefined = 'mainWorkflow' in taskWithBothWorkflows
      ? taskWithBothWorkflows.mainWorkflow as WorkflowPrompt | undefined
      : undefined;

    const fullyEnriched = {
      ...enrichedTask,
      ...(workflow != null && { workflow }),
      ...(mainWorkflow != null && { mainWorkflow })
    };

    // ===== OUTPUT CONSTRUCTION =====
    return {
      mode,
      document: addresses.document.path,
      task: {
        slug: fullyEnriched.slug,
        title: fullyEnriched.title,
        content: fullyEnriched.content,
        status: fullyEnriched.status,
        full_path: fullyEnriched.fullPath ?? ToolIntegration.formatTaskPath(taskAddressForEnrichment),
        ...(workflow != null && { workflow }),
        ...(mainWorkflow != null && { main_workflow: mainWorkflow }),
        ...(fullyEnriched.referencedDocuments != null &&
          fullyEnriched.referencedDocuments.length > 0 && {
            referenced_documents: fullyEnriched.referencedDocuments
          })
      }
    };

  } catch (error) {
    // Re-throw known error types
    if (error instanceof AddressingError || error instanceof DocumentNotFoundError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new AddressingError(
      `Failed to start task: ${error instanceof Error ? error.message : String(error)}`,
      'START_TASK_FAILED',
      {
        originalError: error instanceof Error ? error.message : String(error)
      }
    );
  }
}
