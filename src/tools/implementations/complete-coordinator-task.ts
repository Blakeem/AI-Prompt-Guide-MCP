/**
 * Implementation for the complete_coordinator_task tool
 *
 * Complete coordinator task and auto-archive if all complete
 *
 * - Completes current task with note and date
 * - Conditionally returns next task based on return_next_task parameter (default: false)
 * - When returning next task: includes task workflow only (NO main_workflow)
 * - Auto-archives when all tasks complete to /archived/coordinator/
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';
import { validateCoordinatorTaskAccess } from '../../shared/task-validation.js';
import { completeTaskOperation } from '../../shared/task-operations.js';
import { findNextAvailableTask, extractTaskField } from '../../shared/task-view-utilities.js';
import { enrichTaskWithWorkflow } from '../../shared/workflow-prompt-utilities.js';
import type { WorkflowPrompt } from '../../prompts/workflow-prompts.js';
import {
  PATH_PREFIXES,
  ARCHIVE_PREFIXES,
  FOLDER_NAMES
} from '../../shared/namespace-constants.js';

/**
 * Compact workflow metadata (without full content)
 */
export interface CompactWorkflowMetadata {
  name: string;
  description: string;
  whenToUse: string;
}

/**
 * Response interface for complete_coordinator_task tool
 */
export interface CompleteCoordinatorTaskResponse {
  completed_task: {
    slug: string;
    title: string;
    note: string;
    completed_date: string;
  };
  next_task?: {
    slug: string;
    title: string;
    workflow?: WorkflowPrompt | CompactWorkflowMetadata;
  };
  archived?: boolean;
  archived_to?: string;
}

/**
 * Complete coordinator task with auto-archive when all complete
 *
 * VALIDATION: Sequential only (no #slug allowed), enforces /coordinator/ namespace
 *
 * @param args - Tool arguments with note parameter
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to completion result with optional auto-archive
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export async function completeCoordinatorTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<CompleteCoordinatorTaskResponse> {
  try {
    // COORDINATOR-SPECIFIC: Fixed document path using explicit path prefix
    const documentPath = `${PATH_PREFIXES.COORDINATOR}active.md`;
    const note = ToolIntegration.validateStringParameter(args['note'], 'note');
    const returnNextTask = args['return_next_task'] === true; // Default: false
    const includeFullWorkflow = args['include_full_workflow'] === true; // Default: false

    // Validate coordinator access
    validateCoordinatorTaskAccess(documentPath, undefined);

    // Get document
    const document = await manager.getDocument(documentPath);
    if (document == null) {
      throw new DocumentNotFoundError(documentPath);
    }

    // Find next task (first pending/in_progress)
    const currentTask = await findNextAvailableTask(manager, document, undefined);
    if (currentTask == null) {
      throw new AddressingError(
        'No available tasks to complete',
        'NO_AVAILABLE_TASKS',
        { document: documentPath }
      );
    }

    // Complete the task using shared operation
    const completedTaskData = await completeTaskOperation(
      manager,
      documentPath,
      currentTask.slug,
      note
    );

    // Reload document (cache invalidated by complete operation)
    const updatedDocument = await manager.getDocument(documentPath);
    if (updatedDocument == null) {
      throw new DocumentNotFoundError(documentPath);
    }

    // Check if all tasks are complete
    const allTasksComplete = await checkAllTasksComplete(manager, updatedDocument);

    if (allTasksComplete) {
      // AUTO-ARCHIVE
      const archiveResult = await archiveCoordinatorDocument(manager, documentPath);

      return {
        completed_task: completedTaskData,
        archived: true,
        archived_to: archiveResult.archived_to
      };
    }

    // Conditionally fetch and return next task based on return_next_task parameter
    let nextTask: {
      slug: string;
      title: string;
      workflow?: WorkflowPrompt | CompactWorkflowMetadata;
    } | undefined;

    if (returnNextTask) {
      // Find next task
      const nextTaskData = await findNextAvailableTask(manager, updatedDocument, currentTask.slug);

      if (nextTaskData != null) {
        const nextTaskContent = await manager.getSectionContent(documentPath, nextTaskData.slug) ?? '';
        const enrichedNext = enrichTaskWithWorkflow(
          { slug: nextTaskData.slug, title: nextTaskData.title, content: nextTaskContent, status: nextTaskData.status },
          nextTaskContent
        );

        // Build next task response with conditional workflow content
        nextTask = {
          slug: enrichedNext.slug,
          title: enrichedNext.title
        };

        // Add workflow if present
        if ('workflow' in enrichedNext && enrichedNext.workflow != null) {
          const fullWorkflow = enrichedNext.workflow as WorkflowPrompt;

          if (includeFullWorkflow) {
            // Full workflow with content (3,000+ chars)
            nextTask.workflow = fullWorkflow;
          } else {
            // Compact workflow - only name, description, and whenToUse (saves 3,000+ chars)
            nextTask.workflow = {
              name: fullWorkflow.name,
              description: fullWorkflow.description,
              whenToUse: fullWorkflow.whenToUse
            };
          }
        }
      }
    }

    return {
      completed_task: completedTaskData,
      ...(nextTask != null && { next_task: nextTask })
    };

  } catch (error) {
    // Re-throw known error types
    if (error instanceof AddressingError || error instanceof DocumentNotFoundError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new AddressingError(
      `Failed to complete coordinator task: ${error instanceof Error ? error.message : String(error)}`,
      'COMPLETE_COORDINATOR_TASK_FAILED',
      {
        originalError: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

/**
 * Check if all tasks in document are completed
 */
