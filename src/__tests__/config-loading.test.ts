/**
 * Tests for .mcp-config.json loading functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadProjectConfig } from '../config.js';
import { getGlobalLogger, setGlobalLogger, createSilentLogger } from '../utils/logger.js';

describe('loadProjectConfig', () => {
  let testDir: string;
  let originalCwd: string;
  let originalLogger: ReturnType<typeof getGlobalLogger>;

  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = join(tmpdir(), `mcp-config-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Save original cwd and change to test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Save original logger and set silent logger for tests
    originalLogger = getGlobalLogger();
    setGlobalLogger(createSilentLogger());
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Restore original logger
    setGlobalLogger(originalLogger);
  });

  it('returns empty object when .mcp-config.json does not exist', () => {
    const result = loadProjectConfig();
    expect(result).toEqual({});
  });

  it('returns parsed config when valid JSON with correct structure', () => {
    const config = {
      env: {
        DOCS_BASE_PATH: '/custom/docs',
        WORKFLOWS_BASE_PATH: '/custom/workflows',
        GUIDES_BASE_PATH: '/custom/guides'
      }
    };

    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(config));

    const result = loadProjectConfig();
    expect(result).toEqual(config.env);
  });

  it('returns empty object and logs warning when JSON is invalid', () => {
    let loggedWarning = false;
    const mockLogger = {
      error: (): void => {},
      warn: (): void => { loggedWarning = true; },
      info: (): void => {},
      debug: (): void => {}
    };
    setGlobalLogger(mockLogger);

    writeFileSync(join(testDir, '.mcp-config.json'), '{ invalid json }');

    const result = loadProjectConfig();
    expect(result).toEqual({});
    expect(loggedWarning).toBe(true);
  });

  it('returns empty object and logs warning when structure is invalid (missing env)', () => {
    let loggedWarning = false;
    const mockLogger = {
      error: (): void => {},
      warn: (): void => { loggedWarning = true; },
      info: (): void => {},
      debug: (): void => {}
    };
    setGlobalLogger(mockLogger);

    const invalidConfig = {
      notEnv: {
        DOCS_BASE_PATH: '/custom/docs'
      }
    };

    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(invalidConfig));

    const result = loadProjectConfig();
    expect(result).toEqual({});
    expect(loggedWarning).toBe(true);
  });

  it('returns empty object and logs warning when env is not an object', () => {
    let loggedWarning = false;
    const mockLogger = {
      error: (): void => {},
      warn: (): void => { loggedWarning = true; },
      info: (): void => {},
      debug: (): void => {}
    };
    setGlobalLogger(mockLogger);

    const invalidConfig = {
      env: 'not an object'
    };

    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(invalidConfig));

    const result = loadProjectConfig();
    expect(result).toEqual({});
    expect(loggedWarning).toBe(true);
  });

  it('returns empty object and logs warning when env field has invalid type', () => {
    let loggedWarning = false;
    const mockLogger = {
      error: (): void => {},
      warn: (): void => { loggedWarning = true; },
      info: (): void => {},
      debug: (): void => {}
    };
    setGlobalLogger(mockLogger);

    const config = {
      env: {
        DOCS_BASE_PATH: '/custom/docs',
        WORKFLOWS_BASE_PATH: 123, // Invalid: should be string
        GUIDES_BASE_PATH: '/custom/guides'
      }
    };

    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(config));

    const result = loadProjectConfig();
    // Schema validation should fail on invalid field type
    expect(result).toEqual({});
    expect(loggedWarning).toBe(true);
  });
});
