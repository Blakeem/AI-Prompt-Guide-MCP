/**
 * Enhanced keyword extraction and weighting utilities for document analysis
 *
 * This module provides sophisticated keyword extraction with weighted scoring
 * from multiple content sources including frontmatter, titles, headings,
 * emphasized text, and content body. Integrates with the existing fingerprint
 * system while providing enhanced relevance scoring capabilities.
 *
 * Note: Some exports may appear unused by dead code detection but are part
 * of the Stage 4+ enhanced discovery system implementation. Functions like
 * extractKeywordsWithFingerprint and DEFAULT_KEYWORD_WEIGHTS are intended
 * for future stages of the document discovery improvement plan.
 */
import type { FingerprintEntry } from '../../document-cache.js';
/**
 * Weighting configuration for different content sources
 *
 * Higher weights indicate more important sources for keyword relevance.
 * Frontmatter keywords are treated as authoritative (highest weight).
 */
export interface KeywordWeights {
    /** Keywords from YAML frontmatter `keywords:` field - authoritative */
    readonly frontmatter: number;
    /** Keywords from document title - high importance */
    readonly title: number;
    /** Keywords from section headings - high importance */
    readonly headings: number;
    /** Keywords from bold/italic text - medium importance */
    readonly emphasis: number;
    /** Keywords from general content body - base weight */
    readonly content: number;
}
/**
 * Default keyword weighting configuration
 *
 * Balanced weighting that prioritizes explicit frontmatter keywords
 * while giving appropriate weight to structural elements.
 */
export declare const DEFAULT_KEYWORD_WEIGHTS: KeywordWeights;
/**
 * Weighted keyword with source tracking
 *
 * Represents a keyword with its computed weight and source information
 * for debugging and explanation of relevance scoring.
 */
export interface WeightedKeyword {
    /** The extracted keyword text */
    readonly keyword: string;
    /** Computed weight based on source importance */
    readonly weight: number;
    /** Sources where this keyword was found */
    readonly sources: readonly string[];
}
/**
 * Parsed frontmatter data
 *
 * Structured representation of YAML frontmatter with support
 * for explicit keyword fields.
 */
export interface FrontmatterData {
    /** Explicit keywords field from frontmatter */
    keywords?: string[] | string;
    /** Other frontmatter fields (title, description, etc.) */
    [key: string]: unknown;
}
/**
 * Enhanced keyword extraction result
 *
 * Complete result from weighted keyword extraction including
 * individual weighted keywords and aggregate scores.
 */
export interface KeywordExtractionResult {
    /** Individual weighted keywords with source tracking */
    readonly weightedKeywords: readonly WeightedKeyword[];
    /** Simple keyword list for backward compatibility */
    readonly keywords: readonly string[];
    /** Whether explicit frontmatter keywords were found */
    readonly hasExplicitKeywords: boolean;
    /** Total weighted score for the document */
    readonly totalWeight: number;
}
/**
 * Extract keywords with enhanced weighting from document content
 *
 * Performs comprehensive keyword extraction from multiple content sources
 * with appropriate weighting. Treats explicit frontmatter keywords as
 * authoritative when present, falls back to content analysis otherwise.
 *
 * @param title - Document title
 * @param content - Full document content (including frontmatter)
 * @param weights - Custom weighting configuration (optional)
 *
 * @returns Enhanced keyword extraction result with weighted keywords
 *
 * @example Basic usage
 * ```typescript
 * const result = extractWeightedKeywords(
 *   'User Authentication API',
 *   '---\nkeywords: [auth, api, security]\n---\n# Overview\nThis **important** API handles user login...'
 * );
 * console.log(result.hasExplicitKeywords); // true
 * console.log(result.weightedKeywords); // [{keyword: 'auth', weight: 5.0, sources: ['frontmatter']}, ...]
 * ```
 *
 * @example Custom weighting
 * ```typescript
 * const customWeights = { ...DEFAULT_KEYWORD_WEIGHTS, title: 4.0 };
 * const result = extractWeightedKeywords(title, content, customWeights);
 * ```
 */
