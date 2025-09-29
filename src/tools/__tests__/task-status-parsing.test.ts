/**
 * Regression test for BUG #3: Task Status Parsing Incorrect
 *
 * This test ensures that the extractMetadata function correctly parses
 * all status formats used in task sections:
 * - * Status: value (star format)
 * - - Status: value (dash format)
 * - **Status:** value (bold format)
 *
 * Issue: extractMetadata only supported star and dash formats,
 * but many documents use the bold format which was being ignored,
 * causing all tasks to show as "pending" regardless of actual status.
 */

import { describe, it, expect } from 'vitest';
import { extractTaskField } from '../../shared/task-view-utilities.js';

// Use the shared extractTaskField function which now supports all three formats
// Convert null to undefined for backward compatibility with test expectations
function extractMetadata(content: string, key: string): string | undefined {
  return extractTaskField(content, key) ?? undefined;
}

describe('Task Status Parsing (BUG #3)', () => {
  describe('extractMetadata function', () => {
    it('should parse status from star format (* Status: value)', () => {
      const content = `### Task Title
Some description here.

* Status: in_progress
* Priority: high

More content here.`;

      const status = extractMetadata(content, 'Status');
      expect(status).toBe('in_progress');
    });

    it('should parse status from dash format (- Status: value)', () => {
      const content = `### Task Title
Some description here.

- Status: completed
- Priority: medium

More content here.`;

      const status = extractMetadata(content, 'Status');
      expect(status).toBe('completed');
    });

    it('should parse status from bold format (**Status:** value)', () => {
      const content = `### Task Title
**Status:** pending
**Priority:** low

This is the format used in our test documents.`;

      const status = extractMetadata(content, 'Status');
      expect(status).toBe('pending');
    });

    it('should parse all valid status values from bold format', () => {
      const statusValues = ['pending', 'in_progress', 'completed', 'blocked'];

      statusValues.forEach(statusValue => {
        const content = `### Task Title
**Status:** ${statusValue}
**Priority:** high`;

        const status = extractMetadata(content, 'Status');
        expect(status, `Failed to parse status: ${statusValue}`).toBe(statusValue);
      });
    });

    it('should prioritize star format over other formats when multiple exist', () => {
      const content = `### Task Title
* Status: in_progress
- Status: completed
**Status:** blocked`;

      const status = extractMetadata(content, 'Status');
      expect(status).toBe('in_progress'); // Star format should win
    });

    it('should prioritize dash format over bold format when star is not present', () => {
      const content = `### Task Title
- Status: completed
**Status:** blocked`;

      const status = extractMetadata(content, 'Status');
      expect(status).toBe('completed'); // Dash format should win
    });

    it('should fall back to bold format when star and dash are not present', () => {
      const content = `### Task Title
**Status:** blocked
**Priority:** high`;

      const status = extractMetadata(content, 'Status');
      expect(status).toBe('blocked'); // Bold format should be used
    });

    it('should return undefined when no status format is found', () => {
      const content = `### Task Title
This task has no status field.
Just some description text.`;

      const status = extractMetadata(content, 'Status');
      expect(status).toBeUndefined();
    });

    it('should handle case-sensitive field names correctly', () => {
      const content = `### Task Title
**status:** pending
**Status:** in_progress`;

      // Should only match exact case
      const status = extractMetadata(content, 'Status');
      expect(status).toBe('in_progress');

      const lowerStatus = extractMetadata(content, 'status');
      expect(lowerStatus).toBe('pending');
    });

    it('should trim whitespace from extracted values', () => {
      const content = `### Task Title
**Status:**   completed
**Priority:**   high   `;

      const status = extractMetadata(content, 'Status');
      expect(status).toBe('completed'); // Should be trimmed
    });

    it('should work with other metadata fields like Priority', () => {
      const content = `### Task Title
**Status:** in_progress
**Priority:** high
**Dependencies:** #other-task`;

      const status = extractMetadata(content, 'Status');
      const priority = extractMetadata(content, 'Priority');
      const dependencies = extractMetadata(content, 'Dependencies');

      expect(status).toBe('in_progress');
      expect(priority).toBe('high');
      expect(dependencies).toBe('#other-task');
    });

    it('should handle multiline content correctly', () => {
      const content = `### Test Task Listing
**Status:** in_progress
**Priority:** medium
**Dependencies:** none

Verify that tasks under the Tasks section are properly identified and listed.

This should work correctly now.`;

      const status = extractMetadata(content, 'Status');
      expect(status).toBe('in_progress');
    });
  });
});