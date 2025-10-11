/**
 * Related document discovery using two-stage fingerprint-based filtering
 *
 * Provides efficient discovery of related documents using fingerprint-based
 * initial filtering followed by full content analysis for high-signal candidates.
 */

import type { DocumentManager } from '../../document-manager.js';
import type { RelatedDocumentSuggestion } from '../../tools/schemas/create-document-schemas.js';
import type { FingerprintEntry } from '../../document-cache.js';
import { pathToNamespace } from '../path-utilities.js';
import { getGlobalLogger } from '../../utils/logger.js';
import {
  extractWeightedKeywords,
  calculateWeightedRelevanceWithBreakdown,
  generateFactorBasedExplanation,
  type KeywordExtractionResult,
  type RelevanceCalculationResult,
  DEFAULT_SCORING_FEATURES
} from './keyword-utils.js';
import { DocumentAnalysisError } from './types.js';

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
 * @param excludePath - Optional document path to exclude from results (e.g., the document being created)
 *
 * @returns Promise resolving to array of related document suggestions
 *
 * @throws {DocumentAnalysisError} When document listing fails or critical operations fail
 */
export async function findRelatedDocuments(
  manager: DocumentManager,
  _namespace: string,
  title: string,
  overview: string,
  excludePath?: string
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
          const { documents: allDocuments } = await manager.listDocuments();
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
            // Skip the document being created (prevent self-reference)
            if (excludePath != null && docPath === excludePath) {
              continue;
            }

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
      const { documents: allDocuments } = await manager.listDocuments();

      if (allDocuments.length === 0) {
        logger.debug('No documents available, returning empty results');
        return [];
      }

      // Use original algorithm: process all documents with content analysis
      for (const docInfo of allDocuments) {
        try {
          // Skip the document being created (prevent self-reference)
          if (excludePath != null && docInfo.path === excludePath) {
            continue;
          }

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
