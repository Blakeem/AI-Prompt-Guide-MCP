/**
 * Tests for path resolution utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';

// Mock process.cwd() before importing the module
const mockCwd = vi.fn();
vi.stubGlobal('process', { ...process, cwd: mockCwd });

describe('Path Resolution Utilities', () => {
  beforeEach(() => {
    // Set a consistent mock working directory
    mockCwd.mockReturnValue('/mock/project/root');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkspacePath', async () => {
    // Dynamic import after mocking
    const { getWorkspacePath } = await import('../config.js');

    it('should return absolute paths as-is', () => {
      const absolutePath = '/absolute/path/to/docs';
      const result = getWorkspacePath(absolutePath);
      expect(result).toBe(absolutePath);
    });

    it('should resolve relative paths from process.cwd()', () => {
      const relativePath = 'relative/path/to/docs';
      const result = getWorkspacePath(relativePath);
      expect(result).toBe(join('/mock/project/root', relativePath));
    });

    it('should resolve paths with ../ correctly', () => {
      const relativePath = '../parent/docs';
      const result = getWorkspacePath(relativePath);
      expect(result).toBe(join('/mock/project/root', relativePath));
    });

    it('should resolve paths with ./ correctly', () => {
      const relativePath = './current/docs';
      const result = getWorkspacePath(relativePath);
      expect(result).toBe(join('/mock/project/root', relativePath));
    });
  });

  describe('getWorkflowsPath', async () => {
    const { getWorkflowsPath } = await import('../config.js');

    it('should return absolute paths as-is', () => {
      const absolutePath = '/absolute/path/to/workflows';
      const result = getWorkflowsPath(absolutePath);
      expect(result).toBe(absolutePath);
    });

    it('should resolve relative paths from process.cwd()', () => {
      const relativePath = 'relative/path/to/workflows';
      const result = getWorkflowsPath(relativePath);
      expect(result).toBe(join('/mock/project/root', relativePath));
    });

    it('should resolve paths with ../ correctly', () => {
      const relativePath = '../parent/workflows';
      const result = getWorkflowsPath(relativePath);
      expect(result).toBe(join('/mock/project/root', relativePath));
    });

    it('should resolve paths with ./ correctly', () => {
      const relativePath = './current/workflows';
      const result = getWorkflowsPath(relativePath);
      expect(result).toBe(join('/mock/project/root', relativePath));
    });
  });

  describe('getGuidesPath', async () => {
    const { getGuidesPath } = await import('../config.js');

    it('should return absolute paths as-is', () => {
      const absolutePath = '/absolute/path/to/guides';
      const result = getGuidesPath(absolutePath);
      expect(result).toBe(absolutePath);
    });

    it('should resolve relative paths from process.cwd()', () => {
      const relativePath = 'relative/path/to/guides';
      const result = getGuidesPath(relativePath);
      expect(result).toBe(join('/mock/project/root', relativePath));
    });

    it('should resolve paths with ../ correctly', () => {
      const relativePath = '../parent/guides';
      const result = getGuidesPath(relativePath);
      expect(result).toBe(join('/mock/project/root', relativePath));
    });

    it('should resolve paths with ./ correctly', () => {
      const relativePath = './current/guides';
      const result = getGuidesPath(relativePath);
      expect(result).toBe(join('/mock/project/root', relativePath));
    });
  });
});
