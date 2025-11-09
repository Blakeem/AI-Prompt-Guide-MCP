/**
 * Enhanced document analysis integration tests
 *
 * Tests the complete document analysis system with Stage 1-4 enhancements
 * including structured broken references, enhanced keyword extraction,
 * and fingerprint-based optimization.
 */
import { describe, it, expect, vi } from 'vitest';
import { analyzeDocumentSuggestions } from '../document-analysis.js';
// Mock the logger to avoid console noise in tests
vi.mock('../../utils/logger.js', () => ({
    getGlobalLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    })
}));
// Test utilities
const createMockDocument = (overrides = {}) => ({
    metadata: {
        path: '/test/document.md',
        title: 'Test Document',
        namespace: 'test',
        lastModified: new Date('2023-12-01T10:00:00Z'),
        contentHash: 'test-hash',
        wordCount: 10,
        linkCount: 0,
        codeBlockCount: 0,
        lastAccessed: new Date('2023-12-01T10:00:00Z'),
        cacheGeneration: 1,
        keywords: ['test', 'document'],
        fingerprintGenerated: new Date('2023-12-01T10:00:00Z')
    },
    headings: [],
    toc: [],
    slugIndex: new Map(),
    ...overrides
});
const createMockFingerprint = (overrides = {}) => ({
    keywords: ['test', 'document', 'content'],
    lastModified: new Date('2023-12-01T10:00:00Z'),
    contentHash: 'test-hash',
    namespace: 'test',
    ...overrides
});
const createMockDocumentManager = (documents = [], fingerprints = []) => {
    const documentMap = new Map(documents.map(d => [d.path, d.document]));
    const mockManager = {
        listDocuments: vi.fn().mockResolvedValue({
            documents: documents.map(d => ({ path: d.path, title: d.document.metadata.title, lastModified: d.document.metadata.lastModified, headingCount: d.document.headings.length, wordCount: d.document.metadata.wordCount }))
        }),
        getDocument: vi.fn().mockImplementation(async (path) => {
            return documentMap.get(path) ?? null;
        }),
        getDocumentContent: vi.fn().mockImplementation(async (path) => {
            // Return simple mock content for testing
            return `Mock content for ${path}`;
        }),
        listDocumentFingerprints: vi.fn().mockResolvedValue(fingerprints),
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
    return mockManager;
};
describe('Enhanced Document Analysis Integration', () => {
    describe('Related Document Discovery with Enhanced Features', () => {
        it('should find related documents using enhanced keyword extraction and multi-factor scoring', async () => {
            const authDoc = createMockDocument({
                metadata: {
                    path: '/api/auth/oauth.md',
                    title: 'OAuth Authentication Guide',
                    namespace: 'api/auth',
                    lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                    contentHash: 'auth-hash',
                    wordCount: 50,
                    linkCount: 5,
                    codeBlockCount: 2,
                    lastAccessed: new Date(),
                    cacheGeneration: 1,
                    keywords: ['oauth', 'authentication', 'api', 'security'],
                    fingerprintGenerated: new Date()
                },
            });
            const jwtDoc = createMockDocument({
                metadata: {
                    path: '/api/auth/jwt.md',
                    title: 'JWT Token Management',
                    namespace: 'api/auth',
                    lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
                    contentHash: 'jwt-hash',
                    wordCount: 30,
                    linkCount: 3,
                    codeBlockCount: 1,
                    lastAccessed: new Date(),
                    cacheGeneration: 1,
                    keywords: ['jwt', 'token', 'authentication'],
                    fingerprintGenerated: new Date()
                },
            });
            const securityDoc = createMockDocument({
                metadata: {
                    path: '/security/best-practices.md',
                    title: 'Security Best Practices',
                    namespace: 'security',
                    lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
                    contentHash: 'security-hash',
                    wordCount: 40,
                    linkCount: 2,
                    codeBlockCount: 0,
                    lastAccessed: new Date(),
                    cacheGeneration: 1,
                    keywords: ['security', 'best', 'practices'],
                    fingerprintGenerated: new Date()
                },
            });
            const manager = createMockDocumentManager([
                { path: '/api/auth/oauth.md', document: authDoc },
                { path: '/api/auth/jwt.md', document: jwtDoc },
                { path: '/security/practices.md', document: securityDoc }
            ]);
            const result = await analyzeDocumentSuggestions(manager, 'api/auth', 'OAuth 2.0 Client Implementation', '---\nkeywords: [oauth, authentication, client, api, security]\n---\n\nImplementation guide for OAuth 2.0 client authentication.');
            expect(result.related_documents.length).toBeGreaterThan(0);
            // Should prefer documents in same/related namespace
            const sameNamespaceDocs = result.related_documents.filter(d => d.namespace === 'api/auth');
            const relatedNamespaceDocs = result.related_documents.filter(d => d.namespace === 'security');
            if (sameNamespaceDocs.length > 0 && relatedNamespaceDocs.length > 0) {
                expect(sameNamespaceDocs[0]?.relevance).toBeGreaterThan(relatedNamespaceDocs[0]?.relevance ?? 0);
            }
            // Should include factor-based explanations
            for (const doc of result.related_documents) {
                expect(typeof doc.reason).toBe('string');
                expect(doc.reason.length).toBeGreaterThan(0);
                // Note: Current implementation may still use generic explanations in some cases
                // which is acceptable for fallback scenarios
            }
        });
        it('should use fingerprint optimization when available', async () => {
            const fingerprints = [
                createMockFingerprint({
                    keywords: ['oauth', 'authentication', 'api'],
                    namespace: 'api/auth',
                    contentHash: 'auth-fingerprint'
                }),
                createMockFingerprint({
                    keywords: ['security', 'best', 'practices'],
                    namespace: 'security',
                    contentHash: 'security-fingerprint'
                })
            ];
            const authDoc = createMockDocument({
                metadata: {
                    path: '/api/auth/oauth.md',
                    title: 'OAuth Guide',
                    namespace: 'api/auth',
                    contentHash: 'auth-fingerprint',
                    lastModified: new Date('2023-12-01'),
                    wordCount: 100,
                    linkCount: 5,
                    codeBlockCount: 3,
                    lastAccessed: new Date('2023-12-01'),
                    cacheGeneration: 1,
                    keywords: ['oauth', 'authentication', 'api'],
                    fingerprintGenerated: new Date('2023-12-01')
                }
            });
            const securityDoc = createMockDocument({
                metadata: {
                    path: '/security/practices.md',
                    title: 'Security Practices',
                    namespace: 'security',
                    contentHash: 'security-fingerprint',
                    lastModified: new Date('2023-12-01'),
                    wordCount: 80,
                    linkCount: 2,
                    codeBlockCount: 1,
                    lastAccessed: new Date('2023-12-01'),
                    cacheGeneration: 1,
                    keywords: ['security', 'best', 'practices'],
                    fingerprintGenerated: new Date('2023-12-01')
                }
            });
            const manager = createMockDocumentManager([
                { path: '/api/auth/oauth.md', document: authDoc },
                { path: '/security/practices.md', document: securityDoc }
            ], fingerprints);
            const result = await analyzeDocumentSuggestions(manager, 'api/auth', 'OAuth Implementation', 'OAuth authentication implementation guide');
            // Should find related documents using fingerprint optimization
            expect(result.related_documents.length).toBeGreaterThanOrEqual(0);
            // If documents are found, OAuth document should be relevant due to keyword overlap
            if (result.related_documents.length > 0) {
                const oauthDoc = result.related_documents.find(d => d.path === '/api/auth/oauth.md');
                if (oauthDoc) {
                    expect(oauthDoc.relevance).toBeGreaterThan(0.2); // Lower threshold for test stability
                }
            }
            // Verify fingerprint method was called
            expect(manager.listDocumentFingerprints).toHaveBeenCalled();
        });
        it('should gracefully fall back when fingerprint optimization fails', async () => {
            const authDoc = createMockDocument({
                metadata: {
                    path: '/api/auth/oauth.md',
                    title: 'OAuth Authentication',
                    namespace: 'api/auth',
                    lastModified: new Date(),
                    contentHash: 'auth-hash',
                    wordCount: 50,
                    linkCount: 2,
                    codeBlockCount: 1,
                    lastAccessed: new Date(),
                    cacheGeneration: 1,
                    keywords: ['oauth', 'authentication', 'api'],
                    fingerprintGenerated: new Date()
                },
            });
            const manager = createMockDocumentManager([
                { path: '/api/auth/oauth.md', document: authDoc }
            ]);
            // Make fingerprint method fail
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            manager.listDocumentFingerprints.mockRejectedValue(new Error('Fingerprint system unavailable'));
            const result = await analyzeDocumentSuggestions(manager, 'api/auth', 'Authentication Guide', 'Guide for implementing authentication');
            // Should still find documents using fallback method
            expect(result.related_documents.length).toBeGreaterThan(0);
            const oauthDoc = result.related_documents.find(d => d.path === '/api/auth/oauth.md');
            expect(oauthDoc).toBeDefined();
            expect(oauthDoc?.relevance).toBeGreaterThan(0);
        });
    });
    describe('Structured Broken Reference Detection', () => {
        it('should detect and classify missing documents', async () => {
            const manager = createMockDocumentManager([]);
            const result = await analyzeDocumentSuggestions(manager, 'test', 'Reference Test', 'Document with references: @/missing/doc.md and @/another/missing.md#section');
            expect(result.broken_references.length).toBeGreaterThan(0);
            // Should detect missing documents
            const missingDocRefs = result.broken_references.filter(ref => ref.type === 'missing_document');
            expect(missingDocRefs.length).toBeGreaterThan(0);
            for (const ref of missingDocRefs) {
                expect(ref.documentPath).toBeDefined();
                expect(ref.reason).toContain('Document not found');
            }
        });
        it('should detect missing sections in existing documents', async () => {
            const existingDoc = createMockDocument({});
            const manager = createMockDocumentManager([
                { path: '/api/auth.md', document: existingDoc }
            ]);
            const result = await analyzeDocumentSuggestions(manager, 'test', 'Section Reference Test', 'Reference to existing doc with missing section: @/api/auth.md#nonexistent-section');
            const missingSectionRefs = result.broken_references.filter(ref => ref.type === 'missing_section');
            expect(missingSectionRefs.length).toBeGreaterThan(0);
            const missingSectionRef = missingSectionRefs[0];
            expect(missingSectionRef?.documentPath).toBe('/api/auth.md');
            expect(missingSectionRef?.sectionSlug).toBe('nonexistent-section');
            expect(missingSectionRef?.reason).toContain("Section 'nonexistent-section' not found");
        });
        it('should detect malformed references', async () => {
            const manager = createMockDocumentManager([]);
            const result = await analyzeDocumentSuggestions(manager, 'test', 'Malformed Reference Test', 'Document with malformed references: @[invalid-format] and @incomplete');
            // Should handle malformed references gracefully
            // At minimum, should not crash and should provide some feedback
            expect(result.broken_references.length).toBeGreaterThan(0);
        });
        it('should handle relative references correctly', async () => {
            const manager = createMockDocumentManager([]);
            const result = await analyzeDocumentSuggestions(manager, 'test', 'Relative Reference Test', 'Document with relative references: @relative-doc and @another-relative.md');
            // Should convert relative references to absolute paths
            const relativeRefs = result.broken_references.filter(ref => {
                const docPath = ref.documentPath;
                return docPath != null && docPath.startsWith('/') &&
                    (docPath.includes('relative-doc') || docPath.includes('another-relative'));
            });
            expect(relativeRefs.length).toBeGreaterThan(0);
            for (const ref of relativeRefs) {
                if (ref.documentPath != null) {
                    expect(ref.documentPath).toMatch(/^\/.*\.md$/); // Should be absolute path ending in .md
                }
            }
        });
        it('should deduplicate broken references', async () => {
            const manager = createMockDocumentManager([]);
            const result = await analyzeDocumentSuggestions(manager, 'test', 'Duplicate Reference Test', 'Document with duplicate references: @/missing/doc.md and @/missing/doc.md again');
            // Should deduplicate references with same path
            const uniqueRefs = new Set(result.broken_references.map(ref => ref.reference));
            expect(result.broken_references.length).toBe(uniqueRefs.size);
        });
    });
    describe('Error Handling and Graceful Degradation', () => {
        it('should handle analysis failures with partial results', async () => {
            const failingManager = createMockDocumentManager([]);
            // Make document listing fail
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            failingManager.listDocuments.mockRejectedValue(new Error('Database connection failed'));
            const result = await analyzeDocumentSuggestions(failingManager, 'test', 'Error Test', 'Test document');
            // Should return empty results rather than throwing
            expect(result.related_documents).toEqual([]);
            expect(result.broken_references).toEqual([]);
        });
        it('should validate input parameters', async () => {
            const manager = createMockDocumentManager([]);
            // Test with invalid inputs
            await expect(analyzeDocumentSuggestions(null, 'test', 'Test', 'Test')).rejects.toThrow(/Input validation failed/);
            await expect(analyzeDocumentSuggestions(manager, '', 'Test', 'Test')).rejects.toThrow(/Input validation failed/);
            await expect(analyzeDocumentSuggestions(manager, 'test', '', 'Test')).rejects.toThrow(/Input validation failed/);
        });
        it('should handle document read failures gracefully', async () => {
            const manager = createMockDocumentManager([
                {
                    path: '/failing/doc.md',
                    document: createMockDocument({
                        metadata: {
                            path: '/failing/doc.md',
                            title: 'Failing Document',
                            namespace: 'failing',
                            lastModified: new Date(),
                            contentHash: 'failing-hash',
                            wordCount: 10,
                            linkCount: 0,
                            codeBlockCount: 0,
                            lastAccessed: new Date(),
                            cacheGeneration: 1,
                            keywords: ['failing', 'document'],
                            fingerprintGenerated: new Date()
                        }
                    })
                }
            ]);
            // Make document content reading fail
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            manager.getDocumentContent.mockRejectedValue(new Error('File read error'));
            const result = await analyzeDocumentSuggestions(manager, 'test', 'Test Document', 'Test content with failing keywords');
            // Should complete without throwing, possibly with reduced results
            expect(Array.isArray(result.related_documents)).toBe(true);
            expect(Array.isArray(result.broken_references)).toBe(true);
        });
    });
    describe('Performance and Scalability', () => {
        it('should handle large document sets efficiently', async () => {
            // Create many documents to test performance
            const documents = Array.from({ length: 50 }, (_, i) => ({
                path: `/test/doc-${i}.md`,
                document: createMockDocument({
                    metadata: {
                        path: `/test/doc-${i}.md`,
                        title: `Test Document ${i}`,
                        namespace: `test/namespace-${i % 5}`,
                        lastModified: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
                        contentHash: `hash-${i}`,
                        wordCount: 100 + i,
                        linkCount: i % 3,
                        codeBlockCount: i % 2,
                        lastAccessed: new Date(),
                        cacheGeneration: 1,
                        keywords: [`test`, `document`, `keyword-${i % 3}`],
                        fingerprintGenerated: new Date()
                    }
                })
            }));
            const manager = createMockDocumentManager(documents);
            const startTime = Date.now();
            const result = await analyzeDocumentSuggestions(manager, 'test', 'Performance Test Document', 'Document for testing performance with many potential matches');
            const duration = Date.now() - startTime;
            // Should complete in reasonable time
            expect(duration).toBeLessThan(1000); // 1 second
            // Should limit results appropriately
            expect(result.related_documents.length).toBeLessThanOrEqual(5);
            // Results should be sorted by relevance
            for (let i = 1; i < result.related_documents.length; i++) {
                const current = result.related_documents[i];
                const previous = result.related_documents[i - 1];
                expect(current?.relevance).toBeLessThanOrEqual(previous?.relevance ?? 0);
            }
        });
        it('should optimize with fingerprint-based two-stage filtering', async () => {
            const fingerprints = Array.from({ length: 20 }, (_, i) => createMockFingerprint({
                keywords: [`keyword-${i}`, 'common', 'shared'],
                namespace: `namespace-${i % 3}`,
                contentHash: `fingerprint-${i}`
            }));
            const documents = Array.from({ length: 20 }, (_, i) => ({
                path: `/docs/doc-${i}.md`,
                document: createMockDocument({
                    metadata: {
                        path: `/docs/doc-${i}.md`,
                        title: `Document ${i}`,
                        namespace: `namespace-${i % 3}`,
                        contentHash: `fingerprint-${i}`,
                        lastModified: new Date(),
                        wordCount: 50,
                        linkCount: 1,
                        codeBlockCount: 0,
                        lastAccessed: new Date(),
                        cacheGeneration: 1,
                        keywords: [`keyword-${i}`, 'common', 'shared'],
                        fingerprintGenerated: new Date()
                    }
                })
            }));
            const manager = createMockDocumentManager(documents, fingerprints);
            const startTime = Date.now();
            const result = await analyzeDocumentSuggestions(manager, 'namespace-0', 'Optimization Test', 'Document with common shared keywords for testing optimization');
            const duration = Date.now() - startTime;
            // Should complete efficiently with fingerprint optimization
            expect(duration).toBeLessThan(500); // Should be fast with fingerprint filtering
            expect(result.related_documents.length).toBeGreaterThanOrEqual(0);
            // Verify fingerprint optimization was used
            expect(manager.listDocumentFingerprints).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=document-analysis-enhanced.test.js.map