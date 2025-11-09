/**
 * Implementation for view_coordinator_task tool
 * Dedicated tool for viewing coordinator tasks from /coordinator/active.md
 *
 * This tool provides clean task viewing for coordinator tasks only.
 * For subagent tasks in /docs/ namespace, use view_subagent_task instead.
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  ToolIntegration,
  DocumentNotFoundError,
  AddressingError,
  parseTaskAddress,
  type TaskAddress
} from '../../shared/addressing-system.js';
import { getTaskHeadings } from '../../shared/task-utilities.js';
import {
  enrichTaskWithReferences,
  extractTaskMetadata
} from '../../shared/task-view-utilities.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
import { extractWorkflowName, extractMainWorkflowName } from '../../shared/workflow-prompt-utilities.js';
import { VIEW_COORDINATOR_TASK_CONSTANTS } from '../schemas/view-coordinator-task-schemas.js';

/**
 * Clean response format for view_coordinator_task
 * Optimized for context efficiency - no redundant fields
 */
interface ViewCoordinatorTaskResponse {
  tasks: Array<{
    slug: string;
    title: string;
    status: string;
    depth?: number;  // Only in detail mode
    content?: string;  // Only in detail mode
    parent?: string;
    linked_document?: string;
    referenced_documents?: HierarchicalContent[];
    word_count?: number;  // Only in detail mode
    workflow_name?: string;
    main_workflow_name?: string;
    has_workflow?: boolean;  // Only in detail mode
  }>;
}

/**
 * Execute view_coordinator_task tool
 *
 * @param args - Tool arguments (slug optional)
 * @param _state - Session state (unused)
 * @param manager - Document manager instance
 * @returns Promise resolving to ViewCoordinatorTaskResponse
 *
 * @example
 * // Overview mode
 * const overview = await viewCoordinatorTask({}, state, manager);
 * // Returns all coordinator tasks with minimal data
 *
 * @example
 * // Detail mode
 * const detail = await viewCoordinatorTask({ slug: "phase-1" }, state, manager);
 * // Returns full content for phase-1 task
 */
