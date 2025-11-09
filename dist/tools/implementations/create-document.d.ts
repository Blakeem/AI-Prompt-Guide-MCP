/**
 * Implementation for the create_document tool
 * Refactored to use stage-based pipeline architecture
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
/**
 * Create document using the stage-based pipeline with dependency injection
 * Handles progressive discovery pattern with 4 stages (0, 1, 2.5, 3)
 */
export declare function createDocument(args: Record<string, unknown>, state: SessionState, manager: DocumentManager, onStageChange?: () => void): Promise<unknown>;
//# sourceMappingURL=create-document.d.ts.map