/**
 * Implementation for the create_document tool
 * Refactored to use stage-based pipeline architecture
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import { executeCreateDocumentPipeline } from '../create/index.js';

/**
 * Create document using the stage-based pipeline with dependency injection
 * Handles progressive discovery pattern with 4 stages (0, 1, 2.5, 3)
 */
export async function createDocument(
  args: Record<string, unknown>,
  state: SessionState,
  manager: DocumentManager,
  onStageChange?: () => void
): Promise<unknown> {
  return await executeCreateDocumentPipeline(args, state, manager, onStageChange);
}

// All helper functions moved to pipeline processors
// Main implementation now delegates to executeCreateDocumentPipeline