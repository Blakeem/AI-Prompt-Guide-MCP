/**
 * Pipeline orchestrator for create-document
 * Coordinates all stages of the progressive discovery flow (2-stage: discovery -> creation)
 */
import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import { type ValidationResult } from './validation-processor.js';
import { type DocumentCreationResult } from './file-creator.js';
/**
 * All possible pipeline results
 */
export type PipelineResult = ValidationResult | DocumentCreationResult | CreationErrorResult;
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
 * Handles all stages of the progressive discovery pattern (0 -> 1)
 */
export declare function executeCreateDocumentPipeline(args: Record<string, unknown>, state: SessionState, manager: DocumentManager, onStageChange?: () => void): Promise<PipelineResult>;
//# sourceMappingURL=pipeline.d.ts.map