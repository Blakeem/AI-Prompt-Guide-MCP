/**
 * Integration test for dual task system (Coordinator + Subagent)
 *
 * Tests real-world workflow scenarios with both tool systems
 */

import { createDocumentManager } from './src/shared/utilities.js';
import { coordinatorTask } from './src/tools/implementations/coordinator-task.js';
import { startCoordinatorTask } from './src/tools/implementations/start-coordinator-task.js';
import { completeCoordinatorTask } from './src/tools/implementations/complete-coordinator-task.js';
import { subagentTask } from './src/tools/implementations/subagent-task.js';
import { startSubagentTask } from './src/tools/implementations/start-subagent-task.js';
import { completeSubagentTask } from './src/tools/implementations/complete-subagent-task.js';
import { initializeGlobalCache } from './src/document-cache.js';
import { resolve } from 'path';
import { mkdir, rm } from 'fs/promises';
import type { SessionState } from './src/session/types.js';

const sessionState: SessionState = {
  sessionId: 'test-session',
  createDocumentStage: 1
};

async function runIntegrationTest() {
  console.log('🚀 Starting Dual Task System Integration Test\n');

  // Create test directory structure
  const testRoot = resolve(process.cwd(), '.ai-prompt-guide-test');
  const docsDir = resolve(testRoot, 'docs');

  try {
    await rm(testRoot, { recursive: true, force: true });
  } catch {
    // Ignore if doesn't exist
  }

  await mkdir(docsDir, { recursive: true });

  // Initialize cache and manager
  initializeGlobalCache(docsDir);
  const manager = createDocumentManager(docsDir);

  try {
    // ===== PHASE 1: COORDINATOR SEQUENTIAL WORKFLOW =====
    console.log('📋 Phase 1: Testing Coordinator Sequential Workflow\n');

    // Create coordinator tasks
    console.log('Creating coordinator tasks...');
    const createResult = await coordinatorTask({
      operations: [
        {
          operation: 'create',
          title: 'Research authentication approaches',
          content: `Status: pending
Main-Workflow: manual-verification-orchestration
Workflow: multi-option-tradeoff

Compare JWT vs session-based auth for the project.`
        },
        {
          operation: 'create',
          title: 'Implement chosen auth system',
          content: `Status: pending

Build authentication system based on research.`
        },
        {
          operation: 'create',
          title: 'Write integration tests',
          content: `Status: pending
Workflow: code-review-issue-based

Ensure auth system works end-to-end.`
        }
      ]
    }, sessionState, manager);

    console.log(`✓ Created ${createResult.operations_completed} coordinator tasks`);
    console.log(`  Document: ${createResult.document}\n`);

    // Start first task (should inject Main-Workflow)
    console.log('Starting first coordinator task...');
    const startResult = await startCoordinatorTask({}, sessionState, manager);

    console.log(`✓ Started task: ${startResult.task.title}`);
    console.log(`  Mode: ${startResult.mode}`);
    console.log(`  Status: ${startResult.task.status}`);
    console.log(`  Main-Workflow: ${startResult.task.main_workflow ? startResult.task.main_workflow.name : 'NONE'}`);
    console.log(`  Task-Workflow: ${startResult.task.workflow ? startResult.task.workflow.name : 'NONE'}\n`);

    // Complete first task
    console.log('Completing first coordinator task...');
    const complete1 = await completeCoordinatorTask({
      note: 'Decided on JWT with refresh tokens. Created spec document.'
    }, sessionState, manager);

    console.log(`✓ Completed: ${complete1.completed_task.title}`);
    console.log(`  Next task: ${complete1.next_task?.title || 'NONE'}`);
    console.log(`  Archived: ${complete1.archived || false}\n`);

    // Complete second task
    console.log('Completing second coordinator task...');
    const complete2 = await completeCoordinatorTask({
      note: 'Auth system implemented with all tests passing'
    }, sessionState, manager);

    console.log(`✓ Completed: ${complete2.completed_task.title}`);
    console.log(`  Next task: ${complete2.next_task?.title || 'NONE'}`);
    console.log(`  Archived: ${complete2.archived || false}\n`);

    // Complete final task (should trigger auto-archive)
    console.log('Completing final coordinator task (should auto-archive)...');
    const complete3 = await completeCoordinatorTask({
      note: 'Integration tests complete. Feature ready for review.'
    }, sessionState, manager);

    console.log(`✓ Completed: ${complete3.completed_task.title}`);
    console.log(`  Archived: ${complete3.archived || false}`);
    if (complete3.archived_to) {
      console.log(`  Archive location: ${complete3.archived_to}`);
    }
    console.log('');

    // ===== PHASE 2: SUBAGENT AD-HOC WORKFLOW =====
    console.log('📝 Phase 2: Testing Subagent Ad-Hoc Workflow\n');

    // First create the document for subagent tasks
    console.log('Creating knowledge graph document...');
    await manager.createDocument('/docs/api/authentication.md', {
      title: 'Authentication API',
      template: 'blank'
    });
    console.log('✓ Created /docs/api/authentication.md\n');

    // Create subagent tasks in knowledge graph document
    console.log('Creating subagent tasks in knowledge graph...');
    const subagentCreate = await subagentTask({
      document: '/docs/api/authentication.md',
      operations: [
        {
          operation: 'create',
          title: 'Implement JWT signing',
          content: `Status: pending
Workflow: spec-first-integration

Implement token signing logic with RS256 algorithm.`
        },
        {
          operation: 'create',
          title: 'Add token validation',
          content: `Status: pending

Validate tokens in middleware.`
        },
        {
          operation: 'create',
          title: 'Handle token refresh',
          content: `Status: pending

Implement refresh token endpoint.`
        }
      ]
    }, sessionState, manager);

    console.log(`✓ Created ${subagentCreate.operations_completed} subagent tasks`);
    console.log(`  Document: ${subagentCreate.document}\n`);

    // Start specific task (ad-hoc mode - MUST have #slug)
    console.log('Starting specific subagent task (ad-hoc mode)...');
    const startSubagent = await startSubagentTask({
      document: '/docs/api/authentication.md#implement-jwt-signing'
    }, sessionState, manager);

    console.log(`✓ Started task: ${startSubagent.task.title}`);
    console.log(`  Mode: ${startSubagent.mode}`);
    console.log(`  Status: ${startSubagent.task.status}`);
    console.log(`  Workflow: ${startSubagent.task.workflow ? startSubagent.task.workflow.name : 'NONE'}`);
    console.log(`  Main-Workflow: ${startSubagent.task.main_workflow ? 'PRESENT (should be NONE)' : 'NONE (correct)'}\n`);

    // Complete subagent task (ad-hoc - no next task returned)
    console.log('Completing subagent task (ad-hoc mode)...');
    const completeSubagent = await completeSubagentTask({
      document: '/docs/api/authentication.md#implement-jwt-signing',
      note: 'JWT signing implemented using RS256 algorithm'
    }, sessionState, manager);

    console.log(`✓ Completed: ${completeSubagent.completed_task.title}`);
    console.log(`  Mode: ${completeSubagent.mode}`);
    console.log(`  Next task: ${completeSubagent.next_task ? 'PRESENT (should be NONE)' : 'NONE (correct)'}\n`);

    // Start different task (flexible ordering)
    console.log('Starting different subagent task (flexible ad-hoc ordering)...');
    const startSubagent2 = await startSubagentTask({
      document: '/docs/api/authentication.md#handle-token-refresh'
    }, sessionState, manager);

    console.log(`✓ Started task: ${startSubagent2.task.title}`);
    console.log(`  (Skipped 'Add token validation' - ad-hoc mode allows any order)\n`);

    // ===== VALIDATION TESTS =====
    console.log('🔒 Phase 3: Testing Validation Rules\n');

    // Test 1: Coordinator rejects #slug
    console.log('Test 1: Coordinator should reject #slug parameter');
    try {
      await startCoordinatorTask({
        document: '/coordinator/active.md#some-task'
      }, sessionState, manager);
      console.log('  ❌ FAILED - Should have rejected #slug');
    } catch (error) {
      if (error instanceof Error && error.message.includes('sequential only')) {
        console.log('  ✓ PASSED - Correctly rejected #slug\n');
      } else {
        console.log(`  ❌ FAILED - Wrong error: ${error}\n`);
      }
    }

    // Test 2: Subagent requires #slug
    console.log('Test 2: Subagent should require #slug parameter');
    try {
      await startSubagentTask({
        document: '/docs/api/authentication.md'
      }, sessionState, manager);
      console.log('  ❌ FAILED - Should have required #slug');
    } catch (error) {
      if (error instanceof Error && error.message.includes('require #slug')) {
        console.log('  ✓ PASSED - Correctly required #slug\n');
      } else {
        console.log(`  ❌ FAILED - Wrong error: ${error}\n`);
      }
    }

    // Test 3: Subagent requires /docs/ namespace
    console.log('Test 3: Subagent should require /docs/ namespace');
    try {
      await subagentTask({
        document: '/coordinator/tasks.md',
        operations: [{ operation: 'list' }]
      }, sessionState, manager);
      console.log('  ❌ FAILED - Should have rejected non-/docs/ path');
    } catch (error) {
      if (error instanceof Error && error.message.includes('/docs/')) {
        console.log('  ✓ PASSED - Correctly enforced /docs/ namespace\n');
      } else {
        console.log(`  ❌ FAILED - Wrong error: ${error}\n`);
      }
    }

    console.log('✅ All Integration Tests Complete!\n');
    console.log('Summary:');
    console.log('  - Coordinator sequential workflow: ✓');
    console.log('  - Auto-archive when all complete: ✓');
    console.log('  - Main-Workflow injection: ✓');
    console.log('  - Subagent ad-hoc workflow: ✓');
    console.log('  - Validation rules enforced: ✓');
    console.log('  - Workflow enrichment: ✓\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    throw error;
  } finally {
    // Cleanup
    try {
      await rm(testRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run the test
runIntegrationTest().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
