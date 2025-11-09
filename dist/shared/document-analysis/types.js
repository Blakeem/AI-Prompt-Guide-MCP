/**
 * Shared types and error classes for document analysis system
 */
import { AddressingError } from '../addressing-system.js';
/**
 * Error thrown when document analysis operations fail
 *
 * This error provides structured information about analysis failures,
 * including the operation that failed and any partial results that
 * were successfully obtained.
 *
 * @example Handling analysis errors
 * ```typescript
 * try {
 *   const suggestions = await analyzeDocumentSuggestions(manager, namespace, title, overview);
 * } catch (error) {
 *   if (error instanceof DocumentAnalysisError) {
 *     console.error('Analysis failed:', error.message);
 *     console.log('Partial results:', error.partialResults);
 *     console.log('Recovery suggestions:', error.recoverySuggestions);
 *   }
 * }
 * ```
 */
export class DocumentAnalysisError extends AddressingError {
    operation;
    partialResults;
    recoverySuggestions;
    constructor(message, operation, partialResults, recoverySuggestions) {
        super(message, 'DOCUMENT_ANALYSIS_ERROR', {
            operation,
            partialResults,
            recoverySuggestions
        });
        this.operation = operation;
        this.partialResults = partialResults;
        this.recoverySuggestions = recoverySuggestions;
        this.name = 'DocumentAnalysisError';
    }
}
//# sourceMappingURL=types.js.map