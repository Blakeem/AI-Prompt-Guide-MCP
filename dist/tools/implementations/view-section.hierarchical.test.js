/**
 * TDD-FIRST: Hierarchical view-section tool enhancement tests
 *
 * These tests MUST FAIL initially to follow TDD principles.
 * They test hierarchical addressing enhancements for view-section.ts
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { viewSection } from './view-section.js';
import { getDocumentManager } from '../../shared/utilities.js';
// Mock dependencies
vi.mock('../../shared/utilities.js', () => ({
    getDocumentManager: vi.fn(),
    splitSlugPath: vi.fn((slug) => slug.split('/')),
    getParentSlug: vi.fn((slug) => {
        const parts = slug.split('/');
        return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
    })
}));
// Mock view-section schemas
vi.mock('../schemas/view-section-schemas.js', () => ({
    parseSections: vi.fn((sections) => Array.isArray(sections) ? sections : [sections]),
    validateSectionCount: vi.fn(() => true)
}));
const mockGetDocumentManager = getDocumentManager;
// Mock DocumentManager with hierarchical sections
const createMockDocumentManager = () => ({
    getDocument: vi.fn(() => Promise.resolve({
        metadata: {
            path: '/api/auth-guide.md',
            title: 'Authentication Guide',
            lastModified: new Date(),
            contentHash: 'mock-hash',
            wordCount: 800,
            linkCount: 15,
            codeBlockCount: 8,
            lastAccessed: new Date()
        },
        headings: [
            { slug: 'overview', title: 'Overview', depth: 2 },
            { slug: 'api', title: 'API', depth: 2 },
            { slug: 'api/authentication', title: 'Authentication', depth: 3 },
            { slug: 'api/authentication/jwt-tokens', title: 'JWT Tokens', depth: 4 },
            { slug: 'api/authentication/oauth', title: 'OAuth', depth: 4 },
            { slug: 'api/endpoints', title: 'Endpoints', depth: 3 },
            { slug: 'frontend', title: 'Frontend', depth: 2 },
            { slug: 'frontend/components', title: 'Components', depth: 3 },
            { slug: 'frontend/components/login-form', title: 'Login Form', depth: 4 }
        ],
        toc: [],
        slugIndex: new Map(),
        sections: new Map([
            ['api/authentication/jwt-tokens', '### JWT Tokens\n\nDetailed JWT implementation with @/api/tokens.md links'],
            ['api/authentication/oauth', '### OAuth\n\nOAuth flow documentation with @#providers section'],
            ['frontend/components/login-form', '### Login Form\n\nReact component for authentication @/frontend/components.md#forms']
        ])
    })),
    getSectionContent: vi.fn((path, slug) => {
        const content = new Map([
            ['api/authentication/jwt-tokens', '### JWT Tokens\n\nDetailed JWT implementation with @/api/tokens.md links'],
            ['api/authentication/oauth', '### OAuth\n\nOAuth flow documentation with @#providers section'],
            ['frontend/components/login-form', '### Login Form\n\nReact component for authentication @/frontend/components.md#forms']
        ]);
        return Promise.resolve(content.get(slug) ?? null);
    })
});
const mockSessionState = {
    sessionId: 'test-session'
};
describe('View-Section Tool - Hierarchical Enhancements (TDD-FIRST)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDocumentManager.mockResolvedValue(createMockDocumentManager());
    });
    describe('hierarchical section viewing', () => {
        test('should view section using hierarchical path with context', async () => {
            const args = {
                document: '/api/auth-guide.md',
                section: 'api/authentication/jwt-tokens'
            };
            const result = await viewSection(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should include hierarchical context
            expect(result).toMatchObject({
                document: '/api/auth-guide.md',
                sections: [{
                        slug: 'api/authentication/jwt-tokens',
                        title: 'JWT Tokens',
                        content: '### JWT Tokens\n\nDetailed JWT implementation with @/api/tokens.md links',
                        depth: 4,
                        full_path: 'api/authentication/jwt-tokens',
                        parent: 'api/authentication',
                        word_count: expect.any(Number),
                        links: ['@/api/tokens.md'],
                        hierarchical_context: {
                            full_path: 'api/authentication/jwt-tokens',
                            parent_path: 'api/authentication',
                            section_name: 'jwt-tokens',
                            depth: 3 // Path depth (3 levels)
                        }
                    }],
                summary: {
                    total_sections: 1,
                    total_words: expect.any(Number),
                    has_content: true
                }
            });
        });
        test('should view multiple hierarchical sections with context', async () => {
            const args = {
                document: '/api/auth-guide.md',
                section: ['api/authentication/jwt-tokens', 'frontend/components/login-form']
            };
            const result = await viewSection(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Multiple sections with hierarchical context
            expect(result).toMatchObject({
                document: '/api/auth-guide.md',
                sections: [
                    expect.objectContaining({
                        slug: 'api/authentication/jwt-tokens',
                        full_path: 'api/authentication/jwt-tokens',
                        parent: 'api/authentication',
                        hierarchical_context: {
                            full_path: 'api/authentication/jwt-tokens',
                            parent_path: 'api/authentication',
                            section_name: 'jwt-tokens',
                            depth: 3
                        }
                    }),
                    expect.objectContaining({
                        slug: 'frontend/components/login-form',
                        full_path: 'frontend/components/login-form',
                        parent: 'frontend/components',
                        hierarchical_context: {
                            full_path: 'frontend/components/login-form',
                            parent_path: 'frontend/components',
                            section_name: 'login-form',
                            depth: 3
                        }
                    })
                ],
                summary: {
                    total_sections: 2,
                    total_words: expect.any(Number),
                    has_content: true
                }
            });
        });
        test('should show flat sections without hierarchical context', async () => {
            const args = {
                document: '/api/auth-guide.md',
                section: 'overview'
            };
            const result = await viewSection(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Flat sections should not have hierarchical context
            expect(result).toMatchObject({
                sections: [{
                        slug: 'overview',
                        full_path: 'overview',
                        hierarchical_context: null // No hierarchical context for flat sections
                    }]
            });
        });
        test('should handle deep hierarchical paths (5+ levels)', async () => {
            // Mock a very deep hierarchical section
            const mockManager = createMockDocumentManager();
            mockManager.getDocument = vi.fn(() => Promise.resolve({
                metadata: {
                    path: '/api/auth-guide.md',
                    title: 'Authentication Guide',
                    lastModified: new Date(),
                    contentHash: 'mock-hash',
                    wordCount: 800,
                    linkCount: 15,
                    codeBlockCount: 8,
                    lastAccessed: new Date()
                },
                headings: [
                    { slug: 'api/authentication/oauth/providers/google/scopes', title: 'Google Scopes', depth: 6 }
                ],
                toc: [],
                slugIndex: new Map(),
                sections: new Map([
                    ['api/authentication/oauth/providers/google/scopes', '### Google Scopes\n\nDetailed OAuth scope configuration']
                ])
            }));
            mockManager.getSectionContent = vi.fn(() => Promise.resolve('### Google Scopes\n\nDetailed OAuth scope configuration'));
            mockGetDocumentManager.mockResolvedValue(mockManager);
            const args = {
                document: '/api/auth-guide.md',
                section: 'api/authentication/oauth/providers/google/scopes'
            };
            const result = await viewSection(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Deep hierarchical context
            expect(result).toMatchObject({
                sections: [{
                        slug: 'api/authentication/oauth/providers/google/scopes',
                        full_path: 'api/authentication/oauth/providers/google/scopes',
                        parent: 'api/authentication/oauth/providers/google',
                        hierarchical_context: {
                            full_path: 'api/authentication/oauth/providers/google/scopes',
                            parent_path: 'api/authentication/oauth/providers/google',
                            section_name: 'scopes',
                            depth: 6 // 6 levels deep
                        }
                    }]
            });
        });
    });
    describe('hierarchical link analysis', () => {
        test('should extract and analyze links in hierarchical sections', async () => {
            const args = {
                document: '/api/auth-guide.md',
                section: 'api/authentication/jwt-tokens'
            };
            const result = await viewSection(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Link analysis should work with hierarchical context
            expect(result.sections[0]).toMatchObject({
                links: ['@/api/tokens.md'] // Should extract @ links from content
            });
        });
        test('should handle mixed link types in hierarchical sections', async () => {
            const args = {
                document: '/api/auth-guide.md',
                section: ['api/authentication/oauth', 'frontend/components/login-form']
            };
            const result = await viewSection(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Different link types should be extracted
            expect(result.sections[0]).toMatchObject({
                slug: 'api/authentication/oauth',
                links: ['@#providers'] // Section link
            });
            expect(result.sections[1]).toMatchObject({
                slug: 'frontend/components/login-form',
                links: ['@/frontend/components.md#forms'] // Document + section link
            });
        });
    });
    describe('hierarchical summary statistics', () => {
        test('should provide enhanced summary for hierarchical sections', async () => {
            const args = {
                document: '/api/auth-guide.md',
                section: ['api/authentication/jwt-tokens', 'api/authentication/oauth', 'frontend/components/login-form']
            };
            const result = await viewSection(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Summary should include hierarchical statistics
            expect(result.summary).toMatchObject({
                total_sections: 3,
                total_words: expect.any(Number),
                has_content: true,
                hierarchical_stats: {
                    max_depth: 3, // Deepest path depth
                    namespaces: ['api/authentication', 'frontend/components'], // Unique namespaces
                    flat_sections: 0, // Count of non-hierarchical sections
                    hierarchical_sections: 3 // Count of hierarchical sections
                }
            });
        });
        test('should handle mixed flat and hierarchical sections in summary', async () => {
            // Mock to include a flat section
            const mockManager = createMockDocumentManager();
            mockManager.getDocument = vi.fn(() => Promise.resolve({
                metadata: {
                    path: '/api/auth-guide.md',
                    title: 'Authentication Guide',
                    lastModified: new Date(),
                    contentHash: 'mock-hash',
                    wordCount: 800,
                    linkCount: 15,
                    codeBlockCount: 8,
                    lastAccessed: new Date()
                },
                headings: [
                    { slug: 'overview', title: 'Overview', depth: 2 },
                    { slug: 'api/authentication/jwt-tokens', title: 'JWT Tokens', depth: 4 }
                ],
                toc: [],
                slugIndex: new Map(),
                sections: new Map([
                    ['overview', '## Overview\n\nDocument overview'],
                    ['api/authentication/jwt-tokens', '### JWT Tokens\n\nDetailed JWT implementation']
                ])
            }));
            mockManager.getSectionContent = vi.fn((path, slug) => {
                const content = new Map([
                    ['overview', '## Overview\n\nDocument overview'],
                    ['api/authentication/jwt-tokens', '### JWT Tokens\n\nDetailed JWT implementation']
                ]);
                return Promise.resolve(content.get(slug) ?? null);
            });
            mockGetDocumentManager.mockResolvedValue(mockManager);
            const args = {
                document: '/api/auth-guide.md',
                section: ['overview', 'api/authentication/jwt-tokens']
            };
            const result = await viewSection(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Mixed summary statistics
            expect(result.summary).toMatchObject({
                total_sections: 2,
                hierarchical_stats: {
                    max_depth: 3, // From 'api/authentication/jwt-tokens'
                    namespaces: ['api/authentication'], // Only hierarchical namespace
                    flat_sections: 1, // 'overview'
                    hierarchical_sections: 1 // 'api/authentication/jwt-tokens'
                }
            });
        });
    });
    describe('hierarchical error handling', () => {
        test('should provide hierarchical context in error messages', async () => {
            const args = {
                document: '/api/auth-guide.md',
                section: 'api/nonexistent/hierarchical/path'
            };
            await expect(viewSection(args, mockSessionState)).rejects.toThrow();
            // Error should include hierarchical context about where the path failed
        });
    });
});
//# sourceMappingURL=view-section.hierarchical.test.js.map