export async function viewCoordinatorTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<ViewCoordinatorTaskResponse> {

  // Fixed path for coordinator tasks
  const docPath = VIEW_COORDINATOR_TASK_CONSTANTS.COORDINATOR_PATH;

  // Mode Detection: Check if slug parameter provided
  let mode: 'overview' | 'detail';
  let taskSlugs: string[] | undefined;

  if (args['slug'] != null) {
    // Detail mode: slug(s) provided
    const slugParam = ToolIntegration.validateStringParameter(args['slug'], 'slug');
    mode = 'detail';

    if (slugParam === '') {
      throw new AddressingError(
        'Task slug cannot be empty',
        'EMPTY_TASK_SLUG'
      );
    }

    // Support comma-separated slugs: phase-1,phase-2,phase-3
    taskSlugs = slugParam.split(',').map(s => s.trim()).filter(s => s !== '');

    if (taskSlugs.length === 0) {
      throw new AddressingError(
        'At least one task slug required in detail mode',
        'NO_TASK_SLUGS'
      );
    }

    // Validate count using standardized utility
    ToolIntegration.validateCountLimit(taskSlugs, VIEW_COORDINATOR_TASK_CONSTANTS.MAX_TASKS, 'tasks');
  } else {
    // Overview mode: No slug provided
    taskSlugs = undefined;
    mode = 'overview';
  }

  // Use addressing system for document validation
  const { addresses } = ToolIntegration.validateAndParse({
    document: docPath
  });

  // Get document
  const document = await manager.getDocument(addresses.document.path);
  if (document == null) {
    throw new DocumentNotFoundError(addresses.document.path);
  }

  // Find tasks section (consistent with task.ts)
  const tasksSection = document.headings.find(h =>
    h.slug === 'tasks' ||
    h.title.toLowerCase() === 'tasks'
  );

  if (tasksSection == null) {
    throw new AddressingError(`No tasks section found in document: ${addresses.document.path}`, 'NO_TASKS_SECTION', {
      document: addresses.document.path
    });
  }

  // Handle Overview Mode: Return all tasks with minimal data (no content)
  if (mode === 'overview') {
    const taskHeadings = await getTaskHeadings(document, tasksSection);

    // Process all tasks with minimal data
    const overviewTasks = await Promise.all(
      taskHeadings.map(async (heading) => {
        const content = await manager.getSectionContent(addresses.document.path, heading.slug) ?? '';
        const metadata = extractTaskMetadata(content);

        return {
          slug: heading.slug,
          title: heading.title,
          status: metadata.status
        };
      })
    );

    return {
      tasks: overviewTasks
    };
  }

  // Detail Mode: Process specified tasks with full content
  // At this point we're in detail mode, so taskSlugs must be defined
  if (taskSlugs == null) {
    throw new AddressingError(
      'Internal error: taskSlugs undefined in detail mode',
      'INTERNAL_ERROR'
    );
  }
  const tasks = taskSlugs;

  // Parse and validate all tasks using addressing system
  // Use Promise.allSettled for non-critical view operations to handle partial failures gracefully
  const taskAddressResults = await Promise.allSettled(tasks.map(taskSlug => {
    try {
      return parseTaskAddress(taskSlug, addresses.document.path);
    } catch (error) {
      if (error instanceof AddressingError) {
        const errorResponse = ToolIntegration.formatHierarchicalError(error, 'Check task path format and hierarchical structure');
        throw new AddressingError(errorResponse.error, error.code, errorResponse.context as Record<string, unknown> | undefined);
      }
      throw new AddressingError(`Invalid task reference: ${taskSlug}`, 'INVALID_TASK', { taskSlug });
    }
  }));

  // Separate successful addresses from failures for graceful handling
  const taskAddresses: TaskAddress[] = [];
  const failedTasks: string[] = [];

  taskAddressResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      taskAddresses.push(result.value);
    } else {
      const taskSlug = tasks[index];
      if (taskSlug != null) {
        failedTasks.push(taskSlug);
      }
    }
  });

  // If all tasks failed, throw the first error to maintain backward compatibility
  if (taskAddresses.length === 0 && failedTasks.length > 0) {
    const firstResult = taskAddressResults[0];
    if (firstResult?.status === 'rejected') {
      throw firstResult.reason;
    }
  }

  // Import task identification logic from addressing system
  const { isTaskSection } = await import('../../shared/addressing-system.js');

  // Use getTaskHeadings from shared utilities for consistent task identification
  const taskHeadings = await getTaskHeadings(document, tasksSection);

  // Validate all requested tasks exist and are actual tasks
  for (const taskAddr of taskAddresses) {
    const taskExists = taskHeadings.some(h => h.slug === taskAddr.slug);
    if (!taskExists) {
      // Get available tasks for error message (use same logic as task.ts)
      const availableTasks = taskHeadings.map(h => h.slug).join(', ');
      throw new AddressingError(
        `Task not found: ${taskAddr.slug}. Available tasks: ${availableTasks}`,
        'TASK_NOT_FOUND',
        { taskSlug: taskAddr.slug, document: addresses.document.path }
      );
    }

    // Validate this is actually a task using addressing system logic
    const compatibleDocument = {
      headings: document.headings.map(h => ({
        slug: h.slug,
        title: h.title,
        depth: h.depth
      }))
    };
    const isTask = await isTaskSection(taskAddr.slug, compatibleDocument);
    if (!isTask) {
      throw new AddressingError(
        `Section ${taskAddr.slug} is not a task (not under tasks section)`,
        'NOT_A_TASK',
        { taskSlug: taskAddr.slug, tasksSection: tasksSection.slug }
      );
    }
  }

  // Extract main workflow name from first task (if present)
  let mainWorkflowName: string | null = null;
  const firstTask = taskHeadings[0];
  if (firstTask != null) {
    const firstTaskContent = await manager.getSectionContent(addresses.document.path, firstTask.slug);
    if (firstTaskContent != null) {
      const extractedMainWorkflow = extractMainWorkflowName(firstTaskContent);
      if (extractedMainWorkflow != null && extractedMainWorkflow !== '') {
        mainWorkflowName = extractedMainWorkflow;
      }
    }
  }

  // Process each task using shared utilities with Promise.allSettled for graceful partial failure handling
  const taskProcessingResults = await Promise.allSettled(taskAddresses.map(async taskAddr => {
    const heading = document.headings.find(h => h.slug === taskAddr.slug);
    if (heading == null) {
      throw new AddressingError(
        `Task not found: ${taskAddr.slug}`,
        'TASK_NOT_FOUND',
        { taskSlug: taskAddr.slug, document: addresses.document.path }
      );
    }

    // Get task content using the normalized slug
    const content = await manager.getSectionContent(addresses.document.path, taskAddr.slug) ?? '';

    // Use shared enrichment function for consistent processing
    const enrichedTask = await enrichTaskWithReferences(
      manager,
      addresses.document.path,
      taskAddr.slug,
      content,
      heading,
      taskAddr
    );

    // Extract workflow name from task content
    const workflowName = extractWorkflowName(content);
    // Workflow field exists and has a non-empty value
    const hasWorkflow = workflowName != null && workflowName !== '';

    // Format for view-coordinator-task specific response structure
    const taskData: ViewCoordinatorTaskResponse['tasks'][0] = {
      slug: enrichedTask.slug,
      title: enrichedTask.title,
      content: enrichedTask.content,
      depth: enrichedTask.depth ?? heading.depth,
      status: enrichedTask.status,
      word_count: enrichedTask.wordCount ?? 0,
      has_workflow: hasWorkflow
    };

    // Add optional workflow name (only if present and non-empty)
    if (hasWorkflow) {
      taskData.workflow_name = workflowName;
    }

    // Add main workflow name (only if present and non-empty)
    if (mainWorkflowName != null && mainWorkflowName !== '') {
      taskData.main_workflow_name = mainWorkflowName;
    }

    // Add optional fields
    if (enrichedTask.parent != null) {
      taskData.parent = enrichedTask.parent;
    }

    if (enrichedTask.linkedDocument != null) {
      taskData.linked_document = enrichedTask.linkedDocument;
    }

    if (enrichedTask.referencedDocuments != null && enrichedTask.referencedDocuments.length > 0) {
      taskData.referenced_documents = enrichedTask.referencedDocuments;
    }

    return taskData;
  }));

  // Separate successful tasks from failures
  const processedTasks: ViewCoordinatorTaskResponse['tasks'] = [];
  const processingErrors: { taskSlug: string; error: Error }[] = [];

  taskProcessingResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      processedTasks.push(result.value);
    } else {
      processingErrors.push({
        taskSlug: taskAddresses[index]?.slug ?? failedTasks[0] ?? 'unknown',
        error: result.reason
      });
    }
  });

  // If all tasks failed to process, throw the first error for backward compatibility
  if (processedTasks.length === 0 && processingErrors.length > 0) {
    const firstError = processingErrors[0];
    if (firstError != null) {
      throw firstError.error;
    }
  }

  return {
    tasks: processedTasks
  };
}
