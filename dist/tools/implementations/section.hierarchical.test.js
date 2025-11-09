/**
 * TDD-FIRST: Hierarchical section tool enhancement tests
 *
 * These tests MUST FAIL initially to follow TDD principles.
 * They test hierarchical addressing enhancements for section.ts
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { section } from './section.js';
import { performSectionEdit, getDocumentManager } from '../../shared/utilities.js';
// Mock dependencies
vi.mock('../../shared/utilities.js', () => ({
    getDocumentManager: vi.fn(),
    performSectionEdit: vi.fn(),
    pathToNamespace: vi.fn(() => 'api/specs'),
    pathToSlug: vi.fn(() => 'auth'),
    getSlugDepth: vi.fn(() => 3),
    getParentSlug: vi.fn((slug) => {
        const parts = slug.split('/');
        return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
    }),
    validateSlugPath: vi.fn(() => ({ success: true, result: 'valid-slug' })),
    resolveLinkWithContext: vi.fn()
}));
// Mock link-utils module
vi.mock('../../shared/link-utils.js', () => ({
    resolveLinkWithContext: vi.fn(() => Promise.resolve({
        validation: { valid: true },
        resolvedPath: null
    }))
}));
const mockGetDocumentManager = getDocumentManager;
const mockPerformSectionEdit = performSectionEdit;
// Mock DocumentManager with hierarchical sections
const createMockDocumentManager = () => ({
    getDocument: vi.fn(() => Promise.resolve({
        metadata: {
            path: '/api/auth-guide.md',
            title: 'Authentication Guide',
            lastModified: new Date(),
            contentHash: 'mock-hash',
            wordCount: 500,
            linkCount: 10,
            codeBlockCount: 5,
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
            ['api/authentication/jwt-tokens', '### JWT Tokens\n\nContent about JWT tokens'],
            ['api/authentication/oauth', '### OAuth\n\nContent about OAuth'],
            ['frontend/components/login-form', '### Login Form\n\nContent about login form']
        ])
    })),
    getSectionContent: vi.fn((path, slug) => {
        const content = new Map([
            ['api/authentication/jwt-tokens', '### JWT Tokens\n\nContent about JWT tokens'],
            ['api/authentication/oauth', '### OAuth\n\nContent about OAuth'],
            ['frontend/components/login-form', '### Login Form\n\nContent about login form']
        ]);
        return Promise.resolve(content.get(slug) ?? null);
    }),
    searchDocuments: vi.fn(() => Promise.resolve([]))
});
const mockSessionState = {
    sessionId: 'test-session'
};
describe('Section Tool - Hierarchical Operations (TDD-FIRST)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDocumentManager.mockResolvedValue(createMockDocumentManager());
    });
    describe('hierarchical section operations', () => {
        test('should edit section using hierarchical path', async () => {
            // Setup mock for successful edit
            mockPerformSectionEdit.mockResolvedValue({
                section: 'api/authentication/jwt-tokens',
                action: 'edited',
                depth: 4
            });
            const args = {
                document: '/api/auth-guide.md',
                section: 'api/authentication/jwt-tokens',
                operation: 'replace',
                content: 'Updated JWT token implementation details'
            };
            const result = await section(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should include hierarchical context
            expect(result).toMatchObject({
                updated: true,
                document: '/api/auth-guide.md',
                section: 'api/authentication/jwt-tokens',
                operation: 'replace',
                hierarchical_context: {
                    full_path: 'api/authentication/jwt-tokens',
                    parent_path: 'api/authentication',
                    section_name: 'jwt-tokens',
                    depth: 3 // Path depth, not markdown depth
                }
            });
            expect(mockPerformSectionEdit).toHaveBeenCalledWith(expect.any(Object), '/api/auth-guide.md', 'api/authentication/jwt-tokens', 'Updated JWT token implementation details', 'replace', undefined);
        });
        test('should create child section using hierarchical insert_after', async () => {
            mockPerformSectionEdit.mockResolvedValue({
                section: 'api/authentication/refresh-tokens',
                action: 'created',
                depth: 4
            });
            const args = {
                document: '/api/auth-guide.md',
                section: 'api/authentication/jwt-tokens',
                operation: 'insert_after',
                content: '### Refresh Tokens\n\nDetailed refresh token implementation',
                title: 'Refresh Tokens'
            };
            const result = await section(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should include hierarchical context for created section
            expect(result).toMatchObject({
                created: true,
                new_section: 'api/authentication/refresh-tokens',
                hierarchical_context: {
                    full_path: 'api/authentication/refresh-tokens',
                    parent_path: 'api/authentication',
                    section_name: 'refresh-tokens',
                    depth: 3
                }
            });
        });
        test('should remove section using hierarchical path', async () => {
            mockPerformSectionEdit.mockResolvedValue({
                section: 'frontend/components/login-form',
                action: 'removed',
                removedContent: '### Login Form\n\nContent about login form'
            });
            const args = {
                document: '/api/auth-guide.md',
                section: 'frontend/components/login-form',
                operation: 'remove'
            };
            const result = await section(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should handle hierarchical removal
            expect(result).toMatchObject({
                removed: true,
                section: 'frontend/components/login-form',
                removed_content: '### Login Form\n\nContent about login form'
            });
        });
        test('should handle batch operations with hierarchical paths', async () => {
            mockPerformSectionEdit
                .mockResolvedValueOnce({
                section: 'api/authentication/jwt-tokens',
                action: 'edited'
            })
                .mockResolvedValueOnce({
                section: 'frontend/components/login-form',
                action: 'edited'
            });
            const batchArgs = [
                {
                    document: '/api/auth-guide.md',
                    section: 'api/authentication/jwt-tokens',
                    operation: 'append',
                    content: '\n\nAdditional JWT information'
                },
                {
                    document: '/api/auth-guide.md',
                    section: 'frontend/components/login-form',
                    operation: 'prepend',
                    content: 'Important note:\n\n'
                }
            ];
            const result = await section(batchArgs, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Batch operations should work with hierarchical paths
            expect(result).toMatchObject({
                batch_results: expect.arrayContaining([
                    expect.objectContaining({
                        success: true,
                        section: 'api/authentication/jwt-tokens'
                    }),
                    expect.objectContaining({
                        success: true,
                        section: 'frontend/components/login-form'
                    })
                ]),
                sections_modified: 2,
                total_operations: 2
            });
        });
    });
    describe('hierarchical response context', () => {
        test('should include hierarchical path in response for deep paths', async () => {
            mockPerformSectionEdit.mockResolvedValue({
                section: 'api/authentication/oauth/providers/google',
                action: 'created',
                depth: 5
            });
            const args = {
                document: '/api/auth-guide.md',
                section: 'api/authentication/oauth/providers',
                operation: 'append_child',
                content: '### Google\n\nGoogle OAuth implementation',
                title: 'Google'
            };
            const result = await section(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Deep hierarchical context
            expect(result).toMatchObject({
                hierarchical_context: {
                    full_path: 'api/authentication/oauth/providers/google',
                    parent_path: 'api/authentication/oauth/providers',
                    section_name: 'google',
                    depth: 5 // 5 levels deep
                }
            });
        });
        test('should show flat addressing for non-hierarchical sections', async () => {
            mockPerformSectionEdit.mockResolvedValue({
                section: 'overview',
                action: 'edited',
                depth: 2
            });
            const args = {
                document: '/api/auth-guide.md',
                section: 'overview',
                operation: 'replace',
                content: 'Updated overview content'
            };
            const result = await section(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Flat sections should not have hierarchical context
            expect(result).toMatchObject({
                updated: true,
                section: 'overview',
                hierarchical_context: null // No hierarchical context for flat sections
            });
        });
        test('should handle mixed hierarchical and flat paths in batch operations', async () => {
            mockPerformSectionEdit
                .mockResolvedValueOnce({
                section: 'overview',
                action: 'edited'
            })
                .mockResolvedValueOnce({
                section: 'api/authentication/jwt-tokens',
                action: 'edited'
            });
            const batchArgs = [
                {
                    document: '/api/auth-guide.md',
                    section: 'overview',
                    operation: 'append',
                    content: '\n\nAdditional overview'
                },
                {
                    document: '/api/auth-guide.md',
                    section: 'api/authentication/jwt-tokens',
                    operation: 'append',
                    content: '\n\nAdditional JWT info'
                }
            ];
            const result = await section(batchArgs, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Mixed addressing should work correctly
            expect(result).toMatchObject({
                batch_results: expect.arrayContaining([
                    expect.objectContaining({
                        success: true,
                        section: 'overview'
                    }),
                    expect.objectContaining({
                        success: true,
                        section: 'api/authentication/jwt-tokens'
                    })
                ])
            });
        });
    });
    describe('hierarchical error handling', () => {
        test('should provide helpful error messages for hierarchical path issues', async () => {
            // Mock addressing system to throw hierarchical error
            mockPerformSectionEdit.mockRejectedValue(new Error('Section not found in hierarchical path'));
            const args = {
                document: '/api/auth-guide.md',
                section: 'api/nonexistent/path',
                operation: 'replace',
                content: 'Some content'
            };
            await expect(section(args, mockSessionState)).rejects.toThrow();
        });
    });
});
//# sourceMappingURL=section.hierarchical.test.js.map