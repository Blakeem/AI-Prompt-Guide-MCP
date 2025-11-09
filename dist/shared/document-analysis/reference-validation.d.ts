/**
 * Reference validation and broken reference detection
 *
 * Provides tools for detecting broken @references in document content
 * using the shared reference extraction and validation pipeline.
 */
import type { DocumentManager } from '../../document-manager.js';
import type { BrokenReference } from './types.js';
/**
 * Detect broken @references in document content
 *
 * Analyzes the provided content (title and overview) to find @reference patterns
 * and checks if the referenced documents actually exist in the system.
 * Uses the shared ReferenceExtractor and ReferenceLoader pipeline for consistent
 * reference handling across the system.
 *
 * @param manager - Document manager for checking document existence
 * @param _namespace - Target namespace (not used in current implementation)
 * @param title - Document title to scan for references
 * @param overview - Document overview to scan for references
 *
 * @returns Promise resolving to array of structured broken reference information
 *
 * @throws {DocumentAnalysisError} When critical operations fail
 */
export declare function detectBrokenReferences(manager: DocumentManager, _namespace: string, title: string, overview: string): Promise<BrokenReference[]>;
//# sourceMappingURL=reference-validation.d.ts.map