/**
 * Unit tests for start_coordinator_task tool
 *
 * Tests the start_coordinator_task tool for sequential coordinator task workflow
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { startCoordinatorTask } from '../start-coordinator-task.js';
import { coordinatorTask } from '../coordinator-task.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import { resolve } from 'node:path';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { loadWorkflowPrompts } from '../../../prompts/workflow-prompts.js';
// Mock the workflow-prompts module to provide test workflows
vi.mock('../../../prompts/workflow-prompts.js', () => {
    const mockPrompts = [
        {
            name: 'workflow_tdd-incremental-orchestration',
            description: '🎯 COORDINATION: Orchestrate multi-agent development with TDD',
            content: '# TDD Incremental Orchestration\n\nThis is test content for TDD workflow.',
            whenToUse: [
                'Managing complex features requiring multiple developers',
                'When quality gates must be enforced',
                'Coordinating test-driven development workflows'
            ]
        },
        {
            name: 'workflow_spec-first-integration',
            description: '📋 INTEGRATION: Ensure correctness before coding',
            content: '# Spec-First Integration\n\nValidate against specifications first.',
            whenToUse: [
                'Adding new API integrations',
                'When external dependencies are involved',
                'Before implementing third-party features'
            ]
        }
    ];
    return {
        loadWorkflowPrompts: vi.fn().mockResolvedValue(mockPrompts),
        getWorkflowPrompt: vi.fn((name) => {
            return mockPrompts.find(p => p.name === name);
        }),
        getWorkflowPrompts: vi.fn(() => mockPrompts)
    };
});
describe('start_coordinator_task tool', () => {
    let manager;
    let sessionState;
    let testDir;
    let docsDir;
    beforeAll(async () => {
        // Ensure workflow prompts are loaded before any tests run
        await loadWorkflowPrompts();
    });
    beforeEach(async () => {
        // Set MCP_WORKSPACE_PATH for config loading
        process.env["MCP_WORKSPACE_PATH"] = process.env["MCP_WORKSPACE_PATH"] ?? "/tmp/test-workspace";
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        testDir = await mkdtemp(resolve(tmpdir(), `start-coordinator-test-${uniqueId}-`));
        // Configure MCP_WORKSPACE_PATH for config loading
        process.env["MCP_WORKSPACE_PATH"] = testDir;
        docsDir = resolve(testDir, 'docs');
        const coordinatorDir = resolve(testDir, 'coordinator');
        await mkdir(docsDir, { recursive: true });
        await mkdir(coordinatorDir, { recursive: true });
        // Create document manager using root as testDir
        manager = createDocumentManager(docsDir);
        sessionState = {
            sessionId: `test-${Date.now()}-${Math.random()}`,
            createDocumentStage: 0
        };
    });
    afterEach(async () => {
        await manager.destroy();
        if (testDir != null) {
            await rm(testDir, { recursive: true, force: true });
        }
    });
    describe('Sequential Mode', () => {
        it('should find and start first pending task', async () => {
            // Create tasks
            await coordinatorTask({
                operations: [
                    { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nMain-Workflow: tdd-incremental-orchestration\n\nContent 1' },
                    { operation: 'create', title: 'Task 2', content: 'Status: pending\n\nContent 2' }
                ]
            }, sessionState, manager);
            // Start first task
            const result = await startCoordinatorTask({}, sessionState, manager);
            expect(result.document).toBe('/active.md');
            expect(result.task.slug).toBe('task-1');
            expect(result.task.title).toBe('Task 1');
            expect(result.task.status).toBe('pending');
            expect(result.task.full_path).toBe('/active.md#task-1');
        });
        it('should inject Main-Workflow from first task', async () => {
            // Create tasks with Main-Workflow in first task
            await coordinatorTask({
                operations: [
                    { operation: 'create', title: 'Phase 1', content: 'Status: pending\n\nMain-Workflow: tdd-incremental-orchestration\n\nImplement TDD approach' }
                ]
            }, sessionState, manager);
            const result = await startCoordinatorTask({ return_task_context: true }, sessionState, manager);
            expect(result.task.main_workflow).toBeDefined();
            if (result.task.main_workflow != null) {
                expect(result.task.main_workflow.name).toBe('workflow_tdd-incremental-orchestration');
            }
        });
        it('should inject task-specific Workflow if present', async () => {
            // Create tasks with task workflow
            await coordinatorTask({
                operations: [
                    { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nWorkflow: spec-first-integration\n\nImplement spec first' }
                ]
            }, sessionState, manager);
            const result = await startCoordinatorTask({ return_task_context: true }, sessionState, manager);
            expect(result.task.workflow).toBeDefined();
            if (result.task.workflow != null) {
                expect(result.task.workflow.name).toBe('workflow_spec-first-integration');
            }
        });
        it('should throw error if no tasks available', async () => {
            // Create completed tasks only
            await coordinatorTask({
                operations: [
                    { operation: 'create', title: 'Task 1', content: 'Status: completed\n\nCompleted: 2025-10-14\n\nDone' }
                ]
            }, sessionState, manager);
            await expect(startCoordinatorTask({}, sessionState, manager))
                .rejects.toThrow('No available tasks');
        });
    });
    describe('Relative Path Returns', () => {
        it('should return relative paths in document and full_path fields', async () => {
            // Create task
            await coordinatorTask({
                operations: [
                    { operation: 'create', title: 'Test Task', content: 'Status: pending\n\nTest content' }
                ]
            }, sessionState, manager);
            // Start task
            const result = await startCoordinatorTask({}, sessionState, manager);
            // Document path should be relative (no /coordinator/ prefix)
            expect(result.document).toBe('/active.md');
            // Full path should also use relative document path
            expect(result.task.full_path).toBe('/active.md#test-task');
            expect(result.task.full_path).not.toContain('/coordinator/');
        });
        it('should use relative paths in enriched response with return_task_context', async () => {
            // Create task with workflow
            await coordinatorTask({
                operations: [
                    { operation: 'create', title: 'Phase 1', content: 'Status: pending\n\nMain-Workflow: tdd-incremental-orchestration\n\nImplement TDD' }
                ]
            }, sessionState, manager);
            const result = await startCoordinatorTask({ return_task_context: true }, sessionState, manager);
            // All paths should be relative
            expect(result.document).toBe('/active.md');
            expect(result.task.full_path).toBe('/active.md#phase-1');
            expect(result.document).not.toContain('/coordinator/');
        });
    });
    describe('Validation', () => {
        it('should reject #slug parameter (sequential only)', async () => {
            await coordinatorTask({
                operations: [
                    { operation: 'create', title: 'Task 1', content: 'Status: pending\n\nContent' }
                ]
            }, sessionState, manager);
            await expect(startCoordinatorTask({
                document: '/coordinator/active.md#task-1'
            }, sessionState, manager))
                .rejects.toThrow('sequential only');
        });
    });
});
//# sourceMappingURL=start-coordinator-task.test.js.map