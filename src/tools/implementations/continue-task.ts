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
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';
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
export async function continueTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<ContinueTaskResponse> {
  try {
    // ===== INPUT VALIDATION =====
    const documentPath = ToolIntegration.validateStringParameter(args['document'], 'document');
    const taskSlug = ToolIntegration.validateStringParameter(args['task'], 'task');

    // ===== ADDRESS PARSING =====
    const { addresses } = ToolIntegration.validateAndParse({
      document: documentPath,
      task: taskSlug
    });

    // Ensure task address is defined (type guard)
    if (addresses.task == null) {
      throw new AddressingError(
        'Task address is required',
        'MISSING_TASK_ADDRESS'
      );
    }

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

    // Validate task exists under tasks section (at any depth)
    // This supports both direct children (depth 3) and nested subtasks (depth 4+)
    // Type assertion: addresses.task is guaranteed to be defined after validation
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

    // ===== TASK CONTENT LOADING =====
    const taskContent = await manager.getSectionContent(addresses.document.path, taskAddress.slug);
    if (taskContent == null) {
      throw new AddressingError(
        `Task content not found for ${taskAddress.slug}`,
        'TASK_CONTENT_NOT_FOUND',
        {
          document: addresses.document.path,
          task: taskAddress.slug
        }
      );
    }

    // ===== BASE TASK DATA EXTRACTION =====
    const heading = document.headings.find(h => h.slug === taskAddress.slug);
    const title = heading?.title ?? taskAddress.slug;
    const status = extractTaskField(taskContent, 'Status') ?? 'pending';
    const priority = extractTaskField(taskContent, 'Priority') ?? 'medium';

    // Build base task data
    const baseTaskData: TaskViewData = {
      slug: taskAddress.slug,
      title,
      content: taskContent,
      status,
      priority
    };

    // ===== WORKFLOW ENRICHMENT =====
    // Enrich with task-specific workflow (if present in task metadata)
    const taskWithWorkflow = enrichTaskWithWorkflow(baseTaskData, taskContent);

    // Enrich with main workflow from first task (if present in first task metadata)
    const taskWithBothWorkflows = await enrichTaskWithMainWorkflow(manager, document, taskWithWorkflow);

    // ===== REFERENCE ENRICHMENT =====
    // Enrich with hierarchical references from task content
    const enrichedTask = await enrichTaskWithReferences(
      manager,
      addresses.document.path,
      taskAddress.slug,
      taskContent,
      heading,
      taskAddress
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
      document: addresses.document.path,
      task: {
        slug: fullyEnriched.slug,
        title: fullyEnriched.title,
        content: fullyEnriched.content,
        status: fullyEnriched.status,
        priority: fullyEnriched.priority ?? 'medium',
        full_path: fullyEnriched.fullPath ?? ToolIntegration.formatTaskPath(taskAddress),
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
      `Failed to continue task: ${error instanceof Error ? error.message : String(error)}`,
      'CONTINUE_TASK_FAILED',
      {
        originalError: error instanceof Error ? error.message : String(error)
      }
    );
  }
}
