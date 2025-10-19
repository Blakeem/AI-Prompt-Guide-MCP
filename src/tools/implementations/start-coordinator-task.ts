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
 * Start work on coordinator task with optional context injection
 *
 * VALIDATION: Sequential only (no #slug allowed), enforces /coordinator/ namespace
 *
 * @param args - Tool arguments (return_task_context optional, defaults to false)
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to task data (minimal or enriched based on return_task_context)
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export async function startCoordinatorTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<StartCoordinatorTaskResponse> {
  try {
    // Extract return_task_context parameter (default: false)
    const returnTaskContext = (args['return_task_context'] as boolean | undefined) ?? false;

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
    const fullPath = `${PATH_PREFIXES.COORDINATOR}active.md#${targetTaskSlug}`;

    // MINIMAL RESPONSE: Return basic task info without context
    if (!returnTaskContext) {
      return {
        document: documentPath,
        task: {
          slug: targetTaskSlug,
          title: nextTask.title,
          content: '', // Empty content when not returning context
          status: nextTask.status,
          full_path: fullPath
        }
      };
    }

    // FULL CONTEXT: Load and enrich with workflows and references
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
    // Step 1: Start with reference enrichment (returns full TaskViewData)
    const withReferences = await enrichTaskWithReferences(
      manager,
      documentPath,
      targetTaskSlug,
      taskContent
    );

    // Step 2: Add task-specific workflow (preserves all existing fields)
    const withWorkflow = enrichTaskWithWorkflow(withReferences, taskContent);

    // Step 3: Add main workflow (preserves all existing fields including workflow and references)
    const fullyEnriched = await enrichTaskWithMainWorkflow(manager, document, withWorkflow);

    // Extract workflow data with explicit typing for response
    const workflow: WorkflowPrompt | undefined = 'workflow' in fullyEnriched
      ? fullyEnriched.workflow as WorkflowPrompt | undefined
      : undefined;
    const mainWorkflow: WorkflowPrompt | undefined = 'mainWorkflow' in fullyEnriched
      ? fullyEnriched.mainWorkflow as WorkflowPrompt | undefined
      : undefined;

    // ENRICHED RESPONSE - spread all enriched data
    return {
      document: documentPath,
      task: {
        slug: fullyEnriched.slug,
        title: fullyEnriched.title,
        content: fullyEnriched.content,
        status: fullyEnriched.status,
        full_path: fullPath,
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
      `Failed to start coordinator task: ${error instanceof Error ? error.message : String(error)}`,
      'START_COORDINATOR_TASK_FAILED',
      {
        originalError: error instanceof Error ? error.message : String(error)
      }
    );
  }
}
