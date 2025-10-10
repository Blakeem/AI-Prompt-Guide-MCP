/**
 * Implementation for view_task tool
 * Provides clean task viewing without stats overhead
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
  calculateTaskSummary,
  type TaskViewData
} from '../../shared/task-view-utilities.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
import { extractWorkflowName, extractMainWorkflowName } from '../../shared/workflow-prompt-utilities.js';

/**
 * Clean response format for view_task
 */
interface ViewTaskResponse {
  document: string;
  tasks: Array<{
    slug: string;
    title: string;
    content: string;
    depth: number;
    full_path: string;
    parent?: string;
    status: string;
    priority: string;
    linked_document?: string;
    referenced_documents?: HierarchicalContent[];
    word_count: number;
    workflow_name?: string;
    main_workflow_name?: string;
    has_workflow: boolean;
  }>;
  summary: {
    total_tasks: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    with_links: number;
    with_references: number;
    tasks_with_workflows: number;
    tasks_with_main_workflow: number;
  };
}

/**
 * Execute view_task tool
 */
export async function viewTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<ViewTaskResponse> {

  // Import helper functions (now handled by standardized validation)
  // const { parseTasks, validateTaskCount } = await import('../schemas/view-task-schemas.js');

  // Validate required parameters using standardized utilities
  const documentPath = ToolIntegration.validateDocumentParameter(args['document']);
  const tasks = ToolIntegration.validateArrayParameter(args['task'], 'task');

  // Validate count using standardized utility
  ToolIntegration.validateCountLimit(tasks, 10, 'tasks');

  // Use addressing system for document validation
  const { addresses } = ToolIntegration.validateAndParse({
    document: documentPath,
    // We don't use task here because we need to handle multiple tasks manually
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

    // Format for view-task specific response structure
    const taskData: ViewTaskResponse['tasks'][0] = {
      slug: enrichedTask.slug,
      title: enrichedTask.title,
      content: enrichedTask.content,
      depth: enrichedTask.depth ?? heading.depth,
      full_path: enrichedTask.fullPath ?? ToolIntegration.formatTaskPath(taskAddr),
      status: enrichedTask.status,
      priority: enrichedTask.priority ?? 'medium',
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
  const processedTasks: ViewTaskResponse['tasks'] = [];
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

  // Calculate summary statistics using shared utility
  const taskViewData: TaskViewData[] = processedTasks.map(task => {
    const viewData: TaskViewData = {
      slug: task.slug,
      title: task.title,
      content: task.content,
      status: task.status
    };

    // Only add priority if it's not the default 'medium'
    if (task.priority !== 'medium') {
      viewData.priority = task.priority;
    }

    // Only add optional fields if they exist
    if (task.linked_document != null) {
      viewData.linkedDocument = task.linked_document;
    }

    if (task.referenced_documents != null && task.referenced_documents.length > 0) {
      viewData.referencedDocuments = task.referenced_documents;
    }

    return viewData;
  });

  const baseSummary = calculateTaskSummary(taskViewData);

  // Calculate workflow-specific counts
  const tasksWithWorkflows = processedTasks.filter(task => task.has_workflow).length;
  const tasksWithMainWorkflow = processedTasks.filter(task => task.main_workflow_name != null).length;

  return {
    document: addresses.document.path,
    tasks: processedTasks,
    summary: {
      ...baseSummary,
      tasks_with_workflows: tasksWithWorkflows,
      tasks_with_main_workflow: tasksWithMainWorkflow
    }
  };
}

// Utility functions moved to shared/task-view-utilities.ts to eliminate duplication