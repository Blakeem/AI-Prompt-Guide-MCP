/**
 * Implementation for the start_coordinator_task tool
 *
 * Start work on coordinator task (sequential mode ONLY)
 *
 * - Finds next pending task automatically
 * - Injects Main-Workflow from first task
 * - Loads task-specific Workflow
 * - Loads hierarchical references
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';
import { validateCoordinatorTaskAccess } from '../../shared/task-validation.js';
import {
  enrichTaskWithWorkflow,
  enrichTaskWithMainWorkflow
} from '../../shared/workflow-prompt-utilities.js';
import type { WorkflowPrompt } from '../../prompts/workflow-prompts.js';
import {
  enrichTaskWithReferences,
  findNextAvailableTask
} from '../../shared/task-view-utilities.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
import { PATH_PREFIXES } from '../../shared/namespace-constants.js';

/**
 * Response interface for start_coordinator_task tool
 */
export interface StartCoordinatorTaskResponse {
  document: string;
  task: {
    slug: string;
    title: string;
    content: string;
    status: string;
    full_path: string;
    workflow?: WorkflowPrompt;
    main_workflow?: WorkflowPrompt;
    referenced_documents?: HierarchicalContent[];
  };
}

/**
 * Start work on coordinator task with full context injection
 *
 * VALIDATION: Sequential only (no #slug allowed), enforces /coordinator/ namespace
 *
 * @param args - Tool arguments (document parameter optional, defaults to /coordinator/active.md)
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to enriched task data with full workflow context
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export async function startCoordinatorTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<StartCoordinatorTaskResponse> {
  try {
    // COORDINATOR-SPECIFIC: Fixed document path using explicit path prefix
    const documentPath = `${PATH_PREFIXES.COORDINATOR}active.md`;

    // Validate coordinator access (reject if #slug provided)
    const documentParam = args['document'] as string | undefined;
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (documentParam != null && documentParam.includes('#')) {
      const taskSlug = documentParam.split('#')[1];
      validateCoordinatorTaskAccess(documentPath, taskSlug); // Will throw error
    } else {
      validateCoordinatorTaskAccess(documentPath, undefined);
    }

    // Load document
    const document = await manager.getDocument(documentPath);
    if (document == null) {
      throw new DocumentNotFoundError(documentPath);
    }

    // Find next task (sequential mode - SHARED utility)
    const nextTask = await findNextAvailableTask(manager, document, undefined);
    if (nextTask == null) {
      throw new AddressingError(
        'No available tasks in coordinator document',
        'NO_AVAILABLE_TASKS',
        {
          document: documentPath,
          suggestion: 'Create tasks using coordinator_task tool'
        }
      );
    }

    const targetTaskSlug = nextTask.slug;
    const taskContent = await manager.getSectionContent(documentPath, targetTaskSlug);

    if (taskContent == null) {
      throw new AddressingError(
        `Task content not found for ${targetTaskSlug}`,
        'TASK_CONTENT_NOT_FOUND',
        {
          document: documentPath,
          task: targetTaskSlug
        }
      );
    }

    // WORKFLOW ENRICHMENT (shared utilities)
    const baseTaskData = {
      slug: targetTaskSlug,
      title: nextTask.title,
      content: taskContent,
      status: nextTask.status
    };

    // Task-specific workflow (SHARED)
    const withWorkflow = enrichTaskWithWorkflow(baseTaskData, taskContent);

    // Main workflow (COORDINATOR ONLY - injects from first task)
    const withMainWorkflow = await enrichTaskWithMainWorkflow(manager, document, withWorkflow);

    // Reference loading (SHARED)
    const enriched = await enrichTaskWithReferences(
      manager,
      documentPath,
      targetTaskSlug,
      taskContent
    );

    // Extract workflow data with explicit typing
    const workflow: WorkflowPrompt | undefined = 'workflow' in withMainWorkflow
      ? withMainWorkflow.workflow as WorkflowPrompt | undefined
      : undefined;
    const mainWorkflow: WorkflowPrompt | undefined = 'mainWorkflow' in withMainWorkflow
      ? withMainWorkflow.mainWorkflow as WorkflowPrompt | undefined
      : undefined;

    // RESPONSE
    return {
      document: documentPath,
      task: {
        slug: enriched.slug,
        title: enriched.title,
        content: enriched.content,
        status: enriched.status,
        full_path: `${PATH_PREFIXES.COORDINATOR}active.md#${enriched.slug}`,
        ...(workflow != null && { workflow }),
        ...(mainWorkflow != null && { main_workflow: mainWorkflow }),
        ...(enriched.referencedDocuments != null &&
          enriched.referencedDocuments.length > 0 && {
            referenced_documents: enriched.referencedDocuments
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
      `Failed to start coordinator task: ${error instanceof Error ? error.message : String(error)}`,
      'START_COORDINATOR_TASK_FAILED',
      {
        originalError: error instanceof Error ? error.message : String(error)
      }
    );
  }
}
