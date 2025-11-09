/**
 * TDD-FIRST: Hierarchical view-task tool enhancement tests
 *
 * These tests MUST FAIL initially to follow TDD principles.
 * They test hierarchical addressing enhancements for view-task.ts
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { viewTask } from './view-task.js';
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
// Mock view-task schemas
vi.mock('../schemas/view-task-schemas.js', () => ({
    parseTasks: vi.fn((tasks) => Array.isArray(tasks) ? tasks : [tasks]),
    validateTaskCount: vi.fn(() => true)
}));
const mockGetDocumentManager = getDocumentManager;
// Mock DocumentManager with hierarchical tasks
const createMockDocumentManager = () => ({
    getDocument: vi.fn(() => Promise.resolve({
        metadata: {
            path: '/project/roadmap.md',
            title: 'Project Roadmap',
            lastModified: new Date(),
            contentHash: 'mock-hash',
            wordCount: 1200,
            linkCount: 30,
            codeBlockCount: 10,
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
            { slug: 'phase2/testing/unit-tests', title: 'Unit Tests', depth: 5 },
            { slug: 'phase2/testing/integration-tests', title: 'Integration Tests', depth: 5 },
            { slug: 'phase2/deployment', title: 'Deployment', depth: 4 }
        ],
        toc: [],
        slugIndex: new Map(),
        sections: new Map([
            ['phase1/setup/infrastructure', '### Infrastructure\n- Status: completed\n- Priority: high\n- Completed: 2025-09-25\n→ @/docs/infrastructure.md'],
            ['phase1/setup/development', '### Development\n- Status: in_progress\n- Priority: medium\n- Dependencies: infrastructure\n→ @/docs/development.md'],
            ['phase1/implementation', '### Implementation\n- Status: pending\n- Priority: low\n- Dependencies: development\n→ @/docs/implementation.md'],
            ['phase2/testing/unit-tests', '### Unit Tests\n- Status: pending\n- Priority: high\n- Dependencies: implementation\n→ @/docs/testing.md#unit'],
            ['phase2/testing/integration-tests', '### Integration Tests\n- Status: pending\n- Priority: medium\n- Dependencies: unit-tests\n→ @/docs/testing.md#integration'],
            ['phase2/deployment', '### Deployment\n- Status: pending\n- Priority: high\n- Dependencies: integration-tests\n→ @/docs/deployment.md']
        ])
    })),
    getSectionContent: vi.fn((path, slug) => {
        const content = new Map([
            ['phase1/setup/infrastructure', '### Infrastructure\n- Status: completed\n- Priority: high\n- Completed: 2025-09-25\n→ @/docs/infrastructure.md'],
            ['phase1/setup/development', '### Development\n- Status: in_progress\n- Priority: medium\n- Dependencies: infrastructure\n→ @/docs/development.md'],
            ['phase1/implementation', '### Implementation\n- Status: pending\n- Priority: low\n- Dependencies: development\n→ @/docs/implementation.md'],
            ['phase2/testing/unit-tests', '### Unit Tests\n- Status: pending\n- Priority: high\n- Dependencies: implementation\n→ @/docs/testing.md#unit'],
            ['phase2/testing/integration-tests', '### Integration Tests\n- Status: pending\n- Priority: medium\n- Dependencies: unit-tests\n→ @/docs/testing.md#integration'],
            ['phase2/deployment', '### Deployment\n- Status: pending\n- Priority: high\n- Dependencies: integration-tests\n→ @/docs/deployment.md']
        ]);
        return Promise.resolve(content.get(slug) ?? null);
    })
});
const mockSessionState = {
    sessionId: 'test-session'
};
describe('View-Task Tool - Hierarchical Enhancements (TDD-FIRST)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDocumentManager.mockResolvedValue(createMockDocumentManager());
    });
    describe('hierarchical task viewing with context', () => {
        test('should view single hierarchical task with full context', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: 'phase1/setup/infrastructure'
            };
            const result = await viewTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Should include hierarchical context
            expect(result).toMatchObject({
                document: '/project/roadmap.md',
                tasks: [{
                        slug: 'phase1/setup/infrastructure',
                        title: 'Infrastructure',
                        content: '### Infrastructure\n- Status: completed\n- Priority: high\n- Completed: 2025-09-25\n→ @/docs/infrastructure.md',
                        depth: 5,
                        full_path: 'phase1/setup/infrastructure',
                        parent: 'phase1/setup',
                        status: 'completed',
                        priority: 'high',
                        linked_document: '@/docs/infrastructure.md',
                        dependencies: [],
                        word_count: expect.any(Number),
                        hierarchical_context: {
                            full_path: 'phase1/setup/infrastructure',
                            parent_path: 'phase1/setup',
                            phase: 'phase1',
                            category: 'setup',
                            task_name: 'infrastructure',
                            depth: 3, // Path depth (phase1/setup/infrastructure = 3 levels)
                            ancestors: ['phase1', 'phase1/setup'],
                            siblings: ['phase1/setup/development'],
                            children: [] // No child tasks
                        }
                    }],
                summary: {
                    total_tasks: 1,
                    by_status: { completed: 1 },
                    by_priority: { high: 1 },
                    with_links: 1,
                    hierarchical_summary: {
                        phases_represented: ['phase1'],
                        categories_represented: ['setup'],
                        max_depth: 3,
                        completion_rate_by_phase: {
                            'phase1': { completed: 1, total: 1, percentage: 100 }
                        }
                    }
                }
            });
        });
        test('should view multiple hierarchical tasks with relationship analysis', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: ['phase1/setup/infrastructure', 'phase1/setup/development', 'phase2/testing/unit-tests']
            };
            const result = await viewTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Multiple tasks with relationships
            expect(result).toMatchObject({
                tasks: [
                    expect.objectContaining({
                        slug: 'phase1/setup/infrastructure',
                        hierarchical_context: expect.objectContaining({
                            phase: 'phase1',
                            category: 'setup',
                            siblings: ['phase1/setup/development']
                        })
                    }),
                    expect.objectContaining({
                        slug: 'phase1/setup/development',
                        hierarchical_context: expect.objectContaining({
                            phase: 'phase1',
                            category: 'setup',
                            siblings: ['phase1/setup/infrastructure']
                        })
                    }),
                    expect.objectContaining({
                        slug: 'phase2/testing/unit-tests',
                        hierarchical_context: expect.objectContaining({
                            phase: 'phase2',
                            category: 'testing',
                            siblings: ['phase2/testing/integration-tests']
                        })
                    })
                ],
                task_relationships: {
                    dependency_graph: {
                        'phase1/setup/infrastructure': {
                            dependents: ['phase1/setup/development'], // Tasks that depend on this
                            dependencies: [] // Tasks this depends on
                        },
                        'phase1/setup/development': {
                            dependents: ['phase1/implementation'],
                            dependencies: ['phase1/setup/infrastructure']
                        },
                        'phase2/testing/unit-tests': {
                            dependents: ['phase2/testing/integration-tests'],
                            dependencies: ['phase1/implementation'] // Cross-phase dependency
                        }
                    },
                    hierarchical_relationships: {
                        same_phase: [
                            ['phase1/setup/infrastructure', 'phase1/setup/development']
                        ],
                        cross_phase: [
                            ['phase1/setup/development', 'phase2/testing/unit-tests'] // Indirect through implementation
                        ],
                        parent_child: [],
                        siblings: [
                            ['phase1/setup/infrastructure', 'phase1/setup/development']
                        ]
                    }
                }
            });
        });
        test('should provide hierarchical task completion flow analysis', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: ['phase2/testing/unit-tests', 'phase2/testing/integration-tests', 'phase2/deployment']
            };
            const result = await viewTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Completion flow analysis
            expect(result).toMatchObject({
                completion_flow: {
                    sequential_order: [
                        'phase2/testing/unit-tests',
                        'phase2/testing/integration-tests',
                        'phase2/deployment'
                    ],
                    parallel_opportunities: [], // All are sequential in this case
                    critical_path: ['phase2/testing/unit-tests', 'phase2/testing/integration-tests', 'phase2/deployment'],
                    bottlenecks: [
                        {
                            task: 'phase2/testing/unit-tests',
                            reason: 'Blocks both integration tests and deployment',
                            impact_score: 2
                        }
                    ],
                    estimated_timeline: {
                        if_sequential: '6 weeks',
                        if_parallel: '6 weeks', // No parallelization possible
                        current_progress: '0% complete'
                    }
                }
            });
        });
    });
    describe('hierarchical task dependency visualization', () => {
        test('should provide hierarchical dependency tree', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: ['phase1/setup/development', 'phase1/implementation', 'phase2/testing/unit-tests']
            };
            const result = await viewTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Dependency tree visualization
            expect(result).toMatchObject({
                dependency_tree: {
                    root_tasks: ['phase1/setup/infrastructure'], // Tasks with no dependencies
                    dependency_chains: [
                        {
                            chain: ['phase1/setup/infrastructure', 'phase1/setup/development', 'phase1/implementation', 'phase2/testing/unit-tests'],
                            phases_crossed: ['phase1', 'phase2'],
                            critical_path: true,
                            estimated_duration: '8 weeks'
                        }
                    ],
                    hierarchical_blocks: [
                        {
                            blocking_task: 'phase1/setup/development',
                            blocked_tasks: ['phase1/implementation'],
                            hierarchical_impact: 'blocks_phase1_completion'
                        },
                        {
                            blocking_task: 'phase1/implementation',
                            blocked_tasks: ['phase2/testing/unit-tests'],
                            hierarchical_impact: 'blocks_phase2_start'
                        }
                    ]
                }
            });
        });
        test('should analyze cross-phase dependencies', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: ['phase1/implementation', 'phase2/testing/unit-tests', 'phase2/deployment']
            };
            const result = await viewTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Cross-phase dependency analysis
            expect(result).toMatchObject({
                cross_phase_analysis: {
                    phase_boundaries: [
                        {
                            from_phase: 'phase1',
                            to_phase: 'phase2',
                            gateway_task: 'phase1/implementation',
                            dependent_tasks: ['phase2/testing/unit-tests'],
                            readiness_criteria: ['development_complete', 'infrastructure_stable']
                        }
                    ],
                    phase_readiness: {
                        'phase2': {
                            ready: false,
                            blocking_tasks: ['phase1/implementation'],
                            readiness_percentage: 0,
                            estimated_ready_date: null
                        }
                    },
                    risk_assessment: {
                        cross_phase_risks: [
                            {
                                risk: 'phase1_delay_impact',
                                description: 'Delays in phase1/implementation will cascade to all phase2 tasks',
                                mitigation: 'Consider parallel development where possible',
                                affected_tasks: ['phase2/testing/unit-tests', 'phase2/testing/integration-tests', 'phase2/deployment']
                            }
                        ]
                    }
                }
            });
        });
    });
    describe('hierarchical task status aggregation', () => {
        test('should provide hierarchical status rollup', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: ['phase1/setup/infrastructure', 'phase1/setup/development', 'phase1/implementation']
            };
            const result = await viewTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Status aggregation by hierarchy
            expect(result).toMatchObject({
                hierarchical_status: {
                    by_phase: {
                        'phase1': {
                            total_tasks: 3,
                            completed: 1, // infrastructure
                            in_progress: 1, // development
                            pending: 1, // implementation
                            completion_percentage: 33.33,
                            estimated_completion: expect.any(String)
                        }
                    },
                    by_category: {
                        'setup': {
                            total_tasks: 2,
                            completed: 1,
                            in_progress: 1,
                            pending: 0,
                            completion_percentage: 50
                        },
                        'implementation': {
                            total_tasks: 1,
                            completed: 0,
                            in_progress: 0,
                            pending: 1,
                            completion_percentage: 0
                        }
                    },
                    rollup_status: {
                        'phase1': 'in_progress', // Has completed and pending tasks
                        'phase1/setup': 'in_progress' // Has completed and in_progress tasks
                    }
                }
            });
        });
        test('should identify hierarchical progress patterns', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: ['phase1/setup/infrastructure', 'phase1/setup/development', 'phase2/testing/unit-tests', 'phase2/deployment']
            };
            const result = await viewTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Progress pattern analysis
            expect(result).toMatchObject({
                progress_patterns: {
                    completion_sequence: {
                        follows_hierarchy: true, // Completing in logical order
                        out_of_order_tasks: [], // No tasks completed out of sequence
                        optimal_next_tasks: ['phase1/setup/development'] // Based on dependencies and hierarchy
                    },
                    efficiency_metrics: {
                        parallel_utilization: 'low', // Most tasks are sequential
                        dependency_optimization: 'good', // Following dependency order
                        phase_transition_readiness: {
                            'phase1_to_phase2': 33.33 // phase1 is 33% complete
                        }
                    },
                    risk_indicators: {
                        bottleneck_tasks: ['phase1/setup/development'], // Blocking multiple tasks
                        critical_path_delays: [],
                        resource_conflicts: []
                    }
                }
            });
        });
    });
    describe('hierarchical task linked document analysis', () => {
        test('should analyze linked documents in hierarchical context', async () => {
            const args = {
                document: '/project/roadmap.md',
                task: ['phase1/setup/infrastructure', 'phase2/testing/unit-tests']
            };
            const result = await viewTask(args, mockSessionState);
            // HIERARCHICAL ENHANCEMENT: Linked document analysis
            expect(result).toMatchObject({
                linked_documents: {
                    by_task: {
                        'phase1/setup/infrastructure': {
                            primary_link: '@/docs/infrastructure.md',
                            link_type: 'documentation',
                            hierarchical_relevance: 'high', // Direct phase/category match
                            estimated_completion_time: '2 hours'
                        },
                        'phase2/testing/unit-tests': {
                            primary_link: '@/docs/testing.md#unit',
                            link_type: 'documentation_section',
                            hierarchical_relevance: 'high',
                            estimated_completion_time: '4 hours'
                        }
                    },
                    document_clustering: {
                        by_phase: {
                            'phase1': ['/docs/infrastructure.md', '/docs/development.md'],
                            'phase2': ['/docs/testing.md', '/docs/deployment.md']
                        },
                        by_category: {
                            'setup': ['/docs/infrastructure.md', '/docs/development.md'],
                            'testing': ['/docs/testing.md'],
                            'deployment': ['/docs/deployment.md']
                        }
                    },
                    documentation_coverage: {
                        well_documented: ['phase1/setup/infrastructure', 'phase2/testing/unit-tests'],
                        missing_documentation: [],
                        documentation_quality_score: 95
                    }
                }
            });
        });
    });
});
//# sourceMappingURL=view-task.hierarchical.test.js.map