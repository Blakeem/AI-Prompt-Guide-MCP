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
  document_info: {
    slug: string;
    title: string;
    namespace: string;
  };
  timestamp: string;
}

export async function completeTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<CompleteTaskResult> {
  try {

    // Validate required parameters using ToolIntegration utilities
    const documentPath = ToolIntegration.validateStringParameter(args['document'], 'document');
    const taskSlug = ToolIntegration.validateStringParameter(args['task'], 'task');
    const note = ToolIntegration.validateStringParameter(args['note'], 'note');

    // Use addressing system for validation and parsing
    const { addresses } = ToolIntegration.validateAndParse({
      document: documentPath,
      task: taskSlug
    });

    // Get document and validate existence
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    // Validate task address exists
    if (addresses.task == null) {
      throw new AddressingError('Task address is required for complete operation', 'MISSING_TASK');
    }

    // Format document info using addressing system helper
    const documentInfo = ToolIntegration.formatDocumentInfo(addresses.document, {
      title: document.metadata.title
    });

    // Get current task content using validated addresses
    const currentContent = await manager.getSectionContent(addresses.document.path, addresses.task.slug);
    if (currentContent == null || currentContent === '') {
      throw new AddressingError(`Task not found: ${addresses.task.slug}`, 'TASK_NOT_FOUND', {
        document: addresses.document.path,
        task: addresses.task.slug
      });
    }

    // Get task title for response
    const taskTitle = extractTaskTitle(currentContent);

    // Update task status to completed and add completion note
    const completedDate = new Date().toISOString().substring(0, 10);  // YYYY-MM-DD format
    const updatedContent = updateTaskStatus(currentContent, 'completed', note, completedDate);

    // Update the task section with validated addresses
    await performSectionEdit(manager, addresses.document.path, addresses.task.slug, updatedContent, 'replace');

    // Get next available task using shared utility
    const nextTaskData = await findNextAvailableTask(manager, document, addresses.task.slug);

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
      completed_task: {
        slug: addresses.task.slug,
        title: taskTitle,
        note,
        completed_date: completedDate
      },
      ...(nextTask != null && { next_task: nextTask }),
      document_info: documentInfo,
      timestamp: new Date().toISOString()
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