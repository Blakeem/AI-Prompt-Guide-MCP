/**
 * Document analysis and smart suggestions functionality
 *
 * Main orchestrator for document analysis operations including related document
 * discovery and reference validation. Coordinates specialized modules for
 * efficient and maintainable analysis workflows.
 */
import type { DocumentManager } from '../../document-manager.js';
import type { SmartSuggestions } from '../../tools/schemas/create-document-schemas.js';
import type { BrokenReference, AnalysisResult } from './types.js';
import { DocumentAnalysisError } from './types.js';
export type { BrokenReference, AnalysisResult };
export { DocumentAnalysisError };
/**
 * Main orchestration function for document suggestions analysis
 *
 * Performs comprehensive analysis of document relationships, similar implementations,
 * missing pieces, and generates an implementation sequence. Uses graceful degradation
 * to provide partial results even if some analysis operations fail.
 *
 * @param manager - The document manager instance
 * @param namespace - Target namespace for the document
 * @param title - Document title
 * @param overview - Document overview content
 * @param excludePath - Optional document path to exclude from suggestions (e.g., the document being created)
 *
 * @returns Promise resolving to smart suggestions with analysis results
 *
 * @throws {DocumentAnalysisError} When critical validation fails or when all analysis operations fail
 *
 * @example Basic usage
 * ```typescript
 * const suggestions = await analyzeDocumentSuggestions(
 *   manager,
 *   'api/specs',
 *   'User Authentication API',
 *   'API for handling user login and session management'
 * );
 * ```
 *
 * @example With path exclusion (for document creation)
 * ```typescript
 * const suggestions = await analyzeDocumentSuggestions(
 *   manager,
 *   'api/specs',
 *   'User Authentication API',
 *   'API for handling user login and session management',
 *   '/api/specs/user-authentication-api.md' // Exclude current document
 * );
 * ```
 *
 * @example Error handling with graceful degradation
 * ```typescript
 * try {
 *   const suggestions = await analyzeDocumentSuggestions(manager, namespace, title, overview);
 *   // Use suggestions.related_documents, etc.
 * } catch (error) {
 *   if (error instanceof DocumentAnalysisError) {
 *     // Use partial results if available
 *     const partialSuggestions = error.partialResults as SmartSuggestions;
 *     console.warn('Analysis partially failed:', error.message);
 *   }
 * }
 * ```
 */
export declare function analyzeDocumentSuggestions(manager: DocumentManager, namespace: string, title: string, overview: string, excludePath?: string): Promise<SmartSuggestions>;
//# sourceMappingURL=index.d.ts.map