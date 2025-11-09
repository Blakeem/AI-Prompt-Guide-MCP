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
import { getGlobalLogger } from '../../utils/logger.js';
const logger = getGlobalLogger();
/**
 * Default keyword weighting configuration
 *
 * Balanced weighting that prioritizes explicit frontmatter keywords
 * while giving appropriate weight to structural elements.
 */
export const DEFAULT_KEYWORD_WEIGHTS = {
    frontmatter: 5.0, // Authoritative - explicit user-defined keywords
    title: 3.0, // Highest structural weight
    headings: 2.0, // High structural weight
    emphasis: 1.5, // Medium weight for highlighted content
    content: 1.0 // Base weight for general content
};
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
export function extractWeightedKeywords(title, content, weights = DEFAULT_KEYWORD_WEIGHTS) {
    try {
        // Input validation with graceful handling
        const safeTitle = title ?? '';
        const safeContent = content ?? '';
        if (safeTitle.trim().length === 0 && safeContent.trim().length === 0) {
            logger.warn('Empty title and content provided for keyword extraction');
            return {
                weightedKeywords: [],
                keywords: [],
                hasExplicitKeywords: false,
                totalWeight: 0
            };
        }
        // Parse content sources
        const sources = parseContentSources(safeTitle, safeContent);
        // Check for explicit frontmatter keywords first
        const explicitKeywords = extractExplicitKeywords(sources.frontmatter);
        if (explicitKeywords.length > 0) {
            logger.debug('Found explicit frontmatter keywords', { keywords: explicitKeywords });
            // Use explicit keywords with highest weight
            const weightedKeywords = explicitKeywords.map(keyword => ({
                keyword: keyword.toLowerCase().trim(),
                weight: weights.frontmatter,
                sources: ['frontmatter']
            }));
            return {
                weightedKeywords,
                keywords: explicitKeywords.map(k => k.toLowerCase().trim()),
                hasExplicitKeywords: true,
                totalWeight: explicitKeywords.length * weights.frontmatter
            };
        }
        // Fall back to content analysis
        const weightedKeywords = extractFromContentSources(sources, weights);
        const keywords = weightedKeywords.map(wk => wk.keyword);
        const totalWeight = weightedKeywords.reduce((sum, wk) => sum + wk.weight, 0);
        logger.debug('Extracted keywords from content analysis', {
            keywordCount: keywords.length,
            totalWeight: Math.round(totalWeight * 100) / 100,
            hasExplicitKeywords: false
        });
        return {
            weightedKeywords,
            keywords,
            hasExplicitKeywords: false,
            totalWeight
        };
    }
    catch (error) {
        logger.warn('Enhanced keyword extraction failed, returning empty result', { error });
        return {
            weightedKeywords: [],
            keywords: [],
            hasExplicitKeywords: false,
            totalWeight: 0
        };
    }
}
/**
 * Default feature flags - conservative defaults
 */
