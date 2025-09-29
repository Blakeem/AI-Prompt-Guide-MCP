/**
 * Comprehensive unit tests for configuration loading and validation
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_CONFIG, ERROR_CODES } from '../constants/defaults.js';
import type { SpecDocsError } from '../types/index.js';

// Mock the process.env and dotenv
const originalEnv = process.env;

// Mock dotenv to prevent loading .env file during tests
vi.mock('dotenv', () => ({
  config: vi.fn(() => ({ parsed: {} }))
}));

describe('loadConfig', () => {
  beforeEach(() => {
    // Reset modules and environment before each test
    vi.resetModules();
    process.env = {};
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('referenceExtractionDepth configuration', () => {
    test('should use default value when REFERENCE_EXTRACTION_DEPTH is not set', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';

      const { loadConfig } = await import('../config.js');
      const config = loadConfig();

      expect(config.referenceExtractionDepth).toBe(DEFAULT_CONFIG.REFERENCE_EXTRACTION_DEPTH);
      expect(config.referenceExtractionDepth).toBe(3);
    });

    test('should use valid environment value for REFERENCE_EXTRACTION_DEPTH', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '2';

      const { loadConfig } = await import('../config.js');
      const config = loadConfig();

      expect(config.referenceExtractionDepth).toBe(2);
    });

    test('should accept minimum valid value (1)', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '1';

      const { loadConfig } = await import('../config.js');
      const config = loadConfig();

      expect(config.referenceExtractionDepth).toBe(1);
    });

    test('should accept maximum valid value (5)', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '5';

      const { loadConfig } = await import('../config.js');
      const config = loadConfig();

      expect(config.referenceExtractionDepth).toBe(5);
    });

    test('should throw error for value below minimum (0)', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '0';

      const { loadConfig } = await import('../config.js');

      expect(() => loadConfig()).toThrow();
      try {
        loadConfig();
      } catch (error) {
        const specError = error as SpecDocsError;
        expect(specError.code).toBe(ERROR_CODES.ENVIRONMENT_ERROR);
        expect(specError.message).toContain('REFERENCE_EXTRACTION_DEPTH must be a number between 1 and 5');
      }
    });

    test('should throw error for value above maximum (6)', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '6';

      const { loadConfig } = await import('../config.js');

      expect(() => loadConfig()).toThrow();
      try {
        loadConfig();
      } catch (error) {
        const specError = error as SpecDocsError;
        expect(specError.code).toBe(ERROR_CODES.ENVIRONMENT_ERROR);
        expect(specError.message).toContain('REFERENCE_EXTRACTION_DEPTH must be a number between 1 and 5');
      }
    });

    test('should throw error for negative value', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '-1';

      const { loadConfig } = await import('../config.js');

      expect(() => loadConfig()).toThrow();
      try {
        loadConfig();
      } catch (error) {
        const specError = error as SpecDocsError;
        expect(specError.code).toBe(ERROR_CODES.ENVIRONMENT_ERROR);
        expect(specError.message).toContain('REFERENCE_EXTRACTION_DEPTH must be a number between 1 and 5');
      }
    });

    test('should throw error for non-numeric value', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = 'invalid';

      const { loadConfig } = await import('../config.js');

      expect(() => loadConfig()).toThrow();
      try {
        loadConfig();
      } catch (error) {
        const specError = error as SpecDocsError;
        expect(specError.code).toBe(ERROR_CODES.ENVIRONMENT_ERROR);
        expect(specError.message).toContain('REFERENCE_EXTRACTION_DEPTH must be a number between 1 and 5');
      }
    });

    test('should throw error for empty string value', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '';

      const { loadConfig } = await import('../config.js');

      expect(() => loadConfig()).toThrow();
      try {
        loadConfig();
      } catch (error) {
        const specError = error as SpecDocsError;
        expect(specError.code).toBe(ERROR_CODES.ENVIRONMENT_ERROR);
        expect(specError.message).toContain('REFERENCE_EXTRACTION_DEPTH must be a number between 1 and 5');
      }
    });

    test('should throw error for decimal value', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '2.5';

      const { loadConfig } = await import('../config.js');

      expect(() => loadConfig()).toThrow();
      try {
        loadConfig();
      } catch (error) {
        const specError = error as SpecDocsError;
        expect(specError.code).toBe(ERROR_CODES.ENVIRONMENT_ERROR);
        expect(specError.message).toContain('REFERENCE_EXTRACTION_DEPTH must be a number between 1 and 5');
      }
    });

    test('should pass Zod validation for valid referenceExtractionDepth values', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';

      // Test each valid value
      for (let depth = 1; depth <= 5; depth++) {
        process.env['REFERENCE_EXTRACTION_DEPTH'] = depth.toString();

        const { loadConfig } = await import('../config.js');
        const config = loadConfig();

        expect(config.referenceExtractionDepth).toBe(depth);
        expect(typeof config.referenceExtractionDepth).toBe('number');
        expect(Number.isInteger(config.referenceExtractionDepth)).toBe(true);
      }
    });
  });

  describe('complete configuration with referenceExtractionDepth', () => {
    test('should return complete configuration object with all fields including referenceExtractionDepth', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '4';

      const { loadConfig } = await import('../config.js');
      const config = loadConfig();

      // Verify all expected fields are present
      expect(config).toHaveProperty('serverName');
      expect(config).toHaveProperty('serverVersion');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('docsBasePath');
      expect(config).toHaveProperty('maxFileSize');
      expect(config).toHaveProperty('maxFilesPerOperation');
      expect(config).toHaveProperty('rateLimitRequestsPerMinute');
      expect(config).toHaveProperty('rateLimitBurstSize');
      expect(config).toHaveProperty('enableFileSafetyChecks');
      expect(config).toHaveProperty('enableMtimePrecondition');
      expect(config).toHaveProperty('referenceExtractionDepth');

      // Verify specific values
      expect(config.docsBasePath).toBe('/test/docs');
      expect(config.referenceExtractionDepth).toBe(4);

      // Verify types
      expect(typeof config.referenceExtractionDepth).toBe('number');
    });

    test('should maintain backward compatibility when REFERENCE_EXTRACTION_DEPTH is not provided', async () => {
      process.env['DOCS_BASE_PATH'] = '/test/docs';
      // Explicitly ensure REFERENCE_EXTRACTION_DEPTH is not set
      delete process.env['REFERENCE_EXTRACTION_DEPTH'];

      const { loadConfig } = await import('../config.js');
      const config = loadConfig();

      expect(config.referenceExtractionDepth).toBe(DEFAULT_CONFIG.REFERENCE_EXTRACTION_DEPTH);
      expect(config.docsBasePath).toBe('/test/docs');
    });

    test('should work with both required and optional configuration together', async () => {
      process.env['DOCS_BASE_PATH'] = '/custom/docs';
      process.env['LOG_LEVEL'] = 'debug';
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '2';
      process.env['MCP_SERVER_NAME'] = 'custom-server';

      const { loadConfig } = await import('../config.js');
      const config = loadConfig();

      expect(config.docsBasePath).toBe('/custom/docs');
      expect(config.logLevel).toBe('debug');
      expect(config.referenceExtractionDepth).toBe(2);
      expect(config.serverName).toBe('custom-server');
    });

    test('should throw validation error when DOCS_BASE_PATH is missing but REFERENCE_EXTRACTION_DEPTH is valid', async () => {
      // Set only the optional field, not the required one
      process.env['REFERENCE_EXTRACTION_DEPTH'] = '3';
      delete process.env['DOCS_BASE_PATH'];

      const { loadConfig } = await import('../config.js');

      expect(() => loadConfig()).toThrow();
      try {
        loadConfig();
      } catch (error) {
        const specError = error as SpecDocsError;
        expect(specError.code).toBe(ERROR_CODES.ENVIRONMENT_ERROR);
        expect(specError.message).toContain('DOCS_BASE_PATH is required');
      }
    });
  });
});