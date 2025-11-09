/**
 * Validation processor for create-document pipeline
 * Handles Stage 0 (Discovery) and Stage 1 (Instructions) validation
 */
import { getDocumentNamespaces } from '../schemas/create-document-schemas.js';
/**
 * Stage 0: Discovery validation result
 */
export interface DiscoveryResult {
    stage: 'discovery';
    namespaces: ReturnType<typeof getDocumentNamespaces>;
    next_step: string;
    example: {
        namespace: string;
    };
}
/**
 * Stage 1: Instructions validation result (removed - direct creation now)
 */
/**
 * Error fallback result for validation issues
 */
export interface ValidationErrorResult {
    stage: 'error_fallback';
    error: string;
    provided_namespace?: string;
    valid_namespaces?: string[];
    help: string;
    namespaces?: ReturnType<typeof getDocumentNamespaces>;
    next_step: string;
    example: Record<string, unknown>;
}
export type ValidationResult = DiscoveryResult | ValidationErrorResult;
/**
 * Process Stage 0: Discovery - Return available namespaces
 */
export declare function processDiscovery(): DiscoveryResult;
/**
 * Validate and normalize namespace for creation stage
 * Strips leading slashes to ensure relative paths
 */
export declare function validateNamespaceForCreation(namespace: string): ValidationErrorResult | null;
/**
 * Normalize namespace by removing leading slashes
 * Used by template-processor.ts for path construction
 */
export declare function normalizeNamespace(namespace: string): string;
//# sourceMappingURL=validation-processor.d.ts.map