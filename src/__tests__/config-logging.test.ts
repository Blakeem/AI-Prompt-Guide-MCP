/**
 * Tests for configuration startup logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig } from '../config.js';
import { getGlobalLogger, setGlobalLogger } from '../utils/logger.js';
import type { Logger } from '../types/index.js';

describe('config startup logging', () => {
  let testDir: string;
  let originalCwd: string;
  let originalLogger: Logger;
  let mockLogger: Logger;
  let infoSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = join(tmpdir(), `mcp-config-logging-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Save original cwd and change to test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Save original logger
    originalLogger = getGlobalLogger();

    // Create mock logger with spy
    infoSpy = vi.fn();
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: infoSpy,
      debug: vi.fn()
    };
    setGlobalLogger(mockLogger);

    // Set required DOCS_BASE_PATH environment variable and create directory
    const docsPath = join(testDir, 'docs');
    mkdirSync(docsPath, { recursive: true });
    process.env['DOCS_BASE_PATH'] = docsPath;
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

    // Clean up environment variables
    delete process.env['DOCS_BASE_PATH'];
    delete process.env['WORKFLOWS_BASE_PATH'];
    delete process.env['GUIDES_BASE_PATH'];
    delete process.env['REFERENCE_EXTRACTION_DEPTH'];
  });

  it('logs configuration on startup with all required fields', () => {
    loadConfig();

    // Verify info() was called
    expect(infoSpy).toHaveBeenCalled();

    // Get the call arguments
    const calls = infoSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    // Check that message and context were provided
    const [message, context] = calls[0] as [string, Record<string, unknown>];
    expect(message).toBeTruthy();
    expect(typeof message).toBe('string');
    expect(context).toBeTruthy();
    expect(typeof context).toBe('object');

    // Verify all required fields are present in context
    expect(context).toHaveProperty('projectRoot');
    expect(context).toHaveProperty('docsPath');
    expect(context).toHaveProperty('workflowsPath');
    expect(context).toHaveProperty('guidesPath');
    expect(context).toHaveProperty('referenceExtractionDepth');
    expect(context).toHaveProperty('hasProjectConfig');
  });

  it('logs resolved absolute paths', () => {
    loadConfig();

    const calls = infoSpy.mock.calls;
    const [, context] = calls[0] as [string, Record<string, unknown>];

    // Verify paths are absolute
    expect(typeof context['docsPath']).toBe('string');
    expect(typeof context['workflowsPath']).toBe('string');
    expect(typeof context['guidesPath']).toBe('string');

    const docsPath = context['docsPath'] as string;
    const workflowsPath = context['workflowsPath'] as string;
    const guidesPath = context['guidesPath'] as string;

    expect(docsPath).toMatch(/^[/\\]/); // Absolute path
    expect(workflowsPath).toMatch(/^[/\\]/); // Absolute path
    expect(guidesPath).toMatch(/^[/\\]/); // Absolute path
  });

  it('logs hasProjectConfig as false when no .mcp-config.json exists', () => {
    loadConfig();

    const calls = infoSpy.mock.calls;
    const [, context] = calls[0] as [string, Record<string, unknown>];

    expect(context['hasProjectConfig']).toBe(false);
  });

  it('logs hasProjectConfig as true when .mcp-config.json exists', () => {
    const customDocsPath = join(testDir, 'custom-docs');
    mkdirSync(customDocsPath, { recursive: true });

    const config = {
      env: {
        DOCS_BASE_PATH: customDocsPath
      }
    };

    writeFileSync(join(testDir, '.mcp-config.json'), JSON.stringify(config));

    loadConfig();

    const calls = infoSpy.mock.calls;
    const [, context] = calls[0] as [string, Record<string, unknown>];

    expect(context['hasProjectConfig']).toBe(true);
  });

  it('logs custom reference extraction depth from environment', () => {
    process.env['REFERENCE_EXTRACTION_DEPTH'] = '5';

    loadConfig();

    const calls = infoSpy.mock.calls;
    const [, context] = calls[0] as [string, Record<string, unknown>];

    expect(context['referenceExtractionDepth']).toBe(5);
  });

  it('logs default reference extraction depth when not specified', () => {
    loadConfig();

    const calls = infoSpy.mock.calls;
    const [, context] = calls[0] as [string, Record<string, unknown>];

    expect(context['referenceExtractionDepth']).toBe(3); // Default from DEFAULT_CONFIG
  });

  it('uses getGlobalLogger() not console.log', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const consoleErrorSpy = vi.spyOn(console, 'error');
    const consoleWarnSpy = vi.spyOn(console, 'warn');

    loadConfig();

    // Verify console methods were not called directly
    expect(consoleSpy).not.toHaveBeenCalled();

    // console.error/warn might be called by logger, but not console.log
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('logs message describing configuration startup', () => {
    loadConfig();

    const calls = infoSpy.mock.calls;
    const [message] = calls[0] as [string, Record<string, unknown>];

    // Message should describe configuration or startup
    expect(message.toLowerCase()).toMatch(/(configuration|config|startup|loaded)/);
  });
});
