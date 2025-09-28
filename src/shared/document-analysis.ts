/**
 * Document analysis and smart suggestions functionality
 */

import type { DocumentManager } from '../document-manager.js';
import type {
  SmartSuggestions,
  RelatedDocumentSuggestion,
  SimilarImplementationSuggestion,
  MissingPieceSuggestion,
  ImplementationStep
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
  let similarImplementations: SimilarImplementationSuggestion[] = [];
  let missingPieces: MissingPieceSuggestion[] = [];
  let implementationSequence: ImplementationStep[] = [];

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Collect all analysis in parallel for performance, with individual error handling
    const [relatedDocsResult, similarImplResult] = await Promise.allSettled([
      findRelatedDocuments(manager, namespace, title, overview),
      findSimilarImplementations(manager, namespace, title, overview)
    ]);

    // Process related documents result
    if (relatedDocsResult.status === 'fulfilled') {
      relatedDocs = relatedDocsResult.value;
    } else {
      errors.push(`Related documents analysis failed: ${relatedDocsResult.reason}`);
      warnings.push('Using empty related documents list');
    }

    // Process similar implementations result
    if (similarImplResult.status === 'fulfilled') {
      similarImplementations = similarImplResult.value;
    } else {
      errors.push(`Similar implementations analysis failed: ${similarImplResult.reason}`);
      warnings.push('Using empty similar implementations list');
    }

    // Identify missing pieces - more resilient to failures
    try {
      missingPieces = await identifyMissingPieces(manager, namespace, title, overview, relatedDocs);
    } catch (error) {
      errors.push(`Missing pieces analysis failed: ${error}`);
      warnings.push('Using empty missing pieces list');
      // Generate basic missing pieces as fallback
      missingPieces = generateFallbackMissingPieces(namespace, title);
    }

    // Generate implementation sequence - always succeeds with fallback
    try {
      implementationSequence = generateImplementationSequence(relatedDocs, missingPieces, namespace, title);
    } catch (error) {
      warnings.push(`Implementation sequence generation failed: ${error}`);
      implementationSequence = generateFallbackImplementationSequence(namespace, title);
    }

    // Log warnings if any operations failed
    if (warnings.length > 0) {
      console.warn('Document analysis completed with warnings:', warnings.join('; '));
    }

    return {
      related_documents: relatedDocs,
      similar_implementations: similarImplementations,
      missing_pieces: missingPieces,
      implementation_sequence: implementationSequence
    };

  } catch (error) {
    // If critical failure occurs, provide partial results in error
    const partialResults: SmartSuggestions = {
      related_documents: relatedDocs,
      similar_implementations: similarImplementations,
      missing_pieces: missingPieces,
      implementation_sequence: implementationSequence.length > 0
        ? implementationSequence
        : generateFallbackImplementationSequence(namespace, title)
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
 * Find related documents across namespaces that should be referenced or implemented
 *
 * Analyzes documents across different namespaces to identify relationships,
 * implementation gaps, and relevant sections. Uses graceful degradation to
 * continue analysis even if individual documents fail to load.
 *
 * @param manager - Document manager for accessing documents
 * @param namespace - Target namespace to exclude from related docs
 * @param title - Document title for relevance analysis
 * @param overview - Document overview for keyword extraction
 *
 * @returns Promise resolving to array of related document suggestions
 *
 * @throws {DocumentAnalysisError} When document listing fails or critical operations fail
 *
 * @example
 * ```typescript
 * const related = await findRelatedDocuments(manager, 'api/specs', 'Auth API', 'User authentication system');
 * console.log(`Found ${related.length} related documents`);
 * ```
 */
async function findRelatedDocuments(
  manager: DocumentManager,
  namespace: string,
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

  if (namespace == null || namespace.trim() === '') {
    throw new DocumentAnalysisError(
      'Valid namespace is required',
      'findRelatedDocuments',
      [],
      ['Provide a non-empty namespace string']
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

  // Content fingerprinting - extract keywords and concepts
  let keywords: string[] = [];
  try {
    keywords = extractKeywords(title, overview ?? '');
    if (keywords.length === 0) {
      console.warn('No keywords extracted from title and overview, analysis may be limited');
    }
  } catch (error) {
    console.warn('Keyword extraction failed, using title words as fallback:', error);
    keywords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  }

  const suggestions: RelatedDocumentSuggestion[] = [];
  const processingErrors: string[] = [];
  let processedCount = 0;
  let skippedCount = 0;

  try {
    // Get all documents across namespaces
    const allDocuments = await manager.listDocuments();

    if (allDocuments.length === 0) {
      console.warn('No documents found in document manager');
      return [];
    }

    for (const docInfo of allDocuments) {
      try {
        // Skip documents in the same namespace for related docs analysis
        const docNamespace = pathToNamespace(docInfo.path);
        if (docNamespace === namespace) {
          skippedCount++;
          continue;
        }

        const document = await manager.getDocument(docInfo.path);
        if (document == null) {
          processingErrors.push(`Document not found: ${docInfo.path}`);
          continue;
        }

        // For content analysis, we need to read the actual content
        let content = '';
        try {
          content = await manager.getSectionContent(docInfo.path, '') ?? '';
        } catch (error) {
          processingErrors.push(`Content reading failed for ${docInfo.path}: ${error}`);
          // Continue with empty content rather than skipping the document
        }

        // Calculate relevance based on title and content overlap
        let relevance = 0;
        try {
          relevance = calculateContentRelevance(keywords, document.metadata.title, content);
        } catch (error) {
          processingErrors.push(`Relevance calculation failed for ${docInfo.path}: ${error}`);
          continue;
        }

        if (relevance > 0.3) { // Only include moderately relevant or higher
          try {
            // Determine relationship type and implementation gap
            const relationship = analyzeDocumentRelationship(namespace, docNamespace, title, document.metadata.title);

            const suggestion: RelatedDocumentSuggestion = {
              path: docInfo.path,
              title: document.metadata.title,
              namespace: docNamespace,
              reason: relationship.reason,
              relevance: Math.round(relevance * 100) / 100
            };

            if (relationship.sectionsToReference != null) {
              suggestion.sections_to_reference = relationship.sectionsToReference;
            }

            if (relationship.implementationGap != null) {
              suggestion.implementation_gap = relationship.implementationGap;
            }

            suggestions.push(suggestion);
          } catch (error) {
            processingErrors.push(`Relationship analysis failed for ${docInfo.path}: ${error}`);
          }
        }

        processedCount++;
      } catch (error) {
        processingErrors.push(`Document processing failed for ${docInfo.path}: ${error}`);
      }
    }

    // Log processing summary
    console.warn(`Related documents analysis: processed ${processedCount}, skipped ${skippedCount}, found ${suggestions.length} relevant`);
    if (processingErrors.length > 0) {
      console.warn(`Processing errors (${processingErrors.length}):`, `${processingErrors.slice(0, 3).join('; ')}${processingErrors.length > 3 ? ` (and ${processingErrors.length - 3} more)` : ''}`);
    }

    // Sort by relevance and return top 5
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);

  } catch (error) {
    // If document listing fails, this is a critical error
    throw new DocumentAnalysisError(
      `Failed to list documents for related analysis: ${error}`,
      'findRelatedDocuments',
      suggestions, // Return any partial results
      [
        'Check document manager connectivity',
        'Verify file system permissions',
        'Ensure document root directory exists',
        'Try restarting the document service'
      ]
    );
  }
}

/**
 * Find similar implementations within the same namespace
 *
 * Analyzes documents within the same namespace to identify similar patterns,
 * reusable implementations, and relevant approaches. Uses lower relevance
 * thresholds since documents in the same namespace are more likely to be related.
 *
 * @param manager - Document manager for accessing documents
 * @param namespace - Target namespace to search within
 * @param title - Document title for similarity analysis
 * @param overview - Document overview for pattern matching
 *
 * @returns Promise resolving to array of similar implementation suggestions
 *
 * @throws {DocumentAnalysisError} When critical operations fail
 *
 * @example
 * ```typescript
 * const similar = await findSimilarImplementations(manager, 'api/specs', 'Auth API', 'User authentication');
 * similar.forEach(impl => console.log(`Pattern: ${impl.reusable_patterns.join(', ')}`));
 * ```
 */
async function findSimilarImplementations(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string
): Promise<SimilarImplementationSuggestion[]> {
  // Input validation
  if (manager == null) {
    throw new DocumentAnalysisError(
      'Document manager is required',
      'findSimilarImplementations',
      [],
      ['Ensure document manager is properly initialized']
    );
  }

  if (namespace == null || namespace.trim() === '') {
    throw new DocumentAnalysisError(
      'Valid namespace is required',
      'findSimilarImplementations',
      [],
      ['Provide a non-empty namespace string']
    );
  }

  let keywords: string[] = [];
  try {
    keywords = extractKeywords(title ?? '', overview ?? '');
    if (keywords.length === 0) {
      console.warn('No keywords extracted, similarity analysis may be limited');
    }
  } catch (error) {
    console.warn('Keyword extraction failed, using basic fallback:', error);
    keywords = (title ?? '').toLowerCase().split(/\s+/).filter(word => word.length > 2);
  }

  const suggestions: SimilarImplementationSuggestion[] = [];
  const processingErrors: string[] = [];
  let processedCount = 0;

  try {
    // Get documents in the same namespace
    const allDocuments = await manager.listDocuments();
    const namespaceDocuments = allDocuments.filter(docInfo => {
      try {
        return pathToNamespace(docInfo.path) === namespace;
      } catch (error) {
        processingErrors.push(`Path namespace extraction failed for ${docInfo.path}: ${error}`);
        return false;
      }
    });

    if (namespaceDocuments.length === 0) {
      console.warn(`No documents found in namespace: ${namespace}`);
      return [];
    }

    for (const docInfo of namespaceDocuments) {
      try {
        const document = await manager.getDocument(docInfo.path);
        if (document == null) {
          processingErrors.push(`Document not found: ${docInfo.path}`);
          continue;
        }

        // For content analysis, we need to read the actual content
        let content = '';
        try {
          content = await manager.getSectionContent(docInfo.path, '') ?? '';
        } catch (error) {
          processingErrors.push(`Content reading failed for ${docInfo.path}: ${error}`);
          // Continue with empty content rather than skipping
        }

        // Calculate similarity based on content patterns
        let relevance = 0;
        try {
          relevance = calculateContentRelevance(keywords, document.metadata.title, content);
        } catch (error) {
          processingErrors.push(`Relevance calculation failed for ${docInfo.path}: ${error}`);
          continue;
        }

        if (relevance > 0.2) { // Lower threshold for same namespace
          let patterns: string[] = [];
          try {
            patterns = extractReusablePatterns(content, namespace);
          } catch (error) {
            processingErrors.push(`Pattern extraction failed for ${docInfo.path}: ${error}`);
            patterns = []; // Continue with empty patterns
          }

          let reason = '';
          try {
            reason = generateSimilarityReason(namespace, title, document.metadata.title, patterns);
          } catch (error) {
            processingErrors.push(`Similarity reason generation failed for ${docInfo.path}: ${error}`);
            reason = `Similar ${namespace} document with comparable structure`;
          }

          suggestions.push({
            path: docInfo.path,
            title: document.metadata.title,
            namespace,
            reason,
            relevance: Math.round(relevance * 100) / 100,
            reusable_patterns: patterns
          });
        }

        processedCount++;
      } catch (error) {
        processingErrors.push(`Document processing failed for ${docInfo.path}: ${error}`);
      }
    }

    // Log processing summary
    console.warn(`Similar implementations analysis: processed ${processedCount} in namespace ${namespace}, found ${suggestions.length} similar`);
    if (processingErrors.length > 0) {
      console.warn(`Processing errors (${processingErrors.length}):`, `${processingErrors.slice(0, 3).join('; ')}${processingErrors.length > 3 ? ` (and ${processingErrors.length - 3} more)` : ''}`);
    }

    // Sort by relevance and return top 3
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);

  } catch (error) {
    throw new DocumentAnalysisError(
      `Failed to find similar implementations in namespace ${namespace}: ${error}`,
      'findSimilarImplementations',
      suggestions, // Return any partial results
      [
        'Check document manager connectivity',
        'Verify namespace exists and contains documents',
        'Ensure file system permissions are correct',
        'Try with a different namespace'
      ]
    );
  }
}

/**
 * Identify missing pieces in the documentation ecosystem
 *
 * Analyzes the document ecosystem to identify gaps in documentation,
 * missing implementation guides, troubleshooting docs, and other
 * complementary documents that would enhance the documentation set.
 *
 * @param manager - Document manager for accessing existing documents
 * @param namespace - Target namespace for analysis
 * @param title - Document title for context
 * @param overview - Document overview for analysis
 * @param relatedDocs - Previously found related documents
 *
 * @returns Promise resolving to array of missing piece suggestions
 *
 * @throws {DocumentAnalysisError} When critical analysis operations fail
 *
 * @example
 * ```typescript
 * const missing = await identifyMissingPieces(manager, 'api/specs', 'Auth API', overview, relatedDocs);
 * missing.forEach(piece => console.log(`Missing: ${piece.type} - ${piece.title}`));
 * ```
 */
async function identifyMissingPieces(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string,
  relatedDocs: RelatedDocumentSuggestion[]
): Promise<MissingPieceSuggestion[]> {
  // Input validation
  if (manager == null) {
    throw new DocumentAnalysisError(
      'Document manager is required',
      'identifyMissingPieces',
      [],
      ['Ensure document manager is properly initialized']
    );
  }

  if (namespace == null || namespace.trim() === '') {
    throw new DocumentAnalysisError(
      'Valid namespace is required',
      'identifyMissingPieces',
      [],
      ['Provide a non-empty namespace string']
    );
  }

  const missingPieces: MissingPieceSuggestion[] = [];
  const analysisErrors: string[] = [];

  try {
    // Cross-namespace gap analysis with error handling
    try {
      const gapAnalysis = await performGapAnalysis(manager, namespace, title ?? '', overview ?? '', relatedDocs ?? []);
      missingPieces.push(...gapAnalysis);
    } catch (error) {
      analysisErrors.push(`Gap analysis failed: ${error}`);
      console.warn('Gap analysis failed, continuing with namespace analysis:', error);

      // Provide fallback gap analysis
      const fallbackGaps = generateFallbackGapAnalysis(namespace, title ?? '');
      missingPieces.push(...fallbackGaps);
    }

    // Namespace-specific missing pieces with error handling
    try {
      const namespacePieces = identifyNamespaceMissingPieces(namespace, title ?? '', relatedDocs ?? []);
      missingPieces.push(...namespacePieces);
    } catch (error) {
      analysisErrors.push(`Namespace analysis failed: ${error}`);
      console.warn('Namespace-specific analysis failed:', error);
    }

    // If no pieces found and we had errors, provide basic fallback
    if (missingPieces.length === 0 && analysisErrors.length > 0) {
      console.warn('No missing pieces identified, providing basic fallback suggestions');
      missingPieces.push(...generateFallbackMissingPieces(namespace, title ?? ''));
    }

    // Sort by priority with error handling
    try {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const sortedPieces = missingPieces
        .filter(piece => piece.priority in priorityOrder) // Filter invalid priorities
        .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
        .slice(0, 4); // Limit to top 4 suggestions

      return sortedPieces;
    } catch (error) {
      analysisErrors.push(`Priority sorting failed: ${error}`);
      console.warn('Priority sorting failed, returning unsorted results:', error);
      return missingPieces.slice(0, 4);
    }

  } catch (error) {
    // If everything fails, provide minimal fallback
    const fallbackPieces = generateFallbackMissingPieces(namespace, title ?? '');

    throw new DocumentAnalysisError(
      `Missing pieces analysis failed: ${error}${analysisErrors.length > 0 ? `. Additional errors: ${analysisErrors.join('; ')}` : ''}`,
      'identifyMissingPieces',
      fallbackPieces,
      [
        'Check document manager connectivity',
        'Verify namespace format and accessibility',
        'Try with simpler input parameters',
        'Check system resources and permissions'
      ]
    );
  }
}

/**
 * Generate logical implementation sequence
 */
function generateImplementationSequence(
  relatedDocs: RelatedDocumentSuggestion[],
  missingPieces: MissingPieceSuggestion[],
  namespace: string,
  title: string
): ImplementationStep[] {
  const steps: ImplementationStep[] = [];
  let order = 1;

  // Step 1: Always start with current document
  steps.push({
    order: order++,
    action: getNamespaceAction(namespace),
    document: `Current document (${title})`,
    focus: getNamespaceFocus(namespace)
  });

  // Step 2: Add high-priority missing pieces
  const highPriorityPieces = missingPieces.filter(piece => piece.priority === 'high');
  for (const piece of highPriorityPieces.slice(0, 2)) { // Limit to 2 high priority
    const step: ImplementationStep = {
      order: order++,
      action: `Create ${piece.type}`,
      document: piece.suggested_path,
      focus: piece.reason
    };

    const defaultSections = getDefaultSectionsForType(piece.type);
    if (defaultSections.length > 0) {
      step.sections = defaultSections;
    }

    steps.push(step);
  }

  // Step 3: Reference related documents
  const topRelated = relatedDocs.slice(0, 2); // Top 2 related docs
  for (const related of topRelated) {
    if (related.implementation_gap != null) {
      const step: ImplementationStep = {
        order: order++,
        action: 'Reference and implement',
        document: related.path,
        focus: related.implementation_gap ?? 'Reference for implementation patterns'
      };

      if (related.sections_to_reference != null) {
        step.sections = related.sections_to_reference;
      }

      steps.push(step);
    }
  }

  return steps.slice(0, 4); // Limit to 4 steps for clarity
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

/**
 * Analyze relationship between documents
 */
function analyzeDocumentRelationship(
  sourceNamespace: string,
  targetNamespace: string,
  _sourceTitle: string,
  _targetTitle: string
): { reason: string; sectionsToReference?: string[]; implementationGap?: string } {
  // API specs → guides relationship
  if (sourceNamespace === 'api/specs' && targetNamespace === 'api/guides') {
    return {
      reason: 'Related API implementation guide with proven patterns',
      sectionsToReference: ['#setup', '#implementation', '#testing'],
      implementationGap: 'Create implementation guide based on this API spec'
    };
  }

  // API specs → services relationship
  if (sourceNamespace === 'api/specs' && targetNamespace === 'backend/services') {
    return {
      reason: 'Backend service implementing similar API patterns',
      sectionsToReference: ['#architecture', '#data-layer'],
      implementationGap: 'Design service architecture for this API'
    };
  }

  // Guides → components relationship
  if (sourceNamespace === 'api/guides' && targetNamespace === 'frontend/components') {
    return {
      reason: 'Frontend component consuming this API functionality',
      sectionsToReference: ['#usage-examples', '#props-interface']
    };
  }

  // Default relationship
  return {
    reason: `Similar functionality and patterns in ${targetNamespace}`,
    sectionsToReference: ['#overview']
  };
}

/**
 * Extract reusable patterns from document content
 */
function extractReusablePatterns(content: string, namespace: string): string[] {
  const patterns: string[] = [];

  // Common patterns by namespace
  if (namespace === 'api/specs') {
    if (content.includes('authentication')) patterns.push('Authentication patterns');
    if (content.includes('rate limit')) patterns.push('Rate limiting');
    if (content.includes('pagination')) patterns.push('Pagination');
    if (content.includes('webhook')) patterns.push('Webhook handling');
  } else if (namespace === 'api/guides') {
    if (content.includes('step')) patterns.push('Step-by-step structure');
    if (content.includes('test')) patterns.push('Testing approach');
    if (content.includes('troubleshoot')) patterns.push('Troubleshooting flow');
  } else if (namespace === 'frontend/components') {
    if (content.includes('props')) patterns.push('Props interface design');
    if (content.includes('accessibility')) patterns.push('Accessibility patterns');
    if (content.includes('theme')) patterns.push('Theme integration');
  }

  return patterns;
}

/**
 * Generate similarity reason based on patterns
 */
function generateSimilarityReason(
  namespace: string,
  _title: string,
  _similarTitle: string,
  patterns: string[]
): string {
  if (patterns.length === 0) {
    return `Similar ${namespace} document with comparable structure`;
  }

  return `Shares proven patterns: ${patterns.slice(0, 2).join(', ')}`;
}

/**
 * Perform gap analysis to find missing documents
 *
 * Analyzes the documentation ecosystem to identify common patterns of
 * missing complementary documents based on namespace conventions.
 *
 * @param _manager - Document manager (currently unused but kept for future expansion)
 * @param namespace - Target namespace for gap analysis
 * @param title - Document title for generating suggestions
 * @param _overview - Document overview (currently unused but kept for future expansion)
 * @param relatedDocs - Related documents to check for existing coverage
 *
 * @returns Promise resolving to array of gap analysis suggestions
 *
 * @throws {DocumentAnalysisError} When slug generation fails or critical operations fail
 */
async function performGapAnalysis(
  _manager: DocumentManager,
  namespace: string,
  title: string,
  _overview: string,
  relatedDocs: RelatedDocumentSuggestion[]
): Promise<MissingPieceSuggestion[]> {
  // Input validation
  if (namespace == null || namespace.trim() === '') {
    throw new DocumentAnalysisError(
      'Valid namespace is required for gap analysis',
      'performGapAnalysis',
      [],
      ['Provide a non-empty namespace string']
    );
  }

  if (title == null || title.trim() === '') {
    throw new DocumentAnalysisError(
      'Valid title is required for gap analysis',
      'performGapAnalysis',
      [],
      ['Provide a non-empty title string']
    );
  }

  const gaps: MissingPieceSuggestion[] = [];
  const relatedDocsArray = relatedDocs ?? [];

  try {
    // API spec → implementation guide gap
    if (namespace === 'api/specs') {
      const guideExists = relatedDocsArray.some(doc => doc.namespace === 'api/guides');
      if (!guideExists) {
        try {
          const { titleToSlug } = await import('../slug.js');
          const slug = titleToSlug(title);
          gaps.push({
            type: 'guide',
            suggested_path: `/api/guides/${slug}-implementation.md`,
            title: `${title} Implementation Guide`,
            reason: 'No implementation guide exists for this API specification',
            priority: 'high'
          });
        } catch (error) {
          console.warn('Failed to generate implementation guide suggestion:', error);
          // Provide fallback without slug generation
          gaps.push({
            type: 'guide',
            suggested_path: `/api/guides/implementation.md`,
            title: `${title} Implementation Guide`,
            reason: 'No implementation guide exists for this API specification',
            priority: 'high'
          });
        }
      }
    }

    // Guide → troubleshooting gap
    if (namespace === 'api/guides' || namespace === 'frontend/components') {
      const troubleshootingExists = relatedDocsArray.some(doc => doc.namespace === 'docs/troubleshooting');
      if (!troubleshootingExists) {
        try {
          const { titleToSlug } = await import('../slug.js');
          const slug = titleToSlug(title);
          gaps.push({
            type: 'troubleshooting',
            suggested_path: `/docs/troubleshooting/${slug}-issues.md`,
            title: `${title} Common Issues`,
            reason: 'No troubleshooting documentation exists for this implementation',
            priority: 'medium'
          });
        } catch (error) {
          console.warn('Failed to generate troubleshooting suggestion:', error);
          // Provide fallback without slug generation
          gaps.push({
            type: 'troubleshooting',
            suggested_path: `/docs/troubleshooting/common-issues.md`,
            title: `${title} Common Issues`,
            reason: 'No troubleshooting documentation exists for this implementation',
            priority: 'medium'
          });
        }
      }
    }

    // Backend services → API spec gap
    if (namespace === 'backend/services') {
      const apiSpecExists = relatedDocsArray.some(doc => doc.namespace === 'api/specs');
      if (!apiSpecExists) {
        try {
          const { titleToSlug } = await import('../slug.js');
          const slug = titleToSlug(title);
          gaps.push({
            type: 'spec',
            suggested_path: `/api/specs/${slug}-api.md`,
            title: `${title} API Specification`,
            reason: 'No API specification exists for this backend service',
            priority: 'high'
          });
        } catch (error) {
          console.warn('Failed to generate API spec suggestion:', error);
        }
      }
    }

    return gaps;

  } catch (error) {
    throw new DocumentAnalysisError(
      `Gap analysis failed for namespace ${namespace}: ${error}`,
      'performGapAnalysis',
      gaps, // Return any partial results
      [
        'Check slug generation dependencies',
        'Verify namespace format',
        'Try with simpler title',
        'Check system resources'
      ]
    );
  }
}

/**
 * Identify namespace-specific missing pieces
 */
function identifyNamespaceMissingPieces(
  _namespace: string,
  _title: string,
  _relatedDocs: RelatedDocumentSuggestion[]
): MissingPieceSuggestion[] {
  // This could be expanded with more sophisticated analysis
  // For now, return basic suggestions based on namespace patterns
  return [];
}

/**
 * Get default sections for document type
 */
function getDefaultSectionsForType(type: string): string[] {
  switch (type) {
    case 'guide':
      return ['#prerequisites', '#step-by-step-implementation', '#testing'];
    case 'spec':
      return ['#overview', '#endpoints', '#authentication'];
    case 'troubleshooting':
      return ['#quick-diagnostics', '#common-issues', '#advanced-diagnostics'];
    case 'component':
      return ['#props-interface', '#usage-examples', '#styling'];
    case 'service':
      return ['#architecture-overview', '#components', '#deployment'];
    default:
      return ['#overview'];
  }
}

/**
 * Get action name for namespace
 */
function getNamespaceAction(namespace: string): string {
  switch (namespace) {
    case 'api/specs':
      return 'Create API specification';
    case 'api/guides':
      return 'Create implementation guide';
    case 'frontend/components':
      return 'Create component documentation';
    case 'backend/services':
      return 'Create service documentation';
    case 'docs/troubleshooting':
      return 'Create troubleshooting guide';
    default:
      return 'Create document';
  }
}

/**
 * Get focus description for namespace
 */
function getNamespaceFocus(namespace: string): string {
  switch (namespace) {
    case 'api/specs':
      return 'Define endpoints, schemas, and authentication requirements';
    case 'api/guides':
      return 'Provide step-by-step implementation with code examples';
    case 'frontend/components':
      return 'Document props, usage patterns, and accessibility features';
    case 'backend/services':
      return 'Define architecture, data flows, and integration patterns';
    case 'docs/troubleshooting':
      return 'Document common issues, diagnostics, and solutions';
    default:
      return 'Define structure and core content';
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

/**
 * Generate fallback missing pieces when analysis fails
 *
 * @param namespace - Target namespace
 * @param title - Document title
 *
 * @returns Array of basic missing piece suggestions
 */
function generateFallbackMissingPieces(namespace: string, title: string): MissingPieceSuggestion[] {
  const fallbackPieces: MissingPieceSuggestion[] = [];

  try {
    // Basic suggestions based on namespace patterns
    if (namespace === 'api/specs') {
      fallbackPieces.push({
        type: 'guide',
        suggested_path: `/api/guides/implementation.md`,
        title: `${title} Implementation Guide`,
        reason: 'Implementation guide recommended for API specifications',
        priority: 'high'
      });
    } else if (namespace === 'api/guides') {
      fallbackPieces.push({
        type: 'troubleshooting',
        suggested_path: `/docs/troubleshooting/common-issues.md`,
        title: `${title} Common Issues`,
        reason: 'Troubleshooting documentation recommended for implementation guides',
        priority: 'medium'
      });
    }

    // Generic suggestion for all namespaces
    fallbackPieces.push({
      type: 'guide',
      suggested_path: `/docs/overview.md`,
      title: 'Documentation Overview',
      reason: 'Central overview document for documentation navigation',
      priority: 'low'
    });

  } catch (error) {
    console.warn('Failed to generate fallback missing pieces:', error);
  }

  return fallbackPieces;
}

/**
 * Generate fallback gap analysis when normal analysis fails
 *
 * @param namespace - Target namespace
 * @param title - Document title
 *
 * @returns Array of basic gap analysis suggestions
 */
function generateFallbackGapAnalysis(namespace: string, _title: string): MissingPieceSuggestion[] {
  const fallbackGaps: MissingPieceSuggestion[] = [];

  try {
    // Basic gap patterns
    if (namespace === 'api/specs') {
      fallbackGaps.push({
        type: 'guide',
        suggested_path: `/api/guides/getting-started.md`,
        title: 'Getting Started Guide',
        reason: 'Basic implementation guide for API usage',
        priority: 'high'
      });
    }

    if (namespace.includes('api') || namespace.includes('backend')) {
      fallbackGaps.push({
        type: 'troubleshooting',
        suggested_path: `/docs/troubleshooting/api-issues.md`,
        title: 'API Troubleshooting',
        reason: 'Common API troubleshooting documentation',
        priority: 'medium'
      });
    }

  } catch (error) {
    console.warn('Failed to generate fallback gap analysis:', error);
  }

  return fallbackGaps;
}

/**
 * Generate fallback implementation sequence when normal generation fails
 *
 * @param namespace - Target namespace
 * @param title - Document title
 *
 * @returns Array of basic implementation steps
 */
function generateFallbackImplementationSequence(namespace: string, title: string): ImplementationStep[] {
  try {
    const steps: ImplementationStep[] = [];

    // Basic sequence always starts with current document
    steps.push({
      order: 1,
      action: getNamespaceAction(namespace),
      document: `Current document (${title})`,
      focus: getNamespaceFocus(namespace)
    });

    // Add basic follow-up step based on namespace
    if (namespace === 'api/specs') {
      steps.push({
        order: 2,
        action: 'Create implementation guide',
        document: 'Implementation guide',
        focus: 'Provide step-by-step implementation instructions'
      });
    } else if (namespace === 'api/guides') {
      steps.push({
        order: 2,
        action: 'Create troubleshooting guide',
        document: 'Troubleshooting documentation',
        focus: 'Document common issues and solutions'
      });
    }

    return steps;

  } catch (error) {
    console.warn('Failed to generate fallback implementation sequence:', error);
    // Minimal fallback
    return [{
      order: 1,
      action: 'Create document',
      document: title,
      focus: 'Define basic structure and content'
    }];
  }
}