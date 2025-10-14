/**
 * Tests for complete_task completion notes display
 * Verifies that completion notes are properly saved and displayed when viewing completed tasks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DocumentManager } from '../../../document-manager.js';
import { DocumentCache } from '../../../document-cache.js';
import { completeSubagentTask } from '../complete-subagent-task.js';
import { viewSubagentTask } from '../view-subagent-task.js';
import type { SessionState } from '../../../session/types.js';

describe('Complete Task - Completion Notes Display', () => {
  let testDir: string;
  let cache: DocumentCache;
  let manager: DocumentManager;
  const testDoc = '/docs/test-completion-notes.md';
  const mockSessionState: SessionState = {
    sessionId: 'test-session',
    createDocumentStage: 0
  };

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `mcp-completion-notes-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create /docs/ subdirectory (required for subagent tools)
    const docsDir = path.join(testDir, 'docs');
    await fs.mkdir(docsDir, { recursive: true });

    // Create cache and manager instances
    cache = new DocumentCache(testDir);
    manager = new DocumentManager(testDir, cache);

    // Create test document with task using dash list marker
    const testContent = `# Test Document

## Tasks

### Test Task
- Status: pending

This is a test task for completion notes.
`;
    const testPath = path.join(docsDir, 'test-completion-notes.md');
    await fs.writeFile(testPath, testContent, 'utf-8');
  });

  afterEach(async () => {
    // Wait for any pending debounced operations
    await new Promise(resolve => setTimeout(resolve, 200));

    // Cleanup
    await cache.destroy();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should save and display completion notes when task is completed', async () => {
    // Complete the task with a note
    const completeResult = await completeSubagentTask(
      {
        document: `${testDoc}#test-task`,
        note: 'Successfully implemented authentication with JWT tokens'
      },
      mockSessionState,
      manager
    );

    // Verify completion response includes note
    expect(completeResult.completed_task.note).toBe('Successfully implemented authentication with JWT tokens');
    expect(completeResult.completed_task.completed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // View the completed task
    const viewResult = await viewSubagentTask(
      {
        document: `${testDoc}#test-task`
      },
      mockSessionState,
      manager
    );

    const taskContent = viewResult.tasks[0]?.content ?? '';

    // Verify status is updated to completed
    expect(taskContent).toContain('Status: completed');

    // Verify completion date is present
    expect(taskContent).toContain('Completed:');
    expect(taskContent).toMatch(/Completed: \d{4}-\d{2}-\d{2}/);

    // Verify completion note is present
    expect(taskContent).toContain('Note:');
    expect(taskContent).toContain('Successfully implemented authentication with JWT tokens');
  });

  it('should handle tasks with asterisk list markers', async () => {
    // Create test document with asterisk list marker
    const testContent = `# Test Document

## Tasks

### Asterisk Task
* Status: pending

Task using asterisk list markers.
`;
    const docsDir = path.join(testDir, 'docs');
    const testPath = path.join(docsDir, 'test-completion-notes.md');
    await fs.writeFile(testPath, testContent, 'utf-8');

    // Invalidate cache to reload document
    cache.invalidateDocument(testDoc);

    // Complete the task
    await completeSubagentTask(
      {
        document: `${testDoc}#asterisk-task`,
        note: 'Task completed successfully'
      },
      mockSessionState,
      manager
    );

    // View the completed task
    const viewResult = await viewSubagentTask(
      {
        document: `${testDoc}#asterisk-task`
      },
      mockSessionState,
      manager
    );

    const taskContent = viewResult.tasks[0]?.content ?? '';

    // Verify all completion fields are present
    expect(taskContent).toContain('Status: completed');
    expect(taskContent).toContain('Completed:');
    expect(taskContent).toContain('Note:');
    expect(taskContent).toContain('Task completed successfully');
  });

  it('should preserve list marker format in completion notes', async () => {
    // Complete the task
    await completeSubagentTask(
      {
        document: `${testDoc}#test-task`,
        note: 'Completion note for marker test'
      },
      mockSessionState,
      manager
    );

    // View the completed task
    const viewResult = await viewSubagentTask(
      {
        document: `${testDoc}#test-task`
      },
      mockSessionState,
      manager
    );

    const taskContent = viewResult.tasks[0]?.content ?? '';

    // Verify list markers are consistent (either all - or all *)
    const lines = taskContent.split('\n');
    const statusLine = lines.find(l => l.includes('Status:'));
    const completedLine = lines.find(l => l.includes('Completed:'));
    const noteLine = lines.find(l => l.includes('Note:'));

    if (statusLine != null && completedLine != null && noteLine != null) {
      // Extract the list marker from status line
      const statusMarker = statusLine.trim()[0];

      // Verify all lines use the same marker
      expect(completedLine.trim()[0]).toBe(statusMarker);
      expect(noteLine.trim()[0]).toBe(statusMarker);
    }
  });

  it('should include completion date in ISO format', async () => {
    // Complete the task
    const completeResult = await completeSubagentTask(
      {
        document: `${testDoc}#test-task`,
        note: 'Date format test'
      },
      mockSessionState,
      manager
    );

    // Verify date format in response
    expect(completeResult.completed_task.completed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // View the completed task
    const viewResult = await viewSubagentTask(
      {
        document: `${testDoc}#test-task`
      },
      mockSessionState,
      manager
    );

    const taskContent = viewResult.tasks[0]?.content ?? '';

    // Verify date format in content
    expect(taskContent).toMatch(/Completed: \d{4}-\d{2}-\d{2}/);
  });
});
