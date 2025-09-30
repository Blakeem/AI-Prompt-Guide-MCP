/**
 * Pipeline orchestrator for create-document
 * Coordinates all stages of the progressive discovery flow
 */

import type { SessionState } from '../../session/types.js';
import {
  determineCreateDocumentStage,
  getNextCreateDocumentStage
} from '../schemas/create-document-schemas.js';
import { getGlobalSessionStore } from '../../session/session-store.js';

import {
  processDiscovery,
  processInstructions,
  validateNamespaceForCreation,
  type ValidationResult
} from './validation-processor.js';

import {
  processTemplate
} from './template-processor.js';

import {
  createDocumentFile,
  validateCreationPrerequisites,
  type DocumentCreationResult
} from './file-creator.js';

/**
 * All possible pipeline results
 */
export type PipelineResult =
  | ValidationResult
  | DocumentCreationResult
  | CreationErrorResult;

/**
 * Creation error result with helpful recovery guidance
 */
export interface CreationErrorResult {
  stage: 'error_fallback';
  error: string;
  details: string;
  provided_parameters: {
    namespace: string;
    title: string;
    overview: string;
  };
  help: string;
  suggestion: string;
  recovery_steps: string[];
  example: {
    namespace: string;
    title: string;
    overview: string;
  };
}

/**
 * Main pipeline orchestrator function
 * Handles all stages of the progressive discovery pattern (0, 1, 2)
 */
export async function executeCreateDocumentPipeline(
  args: Record<string, unknown>,
  state: SessionState,
  onStageChange?: () => void
): Promise<PipelineResult> {
  // Extract parameters
  const namespace = args['namespace'] as string | undefined;
  const title = args['title'] as string | undefined;
  const overview = args['overview'] as string | undefined;

  // Get the global session store singleton
  const sessionStore = getGlobalSessionStore();

  // Determine current stage and update session if needed
  const currentStage = determineCreateDocumentStage(args);
  if (currentStage !== state.createDocumentStage) {
    sessionStore.updateSession(state.sessionId, { createDocumentStage: currentStage });

    // Trigger tool list update notification
    if (onStageChange != null) {
      onStageChange();
    }
  }

  // STAGE 0: Discovery - Return available document namespaces
  if (namespace == null) {
    // Update to next stage for tool list
    const nextStage = getNextCreateDocumentStage(currentStage);
    if (nextStage !== currentStage) {
      sessionStore.updateSession(state.sessionId, { createDocumentStage: nextStage });

      if (onStageChange != null) {
        onStageChange();
      }
    }

    return processDiscovery();
  }

  // STAGE 1: Instructions - Return namespace-specific guidance
  if (title == null || overview == null) {
    // Update to next stage for tool list
    const nextStage = getNextCreateDocumentStage(1);
    if (nextStage !== state.createDocumentStage) {
      sessionStore.updateSession(state.sessionId, { createDocumentStage: nextStage });

      if (onStageChange != null) {
        onStageChange();
      }
    }

    return processInstructions(namespace);
  }

  // STAGE 2: Creation - Create the document immediately with suggestions
  // Update to creation stage for tool list
  const nextStage = getNextCreateDocumentStage(2);
  if (nextStage !== state.createDocumentStage) {
    sessionStore.updateSession(state.sessionId, { createDocumentStage: nextStage });

    if (onStageChange != null) {
      onStageChange();
    }
  }

  return await executeCreationStage(namespace, title, overview);
}

/**
 * Execute Stage 2: Document Creation
 */
async function executeCreationStage(
  namespace: string,
  title: string,
  overview: string
): Promise<DocumentCreationResult | CreationErrorResult> {
  try {
    // Validate prerequisites
    const validationError = await validateCreationPrerequisites(namespace, title, overview);
    if (validationError != null) {
      return createCreationErrorResult(
        'Prerequisites validation failed',
        validationError,
        namespace,
        title,
        overview
      );
    }

    // Validate namespace for creation
    const namespaceError = validateNamespaceForCreation(namespace);
    if (namespaceError != null) {
      return createCreationErrorResult(
        namespaceError.error,
        namespaceError.help,
        namespace,
        title,
        overview
      );
    }

    // Process template
    const templateResult = await processTemplate(namespace, title, overview);
    if ('error' in templateResult) {
      return createCreationErrorResult(
        templateResult.error,
        templateResult.details,
        namespace,
        title,
        overview
      );
    }

    // Create document file
    const creationResult = await createDocumentFile(
      namespace,
      title,
      overview,
      templateResult.content,
      templateResult.docPath,
      templateResult.slug
    );

    if ('error' in creationResult) {
      return createCreationErrorResult(
        creationResult.error,
        creationResult.details,
        namespace,
        title,
        overview
      );
    }

    return creationResult;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createCreationErrorResult(
      'Unexpected error during creation',
      message,
      namespace,
      title,
      overview
    );
  }
}

/**
 * Create standardized creation error result
 */
function createCreationErrorResult(
  error: string,
  details: string,
  namespace: string,
  title: string,
  overview: string
): CreationErrorResult {
  return {
    stage: 'error_fallback',
    error,
    details,
    provided_parameters: {
      namespace,
      title,
      overview
    },
    help: 'Document creation failed. Please check your parameters and try again.',
    suggestion: 'Start over with the discovery flow for guidance',
    recovery_steps: [
      'Call create_document with no parameters to see available namespaces',
      'Call create_document with just { "namespace": "your_namespace" } for instructions',
      'Call create_document with all required parameters: namespace, title, and overview'
    ],
    example: {
      namespace: "api/specs",
      title: "Search API",
      overview: "Full-text search capabilities"
    }
  };
}