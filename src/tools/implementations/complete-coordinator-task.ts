/**
 * Implementation for the complete_coordinator_task tool
 *
 * Complete coordinator task and auto-archive if all complete
 *
 * - Completes current task with note and date
 * - Returns next task (workflow only, NO main_workflow)
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
    workflow?: WorkflowPrompt;
  };
  archived?: boolean;
  archived_to?: string;
  timestamp: string;
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
        archived_to: archiveResult.archived_to,
        timestamp: new Date().toISOString().split('T')[0] ?? new Date().toISOString()
      };
    }

    // Find next task
    const nextTaskData = await findNextAvailableTask(manager, updatedDocument, currentTask.slug);

    let nextTask: {
      slug: string;
      title: string;
      workflow?: WorkflowPrompt;
    } | undefined;

    if (nextTaskData != null) {
      const nextTaskContent = await manager.getSectionContent(documentPath, nextTaskData.slug) ?? '';
      const enrichedNext = enrichTaskWithWorkflow(
        { slug: nextTaskData.slug, title: nextTaskData.title, content: nextTaskContent, status: nextTaskData.status },
        nextTaskContent
      );

      nextTask = {
        slug: enrichedNext.slug,
        title: enrichedNext.title,
        ...('workflow' in enrichedNext && enrichedNext.workflow != null && { workflow: enrichedNext.workflow as WorkflowPrompt })
      };
    }

    return {
      completed_task: completedTaskData,
      ...(nextTask != null && { next_task: nextTask }),
      timestamp: new Date().toISOString().split('T')[0] ?? new Date().toISOString()
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

  const docsRoot = manager['docsRoot'] as string;
  const archiveDir = path.join(docsRoot, FOLDER_NAMES.ARCHIVED, FOLDER_NAMES.COORDINATOR);

  // Ensure archive directory exists
  await fs.mkdir(archiveDir, { recursive: true });

  // Generate timestamp-based archive name
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19); // 2025-10-14T15-30-45
  const archivePath = `${ARCHIVE_PREFIXES.COORDINATOR}active-${timestamp}.md`;
  const archiveFilePath = path.join(docsRoot, FOLDER_NAMES.ARCHIVED, FOLDER_NAMES.COORDINATOR, `active-${timestamp}.md`);

  // Copy document to archive
  const sourceFilePath = path.join(docsRoot, documentPath.substring(1)); // Remove leading /
  await fs.copyFile(sourceFilePath, archiveFilePath);

  // Delete original document
  await fs.unlink(sourceFilePath);

  // Invalidate cache
  manager['cache'].invalidateDocument(documentPath);

  return { archived_to: archivePath };
}