async function checkAllTasksComplete(
  manager: DocumentManager,
  document: CachedDocument
): Promise<boolean> {
  const { getTaskHeadingsFromHeadings } = await import('../../shared/task-utilities.js');

  const tasksSection = document.headings.find(h =>
    h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
  );

  if (tasksSection == null) return true; // No tasks section = all complete

  const taskHeadings = await getTaskHeadingsFromHeadings(document, tasksSection);
  if (taskHeadings.length === 0) return true; // No tasks = all complete

  // Check each task's status
  for (const heading of taskHeadings) {
    const taskContent = await manager.getSectionContent(document.metadata.path, heading.slug) ?? '';
    const status = extractTaskField(taskContent, 'Status') ?? 'pending';

    if (status !== 'completed') {
      return false; // Found a non-completed task
    }
  }

  return true; // All tasks are completed
}

/**
 * Archive coordinator document to /archived/coordinator/
 */
async function archiveCoordinatorDocument(
  manager: DocumentManager,
  documentPath: string
): Promise<{ archived_to: string }> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Get coordinator root and archive base from manager
  const coordinatorRoot = manager['coordinatorRoot'] as string;
  const pathHandler = manager['pathHandler'] as { getArchivedBasePath: () => string | undefined };
  const archiveBase = pathHandler.getArchivedBasePath() ?? path.join(path.dirname(coordinatorRoot), FOLDER_NAMES.ARCHIVED);
  const archiveDir = path.join(archiveBase, FOLDER_NAMES.COORDINATOR);

  // Ensure archive directory exists
  await fs.mkdir(archiveDir, { recursive: true });

  // Generate timestamp-based archive name (no prefix needed - path provides context)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19); // 2025-10-14T15-30-45
  const archivePath = `${ARCHIVE_PREFIXES.COORDINATOR}${timestamp}.md`;
  const archiveFilePath = path.join(archiveDir, `${timestamp}.md`);

  // Get source file from coordinator root
  const sourceFilePath = path.join(coordinatorRoot, 'active.md');
  await fs.copyFile(sourceFilePath, archiveFilePath);

  // Delete original document
  await fs.unlink(sourceFilePath);

  // Invalidate cache
  manager['cache'].invalidateDocument(documentPath);

  return { archived_to: archivePath };
}
