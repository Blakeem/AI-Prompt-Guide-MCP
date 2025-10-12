/**
 * Implementation for the complete_task tool
 * Mark tasks as completed and show next available task
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import { performSectionEdit } from '../../shared/utilities.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';
import {
  extractTaskTitle,
  findNextAvailableTask
} from '../../shared/task-view-utilities.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
import { enrichTaskWithWorkflow } from '../../shared/workflow-prompt-utilities.js';

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

    // Task-specific workflow ONLY (no main workflow)
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

export async function completeTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<CompleteTaskResult> {
  try {

    // Mode Detection: Parse document parameter to detect mode
    const documentParam = ToolIntegration.validateStringParameter(args['document'], 'document');
    const note = ToolIntegration.validateStringParameter(args['note'], 'note');

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

    // Use addressing system for validation and parsing
    const { addresses } = ToolIntegration.validateAndParse({
      document: docPath,
      ...(taskSlug != null && { task: taskSlug })
    });

    // Get document and validate existence
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    // Determine target task based on mode
    let targetTaskSlug: string;

    if (mode === 'adhoc') {
      // Ad-hoc mode: Use the provided task slug
      if (addresses.task == null) {
        throw new AddressingError('Task address required for ad-hoc mode', 'MISSING_TASK');
      }
      targetTaskSlug = addresses.task.slug;
    } else {
      // Sequential mode: Find next available task
      const nextTask = await findNextAvailableTask(manager, document, undefined);
      if (nextTask == null) {
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

    // Get current task content using target task slug
    const currentContent = await manager.getSectionContent(addresses.document.path, targetTaskSlug);
    if (currentContent == null || currentContent === '') {
      throw new AddressingError(`Task not found: ${targetTaskSlug}`, 'TASK_NOT_FOUND', {
        document: addresses.document.path,
        task: targetTaskSlug
      });
    }

    // Get task title for response
    const taskTitle = extractTaskTitle(currentContent);

    // Update task status to completed and add completion note
    const completedDate = new Date().toISOString().substring(0, 10);  // YYYY-MM-DD format
    const updatedContent = updateTaskStatus(currentContent, 'completed', note, completedDate);

    // Update the task section with target task slug
    await performSectionEdit(manager, addresses.document.path, targetTaskSlug, updatedContent, 'replace');

    // Get next available task based on mode
    let nextTaskData: { slug: string; title: string; status: string; link?: string; referencedDocuments?: HierarchicalContent[] } | null = null;

    if (mode === 'sequential') {
      // Sequential mode: Find next task after current one
      nextTaskData = await findNextAvailableTask(manager, document, targetTaskSlug);
    }
    // In ad-hoc mode, nextTaskData remains null

    let nextTask: {
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
    } | undefined;

    if (nextTaskData != null) {
      // Get next task content for workflow extraction
      const nextTaskContent = await manager.getSectionContent(
        addresses.document.path,
        nextTaskData.slug
      ) ?? '';

      // Enrich with task-specific workflow ONLY (no main workflow)
      const enrichedNext = enrichTaskWithWorkflow(
        {
          slug: nextTaskData.slug,
          title: nextTaskData.title,
          content: nextTaskContent,
          status: nextTaskData.status
        },
        nextTaskContent
      );

      // Build next_task response
      nextTask = {
        slug: enrichedNext.slug,
        title: enrichedNext.title,
        ...(nextTaskData.link != null && { link: nextTaskData.link }),

        // Add workflow if present (FULL object, not just name)
        ...(enrichedNext.workflow != null && {
          workflow: {
            name: enrichedNext.workflow.name,
            description: enrichedNext.workflow.description,
            content: enrichedNext.workflow.content,
            whenToUse: enrichedNext.workflow.whenToUse
          }
        }),

        ...(nextTaskData.referencedDocuments != null && nextTaskData.referencedDocuments.length > 0 && {
          referenced_documents: nextTaskData.referencedDocuments
        })
      };
    }

    return {
      mode,
      completed_task: {
        slug: targetTaskSlug,
        title: taskTitle,
        note,
        completed_date: completedDate
      },
      ...(nextTask != null && { next_task: nextTask }),
      timestamp: new Date().toISOString().split('T')[0] ?? new Date().toISOString()
    };

  } catch (error) {
    if (error instanceof AddressingError) {
      throw error;
    }
    throw new AddressingError(
      `Task completion failed: ${error instanceof Error ? error.message : String(error)}`,
      'COMPLETION_FAILED'
    );
  }
}

// findNextAvailableTask function moved to shared/task-view-utilities.ts to eliminate duplication

/**
 * Helper functions for task completion
 */

function updateTaskStatus(content: string, newStatus: string, note: string, completedDate: string): string {
  // Update status line
  let updated = content.replace(/^- Status:\s*.+$/m, `- Status: ${newStatus}`);

  // Add completion info
  updated += `\n- Completed: ${completedDate}`;
  updated += `\n- Note: ${note}`;

  return updated;
}

// Other utility functions moved to shared/task-view-utilities.ts to eliminate duplication