export declare function extractWeightedKeywords(title: string, content: string, weights?: KeywordWeights): KeywordExtractionResult;
/**
 * Multi-factor relevance scoring configuration
 *
 * Defines the scoring factors and their weight contributions for determining
 * document relevance. Final relevance is the sum of all factors, capped at 1.0.
 */
export interface RelevanceFactors {
    /** Keyword overlap score (0.0-1.0): Primary relevance factor */
    keywordOverlap: number;
    /** Title similarity boost (0.0-0.3): Documents with similar title words */
    titleSimilarity: number;
    /** Namespace affinity boost (0.0-0.2): Documents in related namespaces */
    namespaceAffinity: number;
    /** Recency boost (0.0-0.1): Recently modified documents */
    recencyBoost: number;
    /** Link graph boost (0.0-0.3): Documents that reference each other (feature-gated) */
    linkGraphBoost: number;
}
/**
 * Feature toggles for optional scoring factors
 *
 * Internal feature flags that control which scoring factors are enabled.
 * These are code-level toggles, not user configuration.
 */
export interface ScoringFeatureFlags {
    /** Enable link graph boost calculation (disabled by default) */
    enableLinkGraphBoost: boolean;
}
/**
 * Default feature flags - conservative defaults
 */
export declare const DEFAULT_SCORING_FEATURES: ScoringFeatureFlags;
/**
 * Enhanced keyword extraction with fingerprint integration
 *
 * Provides enhanced keyword extraction that integrates with existing
 * fingerprint data while offering enhanced weighting when full content
 * analysis is available.
 *
 * @param title - Document title
 * @param content - Full document content (optional for fingerprint-only mode)
 * @param fingerprint - Existing fingerprint data (optional)
 * @param weights - Custom weighting configuration (optional)
 *
 * @returns Enhanced keyword extraction result
 *
 * @example Fingerprint integration
 * ```typescript
 * const result = extractKeywordsWithFingerprint(
 *   'API Documentation',
 *   null, // No content available
 *   { keywords: ['api', 'docs'], namespace: 'api', lastModified: new Date(), contentHash: 'abc123' }
 * );
 * // Falls back to fingerprint keywords with base weight
 * ```
 */
export declare function extractKeywordsWithFingerprint(title: string, content: string | null, fingerprint?: FingerprintEntry, weights?: KeywordWeights): KeywordExtractionResult;
/**
 * Enhanced relevance calculation result with factor breakdown
 *
 * Provides both the final relevance score and detailed factor breakdown
 * for explanation generation and debugging purposes.
 */
export interface RelevanceCalculationResult {
    /** Final combined relevance score (0.0-1.0) */
    relevance: number;
    /** Detailed breakdown of scoring factors */
    factors: RelevanceFactors;
    /** Primary contributing factors (top 2-3 factors) */
    primaryFactors: Array<{
        factor: keyof RelevanceFactors;
        score: number;
        description: string;
    }>;
}
/**
 * Calculate enhanced multi-factor relevance score with detailed breakdown
 *
 * Implements the complete multi-factor relevance algorithm with:
 * - Keyword overlap (primary factor)
 * - Title similarity boost
 * - Namespace affinity boost
 * - Recency boost
 * - Link graph boost (feature-gated)
 *
 * Final relevance = sum of all factors, capped at 1.0 maximum
 *
 * @param sourceKeywords - Weighted keywords from source document
 * @param sourceTitle - Source document title
 * @param sourceNamespace - Source document namespace
 * @param sourceContent - Source document content (for link graph analysis)
 * @param targetTitle - Target document title
 * @param targetContent - Target document content
 * @param targetNamespace - Target document namespace
 * @param targetLastModified - Target document last modified date
 * @param targetPath - Target document path (for link graph analysis)
 * @param targetFingerprint - Target document fingerprint (optional)
 * @param features - Feature flags controlling optional factors
 *
 * @returns Multi-factor relevance score between 0 and 1
 *
 * @example Multi-factor relevance calculation
 * ```typescript
 * const sourceKeywords = [
 *   { keyword: 'api', weight: 3.0, sources: ['title'] },
 *   { keyword: 'auth', weight: 5.0, sources: ['frontmatter'] }
 * ];
 * const relevance = calculateWeightedRelevance(
 *   sourceKeywords,
 *   'User Authentication',
 *   'api/guides',
 *   'This covers auth @/api/specs/auth.md',
 *   'Authentication API',
 *   'API for user authentication...',
 *   'api/specs',
 *   new Date(),
 *   '/api/specs/auth.md'
 * );
 * // Returns combined score: keyword overlap + title similarity + namespace affinity + recency + link boost
 * ```
 */
