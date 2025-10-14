/**
 * Tests for task validation layer
 * Phase 1 preparation for dual task system
 */

import { describe, it, expect } from 'vitest';
import {
  validateSubagentTaskAccess,
  validateCoordinatorTaskAccess,
  validateMainWorkflowPresence
} from '../task-validation.js';
import { AddressingError } from '../addressing-system.js';

describe('Task Validation Layer', () => {
  describe('validateSubagentTaskAccess', () => {
    it('should pass validation for valid subagent task access', () => {
      expect(() => {
        validateSubagentTaskAccess('/docs/project.md', 'task-1');
      }).not.toThrow();
    });

    it('should throw error when taskSlug is missing', () => {
      expect(() => {
        validateSubagentTaskAccess('/docs/project.md');
      }).toThrow(AddressingError);

      expect(() => {
        validateSubagentTaskAccess('/docs/project.md');
      }).toThrow('Subagent tasks require #slug');
    });

    it('should throw error when taskSlug is empty string', () => {
      expect(() => {
        validateSubagentTaskAccess('/docs/project.md', '');
      }).toThrow(AddressingError);
    });

    it('should throw error when document is not in /docs/ namespace', () => {
      expect(() => {
        validateSubagentTaskAccess('/coordinator/active.md', 'task-1');
      }).toThrow(AddressingError);

      expect(() => {
        validateSubagentTaskAccess('/coordinator/active.md', 'task-1');
      }).toThrow('Subagent tools only work in /docs/ namespace');
    });

    it('should include helpful error context for missing slug', () => {
      try {
        validateSubagentTaskAccess('/docs/project.md');
      } catch (error) {
        expect(error).toBeInstanceOf(AddressingError);
        const addressingError = error as AddressingError;
        expect(addressingError.context).toBeDefined();
        expect(addressingError.context?.['suggestion']).toContain('/docs/path.md#task-slug');
      }
    });

    it('should include helpful error context for wrong namespace', () => {
      try {
        validateSubagentTaskAccess('/coordinator/active.md', 'task-1');
      } catch (error) {
        expect(error).toBeInstanceOf(AddressingError);
        const addressingError = error as AddressingError;
        expect(addressingError.context).toBeDefined();
        expect(addressingError.context?.['expected_namespace']).toBe('/docs/');
      }
    });
  });

  describe('validateCoordinatorTaskAccess', () => {
    it('should pass validation for valid coordinator task access', () => {
      expect(() => {
        validateCoordinatorTaskAccess('/coordinator/active.md');
      }).not.toThrow();
    });

    it('should throw error when taskSlug is provided', () => {
      expect(() => {
        validateCoordinatorTaskAccess('/coordinator/active.md', 'task-1');
      }).toThrow(AddressingError);

      expect(() => {
        validateCoordinatorTaskAccess('/coordinator/active.md', 'task-1');
      }).toThrow('Coordinator tasks are sequential only');
    });

    it('should throw error when document is not in /coordinator/ namespace', () => {
      expect(() => {
        validateCoordinatorTaskAccess('/docs/project.md');
      }).toThrow(AddressingError);

      expect(() => {
        validateCoordinatorTaskAccess('/docs/project.md');
      }).toThrow('Coordinator tools only work with /coordinator/ namespace');
    });

    it('should include helpful error context for provided slug', () => {
      try {
        validateCoordinatorTaskAccess('/coordinator/active.md', 'task-1');
      } catch (error) {
        expect(error).toBeInstanceOf(AddressingError);
        const addressingError = error as AddressingError;
        expect(addressingError.context).toBeDefined();
        expect(addressingError.context?.['suggestion']).toContain('/coordinator/active.md (no #slug)');
      }
    });

    it('should include helpful error context for wrong namespace', () => {
      try {
        validateCoordinatorTaskAccess('/docs/project.md');
      } catch (error) {
        expect(error).toBeInstanceOf(AddressingError);
        const addressingError = error as AddressingError;
        expect(addressingError.context).toBeDefined();
        expect(addressingError.context?.['expected_namespace']).toBe('/coordinator/');
        expect(addressingError.context?.['expected_file']).toBe('/coordinator/active.md');
      }
    });
  });

  describe('validateMainWorkflowPresence', () => {
    it('should not throw for any input (warning only)', () => {
      expect(() => {
        validateMainWorkflowPresence(true, false, 'Test Task');
      }).not.toThrow();

      expect(() => {
        validateMainWorkflowPresence(true, true, 'Test Task');
      }).not.toThrow();

      expect(() => {
        validateMainWorkflowPresence(false, false, 'Test Task');
      }).not.toThrow();
    });

    it('should be callable with all parameter combinations', () => {
      // First task without Main-Workflow
      validateMainWorkflowPresence(true, false, 'First Task');

      // First task with Main-Workflow
      validateMainWorkflowPresence(true, true, 'First Task');

      // Non-first task without Main-Workflow
      validateMainWorkflowPresence(false, false, 'Second Task');

      // Non-first task with Main-Workflow
      validateMainWorkflowPresence(false, true, 'Second Task');
    });
  });
});
