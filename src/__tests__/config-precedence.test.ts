/**
 * Tests for configuration precedence merging between .mcp-config.json and process.env
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { loadConfig } from '../config.js';
import { getGlobalLogger, setGlobalLogger, createSilentLogger } from '../utils/logger.js';

describe('loadConfig - configuration precedence', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEnv: Record<string, string | undefined>;
  let originalLogger: ReturnType<typeof getGlobalLogger>;

  // Get the plugin's .ai-prompt-guide directory as default paths
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pluginRoot = join(__dirname, '..', '..');
  const pluginWorkflowsPath = join(pluginRoot, '.ai-prompt-guide', 'workflows');
  const pluginGuidesPath = join(pluginRoot, '.ai-prompt-guide', 'guides');

  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = join(tmpdir(), `mcp-config-precedence-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Save original cwd and change to test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Save original environment variables
    originalEnv = {
      DOCS_BASE_PATH: process.env['DOCS_BASE_PATH'],
      WORKFLOWS_BASE_PATH: process.env['WORKFLOWS_BASE_PATH'],
      GUIDES_BASE_PATH: process.env['GUIDES_BASE_PATH']
    };

    // Save original logger and set silent logger for tests
    originalLogger = getGlobalLogger();
    setGlobalLogger(createSilentLogger());
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);

    // Restore environment variables
    if (originalEnv['DOCS_BASE_PATH'] != null) {
      process.env['DOCS_BASE_PATH'] = originalEnv['DOCS_BASE_PATH'];
    } else {
      delete process.env['DOCS_BASE_PATH'];
    }
    if (originalEnv['WORKFLOWS_BASE_PATH'] != null) {
      process.env['WORKFLOWS_BASE_PATH'] = originalEnv['WORKFLOWS_BASE_PATH'];
    } else {
      delete process.env['WORKFLOWS_BASE_PATH'];
    }
    if (originalEnv['GUIDES_BASE_PATH'] != null) {
      process.env['GUIDES_BASE_PATH'] = originalEnv['GUIDES_BASE_PATH'];
    } else {
      delete process.env['GUIDES_BASE_PATH'];
    }

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Restore original logger
    setGlobalLogger(originalLogger);
  });

  it('uses default config when no .mcp-config.json exists', () => {
    // Set DOCS_BASE_PATH as it's required
    process.env['DOCS_BASE_PATH'] = testDir;

    const config = loadConfig();

    expect(config.docsBasePath).toBe(testDir);
    expect(config.workflowsBasePath).toBe(pluginWorkflowsPath);
    expect(config.guidesBasePath).toBe(pluginGuidesPath);
  });

  it('project config overrides DOCS_BASE_PATH only', () => {
    const customDocsPath = join(testDir, 'custom-docs');
    mkdirSync(customDocsPath, { recursive: true });

    // Set process.env with all paths
    process.env['DOCS_BASE_PATH'] = testDir;
    process.env['WORKFLOWS_BASE_PATH'] = '/env/workflows';
    process.env['GUIDES_BASE_PATH'] = '/env/guides';

    // Create .mcp-config.json that overrides only DOCS_BASE_PATH
    const projectConfig = {
      env: {
        DOCS_BASE_PATH: customDocsPath
      }
    };
    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(projectConfig));

    const config = loadConfig();

    // Project config should override DOCS_BASE_PATH
    expect(config.docsBasePath).toBe(customDocsPath);
    // Other paths should use defaults (not process.env values)
    expect(config.workflowsBasePath).toBe(pluginWorkflowsPath);
    expect(config.guidesBasePath).toBe(pluginGuidesPath);
  });

  it('project config overrides WORKFLOWS_BASE_PATH only', () => {
    const customWorkflowsPath = join(testDir, 'custom-workflows');
    mkdirSync(customWorkflowsPath, { recursive: true });

    // Set required DOCS_BASE_PATH
    process.env['DOCS_BASE_PATH'] = testDir;
    process.env['WORKFLOWS_BASE_PATH'] = '/env/workflows';
    process.env['GUIDES_BASE_PATH'] = '/env/guides';

    // Create .mcp-config.json that overrides only WORKFLOWS_BASE_PATH
    const projectConfig = {
      env: {
        WORKFLOWS_BASE_PATH: customWorkflowsPath
      }
    };
    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(projectConfig));

    const config = loadConfig();

    // DOCS_BASE_PATH should use process.env since not overridden
    expect(config.docsBasePath).toBe(testDir);
    // Project config should override WORKFLOWS_BASE_PATH
    expect(config.workflowsBasePath).toBe(customWorkflowsPath);
    // GUIDES_BASE_PATH should use default
    expect(config.guidesBasePath).toBe(pluginGuidesPath);
  });

  it('project config overrides GUIDES_BASE_PATH only', () => {
    const customGuidesPath = join(testDir, 'custom-guides');
    mkdirSync(customGuidesPath, { recursive: true });

    // Set required DOCS_BASE_PATH
    process.env['DOCS_BASE_PATH'] = testDir;
    process.env['WORKFLOWS_BASE_PATH'] = '/env/workflows';
    process.env['GUIDES_BASE_PATH'] = '/env/guides';

    // Create .mcp-config.json that overrides only GUIDES_BASE_PATH
    const projectConfig = {
      env: {
        GUIDES_BASE_PATH: customGuidesPath
      }
    };
    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(projectConfig));

    const config = loadConfig();

    // DOCS_BASE_PATH should use process.env since not overridden
    expect(config.docsBasePath).toBe(testDir);
    // WORKFLOWS_BASE_PATH should use default
    expect(config.workflowsBasePath).toBe(pluginWorkflowsPath);
    // Project config should override GUIDES_BASE_PATH
    expect(config.guidesBasePath).toBe(customGuidesPath);
  });

  it('project config overrides all three paths', () => {
    const customDocsPath = join(testDir, 'custom-docs');
    const customWorkflowsPath = join(testDir, 'custom-workflows');
    const customGuidesPath = join(testDir, 'custom-guides');

    mkdirSync(customDocsPath, { recursive: true });
    mkdirSync(customWorkflowsPath, { recursive: true });
    mkdirSync(customGuidesPath, { recursive: true });

    // Set process.env values
    process.env['DOCS_BASE_PATH'] = '/env/docs';
    process.env['WORKFLOWS_BASE_PATH'] = '/env/workflows';
    process.env['GUIDES_BASE_PATH'] = '/env/guides';

    // Create .mcp-config.json that overrides all paths
    const projectConfig = {
      env: {
        DOCS_BASE_PATH: customDocsPath,
        WORKFLOWS_BASE_PATH: customWorkflowsPath,
        GUIDES_BASE_PATH: customGuidesPath
      }
    };
    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(projectConfig));

    const config = loadConfig();

    // All paths should use project config values (not process.env)
    expect(config.docsBasePath).toBe(customDocsPath);
    expect(config.workflowsBasePath).toBe(customWorkflowsPath);
    expect(config.guidesBasePath).toBe(customGuidesPath);
  });

  it('project config takes precedence over process.env for all matching keys', () => {
    const projectDocsPath = join(testDir, 'project-docs');
    const projectWorkflowsPath = join(testDir, 'project-workflows');
    const projectGuidesPath = join(testDir, 'project-guides');

    mkdirSync(projectDocsPath, { recursive: true });
    mkdirSync(projectWorkflowsPath, { recursive: true });
    mkdirSync(projectGuidesPath, { recursive: true });

    // Set process.env with different values
    process.env['DOCS_BASE_PATH'] = join(testDir, 'env-docs');
    process.env['WORKFLOWS_BASE_PATH'] = join(testDir, 'env-workflows');
    process.env['GUIDES_BASE_PATH'] = join(testDir, 'env-guides');

    // Create .mcp-config.json with different values
    const projectConfig = {
      env: {
        DOCS_BASE_PATH: projectDocsPath,
        WORKFLOWS_BASE_PATH: projectWorkflowsPath,
        GUIDES_BASE_PATH: projectGuidesPath
      }
    };
    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(projectConfig));

    const config = loadConfig();

    // Project config should completely override process.env values
    expect(config.docsBasePath).toBe(projectDocsPath);
    expect(config.workflowsBasePath).toBe(projectWorkflowsPath);
    expect(config.guidesBasePath).toBe(projectGuidesPath);

    // Values should NOT be from process.env
    expect(config.docsBasePath).not.toBe(process.env['DOCS_BASE_PATH']);
    expect(config.workflowsBasePath).not.toBe(process.env['WORKFLOWS_BASE_PATH']);
    expect(config.guidesBasePath).not.toBe(process.env['GUIDES_BASE_PATH']);
  });
});
