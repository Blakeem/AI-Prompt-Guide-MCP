/**
 * Unit tests for enhanced keyword extraction utilities
 *
 * Tests the keyword extraction and weighting functionality including
 * frontmatter parsing, weighted extraction, and backward compatibility.
 */

import { describe, it, expect } from 'vitest';
import {
  extractWeightedKeywords,
  extractKeywordsWithFingerprint,
  calculateWeightedRelevance,
  calculateWeightedRelevanceWithBreakdown,
  generateFactorBasedExplanation,
  extractKeywords,
  calculateNamespaceAffinity,
  calculateRecencyBoost,
  calculateTitleSimilarity,
  calculateLinkGraphBoost,
  DEFAULT_KEYWORD_WEIGHTS,
  DEFAULT_SCORING_FEATURES,
  type KeywordWeights,
  type WeightedKeyword,
  type ScoringFeatureFlags
} from '../keyword-utils.js';
import type { FingerprintEntry } from '../../../document-cache.js';

describe('Enhanced Keyword Utilities', () => {
  describe('extractWeightedKeywords', () => {
    it('should extract keywords from title and content', () => {
      const result = extractWeightedKeywords(
        'User Authentication API',
        'This document describes JWT authentication for user management'
      );

      expect(result.keywords).toContain('user');
      expect(result.keywords).toContain('authentication');
      expect(result.keywords).toContain('api');
      expect(result.hasExplicitKeywords).toBe(false);
      expect(result.totalWeight).toBeGreaterThan(0);
    });

    it('should parse explicit frontmatter keywords', () => {
      const content = `---
keywords: [auth, api, security, jwt]
title: Authentication Guide
---

# Authentication

This guide covers user authentication.`;

      const result = extractWeightedKeywords('Authentication API', content);

      expect(result.hasExplicitKeywords).toBe(true);
      expect(result.keywords).toEqual(['auth', 'api', 'security', 'jwt']);
      expect(result.weightedKeywords).toHaveLength(4);
      expect(result.weightedKeywords[0]?.weight).toBe(DEFAULT_KEYWORD_WEIGHTS.frontmatter);
      expect(result.weightedKeywords[0]?.sources).toEqual(['frontmatter']);
    });

    it('should handle quoted frontmatter keywords', () => {
      const content = `---
keywords: "authentication, api, security"
---

# Content`;

      const result = extractWeightedKeywords('Title', content);

      expect(result.hasExplicitKeywords).toBe(true);
      expect(result.keywords).toEqual(['authentication', 'api', 'security']);
    });

    it('should extract weighted keywords from different content sources', () => {
      const content = `# Main Heading

This **important** content describes _emphasized_ features.

## Sub Heading

Regular content with keywords.`;

      const result = extractWeightedKeywords('Document Title', content);

      expect(result.hasExplicitKeywords).toBe(false);
      expect(result.weightedKeywords.length).toBeGreaterThan(0);

      // Check that different sources have different weights
      const titleKeywords = result.weightedKeywords.filter(wk => wk.sources.includes('title'));
      const headingKeywords = result.weightedKeywords.filter(wk => wk.sources.includes('headings'));
      const emphasisKeywords = result.weightedKeywords.filter(wk => wk.sources.includes('emphasis'));

      expect(titleKeywords.length).toBeGreaterThan(0);
      expect(headingKeywords.length).toBeGreaterThan(0);
      expect(emphasisKeywords.length).toBeGreaterThan(0);

      // Title should have higher weight than regular content
      if (titleKeywords[0] != null) {
        expect(titleKeywords[0].weight).toBe(DEFAULT_KEYWORD_WEIGHTS.title);
      }
    });

    it('should handle empty input gracefully', () => {
      const result = extractWeightedKeywords('', '');

      expect(result.keywords).toEqual([]);
      expect(result.weightedKeywords).toEqual([]);
      expect(result.hasExplicitKeywords).toBe(false);
      expect(result.totalWeight).toBe(0);
    });

    it('should use custom weights when provided', () => {
      const customWeights: KeywordWeights = {
        frontmatter: 10.0,
        title: 5.0,
        headings: 3.0,
        emphasis: 2.0,
        content: 1.0
      };

      const result = extractWeightedKeywords('Test Title', 'Content', customWeights);

      const titleKeywords = result.weightedKeywords.filter(wk => wk.sources.includes('title'));
      if (titleKeywords[0] != null) {
        expect(titleKeywords[0].weight).toBe(5.0);
      }
    });
  });

  describe('extractKeywordsWithFingerprint', () => {
    it('should prefer content analysis when content is available', () => {
      const fingerprint: FingerprintEntry = {
        keywords: ['old', 'cached'],
        namespace: 'test',
        lastModified: new Date(),
        contentHash: 'hash123'
      };

      const result = extractKeywordsWithFingerprint(
        'New Title',
        'New content with different keywords',
        fingerprint
      );

      expect(result.keywords).toContain('new');
      expect(result.keywords).not.toContain('old');
    });

    it('should fall back to fingerprint when no content available', () => {
      const fingerprint: FingerprintEntry = {
        keywords: ['cached', 'keywords'],
        namespace: 'test',
        lastModified: new Date(),
        contentHash: 'hash123'
      };

      const result = extractKeywordsWithFingerprint(
        'Title',
        null,
        fingerprint
      );

      expect(result.keywords).toContain('cached');
      expect(result.keywords).toContain('keywords');
      expect(result.weightedKeywords[0]?.sources).toEqual(['fingerprint']);
    });

    it('should handle missing fingerprint gracefully', () => {
      const result = extractKeywordsWithFingerprint(
        'Test Title',
        null,
        undefined
      );

      expect(result.keywords).toContain('test');
      expect(result.keywords).toContain('title');
    });
  });

  describe('calculateWeightedRelevance (legacy compatibility)', () => {
    it('should calculate relevance using multi-factor scoring', () => {
      const sourceKeywords: WeightedKeyword[] = [
        { keyword: 'api', weight: 3.0, sources: ['title'] },
        { keyword: 'auth', weight: 5.0, sources: ['frontmatter'] },
        { keyword: 'user', weight: 2.0, sources: ['headings'] }
      ];

      const relevance = calculateWeightedRelevance(
        sourceKeywords,
        'Source API Documentation', // sourceTitle
        'api/guides',               // sourceNamespace
        'API guide content',        // sourceContent
        'Authentication API Guide', // targetTitle
        'This guide covers user authentication and API security', // targetContent
        'api/specs',               // targetNamespace
        new Date(),                // targetLastModified
        '/api/specs/auth.md'       // targetPath
      );

      expect(relevance).toBeGreaterThan(0);
      expect(relevance).toBeLessThanOrEqual(1);
    });

    it('should return 0 for no keyword matches', () => {
      const sourceKeywords: WeightedKeyword[] = [
        { keyword: 'database', weight: 3.0, sources: ['title'] }
      ];

      // Use an old date to avoid recency boost
      const oldDate = new Date('2020-01-01');

      const relevance = calculateWeightedRelevance(
        sourceKeywords,
        'Database Guide',          // sourceTitle
        'data/guides',            // sourceNamespace
        'Database guide content', // sourceContent
        'Frontend UI',            // targetTitle
        'User interface components and styling', // targetContent
        'frontend/ui',            // targetNamespace
        oldDate,                  // targetLastModified (old to avoid recency boost)
        '/frontend/ui.md'         // targetPath
      );

      expect(relevance).toBe(0);
    });

    it('should handle empty source keywords', () => {
      // Use an old date to avoid recency boost
      const oldDate = new Date('2020-01-01');

      const relevance = calculateWeightedRelevance(
        [],
        'Any Title',              // sourceTitle
        'any/namespace',          // sourceNamespace
        'Any content',            // sourceContent
        'Target Title',           // targetTitle
        'Target content',         // targetContent
        'target/namespace',       // targetNamespace
        oldDate,                  // targetLastModified (old to avoid recency boost)
        '/target.md'              // targetPath
      );

      expect(relevance).toBe(0);
    });
  });

  describe('extractKeywords (backward compatibility)', () => {
    it('should maintain backward compatibility with original behavior', () => {
      const keywords = extractKeywords(
        'User Authentication API',
        'This API handles user login and session management'
      );

      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords).toContain('user');
      expect(keywords).toContain('authentication');
      expect(keywords).toContain('api');

      // Should filter out short words and stop words
      expect(keywords).not.toContain('and');
      expect(keywords).not.toContain('the');
    });

    it('should handle empty inputs gracefully', () => {
      const keywords = extractKeywords('', '');
      expect(keywords).toEqual([]);
    });

    it('should provide fallback on extraction failure', () => {
      // Test with input that might cause issues
      const keywords = extractKeywords('Test', 'Content');
      expect(Array.isArray(keywords)).toBe(true);
    });
  });

  describe('frontmatter parsing', () => {
    it('should handle malformed YAML gracefully', () => {
      const content = `---
keywords: [incomplete
---

# Content`;

      const result = extractWeightedKeywords('Title', content);

      // Should fall back to content analysis
      expect(result.hasExplicitKeywords).toBe(false);
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('should ignore non-keyword frontmatter fields', () => {
      const content = `---
title: "Document Title"
date: 2025-01-01
keywords: [test, keywords]
description: "Some description"
---

# Content`;

      const result = extractWeightedKeywords('Title', content);

      expect(result.hasExplicitKeywords).toBe(true);
      expect(result.keywords).toEqual(['test', 'keywords']);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large content efficiently', () => {
      const largeContent = 'word '.repeat(10000);
      const start = Date.now();

      const result = extractWeightedKeywords('Title', largeContent);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.keywords.length).toBeLessThanOrEqual(50); // Should limit results
    });

    it('should handle unicode and special characters', () => {
      const result = extractWeightedKeywords(
        'Café API Documentation',
        'Content with émojis 🚀 and spéciàl characters'
      );

      expect(result.keywords.length).toBeGreaterThan(0);
      // Should handle unicode gracefully without throwing errors
    });

    it('should deduplicate keywords from multiple sources', () => {
      const content = `# API Documentation

This **API** guide covers API implementation details.`;

      const result = extractWeightedKeywords('API Guide', content);

      // 'api' should appear only once despite being in title, heading, emphasis, and content
      const apiKeywords = result.keywords.filter(k => k === 'api');
      expect(apiKeywords).toHaveLength(1);

      // But it should have the highest weight from multiple sources
      const apiWeighted = result.weightedKeywords.find(wk => wk.keyword === 'api');
      expect(apiWeighted).toBeDefined();
      expect(apiWeighted?.sources.length).toBeGreaterThan(1);
    });
  });

  describe('Multi-factor Relevance Scoring', () => {
    describe('calculateNamespaceAffinity', () => {
      it('should return 0.2 for exact namespace match', () => {
        const affinity = calculateNamespaceAffinity('api/specs', 'api/specs');
        expect(affinity).toBe(0.2);
      });

      it('should return 0.15 for parent-child relationships', () => {
        // Parent contains child
        expect(calculateNamespaceAffinity('api', 'api/guides')).toBe(0.15);
        // Child in parent
        expect(calculateNamespaceAffinity('api/guides', 'api')).toBe(0.15);
      });

      it('should return 0.1 for sibling relationships', () => {
        const affinity = calculateNamespaceAffinity('api/specs', 'api/guides');
        expect(affinity).toBe(0.1);
      });

      it('should return 0.0 for unrelated namespaces', () => {
        const affinity = calculateNamespaceAffinity('api', 'frontend');
        expect(affinity).toBe(0.0);
      });

      it('should handle edge cases gracefully', () => {
        expect(calculateNamespaceAffinity('', 'api')).toBe(0.0);
        expect(calculateNamespaceAffinity('api', '')).toBe(0.0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(calculateNamespaceAffinity(null as any, 'api')).toBe(0.0);
      });

      it('should handle root namespace properly', () => {
        expect(calculateNamespaceAffinity('root', 'root')).toBe(0.2);
        expect(calculateNamespaceAffinity('root', 'api')).toBe(0.0);
      });
    });

    describe('calculateRecencyBoost', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      it('should return 0.1 for documents modified within last week', () => {
        expect(calculateRecencyBoost(yesterday)).toBe(0.1);
        expect(calculateRecencyBoost(lastWeek)).toBe(0.1);
      });

      it('should return 0.05 for documents modified within last month', () => {
        expect(calculateRecencyBoost(lastMonth)).toBe(0.05);
      });

      it('should return 0.02 for documents modified within last 3 months', () => {
        expect(calculateRecencyBoost(threeMonthsAgo)).toBe(0.02);
      });

      it('should return 0.0 for older documents', () => {
        expect(calculateRecencyBoost(sixMonthsAgo)).toBe(0.0);
      });

      it('should handle invalid dates gracefully', () => {
        expect(calculateRecencyBoost(new Date('invalid'))).toBe(0.0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(calculateRecencyBoost(null as any)).toBe(0.0);
      });
    });

    describe('calculateTitleSimilarity', () => {
      it('should return 0.3 for exact title match', () => {
        const similarity = calculateTitleSimilarity('API Documentation', 'API Documentation');
        expect(similarity).toBe(0.3);
      });

      it('should return score based on word overlap', () => {
        const similarity = calculateTitleSimilarity('User Authentication API', 'Authentication Guide');
        expect(similarity).toBeGreaterThan(0);
        expect(similarity).toBeLessThanOrEqual(0.3);
      });

      it('should return 0 for completely different titles', () => {
        const similarity = calculateTitleSimilarity('Frontend Guide', 'Backend Setup');
        expect(similarity).toBe(0);
      });

      it('should handle edge cases gracefully', () => {
        expect(calculateTitleSimilarity('', 'API')).toBe(0);
        expect(calculateTitleSimilarity('API', '')).toBe(0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(calculateTitleSimilarity(null as any, 'API')).toBe(0);
      });

      it('should filter out common stop words', () => {
        // These titles share the word 'quick' which should be meaningful
        const similarity = calculateTitleSimilarity(
          'The Quick Guide',
          'A Quick Reference'
        );
        expect(similarity).toBeGreaterThan(0); // 'quick' is meaningful

        // Test with only stop words - should be 0
        const stopWordsOnly = calculateTitleSimilarity(
          'The Guide',
          'A Reference'
        );
        expect(stopWordsOnly).toBe(0); // Only stop words, no meaningful overlap
      });
    });

    describe('calculateLinkGraphBoost', () => {
      const features: ScoringFeatureFlags = { enableLinkGraphBoost: true };
      const disabledFeatures: ScoringFeatureFlags = { enableLinkGraphBoost: false };

      it('should return 0.0 when feature is disabled', () => {
        const boost = calculateLinkGraphBoost(
          'See @/api/auth.md for details',
          '/api/auth.md',
          disabledFeatures
        );
        expect(boost).toBe(0.0);
      });

      it('should return 0.3 when reference is found and feature enabled', () => {
        const boost = calculateLinkGraphBoost(
          'See @/api/auth.md for details',
          '/api/auth.md',
          features
        );
        expect(boost).toBe(0.3);
      });

      it('should return 0.0 when no reference is found', () => {
        const boost = calculateLinkGraphBoost(
          'This content has no references',
          '/api/auth.md',
          features
        );
        expect(boost).toBe(0.0);
      });

      it('should use default features when not provided', () => {
        // Default features have linkGraphBoost disabled
        const boost = calculateLinkGraphBoost(
          'See @/api/auth.md for details',
          '/api/auth.md'
        );
        expect(boost).toBe(0.0);
      });

      it('should handle edge cases gracefully', () => {
        expect(calculateLinkGraphBoost('', '/api/auth.md', features)).toBe(0.0);
        expect(calculateLinkGraphBoost('content', '', features)).toBe(0.0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(calculateLinkGraphBoost(null as any, '/api/auth.md', features)).toBe(0.0);
      });
    });

    describe('Multi-factor calculateWeightedRelevance', () => {
      const sourceKeywords: WeightedKeyword[] = [
        { keyword: 'api', weight: 3.0, sources: ['title'] },
        { keyword: 'auth', weight: 5.0, sources: ['frontmatter'] }
      ];

      const baseParams = {
        sourceTitle: 'User Authentication',
        sourceNamespace: 'api/guides',
        sourceContent: 'This covers auth @/api/specs/auth.md',
        targetTitle: 'Authentication API',
        targetContent: 'API for user authentication...',
        targetNamespace: 'api/specs',
        targetLastModified: new Date(),
        targetPath: '/api/specs/auth.md'
      };

      it('should combine all relevance factors', () => {
        const relevance = calculateWeightedRelevance(
          sourceKeywords,
          baseParams.sourceTitle,
          baseParams.sourceNamespace,
          baseParams.sourceContent,
          baseParams.targetTitle,
          baseParams.targetContent,
          baseParams.targetNamespace,
          baseParams.targetLastModified,
          baseParams.targetPath,
          undefined,
          { enableLinkGraphBoost: true }
        );

        expect(relevance).toBeGreaterThan(0);
        expect(relevance).toBeLessThanOrEqual(1.0); // Should be capped at 1.0
      });

      it('should cap total relevance at 1.0', () => {
        // Create scenario that would exceed 1.0 without capping
        const highScoringKeywords: WeightedKeyword[] = [
          { keyword: 'authentication', weight: 10.0, sources: ['title'] },
          { keyword: 'api', weight: 10.0, sources: ['frontmatter'] }
        ];

        const relevance = calculateWeightedRelevance(
          highScoringKeywords,
          'Authentication API',          // Same as target title for max title similarity
          'api/specs',                   // Same namespace for max affinity
          'Reference to @/api/specs/auth.md',
          'Authentication API',
          'authentication api implementation',
          'api/specs',
          new Date(),                    // Recent for max recency boost
          '/api/specs/auth.md',
          undefined,
          { enableLinkGraphBoost: true }
        );

        expect(relevance).toBe(1.0);
      });

      it('should handle missing optional parameters', () => {
        const relevance = calculateWeightedRelevance(
          sourceKeywords,
          baseParams.sourceTitle,
          baseParams.sourceNamespace,
          baseParams.sourceContent,
          baseParams.targetTitle,
          baseParams.targetContent,
          baseParams.targetNamespace,
          baseParams.targetLastModified,
          baseParams.targetPath
          // fingerprint and features omitted
        );

        expect(relevance).toBeGreaterThanOrEqual(0);
        expect(relevance).toBeLessThanOrEqual(1.0);
      });

      it('should return 0 for empty source keywords', () => {
        const relevance = calculateWeightedRelevance(
          [],
          baseParams.sourceTitle,
          baseParams.sourceNamespace,
          baseParams.sourceContent,
          baseParams.targetTitle,
          baseParams.targetContent,
          baseParams.targetNamespace,
          baseParams.targetLastModified,
          baseParams.targetPath
        );

        expect(relevance).toBe(0);
      });

      it('should provide debug information', () => {
        // This test ensures that the function logs debug information
        // We're not testing the exact log output, just that it doesn't throw
        expect(() => {
          calculateWeightedRelevance(
            sourceKeywords,
            baseParams.sourceTitle,
            baseParams.sourceNamespace,
            baseParams.sourceContent,
            baseParams.targetTitle,
            baseParams.targetContent,
            baseParams.targetNamespace,
            baseParams.targetLastModified,
            baseParams.targetPath
          );
        }).not.toThrow();
      });

      it('should demonstrate practical scoring example from improvement plan', () => {
        // Example from the plan: Creating /api/guides/user-authentication.md
        const sourceKeywords: WeightedKeyword[] = [
          { keyword: 'user', weight: 3.0, sources: ['title'] },
          { keyword: 'auth', weight: 5.0, sources: ['frontmatter'] },
          { keyword: 'jwt', weight: 2.0, sources: ['content'] },
          { keyword: 'api', weight: 3.0, sources: ['title'] }
        ];

        // Document A: /api/specs/auth-api.md (high relevance expected)
        const relevanceA = calculateWeightedRelevance(
          sourceKeywords,
          'User Authentication Guide',  // sourceTitle
          'api/guides',                 // sourceNamespace
          'User auth with JWT tokens',  // sourceContent
          'Auth API Specification',     // targetTitle
          'auth api implementation',    // targetContent
          'api/specs',                  // targetNamespace (related)
          new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday (recent)
          '/api/specs/auth-api.md',     // targetPath
          undefined,
          DEFAULT_SCORING_FEATURES
        );

        expect(relevanceA).toBeGreaterThan(0.5); // Should be high relevance
        expect(relevanceA).toBeLessThanOrEqual(1.0);

        // Document B: /security/jwt-implementation.md (moderate relevance)
        const relevanceB = calculateWeightedRelevance(
          sourceKeywords,
          'User Authentication Guide',
          'api/guides',
          'Reference @/security/jwt-implementation.md',
          'JWT Implementation',
          'jwt implementation details',
          'security',                   // Different namespace
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last week
          '/security/jwt-implementation.md',
          undefined,
          { enableLinkGraphBoost: true } // Enable link boost for this test
        );

        expect(relevanceB).toBeGreaterThan(0.3); // Should have moderate relevance
        expect(relevanceB).toBeLessThan(relevanceA); // Should be less than Document A
      });
    });
  });

  describe('factor-based explanation generation', () => {
    describe('generateFactorBasedExplanation', () => {
      it('should generate explanations for single factors', () => {
        const primaryFactors = [
          { factor: 'keywordOverlap' as const, score: 0.8, description: 'strong keyword overlap' }
        ];

        const explanation = generateFactorBasedExplanation(primaryFactors, 'api/specs');
        expect(explanation).toBe('Strong keyword overlap in api/specs');
      });

      it('should generate explanations for two factors', () => {
        const primaryFactors = [
          { factor: 'keywordOverlap' as const, score: 0.7, description: 'good keyword overlap' },
          { factor: 'namespaceAffinity' as const, score: 0.2, description: 'same namespace' }
        ];

        const explanation = generateFactorBasedExplanation(primaryFactors, 'api/specs');
        expect(explanation).toBe('Good keyword overlap with same namespace');
      });

      it('should generate explanations for three factors', () => {
        const primaryFactors = [
          { factor: 'keywordOverlap' as const, score: 0.6, description: 'shared keywords' },
          { factor: 'titleSimilarity' as const, score: 0.15, description: 'similar titles' },
          { factor: 'recencyBoost' as const, score: 0.08, description: 'recently updated' }
        ];

        const explanation = generateFactorBasedExplanation(primaryFactors, 'api/guides');
        expect(explanation).toBe('Shared keywords with similar titles and recently updated in api/guides');
      });

      it('should handle explicit keywords context', () => {
        const primaryFactors = [
          { factor: 'keywordOverlap' as const, score: 0.8, description: 'strong keyword overlap' },
          { factor: 'namespaceAffinity' as const, score: 0.15, description: 'related namespace structure' }
        ];

        const explanation = generateFactorBasedExplanation(primaryFactors, 'api/specs', true);
        expect(explanation).toBe('Strong explicit keyword matches with related namespace structure');
      });

      it('should handle namespace context already mentioned', () => {
        const primaryFactors = [
          { factor: 'namespaceAffinity' as const, score: 0.2, description: 'same namespace' },
          { factor: 'recencyBoost' as const, score: 0.05, description: 'recent updates' }
        ];

        const explanation = generateFactorBasedExplanation(primaryFactors, 'frontend/components');
        expect(explanation).toBe('Same namespace with recent updates');
      });

      it('should fallback gracefully for empty factors', () => {
        const explanation = generateFactorBasedExplanation([], 'docs/troubleshooting');
        expect(explanation).toBe('Related documentation in docs/troubleshooting');
      });

      it('should handle cross-referenced documentation', () => {
        const primaryFactors = [
          { factor: 'linkGraphBoost' as const, score: 0.3, description: 'cross-referenced documentation' },
          { factor: 'keywordOverlap' as const, score: 0.4, description: 'shared keywords' }
        ];

        const explanation = generateFactorBasedExplanation(primaryFactors, 'backend/services');
        expect(explanation).toBe('Cross-referenced documentation with shared keywords in backend/services');
      });
    });

    describe('calculateWeightedRelevanceWithBreakdown', () => {
      it('should return detailed factor breakdown', () => {
        const sourceKeywords = [
          { keyword: 'api', weight: 3.0, sources: ['title'] as const },
          { keyword: 'auth', weight: 5.0, sources: ['frontmatter'] as const }
        ];

        const result = calculateWeightedRelevanceWithBreakdown(
          sourceKeywords,
          'User Authentication API',
          'api/guides',
          'This covers authentication',
          'Authentication API Reference',
          'API for authentication and user management',
          'api/specs',
          new Date(),
          '/api/specs/auth.md'
        );

        expect(result).toHaveProperty('relevance');
        expect(result).toHaveProperty('factors');
        expect(result).toHaveProperty('primaryFactors');

        expect(result.factors).toHaveProperty('keywordOverlap');
        expect(result.factors).toHaveProperty('titleSimilarity');
        expect(result.factors).toHaveProperty('namespaceAffinity');
        expect(result.factors).toHaveProperty('recencyBoost');
        expect(result.factors).toHaveProperty('linkGraphBoost');

        // Should have meaningful keyword overlap and title similarity
        expect(result.factors.keywordOverlap).toBeGreaterThan(0.1);
        expect(result.factors.titleSimilarity).toBeGreaterThan(0.1);

        // Should identify primary factors
        expect(result.primaryFactors.length).toBeGreaterThan(0);
        expect(result.primaryFactors[0]).toHaveProperty('factor');
        expect(result.primaryFactors[0]).toHaveProperty('score');
        expect(result.primaryFactors[0]).toHaveProperty('description');
      });

      it('should handle empty keywords gracefully', () => {
        const result = calculateWeightedRelevanceWithBreakdown(
          [],
          'Test Title',
          'test/namespace',
          'test content',
          'Target Title',
          'target content',
          'target/namespace',
          new Date(),
          '/target/path.md'
        );

        expect(result.relevance).toBe(0);
        expect(result.primaryFactors).toEqual([]);
        expect(result.factors.keywordOverlap).toBe(0);
      });

      it('should identify same namespace factor', () => {
        const sourceKeywords = [
          { keyword: 'test', weight: 1.0, sources: ['content'] as const }
        ];

        const result = calculateWeightedRelevanceWithBreakdown(
          sourceKeywords,
          'Test Document',
          'api/specs',
          'test content',
          'Another Test',
          'more test content',
          'api/specs', // Same namespace
          new Date(),
          '/api/specs/another.md'
        );

        expect(result.factors.namespaceAffinity).toBe(0.2); // Exact namespace match
        const namespaceFactors = result.primaryFactors.filter(f => f.factor === 'namespaceAffinity');
        expect(namespaceFactors).toHaveLength(1);
        expect(namespaceFactors[0]?.description).toBe('same namespace');
      });

      it('should identify related namespace factor', () => {
        const sourceKeywords = [
          { keyword: 'test', weight: 1.0, sources: ['content'] as const }
        ];

        const result = calculateWeightedRelevanceWithBreakdown(
          sourceKeywords,
          'Test Document',
          'api/specs',
          'test content',
          'Another Test',
          'more test content',
          'api/guides', // Related namespace (same parent)
          new Date(),
          '/api/guides/another.md'
        );

        expect(result.factors.namespaceAffinity).toBe(0.1); // Sibling namespace
        const namespaceFactors = result.primaryFactors.filter(f => f.factor === 'namespaceAffinity');
        if (namespaceFactors.length > 0) {
          expect(namespaceFactors[0]?.description).toBe('similar namespace');
        }
      });

      it('should identify title similarity factor', () => {
        const sourceKeywords = [
          { keyword: 'authentication', weight: 2.0, sources: ['title'] as const }
        ];

        const result = calculateWeightedRelevanceWithBreakdown(
          sourceKeywords,
          'User Authentication Guide',
          'guides',
          'authentication content',
          'Authentication API Reference',
          'auth api content',
          'api/specs',
          new Date(),
          '/api/specs/auth.md'
        );

        expect(result.factors.titleSimilarity).toBeGreaterThan(0.1);
        const titleFactors = result.primaryFactors.filter(f => f.factor === 'titleSimilarity');
        expect(titleFactors.length).toBeGreaterThan(0);
        expect(titleFactors[0]?.description).toMatch(/similar titles|very similar titles/);
      });

      it('should identify recency boost factor', () => {
        const sourceKeywords = [
          { keyword: 'test', weight: 1.0, sources: ['content'] as const }
        ];

        const recentDate = new Date(); // Very recent
        const result = calculateWeightedRelevanceWithBreakdown(
          sourceKeywords,
          'Test Document',
          'test',
          'test content',
          'Target Document',
          'test target content',
          'test',
          recentDate,
          '/test/target.md'
        );

        expect(result.factors.recencyBoost).toBeGreaterThan(0.05);
        const recencyFactors = result.primaryFactors.filter(f => f.factor === 'recencyBoost');
        if (recencyFactors.length > 0) {
          expect(recencyFactors[0]?.description).toMatch(/recently updated|recent updates|updated recently/);
        }
      });
    });

    describe('explanation examples from improvement plan', () => {
      it('should generate explanation matching improvement plan examples', () => {
        // Example: Creating /api/guides/user-authentication.md with strong keyword overlap and same namespace
        const primaryFactors = [
          { factor: 'keywordOverlap' as const, score: 0.5, description: 'good keyword overlap' },
          { factor: 'namespaceAffinity' as const, score: 0.2, description: 'related namespace structure' }
        ];

        const explanation = generateFactorBasedExplanation(primaryFactors, 'api/specs');
        expect(explanation).toBe('Good keyword overlap with related namespace structure');
      });

      it('should handle cross-references with shared concepts', () => {
        // Example: Documents with cross-references and shared technical concepts
        const primaryFactors = [
          { factor: 'linkGraphBoost' as const, score: 0.3, description: 'cross-referenced documentation' },
          { factor: 'keywordOverlap' as const, score: 0.25, description: 'shared keywords' }
        ];

        const explanation = generateFactorBasedExplanation(primaryFactors, 'security');
        expect(explanation).toBe('Cross-referenced documentation with shared keywords in security');
      });

      it('should handle explicit frontmatter keyword matches', () => {
        // Test explicit keyword context replacement
        const primaryFactors = [
          { factor: 'keywordOverlap' as const, score: 0.8, description: 'strong keyword overlap' },
          { factor: 'titleSimilarity' as const, score: 0.2, description: 'very similar titles' }
        ];

        const explanation = generateFactorBasedExplanation(primaryFactors, 'api/guides', true);
        expect(explanation).toBe('Strong explicit keyword matches with very similar titles in api/guides');
      });
    });
  });
});