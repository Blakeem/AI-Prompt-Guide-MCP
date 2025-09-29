/**
 * Document analysis and smart suggestions functionality
 */

import type { DocumentManager } from '../document-manager.js';
import type {
  SmartSuggestions,
  RelatedDocumentSuggestion
} from '../tools/schemas/create-document-schemas.js';
import { pathToNamespace } from './path-utilities.js';
import { AddressingError } from './addressing-system.js';

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
class DocumentAnalysisError extends AddressingError {
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
interface ValidationError {
  parameter: string;
  value: unknown;
  expected: string;
  received: string;
}

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
  overview: string
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
      relatedDocs = await findRelatedDocuments(manager, namespace, title, overview);
    } catch (error) {
      errors.push(`Related documents analysis failed: ${error}`);
      warnings.push('Using empty related documents list');
    }

    // Detect broken references
    let brokenReferences: string[] = [];
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
 * Find related documents using basic keyword matching
 *
 * Simplified function that finds documents with similar content based on
 * keyword overlap. Returns top 5 results regardless of namespace.
 *
 * @param manager - Document manager for accessing documents
 * @param _namespace - Target namespace (kept for compatibility, not used)
 * @param title - Document title for keyword extraction
 * @param overview - Document overview for keyword extraction
 *
 * @returns Promise resolving to array of related document suggestions
 *
 * @throws {DocumentAnalysisError} When document listing fails or critical operations fail
 */
async function findRelatedDocuments(
  manager: DocumentManager,
  _namespace: string,
  title: string,
  overview: string
): Promise<RelatedDocumentSuggestion[]> {
  // Input validation
  if (manager == null) {
    throw new DocumentAnalysisError(
      'Document manager is required',
      'findRelatedDocuments',
      [],
      ['Ensure document manager is properly initialized']
    );
  }

  if (title == null || title.trim() === '') {
    throw new DocumentAnalysisError(
      'Valid title is required',
      'findRelatedDocuments',
      [],
      ['Provide a non-empty title string']
    );
  }

  // Extract keywords from title and overview
  let keywords: string[] = [];
  try {
    keywords = extractKeywords(title, overview ?? '');
    if (keywords.length === 0) {
      console.warn('No keywords extracted from title and overview');
      keywords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    }
  } catch (error) {
    console.warn('Keyword extraction failed, using title words as fallback:', error);
    keywords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  }

  const suggestions: RelatedDocumentSuggestion[] = [];

  try {
    // Get all documents
    const allDocuments = await manager.listDocuments();

    if (allDocuments.length === 0) {
      return [];
    }

    for (const docInfo of allDocuments) {
      try {
        const document = await manager.getDocument(docInfo.path);
        if (document == null) {
          continue;
        }

        // Read document content for keyword matching
        let content = '';
        try {
          content = await manager.getSectionContent(docInfo.path, '') ?? '';
        } catch {
          // Continue with empty content
        }

        // Calculate relevance based on keyword overlap
        const relevance = calculateContentRelevance(keywords, document.metadata.title, content);

        if (relevance > 0.2) { // Include documents with any meaningful relevance
          const docNamespace = pathToNamespace(docInfo.path);
          suggestions.push({
            path: docInfo.path,
            title: document.metadata.title,
            namespace: docNamespace,
            reason: `Related documentation in ${docNamespace}`,
            relevance: Math.round(relevance * 100) / 100
          });
        }
      } catch {
        // Skip failed documents silently
        continue;
      }
    }

    // Sort by relevance and return top 5
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);

  } catch (error) {
    throw new DocumentAnalysisError(
      `Failed to find related documents: ${error}`,
      'findRelatedDocuments',
      [],
      [
        'Check document manager connectivity',
        'Verify file system permissions',
        'Ensure document root directory exists'
      ]
    );
  }
}

/**
 * Detect broken @references in document content
 *
 * Analyzes the provided content (title and overview) to find @reference patterns
 * and checks if the referenced documents actually exist in the system.
 *
 * @param manager - Document manager for checking document existence
 * @param _namespace - Target namespace (not used in current implementation)
 * @param title - Document title to scan for references
 * @param overview - Document overview to scan for references
 *
 * @returns Promise resolving to array of broken reference paths
 *
 * @throws {DocumentAnalysisError} When critical operations fail
 */
