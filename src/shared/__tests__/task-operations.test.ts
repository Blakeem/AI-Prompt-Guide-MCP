/**
 * Tests for shared task operations
 * Phase 1 preparation for dual task system
 *
 * These tests verify that the shared operations are exported and callable.
 * Full integration tests exist in the existing task.test.ts files.
 */

import { describe, it, expect } from 'vitest';
import {
  createTaskOperation,
  editTaskOperation,
  listTasksOperation,
  completeTaskOperation,
  ensureTasksSectionOperation,
  type CreateTaskResult,
  type CompleteTaskResult,
  type ListTasksResult,
  type TaskData,
  type TaskHierarchicalContext
} from '../task-operations.js';

describe('Shared Task Operations', () => {
  describe('Type exports', () => {
    it('should export CreateTaskResult type', () => {
      const result: CreateTaskResult = {
        slug: 'test',
        title: 'Test'
      };
      expect(result).toBeDefined();
    });

    it('should export CompleteTaskResult type', () => {
      const result: CompleteTaskResult = {
        slug: 'test',
        title: 'Test',
        note: 'Note',
        completed_date: '2025-01-01'
      };
      expect(result).toBeDefined();
    });

    it('should export ListTasksResult type', () => {
      const result: ListTasksResult = {
        tasks: []
      };
      expect(result).toBeDefined();
    });

    it('should export TaskData type', () => {
      const data: TaskData = {
        slug: 'test',
        title: 'Test',
        status: 'pending'
      };
      expect(data).toBeDefined();
    });

    it('should export TaskHierarchicalContext type', () => {
      const context: TaskHierarchicalContext = {
        full_path: 'phase/category/task',
        parent_path: 'phase/category',
        phase: 'phase',
        category: 'category',
        task_name: 'task',
        depth: 3
      };
      expect(context).toBeDefined();
    });
  });

  describe('Function exports', () => {
    it('should export ensureTasksSectionOperation function', () => {
      expect(ensureTasksSectionOperation).toBeTypeOf('function');
    });

    it('should export createTaskOperation function', () => {
      expect(createTaskOperation).toBeTypeOf('function');
    });

    it('should export editTaskOperation function', () => {
      expect(editTaskOperation).toBeTypeOf('function');
    });

    it('should export listTasksOperation function', () => {
      expect(listTasksOperation).toBeTypeOf('function');
    });

    it('should export completeTaskOperation function', () => {
      expect(completeTaskOperation).toBeTypeOf('function');
    });
  });
});
