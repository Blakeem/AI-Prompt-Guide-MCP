/**
 * TDD-FIRST: Hierarchical complete-task tool enhancement tests
 *
 * These tests MUST FAIL initially to follow TDD principles.
 * They test hierarchical addressing enhancements for complete-task.ts
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { completeTask } from './complete-task.js';
import { performSectionEdit, getDocumentManager } from '../../shared/utilities.js';
// Mock dependencies
vi.mock('../../shared/utilities.js', () => ({
    getDocumentManager: vi.fn(),
    performSectionEdit: vi.fn()
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
            { slug: 'tasks', title: 'Tasks', depth: 2 },
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
            ['phase1/setup/infrastructure', '### Infrastructure\n- Status: pending\n- Priority: high\n→ @/docs/infrastructure.md'],
            ['phase1/setup/development', '### Development\n- Status: pending\n- Priority: medium\n- Dependencies: infrastructure'],
            ['phase1/implementation', '### Implementation\n- Status: pending\n- Priority: low\n- Dependencies: development\n→ @/docs/implementation.md'],
            ['phase2/testing', '### Testing\n- Status: pending\n- Priority: high\n- Dependencies: implementation'],
            ['phase2/deployment', '### Deployment\n- Status: pending\n- Priority: medium\n- Dependencies: testing']
        ])
    })),
    getSectionContent: vi.fn((path, slug) => {
        const content = new Map([
            ['phase1/setup/infrastructure', '### Infrastructure\n- Status: pending\n- Priority: high\n→ @/docs/infrastructure.md'],
            ['phase1/setup/development', '### Development\n- Status: pending\n- Priority: medium\n- Dependencies: infrastructure'],
            ['phase1/implementation', '### Implementation\n- Status: pending\n- Priority: low\n- Dependencies: development\n→ @/docs/implementation.md'],
            ['phase2/testing', '### Testing\n- Status: pending\n- Priority: high\n- Dependencies: implementation'],
            ['phase2/deployment', '### Deployment\n- Status: pending\n- Priority: medium\n- Dependencies: testing']
        ]);
        return Promise.resolve(content.get(slug) ?? null);
    })
});
const mockSessionState = {
    sessionId: 'test-session'
};
describe('Complete-Task Tool - Hierarchical Enhancements (TDD-FIRST)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDocumentManager.mockResolvedValue(createMockDocumentManager());
        mockPerformSectionEdit.mockResolvedValue({
            section: 'mock-section',
            action: 'edited'
        });
    });
    describe('hierarchical task completion with cascading effects', () => {
        test('should complete hierarchical task with cascade analysis', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: 'phase1/setup/infrastructure',
                note: 'Successfully set up AWS infrastructure including VPC, subnets, and security groups'
            };
            const result = await completeTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should include hierarchical completion context
            expect(result).toMatchObject({
                completed_task: {
                    slug: 'phase1/setup/infrastructure',
                    title: 'Infrastructure',
                    note: 'Successfully set up AWS infrastructure including VPC, subnets, and security groups',
                    completed_date: expect.any(String),
                    hierarchical_context: {
                        full_path: 'phase1/setup/infrastructure',
                        parent_path: 'phase1/setup',
                        phase: 'phase1',
                        category: 'setup',
                        task_name: 'infrastructure'
                    }
                },
                completion_cascade: {
                    unblocked_tasks: [
                        {
                            slug: 'phase1/setup/development',
                            hierarchical_path: 'phase1/setup/development',
                            title: 'Development',
                            reason: 'Dependency on infrastructure completed',
                            priority_boost: true,
                            estimated_unblock_date: expect.any(String)
                        }
                    ],
                    affected_phases: ['phase1'],
                    phase_progress: {
                        'phase1': {
                            completed_tasks: 1,
                            total_tasks: 3,
                            completion_percentage: 33.33,
                            critical_path_status: 'on_track'
                        }
                    },
                    critical_path_impact: {
                        milestone_advanced: true,
                        days_saved: 0, // Infrastructure was blocking
                        next_bottleneck: 'phase1/implementation'
                    }
                }
            });
        });
        test('should handle cross-phase dependency completion', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: 'phase1/implementation',
                note: 'Core implementation completed with full test coverage'
            };
            const result = await completeTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Cross-phase completion effects
            expect(result).toMatchObject({
                completion_cascade: {
                    unblocked_tasks: [
                        {
                            slug: 'phase2/testing',
                            hierarchical_path: 'phase2/testing',
                            reason: 'Cross-phase dependency resolved',
                            cross_phase_unblock: true
                        }
                    ],
                    affected_phases: ['phase1', 'phase2'],
                    phase_transitions: [
                        {
                            from_phase: 'phase1',
                            to_phase: 'phase2',
                            trigger_task: 'phase1/implementation',
                            readiness_score: 100
                        }
                    ]
                }
            });
        });
        test('should provide hierarchical next task recommendation', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: 'phase1/setup/infrastructure',
                note: 'Infrastructure setup complete'
            };
            const result = await completeTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Next task with hierarchical context
            expect(result).toMatchObject({
                next_task: {
                    slug: 'phase1/setup/development',
                    title: 'Development',
                    priority: 'high', // Priority boosted due to unblocking
                    hierarchical_context: {
                        full_path: 'phase1/setup/development',
                        parent_path: 'phase1/setup',
                        phase: 'phase1',
                        category: 'setup',
                        recommended_reason: 'Next logical step in phase1/setup sequence'
                    },
                    linked_document: {
                        path: expect.any(String),
                        title: expect.any(String),
                        hierarchical_relevance: 'high' // HIERARCHICAL ENHANCEMENT
                    }
                }
            });
        });
    });
    describe('hierarchical completion analytics', () => {
        test('should provide phase completion analytics', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: 'phase1/setup/development',
                note: 'Development environment configured'
            };
            const result = await completeTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Phase-level analytics
            expect(result).toMatchObject({
                hierarchical_analytics: {
                    phase_completion: {
                        'phase1': {
                            setup_category: {
                                completed: 2, // infrastructure + development
                                total: 2,
                                percentage: 100
                            },
                            overall_phase: {
                                completed: 2,
                                total: 3, // setup(2) + implementation(1)
                                percentage: 66.67
                            }
                        }
                    },
                    category_completion: {
                        'setup': {
                            completed: 2,
                            total: 2,
                            status: 'complete'
                        }
                    },
                    timeline_impact: {
                        original_estimate: '2 weeks',
                        current_progress: '67% complete',
                        projected_completion: '1.5 weeks',
                        variance: '-0.5 weeks'
                    }
                }
            });
        });
        test('should identify hierarchical completion patterns', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: 'phase2/testing',
                note: 'All tests passing, QA approved'
            };
            const result = await completeTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Pattern recognition
            expect(result).toMatchObject({
                completion_patterns: {
                    sequential_completion: true, // Following phase order
                    category_completion_rate: {
                        'testing': 100, // First task in testing category
                        'deployment': 0
                    },
                    bottleneck_resolution: {
                        was_bottleneck: true,
                        unblocked_count: 1, // deployment now unblocked
                        cascade_depth: 1 // Only direct dependencies
                    },
                    efficiency_metrics: {
                        tasks_completed_ahead_of_schedule: 0,
                        dependency_wait_time_saved: '3 days',
                        parallel_opportunities: ['phase2/deployment']
                    }
                }
            });
        });
    });
    describe('hierarchical linked document context', () => {
        test('should provide enhanced linked document context for hierarchical tasks', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: 'phase1/setup/infrastructure',
                note: 'Infrastructure documented and deployed'
            };
            // Mock linked document
            const mockManager = createMockDocumentManager();
            mockManager.getDocument = vi.fn((path) => {
                if (path === '/docs/infrastructure.md') {
                    return Promise.resolve({
                        metadata: {
                            path: '/docs/infrastructure.md',
                            title: 'Infrastructure Documentation',
                            lastModified: new Date(),
                            contentHash: 'infra-hash',
                            wordCount: 2000,
                            linkCount: 25,
                            codeBlockCount: 15,
                            lastAccessed: new Date()
                        },
                        headings: [
                            { slug: 'aws-setup', title: 'AWS Setup', depth: 2 },
                            { slug: 'networking', title: 'Networking', depth: 2 }
                        ],
                        sections: new Map([
                            ['aws-setup', '## AWS Setup\n\nDetailed AWS configuration']
                        ])
                    });
                }
                const originalGetDocument = mockManager.getDocument;
                return originalGetDocument != null ? originalGetDocument(path) : Promise.resolve(null);
            });
            mockGetDocumentManager.mockResolvedValue(mockManager);
            const result = await completeTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Enhanced linked document context
            expect(result).toMatchObject({
                next_task: expect.objectContaining({
                    linked_document: {
                        path: '/docs/infrastructure.md',
                        title: 'Infrastructure Documentation',
                        content: expect.any(String),
                        hierarchical_relevance: {
                            task_phase: 'phase1',
                            task_category: 'setup',
                            document_sections: ['aws-setup', 'networking'],
                            relevance_score: expect.any(Number),
                            recommended_sections: ['aws-setup'] // Most relevant to infrastructure task
                        }
                    }
                })
            });
        });
    });
    describe('hierarchical completion validation', () => {
        test('should validate hierarchical task completion dependencies', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: 'phase2/deployment', // Has dependencies that aren't completed
                note: 'Attempting early deployment'
            };
            // HIERARCHICAL ENHANCEMENT: Should warn about incomplete dependencies
            const result = await completeTask(args, mockSessionState);
            expect(result).toMatchObject({
                completion_warnings: {
                    incomplete_dependencies: [
                        {
                            slug: 'phase2/testing',
                            hierarchical_path: 'phase2/testing',
                            status: 'pending',
                            impact: 'Completing deployment before testing may cause issues'
                        }
                    ],
                    hierarchy_violations: [
                        {
                            type: 'out_of_sequence',
                            message: 'Completing phase2/deployment before phase2/testing violates typical workflow',
                            recommendation: 'Consider completing testing first'
                        }
                    ]
                }
            });
        });
        test('should handle completion of hierarchical parent tasks', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: 'phase1/setup', // Parent task with children
                note: 'Setup phase completed'
            };
            const result = await completeTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Parent task completion
            expect(result).toMatchObject({
                parent_task_completion: {
                    child_tasks_status: {
                        'phase1/setup/infrastructure': 'pending',
                        'phase1/setup/development': 'pending'
                    },
                    completion_strategy: 'mark_parent_only', // Don't auto-complete children
                    child_impact: {
                        orphaned_tasks: 0,
                        reparented_tasks: 2, // Children move up in hierarchy
                        new_parent: 'phase1'
                    }
                }
            });
        });
    });
});
//# sourceMappingURL=complete-task.hierarchical.test.js.map