export const DEFAULT_SCORING_FEATURES = {
    enableLinkGraphBoost: false // Start disabled until proven stable
};
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
export function extractKeywordsWithFingerprint(title, content, fingerprint, weights = DEFAULT_KEYWORD_WEIGHTS) {
    try {
        // If we have content, prefer enhanced extraction
        if (content != null && content.trim().length > 0) {
            return extractWeightedKeywords(title, content, weights);
        }
        // Fall back to fingerprint data if available
        if (fingerprint != null && fingerprint.keywords.length > 0) {
            logger.debug('Using fingerprint keywords as fallback', {
                keywordCount: fingerprint.keywords.length
            });
            const weightedKeywords = fingerprint.keywords.map(keyword => ({
                keyword: keyword.toLowerCase().trim(),
                weight: weights.content, // Use base weight for fingerprint keywords
                sources: ['fingerprint']
            }));
            return {
                weightedKeywords,
                keywords: fingerprint.keywords.map(k => k.toLowerCase().trim()),
                hasExplicitKeywords: false,
                totalWeight: fingerprint.keywords.length * weights.content
            };
        }
        // Final fallback to title-only extraction
        logger.debug('Falling back to title-only keyword extraction');
        return extractWeightedKeywords(title, '', weights);
    }
    catch (error) {
        logger.warn('Fingerprint-integrated keyword extraction failed', { error });
        return {
            weightedKeywords: [],
            keywords: [],
            hasExplicitKeywords: false,
            totalWeight: 0
        };
    }
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
export function calculateWeightedRelevance(sourceKeywords, sourceTitle, sourceNamespace, sourceContent, targetTitle, targetContent, targetNamespace, targetLastModified, targetPath, targetFingerprint, features = DEFAULT_SCORING_FEATURES) {
    try {
        if (sourceKeywords.length === 0) {
            return 0;
        }
        // Calculate individual relevance factors
        const factors = {
            keywordOverlap: 0,
            titleSimilarity: 0,
            namespaceAffinity: 0,
            recencyBoost: 0,
            linkGraphBoost: 0
        };
        // 1. Keyword overlap (primary factor, 0.0-1.0)
        factors.keywordOverlap = calculateKeywordOverlapScore(sourceKeywords, targetTitle, targetContent, targetFingerprint);
        // 2. Title similarity boost (0.0-0.3)
        factors.titleSimilarity = calculateTitleSimilarity(sourceTitle, targetTitle);
        // 3. Namespace affinity boost (0.0-0.2)
        factors.namespaceAffinity = calculateNamespaceAffinity(sourceNamespace, targetNamespace);
        // 4. Recency boost (0.0-0.1)
        factors.recencyBoost = calculateRecencyBoost(targetLastModified);
        // 5. Link graph boost (0.0-0.3, feature-gated)
        factors.linkGraphBoost = calculateLinkGraphBoost(sourceContent, targetPath, features);
        // Calculate final relevance as sum of all factors
        const totalRelevance = factors.keywordOverlap +
            factors.titleSimilarity +
            factors.namespaceAffinity +
            factors.recencyBoost +
            factors.linkGraphBoost;
        // Cap at 1.0 maximum as specified
        const cappedRelevance = Math.min(1.0, totalRelevance);
        // Debug logging to show factor breakdown
        logger.debug('Multi-factor relevance calculated', {
            targetPath,
            factors: {
                keywordOverlap: Math.round(factors.keywordOverlap * 100) / 100,
                titleSimilarity: Math.round(factors.titleSimilarity * 100) / 100,
                namespaceAffinity: Math.round(factors.namespaceAffinity * 100) / 100,
                recencyBoost: Math.round(factors.recencyBoost * 100) / 100,
                linkGraphBoost: Math.round(factors.linkGraphBoost * 100) / 100
            },
            totalRelevance: Math.round(totalRelevance * 100) / 100,
            cappedRelevance: Math.round(cappedRelevance * 100) / 100
        });
        return cappedRelevance;
    }
    catch (error) {
        logger.warn('Multi-factor relevance calculation failed', { error, targetPath });
        return 0;
    }
}
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
export function calculateWeightedRelevanceWithBreakdown(sourceKeywords, sourceTitle, sourceNamespace, sourceContent, targetTitle, targetContent, targetNamespace, targetLastModified, targetPath, targetFingerprint, features = DEFAULT_SCORING_FEATURES) {
    try {
        if (sourceKeywords.length === 0) {
            return {
                relevance: 0,
                factors: {
                    keywordOverlap: 0,
                    titleSimilarity: 0,
                    namespaceAffinity: 0,
                    recencyBoost: 0,
                    linkGraphBoost: 0
                },
                primaryFactors: []
            };
        }
        // Calculate individual relevance factors
        const factors = {
            keywordOverlap: 0,
            titleSimilarity: 0,
            namespaceAffinity: 0,
            recencyBoost: 0,
            linkGraphBoost: 0
        };
        // 1. Keyword overlap (primary factor, 0.0-1.0)
        factors.keywordOverlap = calculateKeywordOverlapScore(sourceKeywords, targetTitle, targetContent, targetFingerprint);
        // 2. Title similarity boost (0.0-0.3)
        factors.titleSimilarity = calculateTitleSimilarity(sourceTitle, targetTitle);
        // 3. Namespace affinity boost (0.0-0.2)
        factors.namespaceAffinity = calculateNamespaceAffinity(sourceNamespace, targetNamespace);
        // 4. Recency boost (0.0-0.1)
        factors.recencyBoost = calculateRecencyBoost(targetLastModified);
        // 5. Link graph boost (0.0-0.3, feature-gated)
        factors.linkGraphBoost = calculateLinkGraphBoost(sourceContent, targetPath, features);
        // Calculate final relevance as sum of all factors
        const totalRelevance = factors.keywordOverlap +
            factors.titleSimilarity +
            factors.namespaceAffinity +
            factors.recencyBoost +
            factors.linkGraphBoost;
        // Cap at 1.0 maximum as specified
        const cappedRelevance = Math.min(1.0, totalRelevance);
        // Determine primary contributing factors (top 2-3 with meaningful scores)
        const primaryFactors = determinePrimaryFactors(factors);
        // Debug logging to show factor breakdown
        logger.debug('Multi-factor relevance calculated with breakdown', {
            targetPath,
            factors: {
                keywordOverlap: Math.round(factors.keywordOverlap * 100) / 100,
                titleSimilarity: Math.round(factors.titleSimilarity * 100) / 100,
                namespaceAffinity: Math.round(factors.namespaceAffinity * 100) / 100,
                recencyBoost: Math.round(factors.recencyBoost * 100) / 100,
                linkGraphBoost: Math.round(factors.linkGraphBoost * 100) / 100
            },
            totalRelevance: Math.round(totalRelevance * 100) / 100,
            cappedRelevance: Math.round(cappedRelevance * 100) / 100,
            primaryFactors: primaryFactors.map(f => f.description)
        });
        return {
            relevance: cappedRelevance,
            factors,
            primaryFactors
        };
    }
    catch (error) {
        logger.warn('Multi-factor relevance calculation with breakdown failed', { error, targetPath });
        return {
            relevance: 0,
            factors: {
                keywordOverlap: 0,
                titleSimilarity: 0,
                namespaceAffinity: 0,
                recencyBoost: 0,
                linkGraphBoost: 0
            },
            primaryFactors: []
        };
    }
}
/**
 * Determine primary contributing factors from relevance calculation
 *
 * Analyzes the factor scores to identify the top 2-3 factors that meaningfully
 * contributed to the relevance score, filtering out factors with minimal impact.
 *
 * @param factors - RelevanceFactors breakdown from calculation
 *
 * @returns Array of primary factors with descriptions for explanation generation
 */
function determinePrimaryFactors(factors) {
    // Define thresholds for meaningful contribution
    const MEANINGFUL_THRESHOLDS = {
        keywordOverlap: 0.1, // At least 10% keyword overlap
        titleSimilarity: 0.05, // At least 5% title similarity (0.05 out of max 0.3)
        namespaceAffinity: 0.05, // At least 5% namespace affinity (0.05 out of max 0.2)
        recencyBoost: 0.02, // At least 2% recency boost (0.02 out of max 0.1)
        linkGraphBoost: 0.1 // At least 10% link boost (0.1 out of max 0.3)
    };
    // Generate factor entries with descriptions
    const factorEntries = [];
    // Keyword overlap factor
    if (factors.keywordOverlap >= MEANINGFUL_THRESHOLDS.keywordOverlap) {
        factorEntries.push({
            factor: 'keywordOverlap',
            score: factors.keywordOverlap,
            description: factors.keywordOverlap >= 0.7 ? 'strong keyword overlap' :
                factors.keywordOverlap >= 0.4 ? 'good keyword overlap' :
                    'shared keywords'
        });
    }
    // Title similarity factor
    if (factors.titleSimilarity >= MEANINGFUL_THRESHOLDS.titleSimilarity) {
        factorEntries.push({
            factor: 'titleSimilarity',
            score: factors.titleSimilarity,
            description: factors.titleSimilarity >= 0.2 ? 'very similar titles' :
                factors.titleSimilarity >= 0.1 ? 'similar titles' :
                    'related title words'
        });
    }
    // Namespace affinity factor
    if (factors.namespaceAffinity >= MEANINGFUL_THRESHOLDS.namespaceAffinity) {
        factorEntries.push({
            factor: 'namespaceAffinity',
            score: factors.namespaceAffinity,
            description: factors.namespaceAffinity >= 0.2 ? 'same namespace' :
                factors.namespaceAffinity >= 0.15 ? 'related namespace structure' :
                    'similar namespace'
        });
    }
    // Recency boost factor
    if (factors.recencyBoost >= MEANINGFUL_THRESHOLDS.recencyBoost) {
        factorEntries.push({
            factor: 'recencyBoost',
            score: factors.recencyBoost,
            description: factors.recencyBoost >= 0.08 ? 'recently updated' :
                factors.recencyBoost >= 0.04 ? 'recent updates' :
                    'updated recently'
        });
    }
    // Link graph boost factor (feature-gated)
    if (factors.linkGraphBoost >= MEANINGFUL_THRESHOLDS.linkGraphBoost) {
        factorEntries.push({
            factor: 'linkGraphBoost',
            score: factors.linkGraphBoost,
            description: 'cross-referenced documentation'
        });
    }
    // Sort by score (highest first) and return top 3 factors
    return factorEntries
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
}
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
export function generateFactorBasedExplanation(primaryFactors, targetNamespace, hasExplicitKeywords = false) {
    if (primaryFactors.length === 0) {
        return `Related documentation in ${targetNamespace}`;
    }
    // Generate explanation based on primary factors
    const descriptions = primaryFactors.map(factor => factor.description);
    // Add keyword source context if relevant
    if (primaryFactors.some(f => f.factor === 'keywordOverlap') && hasExplicitKeywords) {
        // Replace generic keyword descriptions with explicit keyword context
        const keywordIndex = descriptions.findIndex(desc => desc.includes('keyword') || desc.includes('shared'));
        if (keywordIndex >= 0 && descriptions[keywordIndex] != null) {
            descriptions[keywordIndex] = descriptions[keywordIndex].replace(/keyword overlap|shared keywords/, 'explicit keyword matches');
        }
    }
    // Create base explanation
    let explanation;
    if (descriptions.length === 1) {
        const firstDesc = descriptions[0];
        explanation = firstDesc != null ? capitalizeFirst(firstDesc) : 'Related documentation';
    }
    else if (descriptions.length === 2) {
        const firstDesc = descriptions[0];
        const secondDesc = descriptions[1];
        explanation = firstDesc != null && secondDesc != null
            ? `${capitalizeFirst(firstDesc)} with ${secondDesc}`
            : 'Related documentation';
    }
    else {
        // 3 factors: "X with Y and Z"
        const firstDesc = descriptions[0];
        const secondDesc = descriptions[1];
        const thirdDesc = descriptions[2];
        explanation = firstDesc != null && secondDesc != null && thirdDesc != null
            ? `${capitalizeFirst(firstDesc)} with ${secondDesc} and ${thirdDesc}`
            : 'Related documentation';
    }
    // Add namespace context if not already mentioned
    const hasNamespaceContext = descriptions.some(desc => desc.includes('namespace') || desc.includes('structure'));
    if (!hasNamespaceContext) {
        explanation += ` in ${targetNamespace}`;
    }
    return explanation;
}
/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str) {
    if (str.length === 0)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Calculate keyword overlap score (legacy compatibility function)
 *
 * Maintains backward compatibility with the original calculateWeightedRelevance
 * behavior for keyword overlap calculation only.
 *
 * @param sourceKeywords - Weighted keywords from source document
 * @param targetTitle - Target document title
 * @param targetContent - Target document content
 * @param targetFingerprint - Target document fingerprint (optional)
 *
 * @returns Keyword overlap score between 0 and 1
 */
function calculateKeywordOverlapScore(sourceKeywords, targetTitle, targetContent, targetFingerprint) {
    try {
        if (sourceKeywords.length === 0) {
            return 0;
        }
        // Extract target keywords for matching
        const targetResult = extractKeywordsWithFingerprint(targetTitle ?? '', targetContent ?? '', targetFingerprint);
        if (targetResult.keywords.length === 0) {
            return 0;
        }
        // Create target keyword set for efficient lookup
        const targetKeywordSet = new Set(targetResult.keywords);
        // Calculate weighted matches
        let totalMatchWeight = 0;
        let totalSourceWeight = 0;
        for (const sourceKeyword of sourceKeywords) {
            totalSourceWeight += sourceKeyword.weight;
            if (targetKeywordSet.has(sourceKeyword.keyword)) {
                totalMatchWeight += sourceKeyword.weight;
            }
        }
        // Calculate relevance as weighted match ratio
        const relevance = totalSourceWeight > 0 ? totalMatchWeight / totalSourceWeight : 0;
        // Ensure result is within bounds
        return Math.max(0, Math.min(1, relevance));
    }
    catch (error) {
        logger.warn('Keyword overlap calculation failed', { error });
        return 0;
    }
}
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
export function extractKeywords(title, overview) {
    try {
        // Use enhanced extraction but return only simple keywords for compatibility
        const result = extractWeightedKeywords(title, overview);
        return [...result.keywords]; // Return copy to maintain immutability
    }
    catch (error) {
        logger.warn('Backward compatible keyword extraction failed', { error });
        // Fallback to simple word splitting as original did
        const text = `${title ?? ''} ${overview ?? ''}`.toLowerCase();
        return text
            .split(/\s+/)
            .map(word => word.trim())
            .filter(word => word.length > 2)
            .filter((word, index, array) => array.indexOf(word) === index) // Remove duplicates
            .slice(0, 20); // Limit for performance
    }
}
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
export function calculateNamespaceAffinity(sourceNamespace, targetNamespace) {
    try {
        // Input validation
        if (sourceNamespace == null || targetNamespace == null) {
            return 0.0;
        }
        const source = sourceNamespace.trim();
        const target = targetNamespace.trim();
        if (source === '' || target === '') {
            return 0.0;
        }
        // Exact match: api/specs === api/specs
        if (source === target) {
            return 0.2;
        }
        // Parent-child relationships: api/* contains api/guides/* or vice versa
        if (target.startsWith(`${source}/`)) {
            return 0.15; // Parent: api/* contains api/guides/*
        }
        if (source.startsWith(`${target}/`)) {
            return 0.15; // Child: api/guides/* in api/*
        }
        // Sibling relationships: api/specs vs api/guides (shared prefix)
        if (shareCommonPrefix(source, target)) {
            return 0.1;
        }
        // Unrelated namespaces
        return 0.0;
    }
    catch (error) {
        logger.warn('Namespace affinity calculation failed', { error, sourceNamespace, targetNamespace });
        return 0.0;
    }
}
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
export function calculateRecencyBoost(lastModified) {
    try {
        // Input validation
        if (lastModified == null || !(lastModified instanceof Date) || isNaN(lastModified.getTime())) {
            return 0.0;
        }
        const now = new Date();
        const timeDiff = now.getTime() - lastModified.getTime();
        // Convert to days
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        // Apply recency boost rules
        if (daysDiff <= 7) {
            return 0.1; // Within last week
        }
        else if (daysDiff <= 30) {
            return 0.05; // Within last month
        }
        else if (daysDiff <= 90) {
            return 0.02; // Within last 3 months
        }
        else {
            return 0.0; // Older documents
        }
    }
    catch (error) {
        logger.warn('Recency boost calculation failed', { error, lastModified });
        return 0.0;
    }
}
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
export function calculateTitleSimilarity(sourceTitle, targetTitle) {
    try {
        // Input validation
        if (sourceTitle == null || targetTitle == null) {
            return 0.0;
        }
        const source = sourceTitle.trim().toLowerCase();
        const target = targetTitle.trim().toLowerCase();
        if (source === '' || target === '') {
            return 0.0;
        }
        // Exact match (unlikely but highest score)
        if (source === target) {
            return 0.3;
        }
        // Extract meaningful words from titles
        const sourceWords = extractMeaningfulTitleWords(source);
        const targetWords = extractMeaningfulTitleWords(target);
        if (sourceWords.length === 0 || targetWords.length === 0) {
            return 0.0;
        }
        // Calculate word overlap
        const targetWordSet = new Set(targetWords);
        const matchingWords = sourceWords.filter(word => targetWordSet.has(word));
        if (matchingWords.length === 0) {
            return 0.0;
        }
        // Calculate similarity ratio and scale to max 0.3
        const overlapRatio = matchingWords.length / Math.max(sourceWords.length, targetWords.length);
        const titleSimilarity = overlapRatio * 0.3;
        return Math.max(0.0, Math.min(0.3, titleSimilarity));
    }
    catch (error) {
        logger.warn('Title similarity calculation failed', { error, sourceTitle, targetTitle });
        return 0.0;
    }
}
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
export function calculateLinkGraphBoost(sourceContent, targetPath, features = DEFAULT_SCORING_FEATURES) {
    try {
        // Feature gate - return 0 if disabled
        if (!features.enableLinkGraphBoost) {
            return 0.0;
        }
        // Input validation
        if (sourceContent == null || targetPath == null) {
            return 0.0;
        }
        const content = sourceContent.trim();
        const path = targetPath.trim();
        if (content === '' || path === '') {
            return 0.0;
        }
        // Simple reference detection - look for @references to the target document
        // This is a basic implementation that can be enhanced with the full ReferenceExtractor
        const referencePattern = new RegExp(`@[^\\s]*${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
        const hasReference = referencePattern.test(content);
        if (hasReference) {
            logger.debug('Link graph boost applied', { targetPath: path });
            return 0.3;
        }
        return 0.0;
    }
    catch (error) {
        logger.warn('Link graph boost calculation failed', { error, targetPath });
        return 0.0;
    }
}
// ==================== PRIVATE HELPER FUNCTIONS ====================
/**
 * Parse content into structured sources for targeted extraction
 */
function parseContentSources(title, content) {
    try {
        const frontmatter = parseFrontmatter(content);
        const headings = extractHeadings(content);
        const emphasis = extractEmphasis(content);
        // Remove frontmatter from content for body analysis
        const bodyContent = removeFrontmatter(content);
        return {
            frontmatter,
            title: title.trim(),
            headings,
            emphasis,
            content: bodyContent
        };
    }
    catch (error) {
        logger.warn('Content source parsing failed', { error });
        return {
            frontmatter: null,
            title: title.trim(),
            headings: [],
            emphasis: [],
            content
        };
    }
}
/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content) {
    try {
        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
        if (frontmatterMatch == null) {
            return null;
        }
        const yamlContent = frontmatterMatch[1];
        if (yamlContent == null || yamlContent.trim() === '') {
            return null;
        }
        // Simple YAML parsing for keywords field (avoiding external dependencies)
        const data = {};
        const lines = yamlContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed.startsWith('#'))
                continue;
            // Handle keywords field specifically
            if (trimmed.startsWith('keywords:')) {
                const keywordsPart = trimmed.substring('keywords:'.length).trim();
                // Handle array format: keywords: [item1, item2, item3]
                if (keywordsPart.startsWith('[') && keywordsPart.endsWith(']')) {
                    const arrayContent = keywordsPart.slice(1, -1);
                    const items = arrayContent
                        .split(',')
                        .map(item => item.trim().replace(/['"]/g, ''))
                        .filter(item => item.length > 0);
                    // Only set keywords if we have valid items (avoid empty array from malformed YAML)
                    if (items.length > 0) {
                        data.keywords = items;
                    }
                }
                // Handle list format: keywords: "item1, item2, item3"
                else if (keywordsPart.startsWith('"') && keywordsPart.endsWith('"')) {
                    const quotedContent = keywordsPart.slice(1, -1);
                    data.keywords = quotedContent
                        .split(',')
                        .map(item => item.trim())
                        .filter(item => item.length > 0);
                }
                // Handle single value: keywords: value
                else if (keywordsPart.length > 0) {
                    // Reject malformed array syntax (starts with [ but doesn't end with ])
                    if (keywordsPart.startsWith('[') && !keywordsPart.endsWith(']')) {
                        // This is malformed YAML, skip it
                        continue;
                    }
                    data.keywords = [keywordsPart.replace(/['"]/g, '')];
                }
            }
        }
        return Object.keys(data).length > 0 ? data : null;
    }
    catch (error) {
        logger.warn('Frontmatter parsing failed', { error });
        return null;
    }
}
/**
 * Extract heading text from markdown content
 */
function extractHeadings(content) {
    try {
        const headingRegex = /^#{1,6}\s+(.+)$/gm;
        const headings = [];
        let match;
        while ((match = headingRegex.exec(content)) != null) {
            const headingText = match[1];
            if (headingText != null && headingText.trim().length > 0) {
                headings.push(headingText.trim());
            }
        }
        return headings;
    }
    catch (error) {
        logger.warn('Heading extraction failed', { error });
        return [];
    }
}
/**
 * Extract emphasized text (bold/italic) from markdown content
 */
function extractEmphasis(content) {
    try {
        const emphasis = [];
        // Bold text: **text** or __text__
        const boldRegex = /(?:\*\*|__)([^*_\n]+)(?:\*\*|__)/g;
        let match;
        while ((match = boldRegex.exec(content)) != null) {
            const text = match[1];
            if (text != null && text.trim().length > 0) {
                emphasis.push(text.trim());
            }
        }
        // Italic text: *text* or _text_ (but not already captured as bold)
        const italicRegex = /(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)/g;
        while ((match = italicRegex.exec(content)) != null) {
            const text = match[1] ?? match[2];
            if (text != null && text.trim().length > 0) {
                emphasis.push(text.trim());
            }
        }
        return emphasis;
    }
    catch (error) {
        logger.warn('Emphasis extraction failed', { error });
        return [];
    }
}
/**
 * Remove frontmatter from markdown content
 */
function removeFrontmatter(content) {
    try {
        return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    }
    catch (error) {
        logger.warn('Frontmatter removal failed', { error });
        return content;
    }
}
/**
 * Extract explicit keywords from frontmatter
 */
function extractExplicitKeywords(frontmatter) {
    if (frontmatter?.keywords == null) {
        return [];
    }
    try {
        if (Array.isArray(frontmatter.keywords)) {
            return frontmatter.keywords
                .filter(keyword => typeof keyword === 'string' && keyword.trim().length > 0)
                .map(keyword => keyword.trim());
        }
        if (typeof frontmatter.keywords === 'string') {
            return frontmatter.keywords
                .split(',')
                .map(keyword => keyword.trim())
                .filter(keyword => keyword.length > 0);
        }
        return [];
    }
    catch (error) {
        logger.warn('Explicit keyword extraction failed', { error });
        return [];
    }
}
/**
 * Extract weighted keywords from all content sources
 */
function extractFromContentSources(sources, weights) {
    const keywordMap = new Map();
    // Helper to add keywords with weight
    const addKeywords = (keywords, weight, source) => {
        for (const keyword of keywords) {
            const normalized = keyword.toLowerCase().trim();
            if (normalized.length <= 2)
                continue; // Skip short words
            const existing = keywordMap.get(normalized);
            if (existing != null) {
                existing.weight = Math.max(existing.weight, weight); // Use highest weight
                existing.sources.add(source);
            }
            else {
                keywordMap.set(normalized, {
                    weight,
                    sources: new Set([source])
                });
            }
        }
    };
    // Extract keywords from title
    if (sources.title.length > 0) {
        const titleKeywords = extractWordsFromText(sources.title);
        addKeywords(titleKeywords, weights.title, 'title');
    }
    // Extract keywords from headings
    for (const heading of sources.headings) {
        const headingKeywords = extractWordsFromText(heading);
        addKeywords(headingKeywords, weights.headings, 'headings');
    }
    // Extract keywords from emphasis
    for (const emphasis of sources.emphasis) {
        const emphasisKeywords = extractWordsFromText(emphasis);
        addKeywords(emphasisKeywords, weights.emphasis, 'emphasis');
    }
    // Extract keywords from content
    const contentKeywords = extractWordsFromText(sources.content);
    addKeywords(contentKeywords, weights.content, 'content');
    // Convert to WeightedKeyword array
    const weightedKeywords = [];
    for (const [keyword, data] of keywordMap) {
        weightedKeywords.push({
            keyword,
            weight: data.weight,
            sources: Array.from(data.sources)
        });
    }
    // Sort by weight (highest first) and limit results
    return weightedKeywords
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 50); // Reasonable limit for performance
}
/**
 * Extract meaningful words from text with stop word filtering
 */
function extractWordsFromText(text) {
    if (text == null || text.trim().length === 0) {
        return [];
    }
    try {
        // Split into words and filter by length
        const words = text
            .toLowerCase()
            .split(/\s+/)
            .map(word => word.replace(/[^\w]/g, '')) // Remove punctuation
            .filter(word => word.length > 2);
        // Remove stop words
        const stopWords = new Set([
            'the', 'and', 'for', 'with', 'this', 'that', 'will', 'can', 'are', 'you',
            'how', 'what', 'when', 'where', 'why', 'who', 'which', 'was', 'were',
            'been', 'have', 'has', 'had', 'should', 'would', 'could', 'may', 'might',
            'must', 'shall', 'not', 'but', 'however', 'therefore', 'thus', 'also',
            'such', 'very', 'more', 'most', 'much', 'many', 'some', 'any', 'all'
        ]);
        return words.filter(word => !stopWords.has(word) &&
            !/^[\d\W]+$/.test(word) // Remove words that are just numbers/punctuation
        );
    }
    catch (error) {
        logger.warn('Word extraction failed', { error });
        return [];
    }
}
/**
 * Check if two namespaces share a common prefix (for sibling detection)
 */
function shareCommonPrefix(namespace1, namespace2) {
    try {
        const parts1 = namespace1.split('/');
        const parts2 = namespace2.split('/');
        // Need at least one common part and both must have at least 2 parts for siblings
        if (parts1.length < 2 || parts2.length < 2) {
            return false;
        }
        // Check if they share the first part (making them siblings)
        return parts1[0] === parts2[0] && parts1[1] !== parts2[1];
    }
    catch (error) {
        logger.warn('Common prefix check failed', { error, namespace1, namespace2 });
        return false;
    }
}
/**
 * Extract meaningful words from title text for similarity scoring
 */
function extractMeaningfulTitleWords(title) {
    try {
        // Split into words and filter by length
        const words = title
            .toLowerCase()
            .split(/\s+/)
            .map(word => word.replace(/[^\w]/g, '')) // Remove punctuation
            .filter(word => word.length > 2);
        // Title-specific stop words (more restrictive than general content)
        const titleStopWords = new Set([
            'the', 'and', 'for', 'with', 'this', 'that', 'guide', 'documentation',
            'doc', 'docs', 'reference', 'manual', 'tutorial', 'overview', 'introduction',
            'getting', 'started', 'start', 'how', 'what', 'when', 'where',
            'why', 'who', 'which'
        ]);
        return words.filter(word => !titleStopWords.has(word));
    }
    catch (error) {
        logger.warn('Title word extraction failed', { error });
        return [];
    }
}
//# sourceMappingURL=keyword-utils.js.map