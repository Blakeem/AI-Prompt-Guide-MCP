/**
 * TDD-first tests for hierarchical addressing system enhancements
 * Phase 3: These tests verify parseSectionAddress and parseTaskAddress support hierarchical slugs
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
  parseSectionAddress,
  parseTaskAddress,
  InvalidAddressError,
  ToolIntegration
} from '../addressing-system.js';
import { normalizeSlugPath } from '../slug-utils.js';
import { initializeGlobalCache, getGlobalCache } from '../../document-cache.js';

// Test data setup - documents root for testing
const docsRoot = '/tmp/claude/test-docs-addressing';

beforeAll(async () => {
  // Initialize the global cache for addressing system tests
  initializeGlobalCache(docsRoot);
});

afterAll(() => {
  // Clean up after tests
  const cache = getGlobalCache();
  cache.clear();
});

describe('Addressing System - Hierarchical Support', () => {
  describe('normalizeHierarchicalSlug helper', () => {
    test('should normalize hierarchical path components', () => {
      // Test hierarchical path normalization using slug-utils
      const result = normalizeSlugPath('api//authentication///jwt-tokens');
      expect(result).toBe('api/authentication/jwt-tokens');
    });

    test('should handle # prefix removal for hierarchical paths', () => {
      // Test that # prefix is properly removed before normalization
      const input = '#api/authentication/jwt-tokens';
      const withoutHash = input.startsWith('#') ? input.substring(1) : input;
      const result = normalizeSlugPath(withoutHash);
      expect(result).toBe('api/authentication/jwt-tokens');
    });

    test('should handle flat slugs without modification', () => {
      // Test that simple flat slugs are not broken by hierarchical processing
      const result = normalizeSlugPath('authentication');
      expect(result).toBe('authentication');
    });

    test('should handle edge cases gracefully', () => {
      // Test various edge cases
      expect(normalizeSlugPath('')).toBe('');
      expect(normalizeSlugPath('///')).toBe('');
      expect(normalizeSlugPath('api/')).toBe('api');
      expect(normalizeSlugPath('/api')).toBe('api');
    });
  });

  describe('parseSectionAddress with hierarchical paths', () => {
    test('should parse simple hierarchical paths with context document', async () => {
      // Test: 'api/authentication' with context document
      const result = parseSectionAddress('api/authentication', '/docs/api.md');

      expect(result.document.path).toBe('/docs/api.md');
      expect(result.slug).toBe('api/authentication');
      expect(result.fullPath).toBe('/docs/api.md#api/authentication');
      expect(result.cacheKey).toBe('api/authentication|/docs/api.md');
    });

    test('should parse hierarchical paths with # prefix', async () => {
      // Test: '#api/authentication/jwt-tokens' with context document
      const result = parseSectionAddress('#api/authentication/jwt-tokens', '/docs/api.md');

      expect(result.document.path).toBe('/docs/api.md');
      expect(result.slug).toBe('api/authentication/jwt-tokens');
      expect(result.fullPath).toBe('/docs/api.md#api/authentication/jwt-tokens');
      expect(result.cacheKey).toBe('#api/authentication/jwt-tokens|/docs/api.md');
    });

    test('should parse full document+hierarchical paths', async () => {
      // Test: '/docs/api.md#api/authentication/tokens' format
      const result = parseSectionAddress('/docs/api.md#api/authentication/tokens');

      expect(result.document.path).toBe('/docs/api.md');
      expect(result.slug).toBe('api/authentication/tokens');
      expect(result.fullPath).toBe('/docs/api.md#api/authentication/tokens');
      expect(result.cacheKey).toBe('/docs/api.md#api/authentication/tokens|');
    });

    test('should normalize hierarchical path components', async () => {
      // Test normalization of paths with extra slashes and case issues
      const result = parseSectionAddress('#api//authentication///jwt-tokens', '/docs/api.md');

      expect(result.slug).toBe('api/authentication/jwt-tokens');
      expect(result.fullPath).toBe('/docs/api.md#api/authentication/jwt-tokens');
    });

    test('should handle deeply nested hierarchical paths', async () => {
      // Test deep hierarchical nesting
      const deepPath = 'specs/api/forms/authentication/login/validation';
      const result = parseSectionAddress(deepPath, '/docs/specs.md');

      expect(result.slug).toBe(deepPath);
      expect(result.fullPath).toBe(`/docs/specs.md#${deepPath}`);
    });

    test('should maintain backward compatibility with flat slugs', async () => {
      // Test that existing flat addressing still works perfectly
      const result = parseSectionAddress('authentication', '/docs/api.md');

      expect(result.slug).toBe('authentication');
      expect(result.fullPath).toBe('/docs/api.md#authentication');
      expect(result.cacheKey).toBe('authentication|/docs/api.md');
    });

    test('should handle mixed flat and hierarchical in same operation', async () => {
      // Test that both patterns can coexist
      const flatResult = parseSectionAddress('overview', '/docs/api.md');
      const hierarchicalResult = parseSectionAddress('api/authentication/overview', '/docs/api.md');

      expect(flatResult.slug).toBe('overview');
      expect(hierarchicalResult.slug).toBe('api/authentication/overview');
      expect(flatResult.document.path).toBe(hierarchicalResult.document.path);
    });

    test('should handle edge cases for hierarchical paths', async () => {
      // Test various edge cases that could break hierarchical parsing

      // Empty hierarchical segment
      await expect(async () => parseSectionAddress('#/', '/docs/api.md')).rejects.toThrow(InvalidAddressError);

      // Multiple # characters
      const multiHashResult = parseSectionAddress('/docs/api.md#section#with#hash', undefined);
      expect(multiHashResult.slug).toBe('section#with#hash');

      // Very long hierarchical path
      const longPath = 'a/b/c/d/e/f/g/h/i/j';
      const longResult = parseSectionAddress(longPath, '/docs/test.md');
      expect(longResult.slug).toBe(longPath);
    });

    test('should throw appropriate errors for invalid hierarchical paths', async () => {
      // Test error handling for invalid cases
      await expect(async () => parseSectionAddress('#', '/docs/api.md')).rejects.toThrow(InvalidAddressError);
      await expect(async () => parseSectionAddress('api/auth', undefined)).rejects.toThrow(InvalidAddressError);
      await expect(async () => parseSectionAddress('#api/auth')).rejects.toThrow(InvalidAddressError);
    });
  });

  describe('parseTaskAddress with hierarchical paths', () => {
    test('should parse hierarchical task addresses', async () => {
      // Test that parseTaskAddress works with hierarchical paths
      const result = parseTaskAddress('setup/backend/database-migration', '/docs/tasks.md');

      expect(result.document.path).toBe('/docs/tasks.md');
      expect(result.slug).toBe('setup/backend/database-migration');
      expect(result.fullPath).toBe('/docs/tasks.md#setup/backend/database-migration');
      expect(result.isTask).toBe(true);
      expect(result.cacheKey).toBe('task:setup/backend/database-migration|/docs/tasks.md');
    });

    test('should handle hierarchical task addresses with # prefix', async () => {
      // Test hierarchical task parsing with # prefix
      const result = parseTaskAddress('#project/frontend/setup-authentication', '/docs/project.md');

      expect(result.slug).toBe('project/frontend/setup-authentication');
      expect(result.isTask).toBe(true);
      expect(result.fullPath).toBe('/docs/project.md#project/frontend/setup-authentication');
    });
  });

  describe('SectionAddress with hierarchical slugs', () => {
    test('should create proper cache keys for hierarchical addresses', async () => {
      // Test that cache keys are properly formed for hierarchical addresses
      const result = parseSectionAddress('api/auth/tokens', '/docs/api.md');

      expect(result.cacheKey).toBe('api/auth/tokens|/docs/api.md');
      expect(typeof result.cacheKey).toBe('string');
      expect(result.cacheKey.length).toBeGreaterThan(0);
    });

    test('should create correct fullPath with hierarchical slugs', async () => {
      // Test fullPath formatting for hierarchical addresses
      const testCases = [
        {
          input: 'api/authentication',
          context: '/docs/api.md',
          expected: '/docs/api.md#api/authentication'
        },
        {
          input: '#specs/api/forms',
          context: '/docs/specs.md',
          expected: '/docs/specs.md#specs/api/forms'
        },
        {
          input: '/docs/backend.md#database/migrations/setup',
          context: undefined,
          expected: '/docs/backend.md#database/migrations/setup'
        }
      ];

      for (const testCase of testCases) {
        const result = parseSectionAddress(testCase.input, testCase.context);
        expect(result.fullPath).toBe(testCase.expected);
      }
    });
  });

  describe('ToolIntegration.validateAndParse with hierarchical support', () => {
    test('should handle hierarchical section parsing in tool integration', async () => {
      // Test that ToolIntegration can handle hierarchical addresses
      const result = ToolIntegration.validateAndParse({
        document: '/docs/api.md',
        section: 'api/authentication/jwt-tokens'
      });

      expect(result.addresses.document.path).toBe('/docs/api.md');
      expect(result.addresses.section?.slug).toBe('api/authentication/jwt-tokens');
      expect(result.addresses.section?.fullPath).toBe('/docs/api.md#api/authentication/jwt-tokens');
    });

    test('should maintain backward compatibility in tool integration', async () => {
      // Test that flat addressing still works through ToolIntegration
      const result = ToolIntegration.validateAndParse({
        document: '/docs/api.md',
        section: 'authentication'
      });

      expect(result.addresses.section?.slug).toBe('authentication');
      expect(result.addresses.section?.fullPath).toBe('/docs/api.md#authentication');
    });

    test('should handle mixed addressing patterns in tool integration', async () => {
      // Test that tools can work with both patterns simultaneously
      const flatResult = ToolIntegration.validateAndParse({
        document: '/docs/api.md',
        section: 'overview'
      });

      const hierarchicalResult = ToolIntegration.validateAndParse({
        document: '/docs/api.md',
        section: 'api/endpoints/users'
      });

      expect(flatResult.addresses.section?.slug).toBe('overview');
      expect(hierarchicalResult.addresses.section?.slug).toBe('api/endpoints/users');
    });
  });
});