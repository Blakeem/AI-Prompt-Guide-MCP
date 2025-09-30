/**
 * Document analysis and smart suggestions functionality
 */

import type { DocumentManager } from '../document-manager.js';
import type {
  SmartSuggestions,
  RelatedDocumentSuggestion
} from '../tools/schemas/create-document-schemas.js';
import type { FingerprintEntry } from '../document-cache.js';
import { pathToNamespace } from './path-utilities.js';
import { AddressingError } from './addressing-system.js';
import { getGlobalLogger } from '../utils/logger.js';
import { ReferenceExtractor } from './reference-extractor.js';
import {
  extractWeightedKeywords,
  calculateWeightedRelevanceWithBreakdown,
  generateFactorBasedExplanation,
  type KeywordExtractionResult,
  type RelevanceCalculationResult,
  DEFAULT_SCORING_FEATURES
} from './document-analysis/keyword-utils.js';

const logger = getGlobalLogger();

// Performance optimization constants for two-stage filtering
const FINGERPRINT_THRESHOLD = 0.3;
const MAX_CANDIDATES_FOR_CONTENT_ANALYSIS = 10;

/**
 * Extended fingerprint entry that includes document path for processing
 */
interface FingerprintCandidate {
  readonly fingerprint: FingerprintEntry;
  readonly path: string;
  readonly score: number;
}

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
 * Find related documents using two-stage fingerprint-based filtering
 *
 * Uses efficient fingerprint-based initial filtering followed by full content
 * analysis only for high-signal candidates. This significantly improves performance
 * for large document sets while maintaining result quality.
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

  // Extract keywords from title and overview using enhanced extraction
  let keywords: string[] = [];
  let keywordResult: KeywordExtractionResult;
  try {
    keywordResult = extractWeightedKeywords(title, overview ?? '');
    keywords = [...keywordResult.keywords];

    if (keywords.length === 0) {
      logger.warn('No keywords extracted from title and overview');
      keywords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    } else {
      logger.debug('Enhanced keyword extraction successful', {
        keywordCount: keywords.length,
        hasExplicitKeywords: keywordResult.hasExplicitKeywords,
        totalWeight: Math.round(keywordResult.totalWeight * 100) / 100
      });
    }
  } catch (error) {
    logger.warn('Enhanced keyword extraction failed, using fallback', { error });
    keywords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    keywordResult = {
      weightedKeywords: keywords.map(k => ({ keyword: k, weight: 1.0, sources: ['fallback'] })),
      keywords,
      hasExplicitKeywords: false,
      totalWeight: keywords.length
    };
  }

  try {
    // Stage 1: Fast fingerprint-based filtering (if available)
    let candidates: FingerprintCandidate[] = [];
    let usedFingerprintFiltering = false;

    try {
      // Check if fingerprint listing is available
      if (typeof manager.listDocumentFingerprints === 'function') {
        logger.debug('Starting Stage 1: fingerprint-based filtering', {
          keywords,
          threshold: FINGERPRINT_THRESHOLD
        });

        const fingerprints = await manager.listDocumentFingerprints();
        logger.debug(`Retrieved ${fingerprints.length} document fingerprints`);

        if (fingerprints.length > 0) {
          // Get all documents to match with fingerprints
          const allDocuments = await manager.listDocuments();
          const pathToFingerprint = new Map<string, FingerprintEntry>();

          // Create mapping of paths to fingerprints by matching metadata
          for (const docInfo of allDocuments) {
            try {
              const document = await manager.getDocument(docInfo.path);
              if (document != null) {
                const fingerprint = fingerprints.find(fp =>
                  fp.namespace === document.metadata.namespace &&
                  fp.contentHash === document.metadata.contentHash &&
                  fp.lastModified.getTime() === document.metadata.lastModified.getTime()
                );
                if (fingerprint != null) {
                  pathToFingerprint.set(docInfo.path, fingerprint);
                }
              }
            } catch {
              // Skip documents that fail to load
              continue;
            }
          }

          logger.debug(`Successfully mapped ${pathToFingerprint.size} documents to fingerprints`);

          // Calculate fingerprint-based relevance scores
          for (const [docPath, fingerprint] of pathToFingerprint.entries()) {
            const score = calculateFingerprintRelevance(keywords, fingerprint.keywords);
            candidates.push({
              fingerprint,
              path: docPath,
              score
            });
          }

          // Filter candidates above threshold
          candidates = candidates
            .filter(candidate => candidate.score > FINGERPRINT_THRESHOLD)
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_CANDIDATES_FOR_CONTENT_ANALYSIS);

          logger.debug(`Fingerprint analysis: ${pathToFingerprint.size} documents, ${candidates.length} candidates above threshold ${FINGERPRINT_THRESHOLD}`);
          usedFingerprintFiltering = true;
        }
      }
    } catch (error) {
      logger.warn('Fingerprint-based filtering failed, falling back to full analysis', { error });
    }

    // Fallback: If fingerprint filtering not available or failed, use original approach
    if (!usedFingerprintFiltering) {
      logger.debug('Using fallback: original algorithm (no fingerprint filtering)');
      const allDocuments = await manager.listDocuments();

      if (allDocuments.length === 0) {
        logger.debug('No documents available, returning empty results');
        return [];
      }

      // Use original algorithm: process all documents with content analysis
      for (const docInfo of allDocuments) {
        try {
          const document = await manager.getDocument(docInfo.path);
          if (document == null) {
            continue;
          }

          // Read document content for keyword matching (like original)
          let content = '';
          try {
            content = await manager.getDocumentContent(docInfo.path) ?? '';
          } catch (error) {
            logger.warn(`Failed to read content for document ${docInfo.path}`, { error });
            // Fallback to metadata when content is unavailable
            content = document.metadata.title;
          }

          // Calculate relevance based on keyword overlap (like original)
          const relevance = calculateContentRelevance(keywords, document.metadata.title, content);

          if (relevance > 0.2) { // Same threshold as original
            // Note: variables removed as unused in fallback path (docNamespace, reason)
            // (was: based on contentSource === 'metadata' for informative reason)

            candidates.push({
              fingerprint: {
                keywords: [],
                lastModified: document.metadata.lastModified,
                contentHash: document.metadata.contentHash,
                namespace: document.metadata.namespace
              },
              path: docInfo.path,
              score: relevance // Use content relevance directly
            });
          }
        } catch {
          // Skip failed documents silently
          continue;
        }
      }

      logger.debug(`Fallback analysis: ${allDocuments.length} documents processed, ${candidates.length} candidates above threshold 0.2`);
    }

    if (candidates.length === 0) {
      logger.debug('No candidates found, returning empty results');
      return [];
    }

    // Stage 2: Process candidates based on filtering method
    if (usedFingerprintFiltering) {
      // For fingerprint filtering: do full content analysis
      logger.debug('Starting Stage 2: content analysis for fingerprint candidates', {
        candidateCount: candidates.length
      });

      const fullAnalysis = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            // Load full content for detailed analysis
            let content = '';
            let contentSource = 'content';

            try {
              content = await manager.getDocumentContent(candidate.path) ?? '';
            } catch (error) {
              logger.warn(`Failed to read content for document ${candidate.path}`, { error });
              // Fallback to metadata when content is unavailable
              const document = await manager.getDocument(candidate.path);
              content = document?.metadata.title ?? '';
              contentSource = 'metadata';
            }

            // Calculate detailed content relevance using enhanced weighting
            const document = await manager.getDocument(candidate.path);
            if (document == null) {
              return null;
            }

            // Use enhanced multi-factor relevance calculation if we have weighted keywords
            let contentScore: number;
            let relevanceResult: RelevanceCalculationResult | null = null;

            if (keywordResult.weightedKeywords.length > 0) {
              // Extract source namespace from the document being created (use _namespace or 'root')
              const sourceNamespace = _namespace ?? 'root';
              const sourceContent = overview ?? '';

              // Extract target namespace
              const targetNamespace = document.metadata.namespace ?? pathToNamespace(candidate.path);

              // Use enhanced calculation with factor breakdown for explanation generation
              relevanceResult = calculateWeightedRelevanceWithBreakdown(
                keywordResult.weightedKeywords,
                title,                           // sourceTitle
                sourceNamespace,                 // sourceNamespace
                sourceContent,                   // sourceContent
                document.metadata.title,         // targetTitle
                content,                         // targetContent
                targetNamespace,                 // targetNamespace
                document.metadata.lastModified,  // targetLastModified
                candidate.path,                  // targetPath
                candidate.fingerprint,           // targetFingerprint
                DEFAULT_SCORING_FEATURES         // features
              );
              contentScore = relevanceResult.relevance;
            } else {
              // Fallback to original calculation
              contentScore = calculateContentRelevance(keywords, document.metadata.title, content);
            }

            // Combine fingerprint and content scores with weighted approach
            const combinedScore = (candidate.score * 0.3) + (contentScore * 0.7);

            logger.debug(`Content analysis for ${candidate.path}`, {
              fingerprintScore: Math.round(candidate.score * 100) / 100,
              contentScore: Math.round(contentScore * 100) / 100,
              combinedScore: Math.round(combinedScore * 100) / 100,
              contentSource,
              contentLength: content.length,
              hasFactorBreakdown: relevanceResult != null
            });

            const docNamespace = pathToNamespace(candidate.path);

            // Generate factor-based explanation using enhanced system
            let reason: string;
            if (relevanceResult != null && relevanceResult.primaryFactors.length > 0) {
              // Use factor-based explanation generation
              reason = generateFactorBasedExplanation(
                relevanceResult.primaryFactors,
                docNamespace,
                keywordResult.hasExplicitKeywords
              );
            } else if (contentSource === 'metadata') {
              // Fallback for metadata-only analysis
              reason = `Related documentation in ${docNamespace} (based on title and keywords)`;
            } else {
              // Generic fallback
              reason = `Related documentation in ${docNamespace}`;
            }

            return {
              path: candidate.path,
              title: document.metadata.title,
              namespace: docNamespace,
              reason,
              relevance: Math.round(combinedScore * 100) / 100
            };
          } catch (error) {
            logger.warn(`Content analysis failed for candidate ${candidate.path}`, { error });
            return null;
          }
        })
      );

      // Filter out failed analyses and apply minimum relevance threshold
      const validResults = fullAnalysis
        .filter((result): result is RelatedDocumentSuggestion => result != null && result.relevance > 0.2)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5);

      logger.debug(`Content analysis: ${candidates.length} candidates processed`);
      logger.debug(`Discovery complete: ${validResults.length} related documents found using fingerprint filtering`);

      return validResults;

    } else {
      // For fallback: candidates already have final scores, just format them
      logger.debug('Stage 2: formatting fallback results', {
        candidateCount: candidates.length
      });

      const fallbackResults = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const document = await manager.getDocument(candidate.path);
            if (document == null) {
              return null;
            }

            const docNamespace = pathToNamespace(candidate.path);

            // For fallback results, generate basic but informative reason
            const reason = `Related documentation in ${docNamespace}`;

            return {
              path: candidate.path,
              title: document.metadata.title,
              namespace: docNamespace,
              reason,
              relevance: Math.round(candidate.score * 100) / 100
            };
          } catch (error) {
            logger.warn(`Fallback result formatting failed for ${candidate.path}`, { error });
            return null;
          }
        })
      );

      const validResults = fallbackResults
        .filter((result): result is RelatedDocumentSuggestion => result != null)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5);

      logger.debug(`Discovery complete: ${validResults.length} related documents found using fallback filtering`);

      return validResults;
    }

  } catch (error) {
    throw new DocumentAnalysisError(
      `Failed to find related documents: ${error}`,
      'findRelatedDocuments',
      [],
      [
        'Check document manager connectivity',
        'Verify fingerprint cache functionality',
        'Ensure document root directory exists',
        'Try with simpler keywords'
      ]
    );
  }
}

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
async function detectBrokenReferences(
  manager: DocumentManager,
  _namespace: string,
  title: string,
  overview: string
): Promise<BrokenReference[]> {
  // Input validation
  if (manager == null) {
    throw new DocumentAnalysisError(
      'Document manager is required',
      'detectBrokenReferences',
      [],
      ['Ensure document manager is properly initialized']
    );
  }

  const brokenReferences: BrokenReference[] = [];
  const contentToScan = `${title ?? ''} ${overview ?? ''}`;

  try {
    // Use shared reference extraction pipeline
    const extractor = new ReferenceExtractor();

    // Extract references using the shared extractor (handles @/path and @#section)
    const standardRefs = extractor.extractReferences(contentToScan);

    // For broken reference detection, we also need to catch relative references
    // that the standard extractor doesn't handle (like @missing-doc)
    const relativeRefRegex = /@([a-zA-Z][^@\s/]*(?:\.md)?(?:#[^\s]*)?)/g;
    const relativeMatches = contentToScan.matchAll(relativeRefRegex);
    const relativeRefs = Array.from(relativeMatches, match => match[0]);

    // Combine both sets of references and deduplicate
    const allRefs = [...new Set([...standardRefs, ...relativeRefs])];

    if (allRefs.length === 0) {
      return [];
    }

    // Process standard references using the shared normalization pipeline
    try {
      const normalizedStandardRefs = extractor.normalizeReferences(standardRefs, '/');

      // Validate standard references using the shared system
      for (const ref of normalizedStandardRefs) {
        try {
          // Check if the document exists
          const document = await manager.getDocument(ref.documentPath);
          if (document == null) {
            // Document doesn't exist - this is a broken reference
            brokenReferences.push({
              reference: ref.originalRef,
              type: 'missing_document',
              documentPath: ref.documentPath,
              sectionSlug: ref.sectionSlug,
              reason: `Document not found: ${ref.documentPath}`
            });
            continue;
          }

          // If reference includes a section, check section existence
          if (ref.sectionSlug != null) {
            const sectionExists = document.sections?.has(ref.sectionSlug) ?? false;
            if (!sectionExists) {
              // Section doesn't exist - this is a broken reference
              brokenReferences.push({
                reference: ref.originalRef,
                type: 'missing_section',
                documentPath: ref.documentPath,
                sectionSlug: ref.sectionSlug,
                reason: `Section '${ref.sectionSlug}' not found in document ${ref.documentPath}`
              });
            }
          }

          // Document exists (and section exists if specified) - reference is valid
        } catch (error) {
          // If we can't check the document, consider it broken
          logger.warn(`Failed to validate reference "${ref.originalRef}":`, { error: error instanceof Error ? error.message : String(error) });
          brokenReferences.push({
            reference: ref.originalRef,
            type: 'missing_document',
            documentPath: ref.documentPath,
            sectionSlug: ref.sectionSlug,
            reason: `Failed to validate document: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
    } catch (error) {
      // If normalization fails, treat standard references as malformed
      for (const ref of standardRefs) {
        brokenReferences.push({
          reference: ref,
          type: 'malformed',
          reason: `Failed to parse reference: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    // Process relative references (not handled by shared extractor)
    const relativeOnlyRefs = relativeRefs.filter(ref => !standardRefs.includes(ref));
    for (const relativeRef of relativeOnlyRefs) {
      try {
        // Parse relative reference manually (similar to original implementation)
        const refContent = relativeRef.slice(1); // Remove @
        let documentPath = refContent;
        let sectionSlug: string | undefined;

        // Handle section references
        if (refContent.includes('#')) {
          const parts = refContent.split('#');
          documentPath = parts[0] ?? refContent;
          sectionSlug = parts[1];
        }

        // Ensure it's a markdown file
        if (!documentPath.endsWith('.md')) {
          documentPath = `${documentPath}.md`;
        }

        // Ensure it starts with /
        if (!documentPath.startsWith('/')) {
          documentPath = `/${documentPath}`;
        }

        // Check if the document exists
        const document = await manager.getDocument(documentPath);
        if (document == null) {
          brokenReferences.push({
            reference: relativeRef,
            type: 'missing_document',
            documentPath,
            sectionSlug,
            reason: `Document not found: ${documentPath}`
          });
        }
        // Note: For relative refs, we don't check sections as they're not well-defined
      } catch (error) {
        // If we can't parse the reference, consider it malformed
        logger.warn(`Failed to validate relative reference "${relativeRef}":`, { error: error instanceof Error ? error.message : String(error) });
        brokenReferences.push({
          reference: relativeRef,
          type: 'malformed',
          reason: `Failed to parse relative reference: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    // Deduplicate based on reference text (since we might have same ref detected multiple ways)
    const seenRefs = new Set<string>();
    const dedupedReferences: BrokenReference[] = [];

    for (const ref of brokenReferences) {
      if (!seenRefs.has(ref.reference)) {
        seenRefs.add(ref.reference);
        dedupedReferences.push(ref);
      }
    }

    return dedupedReferences;

  } catch (error) {
    throw new DocumentAnalysisError(
      `Broken reference detection failed: ${error}`,
      'detectBrokenReferences',
      [],
      [
        'Check document manager connectivity',
        'Verify content format',
        'Try with simpler content',
        'Ensure ReferenceExtractor is working properly'
      ]
    );
  }
}

// Helper functions for suggestion analysis

// The extractKeywords function has been moved to keyword-utils.ts
// This comment is preserved for clarity about the relocation

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
 * Calculate fingerprint-based relevance score for fast document filtering
 *
 * Performs lightweight keyword overlap analysis using document fingerprints
 * without requiring full content parsing. Used in Stage 1 filtering.
 *
 * @param sourceKeywords - Keywords extracted from the source document
 * @param fingerprintKeywords - Keywords from the document fingerprint
 *
 * @returns Relevance score between 0 and 1 based on keyword overlap
 *
 * @example
 * ```typescript
 * const score = calculateFingerprintRelevance(
 *   ['api', 'authentication', 'jwt'],
 *   ['api', 'auth', 'security', 'tokens']
 * );
 * console.log(`Fingerprint relevance: ${score}`); // 0.33 (1/3 match)
 * ```
 */
function calculateFingerprintRelevance(sourceKeywords: string[], fingerprintKeywords: string[]): number {
  // Input validation with graceful handling
  if (!Array.isArray(sourceKeywords) || !Array.isArray(fingerprintKeywords)) {
    logger.warn('Invalid input to calculateFingerprintRelevance', {
      sourceKeywords: typeof sourceKeywords,
      fingerprintKeywords: typeof fingerprintKeywords
    });
    return 0;
  }

  if (sourceKeywords.length === 0 || fingerprintKeywords.length === 0) {
    return 0;
  }

  try {
    // Normalize keywords for case-insensitive matching
    const normalizedSource = sourceKeywords
      .filter(keyword => typeof keyword === 'string' && keyword.trim().length > 0)
      .map(keyword => keyword.toLowerCase().trim());

    const normalizedFingerprint = new Set(
      fingerprintKeywords
        .filter(keyword => typeof keyword === 'string' && keyword.trim().length > 0)
        .map(keyword => keyword.toLowerCase().trim())
    );

    if (normalizedSource.length === 0 || normalizedFingerprint.size === 0) {
      return 0;
    }

    // Count matches using Set for O(1) lookup
    const matches = normalizedSource.filter(keyword => normalizedFingerprint.has(keyword));

    // Calculate overlap ratio
    const relevance = matches.length / normalizedSource.length;

    // Ensure result is within bounds
    return Math.max(0, Math.min(1, relevance));

  } catch (error) {
    logger.warn('Fingerprint relevance calculation failed', { error });
    return 0;
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


