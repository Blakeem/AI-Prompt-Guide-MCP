/**
 * Integration tests for enhanced keyword utilities
 *
 * Tests the enhanced keyword extraction and multi-factor relevance scoring
 * systems to ensure they work correctly in the Stage 2.5 workflow.
 * These tests verify the Stage 4 enhancements work as expected.
 */
import { describe, it, expect } from 'vitest';
import { extractWeightedKeywords, extractKeywordsWithFingerprint, calculateWeightedRelevanceWithBreakdown, calculateNamespaceAffinity, calculateRecencyBoost, calculateTitleSimilarity, generateFactorBasedExplanation, DEFAULT_KEYWORD_WEIGHTS, DEFAULT_SCORING_FEATURES } from '../document-analysis/keyword-utils.js';
describe('Enhanced Keyword Utilities Integration', () => {
    describe('Enhanced Keyword Extraction', () => {
        it('should extract keywords from frontmatter with highest weight', () => {
            const content = `---
keywords: [authentication, oauth, jwt, api, security]
description: Complete authentication guide
---

# User Authentication

This guide covers **important** authentication concepts with *JWT tokens*.`;
            const result = extractWeightedKeywords('User Authentication API', content);
            expect(result.hasExplicitKeywords).toBe(true);
            expect(result.keywords).toEqual(['authentication', 'oauth', 'jwt', 'api', 'security']);
            expect(result.weightedKeywords).toHaveLength(5);
            // All frontmatter keywords should have highest weight
            for (const weighted of result.weightedKeywords) {
                expect(weighted.weight).toBe(DEFAULT_KEYWORD_WEIGHTS.frontmatter);
                expect(weighted.sources).toEqual(['frontmatter']);
            }
            expect(result.totalWeight).toBe(5 * DEFAULT_KEYWORD_WEIGHTS.frontmatter);
        });
        it('should fall back to content analysis when no frontmatter keywords', () => {
            const content = `# API Authentication Guide

This **important** guide covers authentication concepts including:
- OAuth 2.0 flows
- JWT token management
- *Security* best practices

## Getting Started

Start with basic authentication setup.`;
            const result = extractWeightedKeywords('API Authentication Guide', content);
            expect(result.hasExplicitKeywords).toBe(false);
            expect(result.keywords.length).toBeGreaterThan(0);
            expect(result.weightedKeywords.length).toBeGreaterThan(0);
            // Should have keywords from different sources
            const sourcesUsed = new Set(result.weightedKeywords.flatMap(w => w.sources));
            expect(sourcesUsed.has('title')).toBe(true);
            expect(sourcesUsed.has('headings')).toBe(true);
            expect(sourcesUsed.has('emphasis')).toBe(true);
            expect(sourcesUsed.has('content')).toBe(true);
            // Title keywords should have higher weight than content
            const titleKeywords = result.weightedKeywords.filter(w => w.sources.includes('title'));
            const contentKeywords = result.weightedKeywords.filter(w => w.sources.includes('content') && !w.sources.includes('title'));
            if (titleKeywords.length > 0 && contentKeywords.length > 0) {
                expect(titleKeywords[0]?.weight).toBeGreaterThan(contentKeywords[0]?.weight ?? 0);
            }
        });
        it('should integrate with fingerprint data for keyword extraction', () => {
            const fingerprint = {
                keywords: ['api', 'documentation', 'reference'],
                lastModified: new Date('2023-12-01'),
                contentHash: 'test-hash',
                namespace: 'api'
            };
            // Test with content available (should prefer content analysis)
            const withContent = extractKeywordsWithFingerprint('API Reference', '# API Reference\n\nComplete API documentation', fingerprint);
            expect(withContent.hasExplicitKeywords).toBe(false);
            expect(withContent.keywords.length).toBeGreaterThan(0);
            // Test without content (should use fingerprint)
            const withoutContent = extractKeywordsWithFingerprint('API Reference', null, fingerprint);
            expect(withoutContent.keywords).toEqual(['api', 'documentation', 'reference']);
            expect(withoutContent.weightedKeywords.every(w => w.sources.includes('fingerprint'))).toBe(true);
        });
        it('should handle malformed frontmatter gracefully', () => {
            const malformedContent = `---
keywords: [incomplete, array
broken-yaml: test
---

# Test Document

Content with malformed frontmatter.`;
            const result = extractWeightedKeywords('Test Document', malformedContent);
            // Should fall back to content analysis without crashing
            expect(result.hasExplicitKeywords).toBe(false);
            expect(result.keywords.length).toBeGreaterThan(0);
            expect(result.keywords).toContain('test');
        });
    });
    describe('Multi-Factor Relevance Scoring', () => {
        const createTestKeywords = (keywords) => keywords.map(keyword => ({
            keyword,
            weight: DEFAULT_KEYWORD_WEIGHTS.frontmatter,
            sources: ['frontmatter']
        }));
        it('should calculate comprehensive relevance with factor breakdown', () => {
            const sourceKeywords = createTestKeywords(['api', 'authentication', 'oauth', 'security']);
            const result = calculateWeightedRelevanceWithBreakdown(sourceKeywords, 'OAuth API Authentication', // sourceTitle
            'api/auth', // sourceNamespace
            'OAuth implementation @/api/specs/auth.md', // sourceContent
            'Authentication API Specification', // targetTitle
            'API specification for OAuth authentication with security guidelines', // targetContent
            'api/specs', // targetNamespace
            new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // targetLastModified (2 days ago)
            '/api/specs/auth.md', // targetPath
            undefined, // targetFingerprint
            DEFAULT_SCORING_FEATURES // features
            );
            // Should have meaningful relevance score
            expect(result.relevance).toBeGreaterThan(0.5);
            expect(result.relevance).toBeLessThanOrEqual(1.0);
            // Should have factor breakdown
            expect(result.factors.keywordOverlap).toBeGreaterThan(0);
            expect(result.factors.titleSimilarity).toBeGreaterThan(0);
            expect(result.factors.namespaceAffinity).toBeGreaterThan(0);
            expect(result.factors.recencyBoost).toBeGreaterThan(0);
            // Should identify primary factors
            expect(result.primaryFactors.length).toBeGreaterThan(0);
            expect(result.primaryFactors.length).toBeLessThanOrEqual(3);
            // Primary factors should be sorted by score
            for (let i = 1; i < result.primaryFactors.length; i++) {
                const current = result.primaryFactors[i];
                const previous = result.primaryFactors[i - 1];
                expect(current?.score).toBeLessThanOrEqual(previous?.score ?? 0);
            }
        });
        it('should demonstrate namespace affinity rules', () => {
            // Same namespace
            expect(calculateNamespaceAffinity('api/specs', 'api/specs')).toBe(0.2);
            // Parent-child relationships
            expect(calculateNamespaceAffinity('api', 'api/specs')).toBe(0.15);
            expect(calculateNamespaceAffinity('api/specs', 'api')).toBe(0.15);
            // Sibling relationships
            expect(calculateNamespaceAffinity('api/specs', 'api/guides')).toBe(0.1);
            // Unrelated namespaces
            expect(calculateNamespaceAffinity('api', 'frontend')).toBe(0.0);
            expect(calculateNamespaceAffinity('completely/different', 'totally/unrelated')).toBe(0.0);
        });
        it('should demonstrate recency boost rules', () => {
            const now = new Date();
            // Within last week
            const lastWeek = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
            expect(calculateRecencyBoost(lastWeek)).toBe(0.1);
            // Within last month
            const lastMonth = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
            expect(calculateRecencyBoost(lastMonth)).toBe(0.05);
            // Within last 3 months
            const threeMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            expect(calculateRecencyBoost(threeMonthsAgo)).toBe(0.02);
            // Older documents
            const oldDocument = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000);
            expect(calculateRecencyBoost(oldDocument)).toBe(0.0);
        });
        it('should demonstrate title similarity scoring', () => {
            // High similarity
            expect(calculateTitleSimilarity('User Authentication API', 'Authentication API Guide')).toBeGreaterThan(0.15);
            // Medium similarity
            const mediumSimilarity = calculateTitleSimilarity('API Documentation', 'API Reference Guide');
            expect(mediumSimilarity).toBeGreaterThan(0.1);
            expect(mediumSimilarity).toBeLessThanOrEqual(0.3); // Allow for actual implementation
            // Low similarity
            expect(calculateTitleSimilarity('Frontend Guide', 'Backend Implementation')).toBe(0.0);
            // Exact match
            expect(calculateTitleSimilarity('Test Document', 'Test Document')).toBe(0.3);
        });
        it('should cap total relevance at 1.0', () => {
            // Create scenario that would exceed 1.0 without capping
            const highWeightKeywords = createTestKeywords(['exact', 'match', 'keywords']);
            const result = calculateWeightedRelevanceWithBreakdown(highWeightKeywords, 'Exact Match Keywords', // sourceTitle (should match target exactly)
            'same/namespace', // sourceNamespace
            'Content with @/same/namespace/exact.md reference', // sourceContent
            'Exact Match Keywords', // targetTitle (exact match)
            'Content with exact match keywords and more exact match keywords', // targetContent
            'same/namespace', // targetNamespace (exact match)
            new Date(), // targetLastModified (very recent)
            '/same/namespace/exact.md', // targetPath
            undefined, { enableLinkGraphBoost: true } // Enable all features
            );
            // Should be capped at 1.0
            expect(result.relevance).toBeLessThanOrEqual(1.0);
            expect(result.relevance).toBeGreaterThan(0.9); // Should be very high
        });
    });
    describe('Factor-Based Explanation Generation', () => {
        it('should generate meaningful explanations for single factors', () => {
            const keywordFactor = [{
                    factor: 'keywordOverlap',
                    score: 0.8,
                    description: 'strong keyword overlap'
                }];
            const explanation = generateFactorBasedExplanation(keywordFactor, 'api/auth', false);
            expect(explanation).toBe('Strong keyword overlap in api/auth');
        });
        it('should generate explanations for multiple factors', () => {
            const multipleFactors = [
                {
                    factor: 'keywordOverlap',
                    score: 0.7,
                    description: 'good keyword overlap'
                },
                {
                    factor: 'namespaceAffinity',
                    score: 0.2,
                    description: 'same namespace'
                }
            ];
            const explanation = generateFactorBasedExplanation(multipleFactors, 'api/auth', false);
            expect(explanation).toBe('Good keyword overlap with same namespace');
        });
        it('should handle explicit keyword context', () => {
            const explicitKeywordFactors = [{
                    factor: 'keywordOverlap',
                    score: 0.9,
                    description: 'strong keyword overlap'
                }];
            const explanation = generateFactorBasedExplanation(explicitKeywordFactors, 'api/auth', true);
            expect(explanation).toBe('Strong explicit keyword matches in api/auth');
        });
        it('should generate explanations for three factors', () => {
            const threeFactors = [
                {
                    factor: 'keywordOverlap',
                    score: 0.6,
                    description: 'shared keywords'
                },
                {
                    factor: 'titleSimilarity',
                    score: 0.15,
                    description: 'similar titles'
                },
                {
                    factor: 'recencyBoost',
                    score: 0.05,
                    description: 'recent updates'
                }
            ];
            const explanation = generateFactorBasedExplanation(threeFactors, 'api/auth', false);
            expect(explanation).toBe('Shared keywords with similar titles and recent updates in api/auth');
        });
        it('should provide fallback for empty factors', () => {
            const explanation = generateFactorBasedExplanation([], 'api/auth', false);
            expect(explanation).toBe('Related documentation in api/auth');
        });
    });
    describe('Performance and Edge Cases', () => {
        it('should handle empty keyword scenarios gracefully', () => {
            const result = calculateWeightedRelevanceWithBreakdown([], // Empty keywords
            'Test Title', 'test', 'Test content', 'Target Title', 'Target content', 'target', new Date(), '/target/path.md');
            expect(result.relevance).toBe(0);
            expect(result.primaryFactors).toEqual([]);
        });
        it('should handle invalid input gracefully', () => {
            // Test with null/undefined values
            expect(calculateNamespaceAffinity('', '')).toBe(0);
            expect(calculateTitleSimilarity('', '')).toBe(0);
            expect(calculateRecencyBoost(new Date('invalid'))).toBe(0);
            // Test with malformed content
            const result = extractWeightedKeywords('', '');
            expect(result.keywords).toEqual([]);
            expect(result.weightedKeywords).toEqual([]);
            expect(result.hasExplicitKeywords).toBe(false);
        });
        it('should complete keyword extraction efficiently', () => {
            const largeContent = `# Large Document\n\n${'This is a large document with many words. '.repeat(100)}\n\n## Section 1\n\n${'Content with **important** information and *emphasized* text. '.repeat(50)}`;
            const startTime = Date.now();
            const result = extractWeightedKeywords('Large Document Title', largeContent);
            const duration = Date.now() - startTime;
            // Should complete quickly even with large content
            expect(duration).toBeLessThan(100);
            expect(result.keywords.length).toBeGreaterThan(0);
            expect(result.keywords.length).toBeLessThan(100); // Should limit results
        });
        it('should handle complex frontmatter formats', () => {
            const complexFrontmatter = `---
keywords: ["quoted keywords", 'single quoted', unquoted]
other_field: value
description: "Test description"
---

# Test Document

Content here.`;
            const result = extractWeightedKeywords('Test Document', complexFrontmatter);
            expect(result.hasExplicitKeywords).toBe(true);
            expect(result.keywords).toEqual(['quoted keywords', 'single quoted', 'unquoted']);
        });
    });
    describe('Integration with Document Analysis System', () => {
        it('should maintain consistency with legacy keyword extraction', () => {
            const title = 'API Authentication Guide';
            const overview = 'Complete guide for API authentication with OAuth and JWT';
            // Test enhanced extraction
            const enhanced = extractWeightedKeywords(title, overview);
            // Enhanced should include all meaningful keywords
            expect(enhanced.keywords.length).toBeGreaterThan(0);
            expect(enhanced.keywords).toContain('api');
            expect(enhanced.keywords).toContain('authentication');
            // Should handle both title and content keywords
            const titleKeywords = enhanced.weightedKeywords.filter(w => w.sources.includes('title'));
            const contentKeywords = enhanced.weightedKeywords.filter(w => w.sources.includes('content'));
            expect(titleKeywords.length).toBeGreaterThan(0);
            expect(contentKeywords.length).toBeGreaterThan(0);
        });
        it('should provide deterministic results for same input', () => {
            const title = 'Consistent Test Document';
            const content = 'This should produce **consistent** results every time.';
            const result1 = extractWeightedKeywords(title, content);
            const result2 = extractWeightedKeywords(title, content);
            expect(result1.keywords).toEqual(result2.keywords);
            expect(result1.hasExplicitKeywords).toBe(result2.hasExplicitKeywords);
            expect(result1.totalWeight).toBe(result2.totalWeight);
        });
    });
});
//# sourceMappingURL=keyword-utils-integration.test.js.map