async function detectBrokenReferences(
  manager: DocumentManager,
  _namespace: string,
  title: string,
  overview: string
): Promise<string[]> {
  // Input validation
  if (manager == null) {
    throw new DocumentAnalysisError(
      'Document manager is required',
      'detectBrokenReferences',
      [],
      ['Ensure document manager is properly initialized']
    );
  }

  const brokenReferences: string[] = [];
  const contentToScan = `${title ?? ''} ${overview ?? ''}`;

  try {
    // Extract @references from content using regex
    const referenceRegex = /@([^@\s]+(?:\.md)?(?:#[^\s]*)?)/g;
    const matches = contentToScan.matchAll(referenceRegex);

    for (const match of matches) {
      const reference = match[1];
      if (reference == null) {
        continue;
      }

      // Parse the reference to extract document path
      let documentPath = reference;

      // Handle section references by extracting just the document path
      if (reference.includes('#')) {
        const parts = reference.split('#');
        documentPath = parts[0] ?? reference;
      }

      // Ensure it's a markdown file
      if (!documentPath.endsWith('.md')) {
        documentPath = `${documentPath}.md`;
      }

      // Ensure it starts with /
      if (!documentPath.startsWith('/')) {
        documentPath = `/${documentPath}`;
      }

      try {
        // Check if the document exists
        const document = await manager.getDocument(documentPath);
        if (document == null) {
          brokenReferences.push(`@${reference}`);
        }
      } catch {
        // If we can't check the document, consider it broken
        brokenReferences.push(`@${reference}`);
      }
    }

    // Remove duplicates
    return [...new Set(brokenReferences)];

  } catch (error) {
    throw new DocumentAnalysisError(
      `Broken reference detection failed: ${error}`,
      'detectBrokenReferences',
      [],
      [
        'Check document manager connectivity',
        'Verify content format',
        'Try with simpler content'
      ]
    );
  }
}

// Helper functions for suggestion analysis

/**
 * Extract keywords and concepts from title and overview
 *
 * Processes text to extract meaningful keywords by removing stop words,
 * filtering short words, and cleaning common noise. Uses defensive
 * programming to handle edge cases gracefully.
 *
 * @param title - Document title to extract keywords from
 * @param overview - Document overview to extract keywords from
 *
 * @returns Array of extracted keywords
 *
 * @example
 * ```typescript
 * const keywords = extractKeywords(
 *   'User Authentication API',
 *   'This API handles user login and session management with JWT tokens'
 * );
 * console.log(keywords); // ['user', 'authentication', 'api', 'handles', 'login', ...]
 * ```
 */
function extractKeywords(title: string, overview: string): string[] {
  try {
    // Handle null/undefined inputs gracefully
    const safeTitle = title ?? '';
    const safeOverview = overview ?? '';

    // Combine and normalize text
    const text = `${safeTitle} ${safeOverview}`.toLowerCase();

    if (text.trim().length === 0) {
      console.warn('Empty text provided for keyword extraction');
      return [];
    }

    // Split into words and filter by length
    const words = text
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length > 2);

    if (words.length === 0) {
      console.warn('No words found after initial filtering');
      return [];
    }

    // Remove common words and focus on meaningful terms
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'this', 'that', 'will', 'can', 'are', 'you',
      'how', 'what', 'when', 'where', 'why', 'who', 'which', 'was', 'were',
      'been', 'have', 'has', 'had', 'should', 'would', 'could', 'may', 'might',
      'must', 'shall', 'not', 'but', 'however', 'therefore', 'thus', 'also',
      'such', 'very', 'more', 'most', 'much', 'many', 'some', 'any', 'all'
    ]);

    const keywords = words.filter(word => {
      // Remove stop words
      if (stopWords.has(word)) {
        return false;
      }

      // Remove words that are just punctuation or numbers
      if (/^[\d\W]+$/.test(word)) {
        return false;
      }

      return true;
    });

    // Remove duplicates while preserving order
    const uniqueKeywords = [...new Set(keywords)];

    if (uniqueKeywords.length === 0) {
      console.warn('No meaningful keywords found after stop word filtering');
      // Return at least some basic words if nothing else
      return words.slice(0, 3);
    }

    // Limit to reasonable number of keywords for performance
    const limitedKeywords = uniqueKeywords.slice(0, 20);

    return limitedKeywords;

  } catch (error) {
    console.warn('Keyword extraction failed, returning empty array:', error);
    return [];
  }
}

/**
 * Calculate content relevance based on keyword overlap
 *
 * Computes a relevance score by analyzing keyword overlap between
 * the source keywords and the target document's title and content.
 *
 * @param keywords - Array of keywords to match against
 * @param title - Target document title
 * @param content - Target document content
 *
 * @returns Relevance score between 0 and 1
 *
 * @throws {DocumentAnalysisError} When input validation fails
 *
 * @example
 * ```typescript
 * const relevance = calculateContentRelevance(
 *   ['api', 'authentication', 'jwt'],
 *   'User Auth API',
 *   'This document describes JWT-based user authentication...'
 * );
 * console.log(`Relevance: ${relevance}`); // 0.67
 * ```
 */
function calculateContentRelevance(keywords: string[], title: string, content: string): number {
  // Input validation
  if (!Array.isArray(keywords)) {
    throw new DocumentAnalysisError(
      'Keywords must be an array',
      'calculateContentRelevance',
      undefined,
      ['Ensure keywords parameter is an array of strings']
    );
  }

  // Handle edge cases gracefully
  if (keywords.length === 0) {
    console.warn('Empty keywords array provided to relevance calculation');
    return 0;
  }

  const safeTitle = title ?? '';
  const safeContent = content ?? '';

  try {
    const targetText = `${safeTitle} ${safeContent}`.toLowerCase();

    // Filter and validate keywords
    const validKeywords = keywords.filter(keyword => {
      if (typeof keyword !== 'string') {
        console.warn('Non-string keyword filtered out:', keyword);
        return false;
      }
      return keyword.trim().length > 0;
    });

    if (validKeywords.length === 0) {
      console.warn('No valid keywords found after filtering');
      return 0;
    }

    const matches = validKeywords.filter(keyword => {
      try {
        return targetText.includes(keyword.toLowerCase());
      } catch (error) {
        console.warn(`Keyword matching failed for "${keyword}":`, error);
        return false;
      }
    });

    const relevance = matches.length / validKeywords.length;

    // Ensure result is within expected bounds
    if (relevance < 0 || relevance > 1) {
      console.warn(`Relevance calculation produced out-of-bounds result: ${relevance}`);
      return Math.max(0, Math.min(1, relevance));
    }

    return relevance;

  } catch (error) {
    throw new DocumentAnalysisError(
      `Content relevance calculation failed: ${error}`,
      'calculateContentRelevance',
      0,
      [
        'Check keyword array format',
        'Verify title and content are strings',
        'Try with simpler input data'
      ]
    );
  }
}






// Helper functions for error recovery and graceful degradation

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


