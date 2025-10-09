/**
 * Shared types and error classes for document analysis system
 */

import { AddressingError } from '../addressing-system.js';

/**
 * Structured information about a broken reference
 *
 * Provides detailed classification and context for reference validation failures,
 * enabling targeted fixes and better user guidance.
 *
 * @example Using BrokenReference data
 * ```typescript
 * const brokenRefs = await detectBrokenReferences(manager, namespace, title, overview);
 * for (const ref of brokenRefs) {
 *   if (ref.type === 'missing_document') {
 *     console.log(`Document not found: ${ref.documentPath}`);
 *   } else if (ref.type === 'missing_section') {
 *     console.log(`Section '${ref.sectionSlug}' not found in ${ref.documentPath}`);
 *   }
 * }
 * ```
 */
export interface BrokenReference {
  /** Original @reference text as it appeared in content */
  readonly reference: string;
  /** Classification of the failure type */
  readonly type: 'missing_document' | 'missing_section' | 'malformed';
  /** Parsed document path (if parseable) */
  readonly documentPath?: string;
  /** Parsed section slug (if applicable) */
  readonly sectionSlug?: string | undefined;
  /** Human-readable reason for the failure */
  readonly reason: string;
}

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
  constructor(
    message: string,
    public operation: string,
    public partialResults?: unknown,
    public recoverySuggestions?: string[]
  ) {
    super(message, 'DOCUMENT_ANALYSIS_ERROR', {
      operation,
      partialResults,
      recoverySuggestions
    });
    this.name = 'DocumentAnalysisError';
  }
}

/**
 * Structured result type for analysis operations that may partially fail
 *
 * @template T - The type of the successful result
 */
export interface AnalysisResult<T> {
  /** Whether the operation completed successfully */
  success: boolean;
  /** The result data if successful, or partial results if failed */
  data: T;
  /** Error information if the operation failed */
  error?: {
    message: string;
    operation: string;
    code: string;
  };
  /** Suggestions for recovering from the error */
  recoverySuggestions?: string[];
}

/**
 * Input validation error details
 */
export interface ValidationError {
  parameter: string;
  value: unknown;
  expected: string;
  received: string;
}
