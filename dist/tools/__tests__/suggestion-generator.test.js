/**
 * Integration tests for Suggestion Generator (Stage 2.5)
 *
 * Tests the complete Smart Suggestions workflow including related document discovery,
 * broken reference detection, and error handling scenarios.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { processSuggestions } from '../create/suggestion-generator.js';
// Mock the utilities module
vi.mock('../../shared/utilities.js', () => ({
    getDocumentManager: vi.fn(),
    analyzeDocumentSuggestions: vi.fn(),
    analyzeNamespacePatterns: vi.fn()
}));
import { getDocumentManager, analyzeDocumentSuggestions, analyzeNamespacePatterns } from '../../shared/utilities.js';
// Type the mocked functions
const mockGetDocumentManager = getDocumentManager;
const mockAnalyzeDocumentSuggestions = analyzeDocumentSuggestions;
const mockAnalyzeNamespacePatterns = analyzeNamespacePatterns;
// Helper function to create mock document manager
const createMockDocumentManager = () => {
    return {
        listDocuments: vi.fn(),
        getDocument: vi.fn(),
        getDocumentContent: vi.fn(),
        getSectionContent: vi.fn(),
        addDocument: vi.fn(),
        updateDocument: vi.fn(),
        deleteDocument: vi.fn(),
        archiveDocument: vi.fn(),
        createSection: vi.fn(),
        updateSection: vi.fn(),
        deleteSection: vi.fn(),
        moveDocument: vi.fn(),
        renameDocument: vi.fn()
    };
};
// Helper function to create mock SmartSuggestions
const createMockSmartSuggestions = (overrides = {}) => ({
    related_documents: [
        {
            path: '/api/auth.md',
            title: 'Authentication API',
            namespace: 'api',
            reason: 'Related documentation in api',
            relevance: 0.8
        },
        {
            path: '/api/users.md',
            title: 'User Management API',
            namespace: 'api',
            reason: 'Related documentation in api',
            relevance: 0.6
        }
    ],
    broken_references: [
        {
            reference: '@/missing/doc.md',
            type: 'missing_document',
            documentPath: '/missing/doc.md',
            reason: 'Document not found: /missing/doc.md'
        },
        {
            reference: '@/another/missing.md',
            type: 'missing_document',
            documentPath: '/another/missing.md',
            reason: 'Document not found: /another/missing.md'
        }
    ],
    ...overrides
});
// Helper function to create mock namespace patterns
const createMockNamespacePatterns = () => ({
    common_sections: ['Overview', 'Getting Started', 'API Reference'],
    frequent_links: ['/api/auth.md', '/guides/setup.md'],
    typical_tasks: ['Setup authentication', 'Configure API endpoints']
});
describe('Suggestion Generator (Stage 2.5)', () => {
    let mockManager;
    let tempDir;
    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'suggestion-generator-test-'));
        // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
        process.env['MCP_WORKSPACE_PATH'] = tempDir;
        mockManager = createMockDocumentManager();
        vi.clearAllMocks();
        // Default successful mocks
        mockGetDocumentManager.mockResolvedValue(mockManager);
        mockAnalyzeDocumentSuggestions.mockResolvedValue(createMockSmartSuggestions());
        mockAnalyzeNamespacePatterns.mockResolvedValue(createMockNamespacePatterns());
    });
    afterEach(async () => {
        // Clean up temporary directory and all its contents
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch {
            // Ignore if directory doesn't exist
        }
    });
    describe('processSuggestions', () => {
        it('should return smart suggestions result with related documents', async () => {
            const result = await processSuggestions('api/specs', 'User Authentication API', 'API for handling user login and session management');
            expect(result.stage).toBe('smart_suggestions');
            expect(result).toHaveProperty('suggestions');
            expect(result).toHaveProperty('namespace_patterns');
            expect(result).toHaveProperty('next_step');
            expect(result).toHaveProperty('example');
            // Verify the result has the expected structure
            const smartResult = result;
            expect(smartResult.suggestions.related_documents).toHaveLength(2);
            expect(smartResult.suggestions.broken_references).toHaveLength(2);
            expect(smartResult.namespace_patterns.common_sections).toContain('Overview');
            // Verify example structure
            expect(smartResult.example).toEqual({
                namespace: 'api/specs',
                title: 'User Authentication API',
                overview: 'API for handling user login and session management',
                create: true
            });
            expect(smartResult.next_step).toContain("create: true");
        });
        it('should include both related documents and broken references', async () => {
            const mockSuggestions = createMockSmartSuggestions({
                related_documents: [
                    {
                        path: '/api/auth.md',
                        title: 'Authentication Guide',
                        namespace: 'api',
                        reason: 'Shares authentication keywords',
                        relevance: 0.9
                    }
                ],
                broken_references: [
                    {
                        reference: '@/missing/reference.md',
                        type: 'missing_document',
                        documentPath: '/missing/reference.md',
                        reason: 'Document not found: /missing/reference.md'
                    }
                ]
            });
            mockAnalyzeDocumentSuggestions.mockResolvedValue(mockSuggestions);
            const result = await processSuggestions('api', 'JWT Authentication', 'JWT token-based authentication system');
            const smartResult = result;
            // Verify related documents
            expect(smartResult.suggestions.related_documents).toHaveLength(1);
            expect(smartResult.suggestions.related_documents[0]?.title).toBe('Authentication Guide');
            expect(smartResult.suggestions.related_documents[0]?.relevance).toBe(0.9);
            // Verify broken references
            expect(smartResult.suggestions.broken_references).toHaveLength(1);
            expect(smartResult.suggestions.broken_references[0]).toEqual(expect.objectContaining({
                reference: '@/missing/reference.md',
                type: 'missing_document',
                documentPath: '/missing/reference.md',
                reason: expect.stringContaining('Document not found')
            }));
        });
        it('should handle empty suggestions gracefully', async () => {
            const emptyMockSuggestions = createMockSmartSuggestions({
                related_documents: [],
                broken_references: []
            });
            mockAnalyzeDocumentSuggestions.mockResolvedValue(emptyMockSuggestions);
            const result = await processSuggestions('new-namespace', 'First Document', 'Starting a new documentation namespace');
            const smartResult = result;
            expect(smartResult.suggestions.related_documents).toEqual([]);
            expect(smartResult.suggestions.broken_references).toEqual([]);
            expect(smartResult.stage).toBe('smart_suggestions');
        });
        it('should run suggestions and namespace analysis in parallel', async () => {
            const startTime = Date.now();
            // Add artificial delays to verify parallel execution
            mockAnalyzeDocumentSuggestions.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return createMockSmartSuggestions();
            });
            mockAnalyzeNamespacePatterns.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return createMockNamespacePatterns();
            });
            await processSuggestions('api', 'Test', 'Test overview');
            const duration = Date.now() - startTime;
            // Should complete in less time than sequential execution (100ms vs 50ms)
            expect(duration).toBeLessThan(100);
            // Verify both functions were called
            expect(mockAnalyzeDocumentSuggestions).toHaveBeenCalledWith(mockManager, 'api', 'Test', 'Test overview');
            expect(mockAnalyzeNamespacePatterns).toHaveBeenCalledWith(mockManager, 'api');
        });
        it('should include namespace patterns in result', async () => {
            const customNamespacePatterns = {
                common_sections: ['Custom Section', 'Special Overview'],
                frequent_links: ['/custom/path.md'],
                typical_tasks: ['Custom task']
            };
            mockAnalyzeNamespacePatterns.mockResolvedValue(customNamespacePatterns);
            const result = await processSuggestions('custom', 'Custom Document', 'Custom overview');
            const smartResult = result;
            expect(smartResult.namespace_patterns).toEqual(customNamespacePatterns);
        });
    });
    describe('error handling', () => {
        it('should return error result when document manager fails', async () => {
            mockGetDocumentManager.mockRejectedValue(new Error('Document manager initialization failed'));
            const result = await processSuggestions('api', 'Test Document', 'Test overview');
            expect(result.stage).toBe('error_fallback');
            const errorResult = result;
            expect(errorResult.error).toBe('Failed to analyze suggestions');
            expect(errorResult.details).toContain('Document manager initialization failed');
            expect(errorResult.provided_parameters).toEqual({
                namespace: 'api',
                title: 'Test Document',
                overview: 'Test overview'
            });
        });
        it('should return error result when document suggestions analysis fails', async () => {
            mockAnalyzeDocumentSuggestions.mockRejectedValue(new Error('Suggestions analysis failed'));
            const result = await processSuggestions('api', 'Test Document', 'Test overview');
            expect(result.stage).toBe('error_fallback');
            const errorResult = result;
            expect(errorResult.error).toBe('Failed to analyze suggestions');
            expect(errorResult.details).toContain('Suggestions analysis failed');
        });
        it('should return error result when namespace patterns analysis fails', async () => {
            mockAnalyzeNamespacePatterns.mockRejectedValue(new Error('Namespace analysis failed'));
            const result = await processSuggestions('api', 'Test Document', 'Test overview');
            expect(result.stage).toBe('error_fallback');
            const errorResult = result;
            expect(errorResult.details).toContain('Namespace analysis failed');
        });
        it('should provide helpful recovery steps in error result', async () => {
            mockGetDocumentManager.mockRejectedValue(new Error('Connection failed'));
            const result = await processSuggestions('api', 'Test Document', 'Test overview');
            const errorResult = result;
            expect(errorResult.help).toContain('You can still proceed with document creation');
            expect(errorResult.recovery_steps).toContain("Call again with 'create: true' to skip suggestions and create the document");
            expect(errorResult.recovery_steps).toContain('Check that the namespace, title, and overview are valid');
            // Should provide a valid example for recovery
            expect(errorResult.example).toEqual({
                namespace: 'api',
                title: 'Test Document',
                overview: 'Test overview',
                create: true
            });
        });
        it('should handle non-Error thrown objects gracefully', async () => {
            mockAnalyzeDocumentSuggestions.mockRejectedValue('String error');
            const result = await processSuggestions('api', 'Test Document', 'Test overview');
            const errorResult = result;
            expect(errorResult.details).toBe('String error');
        });
        it('should preserve original parameters in error result', async () => {
            mockGetDocumentManager.mockRejectedValue(new Error('Test error'));
            const namespace = 'complex/nested/namespace';
            const title = 'Complex Document Title';
            const overview = 'Complex overview with special characters @#$%';
            const result = await processSuggestions(namespace, title, overview);
            const errorResult = result;
            expect(errorResult.provided_parameters).toEqual({
                namespace,
                title,
                overview
            });
            expect(errorResult.example).toEqual({
                namespace,
                title,
                overview,
                create: true
            });
        });
    });
    describe('integration scenarios', () => {
        it('should handle real-world document analysis scenario', async () => {
            // Simulate a realistic scenario with multiple related docs and some broken refs
            const realisticSuggestions = createMockSmartSuggestions({
                related_documents: [
                    {
                        path: '/api/auth/oauth.md',
                        title: 'OAuth 2.0 Implementation',
                        namespace: 'api/auth',
                        reason: 'Shares authentication and OAuth keywords',
                        relevance: 0.95
                    },
                    {
                        path: '/api/auth/jwt.md',
                        title: 'JWT Token Management',
                        namespace: 'api/auth',
                        reason: 'Related authentication documentation',
                        relevance: 0.87
                    },
                    {
                        path: '/guides/security.md',
                        title: 'Security Best Practices',
                        namespace: 'guides',
                        reason: 'Related security documentation',
                        relevance: 0.43
                    }
                ],
                broken_references: [
                    {
                        reference: '@/api/auth/deprecated-flow.md',
                        type: 'missing_document',
                        documentPath: '/api/auth/deprecated-flow.md',
                        reason: 'Document not found: /api/auth/deprecated-flow.md'
                    },
                    {
                        reference: '@/config/oauth-settings.md',
                        type: 'missing_document',
                        documentPath: '/config/oauth-settings.md',
                        reason: 'Document not found: /config/oauth-settings.md'
                    }
                ]
            });
            const realisticNamespacePatterns = {
                common_sections: ['Configuration', 'Examples', 'Troubleshooting'],
                frequent_links: ['/api/auth/oauth.md', '/guides/security.md'],
                typical_tasks: ['Setup OAuth flow', 'Configure JWT validation', 'Handle token refresh']
            };
            mockAnalyzeDocumentSuggestions.mockResolvedValue(realisticSuggestions);
            mockAnalyzeNamespacePatterns.mockResolvedValue(realisticNamespacePatterns);
            const result = await processSuggestions('api/auth', 'OAuth 2.0 Client Authentication', 'Implementation guide for OAuth 2.0 client authentication flow with JWT tokens');
            const smartResult = result;
            // Verify comprehensive suggestions
            expect(smartResult.suggestions.related_documents).toHaveLength(3);
            expect(smartResult.suggestions.broken_references).toHaveLength(2);
            // Verify high-relevance docs are included
            const oauthDoc = smartResult.suggestions.related_documents.find(doc => doc.path === '/api/auth/oauth.md');
            expect(oauthDoc?.relevance).toBeGreaterThan(0.9);
            // Verify namespace patterns are meaningful
            expect(smartResult.namespace_patterns.typical_tasks).toContain('Setup OAuth flow');
        });
        it('should handle namespace with no existing documents', async () => {
            const emptySuggestions = createMockSmartSuggestions({
                related_documents: [],
                broken_references: []
            });
            const emptyNamespacePatterns = {
                common_sections: [],
                frequent_links: [],
                typical_tasks: []
            };
            mockAnalyzeDocumentSuggestions.mockResolvedValue(emptySuggestions);
            mockAnalyzeNamespacePatterns.mockResolvedValue(emptyNamespacePatterns);
            const result = await processSuggestions('brand-new-namespace', 'First Document Ever', 'Starting completely fresh documentation');
            const smartResult = result;
            expect(smartResult.suggestions.related_documents).toEqual([]);
            expect(smartResult.suggestions.broken_references).toEqual([]);
            expect(smartResult.namespace_patterns.common_sections).toEqual([]);
            // Should still provide valid guidance
            expect(smartResult.next_step).toContain("create: true");
        });
        it('should handle complex broken references scenario', async () => {
            const complexBrokenRefs = createMockSmartSuggestions({
                related_documents: [],
                broken_references: [
                    {
                        reference: '@/api/v1/deprecated.md',
                        type: 'missing_document',
                        documentPath: '/api/v1/deprecated.md',
                        reason: 'Document not found: /api/v1/deprecated.md'
                    },
                    {
                        reference: '@/config/old-settings.md',
                        type: 'missing_document',
                        documentPath: '/config/old-settings.md',
                        reason: 'Document not found: /config/old-settings.md'
                    },
                    {
                        reference: '@/guides/outdated-tutorial.md',
                        type: 'missing_document',
                        documentPath: '/guides/outdated-tutorial.md',
                        reason: 'Document not found: /guides/outdated-tutorial.md'
                    },
                    {
                        reference: '@missing-entirely.md',
                        type: 'missing_document',
                        documentPath: '/missing-entirely.md',
                        reason: 'Document not found: /missing-entirely.md'
                    },
                    {
                        reference: '@/api/auth.md#nonexistent-section',
                        type: 'missing_section',
                        documentPath: '/api/auth.md',
                        sectionSlug: 'nonexistent-section',
                        reason: "Section 'nonexistent-section' not found in document /api/auth.md"
                    }
                ]
            });
            mockAnalyzeDocumentSuggestions.mockResolvedValue(complexBrokenRefs);
            const result = await processSuggestions('api', 'Migration Guide', 'Guide for migrating from old API to new. See @/api/v1/deprecated.md and @missing-entirely.md');
            const smartResult = result;
            expect(smartResult.suggestions.broken_references).toHaveLength(5);
            // Check specific references by their text
            const brokenRefTexts = smartResult.suggestions.broken_references.map(ref => ref.reference);
            expect(brokenRefTexts).toContain('@/api/v1/deprecated.md');
            expect(brokenRefTexts).toContain('@missing-entirely.md');
            // Verify structure of section-specific broken reference
            const sectionRef = smartResult.suggestions.broken_references.find(ref => ref.reference === '@/api/auth.md#nonexistent-section');
            expect(sectionRef).toEqual(expect.objectContaining({
                reference: '@/api/auth.md#nonexistent-section',
                type: 'missing_section',
                documentPath: '/api/auth.md',
                sectionSlug: 'nonexistent-section',
                reason: expect.stringContaining('Section \'nonexistent-section\' not found')
            }));
        });
        it('should validate comprehensive BrokenReference structure integration', async () => {
            // Test that the integration properly handles all BrokenReference types implemented in Stage 3
            const comprehensiveBrokenRefs = createMockSmartSuggestions({
                related_documents: [],
                broken_references: [
                    // Missing document type
                    {
                        reference: '@/missing/document.md',
                        type: 'missing_document',
                        documentPath: '/missing/document.md',
                        reason: 'Document not found: /missing/document.md'
                    },
                    // Missing document with section
                    {
                        reference: '@/missing/document.md#section',
                        type: 'missing_document',
                        documentPath: '/missing/document.md',
                        sectionSlug: 'section',
                        reason: 'Document not found: /missing/document.md'
                    },
                    // Missing section type
                    {
                        reference: '@/existing/document.md#missing-section',
                        type: 'missing_section',
                        documentPath: '/existing/document.md',
                        sectionSlug: 'missing-section',
                        reason: "Section 'missing-section' not found in document /existing/document.md"
                    },
                    // Malformed type
                    {
                        reference: '@malformed-ref',
                        type: 'malformed',
                        reason: 'Failed to parse reference: Invalid reference format'
                    },
                    // Relative reference
                    {
                        reference: '@relative-doc',
                        type: 'missing_document',
                        documentPath: '/relative-doc.md',
                        reason: 'Document not found: /relative-doc.md'
                    }
                ]
            });
            mockAnalyzeDocumentSuggestions.mockResolvedValue(comprehensiveBrokenRefs);
            const result = await processSuggestions('api', 'Comprehensive Reference Test', 'Test all reference types: @/missing/document.md @/existing/document.md#missing-section @malformed-ref');
            const smartResult = result;
            // Verify comprehensive coverage
            expect(smartResult.suggestions.broken_references).toHaveLength(5);
            // Test missing_document type
            const missingDocRefs = smartResult.suggestions.broken_references.filter(ref => ref.type === 'missing_document');
            expect(missingDocRefs).toHaveLength(3);
            for (const ref of missingDocRefs) {
                expect(ref.documentPath).toBeDefined();
                expect(ref.reason).toContain('Document not found');
            }
            // Test missing_section type
            const missingSectionRefs = smartResult.suggestions.broken_references.filter(ref => ref.type === 'missing_section');
            expect(missingSectionRefs).toHaveLength(1);
            const missingSectionRef = missingSectionRefs[0];
            expect(missingSectionRef?.documentPath).toBe('/existing/document.md');
            expect(missingSectionRef?.sectionSlug).toBe('missing-section');
            expect(missingSectionRef?.reason).toContain('Section \'missing-section\' not found');
            // Test malformed type
            const malformedRefs = smartResult.suggestions.broken_references.filter(ref => ref.type === 'malformed');
            expect(malformedRefs).toHaveLength(1);
            const malformedRef = malformedRefs[0];
            expect(malformedRef?.reason).toContain('Failed to parse reference');
            expect(malformedRef?.documentPath).toBeUndefined(); // Malformed refs may not have valid paths
            // Verify all references have required fields
            for (const ref of smartResult.suggestions.broken_references) {
                expect(ref.reference).toBeDefined();
                expect(ref.type).toBeOneOf(['missing_document', 'missing_section', 'malformed']);
                expect(ref.reason).toBeDefined();
                expect(typeof ref.reason).toBe('string');
                expect(ref.reason.length).toBeGreaterThan(0);
            }
        });
    });
    describe('performance and concurrency', () => {
        it('should handle concurrent suggestion analysis efficiently', async () => {
            // Simulate multiple parallel calls
            const promises = Array.from({ length: 5 }, (_, i) => processSuggestions(`namespace-${i}`, `Document ${i}`, `Overview for document ${i}`));
            const results = await Promise.all(promises);
            // All should complete successfully
            expect(results).toHaveLength(5);
            results.forEach((result, i) => {
                expect(result.stage).toBe('smart_suggestions');
                const smartResult = result;
                expect(smartResult.example.namespace).toBe(`namespace-${i}`);
            });
            // Verify all manager calls were made
            expect(mockGetDocumentManager).toHaveBeenCalledTimes(5);
            expect(mockAnalyzeDocumentSuggestions).toHaveBeenCalledTimes(5);
            expect(mockAnalyzeNamespacePatterns).toHaveBeenCalledTimes(5);
        });
    });
});
//# sourceMappingURL=suggestion-generator.test.js.map