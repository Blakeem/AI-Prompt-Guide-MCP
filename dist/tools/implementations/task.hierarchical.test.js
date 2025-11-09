/**
 * TDD-FIRST: Hierarchical task tool enhancement tests
 *
 * These tests MUST FAIL initially to follow TDD principles.
 * They test hierarchical addressing enhancements for task.ts
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { task } from './task.js';
import { performSectionEdit, getDocumentManager } from '../../shared/utilities.js';
// Mock dependencies
vi.mock('../../shared/utilities.js', () => ({
    getDocumentManager: vi.fn(),
    performSectionEdit: vi.fn()
}));
vi.mock('../../slug.js', () => ({
    titleToSlug: vi.fn((title) => title.toLowerCase().replace(/\s+/g, '-'))
}));
const mockGetDocumentManager = getDocumentManager;
const mockPerformSectionEdit = performSectionEdit;
// Mock DocumentManager with hierarchical tasks
const createMockDocumentManager = () => ({
    getDocument: vi.fn(() => Promise.resolve({
        metadata: {
            path: '/project/roadmap.md',
            title: 'Project Roadmap',
            lastModified: new Date(),
            contentHash: 'mock-hash',
            wordCount: 1000,
            linkCount: 20,
            codeBlockCount: 5,
            lastAccessed: new Date()
        },
        headings: [
            { slug: 'overview', title: 'Overview', depth: 2 },
            { slug: 'tasks', title: 'Tasks', depth: 2 },
            // Hierarchical tasks under Tasks section
            { slug: 'phase1', title: 'Phase 1', depth: 3 },
            { slug: 'phase1/setup', title: 'Setup', depth: 4 },
            { slug: 'phase1/setup/infrastructure', title: 'Infrastructure', depth: 5 },
            { slug: 'phase1/setup/development', title: 'Development', depth: 5 },
            { slug: 'phase1/implementation', title: 'Implementation', depth: 4 },
            { slug: 'phase2', title: 'Phase 2', depth: 3 },
            { slug: 'phase2/testing', title: 'Testing', depth: 4 },
            { slug: 'phase2/deployment', title: 'Deployment', depth: 4 }
        ],
        toc: [],
        slugIndex: new Map(),
        sections: new Map([
            ['tasks', '## Tasks\n\nProject task breakdown'],
            ['phase1/setup/infrastructure', '### Infrastructure\n- Status: pending\n- Priority: high\n→ @/docs/infrastructure.md'],
            ['phase1/setup/development', '### Development\n- Status: in_progress\n- Priority: medium\n- Dependencies: infrastructure'],
            ['phase1/implementation', '### Implementation\n- Status: pending\n- Priority: low\n→ @/docs/implementation.md'],
            ['phase2/testing', '### Testing\n- Status: pending\n- Priority: high\n- Dependencies: implementation'],
            ['phase2/deployment', '### Deployment\n- Status: pending\n- Priority: medium\n- Dependencies: testing']
        ])
    })),
    getSectionContent: vi.fn((path, slug) => {
        const content = new Map([
            ['tasks', '## Tasks\n\nProject task breakdown'],
            ['phase1/setup/infrastructure', '### Infrastructure\n- Status: pending\n- Priority: high\n→ @/docs/infrastructure.md'],
            ['phase1/setup/development', '### Development\n- Status: in_progress\n- Priority: medium\n- Dependencies: infrastructure'],
            ['phase1/implementation', '### Implementation\n- Status: pending\n- Priority: low\n→ @/docs/implementation.md'],
            ['phase2/testing', '### Testing\n- Status: pending\n- Priority: high\n- Dependencies: implementation'],
            ['phase2/deployment', '### Deployment\n- Status: pending\n- Priority: medium\n- Dependencies: testing']
        ]);
        return Promise.resolve(content.get(slug) ?? null);
    })
});
const mockSessionState = {
    sessionId: 'test-session'
};
describe('Task Tool - Hierarchical Operations (TDD-FIRST)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDocumentManager.mockResolvedValue(createMockDocumentManager());
    });
    describe('hierarchical task listing', () => {
        test('should list tasks with hierarchical grouping and context', async () => {
            const args = {
                document: '/project/roadmap.md',
                operation: 'list'
            };
            const result = await task(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should group tasks hierarchically
            expect(result).toMatchObject({
                operation: 'list',
                document: '/project/roadmap.md',
                tasks: expect.arrayContaining([
                    expect.objectContaining({
                        slug: 'phase1/setup/infrastructure',
                        title: 'Infrastructure',
                        status: 'pending',
                        priority: 'high',
                        hierarchical_context: {
                            full_path: 'phase1/setup/infrastructure',
                            parent_path: 'phase1/setup',
                            phase: 'phase1',
                            category: 'setup',
                            task_name: 'infrastructure',
                            depth: 3
                        }
                    }),
                    expect.objectContaining({
                        slug: 'phase1/setup/development',
                        title: 'Development',
                        status: 'in_progress',
                        hierarchical_context: {
                            full_path: 'phase1/setup/development',
                            parent_path: 'phase1/setup',
                            phase: 'phase1',
                            category: 'setup',
                            task_name: 'development',
                            depth: 3
                        }
                    })
                ]),
                hierarchical_summary: {
                    by_phase: {
                        'phase1': { total: 3, pending: 2, in_progress: 1, completed: 0 },
                        'phase2': { total: 2, pending: 2, in_progress: 0, completed: 0 }
                    },
                    by_category: {
                        'setup': { total: 2, pending: 1, in_progress: 1 },
                        'implementation': { total: 1, pending: 1 },
                        'testing': { total: 1, pending: 1 },
                        'deployment': { total: 1, pending: 1 }
                    },
                    critical_path: ['phase1/setup/infrastructure', 'phase1/setup/development', 'phase1/implementation', 'phase2/testing', 'phase2/deployment']
                }
            });
        });
        test('should filter tasks by hierarchical path patterns', async () => {
            const args = {
                document: '/project/roadmap.md',
                operation: 'list',
                phase_filter: 'phase1' // HIERARCHICAL ENHANCEMENT: New filter type
            };
            const result = await task(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should filter by hierarchical patterns
            expect(result).toMatchObject({
                tasks: expect.arrayContaining([
                    expect.objectContaining({
                        slug: expect.stringMatching(/^phase1\//)
                    })
                ])
            });
            // Should not include phase2 tasks
            expect(result.tasks).not.toEqual(expect.arrayContaining([
                expect.objectContaining({
                    slug: expect.stringMatching(/^phase2\//)
                })
            ]));
        });
        test('should show dependency relationships in hierarchical context', async () => {
            const args = {
                document: '/project/roadmap.md',
                operation: 'list'
            };
            const result = await task(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should show hierarchical dependencies
            const developmentTask = result.tasks?.find(t => t.slug === 'phase1/setup/development');
            expect(developmentTask).toMatchObject({
                dependencies: ['infrastructure'], // Flat reference within same phase
                hierarchical_dependencies: {
                    full_paths: ['phase1/setup/infrastructure'], // Full hierarchical paths
                    within_phase: ['infrastructure'], // Dependencies within same phase
                    cross_phase: [] // Dependencies across phases
                }
            });
            const testingTask = result.tasks?.find(t => t.slug === 'phase2/testing');
            expect(testingTask).toMatchObject({
                dependencies: ['implementation'],
                hierarchical_dependencies: {
                    full_paths: ['phase1/implementation'], // Cross-phase dependency
                    within_phase: [],
                    cross_phase: ['phase1/implementation']
                }
            });
        });
    });
    describe('hierarchical task creation', () => {
        test('should create task with hierarchical addressing', async () => {
            mockPerformSectionEdit.mockResolvedValue({
                section: 'phase1/setup/database',
                action: 'created',
                depth: 5
            });
            const args = {
                document: '/project/roadmap.md',
                operation: 'create',
                title: 'Database Setup',
                content: '- Status: pending\n- Priority: high\n- Dependencies: infrastructure',
                hierarchical_parent: 'phase1/setup' // HIERARCHICAL ENHANCEMENT: Parent path
            };
            const result = await task(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should create with hierarchical context
            expect(result).toMatchObject({
                operation: 'create',
                task_created: {
                    slug: 'phase1/setup/database-setup',
                    title: 'Database Setup',
                    hierarchical_context: {
                        full_path: 'phase1/setup/database-setup',
                        parent_path: 'phase1/setup',
                        phase: 'phase1',
                        category: 'setup',
                        task_name: 'database-setup'
                    }
                }
            });
            expect(mockPerformSectionEdit).toHaveBeenCalledWith(expect.any(Object), '/project/roadmap.md', 'phase1/setup', // Insert under hierarchical parent
            expect.stringContaining('### Database Setup'), 'append_child', 'Database Setup');
        });
        test('should auto-suggest hierarchical placement based on dependencies', async () => {
            const args = {
                document: '/project/roadmap.md',
                operation: 'create',
                title: 'API Development',
                content: '- Status: pending\n- Priority: medium\n- Dependencies: infrastructure, development',
                auto_place: true // HIERARCHICAL ENHANCEMENT: Automatic placement
            };
            const result = await task(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should suggest placement based on dependencies
            expect(result).toMatchObject({
                suggested_placement: {
                    recommended_parent: 'phase1/setup', // Based on dependencies
                    reasoning: 'Dependencies suggest placement under phase1/setup',
                    alternative_locations: [
                        'phase1/implementation' // Alternative based on content analysis
                    ]
                }
            });
        });
    });
    describe('hierarchical task editing', () => {
        test('should edit task using hierarchical addressing', async () => {
            mockPerformSectionEdit.mockResolvedValue({
                section: 'phase1/setup/infrastructure',
                action: 'edited'
            });
            const args = {
                document: '/project/roadmap.md',
                operation: 'edit',
                task: 'phase1/setup/infrastructure',
                content: '- Status: completed\n- Priority: high\n- Completed: 2025-09-26\n→ @/docs/infrastructure.md'
            };
            const result = await task(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should maintain hierarchical context in edit
            expect(result).toMatchObject({
                operation: 'edit',
                task_updated: {
                    slug: 'phase1/setup/infrastructure',
                    hierarchical_context: {
                        full_path: 'phase1/setup/infrastructure',
                        parent_path: 'phase1/setup',
                        phase: 'phase1',
                        category: 'setup',
                        task_name: 'infrastructure'
                    }
                }
            });
            expect(mockPerformSectionEdit).toHaveBeenCalledWith(expect.any(Object), '/project/roadmap.md', 'phase1/setup/infrastructure', '- Status: completed\n- Priority: high\n- Completed: 2025-09-26\n→ @/docs/infrastructure.md', 'replace');
        });
    });
    describe('hierarchical task completion cascade', () => {
        test('should analyze impact on dependent tasks when completing hierarchical task', async () => {
            const args = {
                document: '/project/roadmap.md',
                operation: 'complete',
                task: 'phase1/setup/infrastructure',
                completion_note: 'Infrastructure setup completed successfully'
            };
            const result = await task(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should analyze completion impact
            expect(result).toMatchObject({
                completion_impact: {
                    unblocked_tasks: [
                        {
                            slug: 'phase1/setup/development',
                            hierarchical_path: 'phase1/setup/development',
                            reason: 'Dependency on infrastructure resolved'
                        }
                    ],
                    affected_phases: ['phase1'],
                    critical_path_updated: true,
                    next_recommended_tasks: [
                        {
                            slug: 'phase1/setup/development',
                            priority_boosted: true,
                            reason: 'Now unblocked and high priority'
                        }
                    ]
                }
            });
        });
    });
    describe('hierarchical task search and filtering', () => {
        test('should support hierarchical path-based filtering', async () => {
            const args = {
                document: '/project/roadmap.md',
                operation: 'list',
                hierarchical_filter: {
                    phase: 'phase1',
                    category: 'setup',
                    exclude_completed: true
                }
            };
            const result = await task(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Advanced hierarchical filtering
            expect(result).toMatchObject({
                filter_applied: {
                    type: 'hierarchical',
                    criteria: {
                        phase: 'phase1',
                        category: 'setup',
                        exclude_completed: true
                    }
                },
                tasks: expect.arrayContaining([
                    expect.objectContaining({
                        slug: expect.stringMatching(/^phase1\/setup\//)
                    })
                ])
            });
            // Should not include completed or non-setup tasks
            result.tasks?.forEach(task => {
                expect(task.slug).toMatch(/^phase1\/setup\//);
                expect(task.status).not.toBe('completed');
            });
        });
    });
});
//# sourceMappingURL=task.hierarchical.test.js.map