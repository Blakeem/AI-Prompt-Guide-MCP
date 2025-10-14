/**
 * Task validation layer for dual task system
 *
 * Provides validation functions for subagent (ad-hoc) and coordinator (sequential)
 * task tools. These validators enforce namespace and mode restrictions to ensure
 * correct tool usage.
 *
 * Validation Rules:
 * - Subagent tasks: MUST include #slug, MUST be in /docs/ namespace
 * - Coordinator tasks: MUST NOT include #slug, MUST be in /coordinator/ namespace
 */

import { AddressingError } from './addressing-system.js';
import { PATH_PREFIXES, isDocsPath, isCoordinatorPath } from './namespace-constants.js';
import { getGlobalLogger } from '../utils/logger.js';

/**
 * Validate subagent task access (ad-hoc only)
 *
 * Rules:
 * - MUST include taskSlug (ad-hoc mode required)
 * - MUST be within /docs/ namespace
 * - ERROR if sequential mode attempted
 *
 * @param documentPath - Path to the document
 * @param taskSlug - Task slug (required for subagent)
 * @throws {AddressingError} When validation fails
 */
export function validateSubagentTaskAccess(
  documentPath: string,
  taskSlug?: string
): void {
  // Rule 1: Must have task slug (ad-hoc only)
  if (taskSlug == null || taskSlug === '') {
    throw new AddressingError(
      'Subagent tasks require #slug (ad-hoc mode). Use coordinator tools for sequential work.',
      'SUBAGENT_REQUIRES_SLUG',
      {
        suggestion: 'Format: /docs/path.md#task-slug',
        coordinator_alternative: 'Use start_coordinator_task for sequential work'
      }
    );
  }

  // Rule 2: Must be in /docs/ namespace
  if (!isDocsPath(documentPath)) {
    throw new AddressingError(
      `Subagent tools only work in ${PATH_PREFIXES.DOCS} namespace. Use coordinator tools for /coordinator/ tasks.`,
      'INVALID_NAMESPACE_FOR_SUBAGENT',
      { documentPath, expected_namespace: PATH_PREFIXES.DOCS }
    );
  }
}

/**
 * Validate coordinator task access (sequential only)
 *
 * Rules:
 * - MUST NOT include taskSlug (sequential mode required)
 * - MUST be in /.ai-prompt-guide/coordinator/ namespace
 * - ERROR if ad-hoc mode attempted
 *
 * @param documentPath - Path to the document
 * @param taskSlug - Task slug (must be undefined for coordinator)
 * @throws {AddressingError} When validation fails
 */
export function validateCoordinatorTaskAccess(
  documentPath: string,
  taskSlug?: string
): void {
  // Rule 1: Must NOT have task slug (sequential only)
  if (taskSlug != null && taskSlug !== '') {
    throw new AddressingError(
      'Coordinator tasks are sequential only. Do not specify #slug.',
      'COORDINATOR_NO_SLUG_ALLOWED',
      {
        suggestion: 'Format: /coordinator/active.md (no #slug)',
        task_reordering: 'To change task order, reorder tasks in the document'
      }
    );
  }

  // Rule 2: Must be in coordinator namespace
  if (!isCoordinatorPath(documentPath)) {
    throw new AddressingError(
      `Coordinator tools only work with ${PATH_PREFIXES.COORDINATOR} namespace`,
      'INVALID_COORDINATOR_PATH',
      {
        documentPath,
        expected_namespace: PATH_PREFIXES.COORDINATOR,
        expected_file: `${PATH_PREFIXES.COORDINATOR}active.md`
      }
    );
  }
}

/**
 * Validate Main-Workflow requirement for coordinator first task
 * Warning only - doesn't throw, just logs
 *
 * This checks if the first task in a coordinator document has a Main-Workflow
 * field. If missing, it logs a warning but doesn't block execution.
 *
 * @param isFirstTask - Whether this is the first task in the document
 * @param hasMainWorkflow - Whether the task has a Main-Workflow field
 * @param taskTitle - Title of the task for logging
 */
export function validateMainWorkflowPresence(
  isFirstTask: boolean,
  hasMainWorkflow: boolean,
  taskTitle: string
): void {
  if (isFirstTask && !hasMainWorkflow) {
    const logger = getGlobalLogger();
    logger.warn('First coordinator task missing Main-Workflow field', {
      task: taskTitle,
      suggestion: 'Add "Main-Workflow: workflow-name" to task metadata using coordinator_task edit',
      available_workflows: [
        'tdd-incremental-orchestration',
        'manual-verification-orchestration',
        'spec-first-integration',
        'multi-option-tradeoff',
        'failure-triage-repro',
        'code-review-issue-based'
      ]
    });
  }
}