export declare function calculateWeightedRelevance(sourceKeywords: readonly WeightedKeyword[], sourceTitle: string, sourceNamespace: string, sourceContent: string, targetTitle: string, targetContent: string, targetNamespace: string, targetLastModified: Date, targetPath: string, targetFingerprint?: FingerprintEntry, features?: ScoringFeatureFlags): number;
/**
 * Calculate enhanced multi-factor relevance with detailed factor breakdown
 *
 * Extended version of calculateWeightedRelevance that returns both the final score
 * and detailed factor breakdown for explanation generation.
 *
 * @param sourceKeywords - Weighted keywords from source document
 * @param sourceTitle - Source document title
 * @param sourceNamespace - Source document namespace
 * @param sourceContent - Source document content (for link graph analysis)
 * @param targetTitle - Target document title
 * @param targetContent - Target document content
 * @param targetNamespace - Target document namespace
 * @param targetLastModified - Target document last modified date
 * @param targetPath - Target document path (for link graph analysis)
 * @param targetFingerprint - Target document fingerprint (optional)
 * @param features - Feature flags controlling optional factors
 *
 * @returns Enhanced result with relevance score and factor breakdown
 *
 * @example Enhanced relevance calculation with breakdown
 * ```typescript
 * const result = calculateWeightedRelevanceWithBreakdown(
 *   sourceKeywords,
 *   'User Authentication',
 *   'api/guides',
 *   'auth content',
 *   'Auth API',
 *   'API content',
 *   'api/specs',
 *   new Date(),
 *   '/api/specs/auth.md'
 * );
 * console.log(`Relevance: ${result.relevance}`);
 * console.log(`Primary factors: ${result.primaryFactors.map(f => f.description).join(', ')}`);
 * ```
 */
export declare function calculateWeightedRelevanceWithBreakdown(sourceKeywords: readonly WeightedKeyword[], sourceTitle: string, sourceNamespace: string, sourceContent: string, targetTitle: string, targetContent: string, targetNamespace: string, targetLastModified: Date, targetPath: string, targetFingerprint?: FingerprintEntry, features?: ScoringFeatureFlags): RelevanceCalculationResult;
/**
 * Generate human-readable explanation from primary factors
 *
 * Creates a concise, informative explanation of why a document was suggested
 * based on the primary contributing factors from relevance calculation.
 *
 * @param primaryFactors - Array of primary factors from determinePrimaryFactors
 * @param targetNamespace - Target document namespace for context
 * @param hasExplicitKeywords - Whether source had explicit frontmatter keywords
 *
 * @returns Human-readable explanation string
 *
 * @example Factor-based explanation generation
 * ```typescript
 * const explanation = generateFactorBasedExplanation(
 *   [
 *     { factor: 'keywordOverlap', score: 0.8, description: 'strong keyword overlap' },
 *     { factor: 'namespaceAffinity', score: 0.2, description: 'same namespace' }
 *   ],
 *   'api/specs',
 *   true
 * );
 * // Returns: "Strong keyword overlap with same namespace structure"
 * ```
 */
export declare function generateFactorBasedExplanation(primaryFactors: Array<{
    factor: keyof RelevanceFactors;
    score: number;
    description: string;
}>, targetNamespace: string, hasExplicitKeywords?: boolean): string;
/**
 * Extract keywords using original algorithm for backward compatibility
 *
 * Maintains the original extractKeywords behavior for existing code
 * that depends on the simple keyword extraction approach.
 *
 * @param title - Document title
 * @param overview - Document overview
 *
 * @returns Array of extracted keywords (backward compatible)
 */
