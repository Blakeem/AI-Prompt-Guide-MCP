/**
 * Document analysis and smart suggestions functionality
 *
 * Main orchestrator for document analysis operations including related document
 * discovery and reference validation. Coordinates specialized modules for
 * efficient and maintainable analysis workflows.
 */

import type { DocumentManager } from '../../document-manager.js';
import type {
  SmartSuggestions,
  RelatedDocumentSuggestion
} from '../../tools/schemas/create-document-schemas.js';
import { findRelatedDocuments } from './related-docs.js';
import { detectBrokenReferences } from './reference-validation.js';
import type { BrokenReference, ValidationError, AnalysisResult } from './types.js';
import { DocumentAnalysisError } from './types.js';

// Re-export types and utilities for external consumers
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
export async function analyzeDocumentSuggestions(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string,
  excludePath?: string
): Promise<SmartSuggestions> {
  // Input validation
  const validationErrors = validateAnalysisInputs(manager, namespace, title, overview);
  if (validationErrors.length > 0) {
    const errorMessages = validationErrors.map(err => `${err.parameter}: ${err.expected}, got ${err.received}`);
    throw new DocumentAnalysisError(
      `Input validation failed: ${errorMessages.join('; ')}`,
      'analyzeDocumentSuggestions',
      undefined,
      [
        'Ensure all parameters are provided and not empty',
        'Check that manager is properly initialized',
        'Verify namespace follows expected format'
      ]
    );
  }

  // Initialize partial results for graceful degradation
  let relatedDocs: RelatedDocumentSuggestion[] = [];

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Find related documents
    try {
      relatedDocs = await findRelatedDocuments(manager, namespace, title, overview, excludePath);
    } catch (error) {
      errors.push(`Related documents analysis failed: ${error}`);
      warnings.push('Using empty related documents list');
    }

    // Detect broken references
    let brokenReferences: BrokenReference[] = [];
    try {
      brokenReferences = await detectBrokenReferences(manager, namespace, title, overview);
    } catch (error) {
      errors.push(`Broken reference detection failed: ${error}`);
      warnings.push('Using empty broken references list');
    }

    // Log warnings if any operations failed
    if (warnings.length > 0) {
      console.warn('Document analysis completed with warnings:', warnings.join('; '));
    }

    return {
      related_documents: relatedDocs,
      broken_references: brokenReferences
    };

  } catch (error) {
    // If critical failure occurs, provide partial results in error
    const partialResults: SmartSuggestions = {
      related_documents: relatedDocs,
      broken_references: []
    };

    throw new DocumentAnalysisError(
      `Document analysis failed: ${error}${errors.length > 0 ? `. Additional errors: ${errors.join('; ')}` : ''}`,
      'analyzeDocumentSuggestions',
      partialResults,
      [
        'Check document manager connectivity',
        'Verify namespace exists and is accessible',
        'Try with simpler title and overview',
        'Check system resources and permissions'
      ]
    );
  }
}

/**
 * Validate inputs for analysis functions
 *
 * @param manager - Document manager to validate
 * @param namespace - Namespace to validate
 * @param title - Title to validate
 * @param overview - Overview to validate
 *
 * @returns Array of validation errors, empty if all inputs are valid
 */
function validateAnalysisInputs(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (manager == null) {
    errors.push({
      parameter: 'manager',
      value: manager,
      expected: 'DocumentManager instance',
      received: typeof manager
    });
  }

  if (namespace == null || typeof namespace !== 'string' || namespace.trim() === '') {
    errors.push({
      parameter: 'namespace',
      value: namespace,
      expected: 'non-empty string',
      received: namespace == null ? 'null/undefined' : typeof namespace
    });
  }

  if (title == null || typeof title !== 'string' || title.trim() === '') {
    errors.push({
      parameter: 'title',
      value: title,
      expected: 'non-empty string',
      received: title == null ? 'null/undefined' : typeof title
    });
  }

  if (overview != null && typeof overview !== 'string') {
    errors.push({
      parameter: 'overview',
      value: overview,
      expected: 'string or null/undefined',
      received: typeof overview
    });
  }

  return errors;
}
