/**
 * Tests for path validation in parseEnvironmentVariables
 * Validates that path existence checks work correctly for required and optional paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig } from '../config.js';

describe('Config Path Validation', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;
  let loggerSpy: {
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(async () => {
    // Save original environment and cwd
    originalEnv = { ...process.env };
    originalCwd = process.cwd();

    // Create temp directory
    tempDir = join(tmpdir(), `mcp-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    mkdirSync(tempDir, { recursive: true });

    // Change to temp directory
    process.chdir(tempDir);

    // Mock logger
    const { getGlobalLogger } = await import('../utils/logger.js');
    const logger = getGlobalLogger();
    loggerSpy = {
      warn: vi.spyOn(logger, 'warn'),
      info: vi.spyOn(logger, 'info')
    };
  });

  afterEach(() => {
    // Restore environment and cwd
    process.env = originalEnv;
    process.chdir(originalCwd);

    // Clean up temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('Required MCP_WORKSPACE_PATH Validation', () => {
    it('should throw error when MCP_WORKSPACE_PATH does not exist', () => {
      // Setup: Non-existent docs path
      const nonExistentPath = join(tempDir, 'non-existent-docs');
      process.env['MCP_WORKSPACE_PATH'] = nonExistentPath;

      // Act & Assert: Should throw error for non-existent required path
      expect(() => loadConfig()).toThrow(/MCP_WORKSPACE_PATH directory does not exist/);
    });

    it('should succeed when MCP_WORKSPACE_PATH exists', () => {
      // Setup: Existing docs path
      const docsPath = join(tempDir, 'docs');
      mkdirSync(docsPath, { recursive: true });
      process.env['MCP_WORKSPACE_PATH'] = docsPath;

      // Act: Should not throw
      expect(() => loadConfig()).not.toThrow();
    });

    it('should throw error when relative MCP_WORKSPACE_PATH resolves to non-existent directory', () => {
      // Setup: Relative path that doesn't exist
      process.env['MCP_WORKSPACE_PATH'] = './non-existent-docs';

      // Act & Assert: Should throw error after resolution
      expect(() => loadConfig()).toThrow(/MCP_WORKSPACE_PATH directory does not exist/);
    });

    it('should succeed when relative MCP_WORKSPACE_PATH resolves to existing directory', () => {
      // Setup: Create directory and use relative path
      const docsPath = join(tempDir, 'docs');
      mkdirSync(docsPath, { recursive: true });
      process.env['MCP_WORKSPACE_PATH'] = './docs';

      // Act: Should not throw
      expect(() => loadConfig()).not.toThrow();
    });
  });

  describe('Optional WORKFLOWS_BASE_PATH Validation', () => {
    it('should log warning when WORKFLOWS_BASE_PATH does not exist', () => {
      // Setup: Valid docs path, non-existent workflows path
      const docsPath = join(tempDir, 'docs');
      mkdirSync(docsPath, { recursive: true });
      process.env['MCP_WORKSPACE_PATH'] = docsPath;

      const nonExistentWorkflows = join(tempDir, 'non-existent-workflows');
      process.env['WORKFLOWS_BASE_PATH'] = nonExistentWorkflows;

      // Act: Should not throw but log warning
      expect(() => loadConfig()).not.toThrow();

      // Assert: Warning should be logged
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WORKFLOWS_BASE_PATH directory does not exist'),
        expect.objectContaining({
          path: expect.any(String)
        })
      );
    });

    it('should not log warning when WORKFLOWS_BASE_PATH exists', () => {
      // Setup: Valid docs and workflows paths
      const docsPath = join(tempDir, 'docs');
      const workflowsPath = join(tempDir, 'workflows');
      mkdirSync(docsPath, { recursive: true });
      mkdirSync(workflowsPath, { recursive: true });

      process.env['MCP_WORKSPACE_PATH'] = docsPath;
      process.env['WORKFLOWS_BASE_PATH'] = workflowsPath;

      // Clear previous calls
      loggerSpy.warn.mockClear();

      // Act: Should not throw
      expect(() => loadConfig()).not.toThrow();

      // Assert: No warning about non-existent WORKFLOWS_BASE_PATH
      expect(loggerSpy.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('WORKFLOWS_BASE_PATH directory does not exist'),
        expect.any(Object)
      );
    });
  });

  describe('Optional GUIDES_BASE_PATH Validation', () => {
    it('should log warning when GUIDES_BASE_PATH does not exist', () => {
      // Setup: Valid docs path, non-existent guides path
      const docsPath = join(tempDir, 'docs');
      mkdirSync(docsPath, { recursive: true });
      process.env['MCP_WORKSPACE_PATH'] = docsPath;

      const nonExistentGuides = join(tempDir, 'non-existent-guides');
      process.env['GUIDES_BASE_PATH'] = nonExistentGuides;

      // Act: Should not throw but log warning
      expect(() => loadConfig()).not.toThrow();

      // Assert: Warning should be logged
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('GUIDES_BASE_PATH directory does not exist'),
        expect.objectContaining({
          path: expect.any(String)
        })
      );
    });

    it('should not log warning when GUIDES_BASE_PATH exists', () => {
      // Setup: Valid docs and guides paths
      const docsPath = join(tempDir, 'docs');
      const guidesPath = join(tempDir, 'guides');
      mkdirSync(docsPath, { recursive: true });
      mkdirSync(guidesPath, { recursive: true });

      process.env['MCP_WORKSPACE_PATH'] = docsPath;
      process.env['GUIDES_BASE_PATH'] = guidesPath;

      // Clear previous calls
      loggerSpy.warn.mockClear();

      // Act: Should not throw
      expect(() => loadConfig()).not.toThrow();

      // Assert: No warning about non-existent GUIDES_BASE_PATH
      expect(loggerSpy.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('GUIDES_BASE_PATH directory does not exist'),
        expect.any(Object)
      );
    });
  });

  describe('Multiple Path Validation', () => {
    it('should log warnings for multiple non-existent optional paths', () => {
      // Setup: Valid docs, non-existent workflows and guides
      const docsPath = join(tempDir, 'docs');
      mkdirSync(docsPath, { recursive: true });
      process.env['MCP_WORKSPACE_PATH'] = docsPath;

      process.env['WORKFLOWS_BASE_PATH'] = join(tempDir, 'non-existent-workflows');
      process.env['GUIDES_BASE_PATH'] = join(tempDir, 'non-existent-guides');

      // Act: Should not throw
      expect(() => loadConfig()).not.toThrow();

      // Assert: Both warnings logged
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WORKFLOWS_BASE_PATH directory does not exist'),
        expect.any(Object)
      );
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('GUIDES_BASE_PATH directory does not exist'),
        expect.any(Object)
      );
    });

    it('should not log warnings when all paths exist', () => {
      // Setup: All paths exist
      const docsPath = join(tempDir, 'docs');
      const workflowsPath = join(tempDir, 'workflows');
      const guidesPath = join(tempDir, 'guides');

      mkdirSync(docsPath, { recursive: true });
      mkdirSync(workflowsPath, { recursive: true });
      mkdirSync(guidesPath, { recursive: true });

      process.env['MCP_WORKSPACE_PATH'] = docsPath;
      process.env['WORKFLOWS_BASE_PATH'] = workflowsPath;
      process.env['GUIDES_BASE_PATH'] = guidesPath;

      // Clear previous calls
      loggerSpy.warn.mockClear();

      // Act: Should not throw
      expect(() => loadConfig()).not.toThrow();

      // Assert: No path existence warnings
      expect(loggerSpy.warn).not.toHaveBeenCalledWith(
        expect.stringMatching(/BASE_PATH directory does not exist/),
        expect.any(Object)
      );
    });
  });

  describe('Project Config Path Validation', () => {
    it('should validate paths from .mcp-config.json', () => {
      // Setup: Create .mcp-config.json with non-existent docs path
      const nonExistentDocs = join(tempDir, 'config-docs');
      const configContent = {
        env: {
          MCP_WORKSPACE_PATH: nonExistentDocs
        }
      };

      writeFileSync(
        join(tempDir, '.mcp-config.json'),
        JSON.stringify(configContent, null, 2)
      );

      // Act & Assert: Should throw error
      expect(() => loadConfig()).toThrow(/MCP_WORKSPACE_PATH directory does not exist/);
    });

    it('should validate optional paths from .mcp-config.json', () => {
      // Setup: Create .mcp-config.json with valid docs, invalid workflows
      const docsPath = join(tempDir, 'docs');
      mkdirSync(docsPath, { recursive: true });

      const configContent = {
        env: {
          MCP_WORKSPACE_PATH: docsPath,
          WORKFLOWS_BASE_PATH: join(tempDir, 'config-workflows-missing')
        }
      };

      writeFileSync(
        join(tempDir, '.mcp-config.json'),
        JSON.stringify(configContent, null, 2)
      );

      // Act: Should not throw
      expect(() => loadConfig()).not.toThrow();

      // Assert: Warning logged
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WORKFLOWS_BASE_PATH directory does not exist'),
        expect.any(Object)
      );
    });
  });
});