export declare function extractKeywords(title: string, overview: string): string[];
/**
 * Calculate namespace affinity score between two namespaces
 *
 * Implements the multi-factor relevance algorithm namespace affinity rules:
 * - Same namespace: 0.2 (api/specs === api/specs)
 * - Parent/child relationship: 0.15 (api/* contains api/guides/*)
 * - Sibling relationship: 0.1 (api/specs vs api/guides)
 * - Unrelated: 0.0 (api/* vs frontend/*)
 *
 * @param sourceNamespace - The source document's namespace
 * @param targetNamespace - The target document's namespace
 *
 * @returns Namespace affinity score between 0.0 and 0.2
 *
 * @example Namespace affinity examples
 * ```typescript
 * calculateNamespaceAffinity('api/specs', 'api/specs');     // 0.2 - exact match
 * calculateNamespaceAffinity('api', 'api/guides');         // 0.15 - parent/child
 * calculateNamespaceAffinity('api/specs', 'api/guides');   // 0.1 - siblings
 * calculateNamespaceAffinity('api', 'frontend');           // 0.0 - unrelated
 * ```
 */
export declare function calculateNamespaceAffinity(sourceNamespace: string, targetNamespace: string): number;
/**
 * Calculate recency boost score based on document modification time
 *
 * Implements the multi-factor relevance algorithm recency rules:
 * - Modified within last week: 0.1 boost
 * - Modified within last month: 0.05 boost
 * - Modified within last 3 months: 0.02 boost
 * - Older documents: 0.0 boost
 *
 * @param lastModified - Document's last modification date
 *
 * @returns Recency boost score between 0.0 and 0.1
 *
 * @example Recency boost examples
 * ```typescript
 * const today = new Date();
 * const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
 * const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
 * const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
 *
 * calculateRecencyBoost(yesterday);  // 0.1 - within last week
 * calculateRecencyBoost(lastWeek);   // 0.1 - within last week
 * calculateRecencyBoost(lastMonth);  // 0.05 - within last month
 * ```
 */
export declare function calculateRecencyBoost(lastModified: Date): number;
/**
 * Calculate title similarity score between two document titles
 *
 * Implements the multi-factor relevance algorithm title similarity factor.
 * Analyzes word overlap between titles with emphasis on meaningful terms.
 *
 * @param sourceTitle - The source document's title
 * @param targetTitle - The target document's title
 *
 * @returns Title similarity score between 0.0 and 0.3
 *
 * @example Title similarity examples
 * ```typescript
 * calculateTitleSimilarity('User Authentication API', 'Authentication Guide');  // ~0.2
 * calculateTitleSimilarity('API Documentation', 'API Reference');              // ~0.15
 * calculateTitleSimilarity('Frontend Guide', 'Backend Setup');                 // 0.0
 * ```
 */
export declare function calculateTitleSimilarity(sourceTitle: string, targetTitle: string): number;
/**
 * Calculate link graph boost score for documents that reference each other
 *
 * This is a feature-gated scoring factor that detects when documents
 * reference each other using the @reference system.
 *
 * @param sourceContent - Content of the source document to scan for references
 * @param targetPath - Path of the target document to check for references
 * @param features - Feature flags controlling whether this factor is enabled
 *
 * @returns Link graph boost score between 0.0 and 0.3
 *
 * @example Link graph boost usage
 * ```typescript
 * const boost = calculateLinkGraphBoost(
 *   'See @/api/auth.md for details',
 *   '/api/auth.md',
 *   { enableLinkGraphBoost: true }
 * );
 * // Returns 0.3 if reference found and feature enabled, 0.0 otherwise
 * ```
 */
export declare function calculateLinkGraphBoost(sourceContent: string, targetPath: string, features?: ScoringFeatureFlags): number;
//# sourceMappingURL=keyword-utils.d.ts.map