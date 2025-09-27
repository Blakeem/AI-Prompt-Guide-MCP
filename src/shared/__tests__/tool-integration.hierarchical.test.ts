/**
 * @file tool-integration.hierarchical.test.ts
 * @description TDD tests for Phase 5 - ToolIntegration hierarchical response formatting
 * Tests are written FIRST (should FAIL initially) before implementation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ToolIntegration, AddressingError, SectionNotFoundError } from '../addressing-system.js';
import { initializeGlobalCache } from '../../document-cache.js';
import path from 'path';
import os from 'os';

describe('ToolIntegration - Hierarchical Response Formatting', () => {
  let testDocsRoot: string;

  beforeAll(async () => {
    // Create a temporary test directory
    testDocsRoot = path.join(os.tmpdir(), `test-hierarchical-${Date.now()}`);
    initializeGlobalCache(testDocsRoot);
  });

  describe('formatHierarchicalContext', () => {
    it('should format hierarchical context for multi-level paths', async () => {
      // Create mock section address for hierarchical path
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/api/authentication.md',
        section: 'api/authentication/jwt-tokens'
      });

      const sectionAddress = addresses.section;
      if (sectionAddress == null) {
        throw new Error('Section address is required');
      }
      const hierarchicalContext = ToolIntegration.formatHierarchicalContext(sectionAddress);

      expect(hierarchicalContext).toEqual({
        full_path: 'api/authentication/jwt-tokens',
        parent_path: 'api/authentication',
        section_name: 'jwt-tokens',
        depth: 3
      });
    });

    it('should format hierarchical context for two-level paths', async () => {
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/docs/guide.md',
        section: 'frontend/components'
      });

      const sectionAddress = addresses.section;
      if (sectionAddress == null) {
        throw new Error('Section address is required');
      }
      const hierarchicalContext = ToolIntegration.formatHierarchicalContext(sectionAddress);

      expect(hierarchicalContext).toEqual({
        full_path: 'frontend/components',
        parent_path: 'frontend',
        section_name: 'components',
        depth: 2
      });
    });

    it('should return null for flat sections', async () => {
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/docs/guide.md',
        section: 'authentication'
      });

      const sectionAddress = addresses.section;
      if (sectionAddress == null) {
        throw new Error('Section address is required');
      }
      const hierarchicalContext = ToolIntegration.formatHierarchicalContext(sectionAddress);

      expect(hierarchicalContext).toBeNull();
    });

    it('should handle edge cases with single slash', async () => {
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/docs/guide.md',
        section: 'api/overview'
      });

      const sectionAddress = addresses.section;
      if (sectionAddress == null) {
        throw new Error('Section address is required');
      }
      const hierarchicalContext = ToolIntegration.formatHierarchicalContext(sectionAddress);

      expect(hierarchicalContext).toEqual({
        full_path: 'api/overview',
        parent_path: 'api',
        section_name: 'overview',
        depth: 2
      });
    });

    it('should handle complex nested paths', async () => {
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/complex/nested.md',
        section: 'level1/level2/level3/level4'
      });

      const sectionAddress = addresses.section;
      if (sectionAddress == null) {
        throw new Error('Section address is required');
      }
      const hierarchicalContext = ToolIntegration.formatHierarchicalContext(sectionAddress);

      expect(hierarchicalContext).toEqual({
        full_path: 'level1/level2/level3/level4',
        parent_path: 'level1/level2/level3',
        section_name: 'level4',
        depth: 4
      });
    });
  });

  describe('formatSectionPath with hierarchical indicator', () => {
    it('should add hierarchical indicator for hierarchical paths', async () => {
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/docs/api.md',
        section: 'api/auth/tokens'
      });

      const sectionAddress = addresses.section;
      if (sectionAddress == null) {
        throw new Error('Section address is required');
      }
      const formattedPath = ToolIntegration.formatSectionPath(sectionAddress);

      expect(formattedPath).toBe('/docs/api.md#api/auth/tokens (hierarchical)');
    });

    it('should not add indicator for flat paths', async () => {
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/docs/api.md',
        section: 'tokens'
      });

      const sectionAddress = addresses.section;
      if (sectionAddress == null) {
        throw new Error('Section address is required');
      }
      const formattedPath = ToolIntegration.formatSectionPath(sectionAddress);

      expect(formattedPath).toBe('/docs/api.md#tokens');
    });

    it('should handle complex hierarchical paths', async () => {
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/complex/document.md',
        section: 'level1/level2/level3/final'
      });

      const sectionAddress = addresses.section;
      if (sectionAddress == null) {
        throw new Error('Section address is required');
      }
      const formattedPath = ToolIntegration.formatSectionPath(sectionAddress);

      expect(formattedPath).toBe('/complex/document.md#level1/level2/level3/final (hierarchical)');
    });
  });

  describe('formatHierarchicalError - enhanced error messages', () => {
    it('should include hierarchical context in section not found errors', () => {
      const error = new SectionNotFoundError('api/auth/missing-section', '/docs/api.md');

      const formattedError = ToolIntegration.formatHierarchicalError(error);

      expect(formattedError.error).toBe('Section not found: api/auth/missing-section in /docs/api.md');
      expect(formattedError.context).toEqual({
        slug: 'api/auth/missing-section',
        documentPath: '/docs/api.md'
      });
      expect(formattedError.suggestion).toContain('Try checking parent section: api/auth');
    });

    it('should suggest parent path on hierarchical errors', () => {
      const error = new SectionNotFoundError('frontend/components/forms/validation', '/docs/guide.md');

      const formattedError = ToolIntegration.formatHierarchicalError(error);

      expect(formattedError.suggestion).toContain('Try checking parent section: frontend/components/forms');
    });

    it('should not suggest parent path for flat sections', () => {
      const error = new SectionNotFoundError('missing-section', '/docs/guide.md');

      const formattedError = ToolIntegration.formatHierarchicalError(error);

      expect(formattedError.suggestion).toBeUndefined();
    });

    it('should handle custom suggestions', () => {
      const error = new SectionNotFoundError('api/v2/endpoints', '/docs/api.md');

      const customSuggestion = 'Try using api/v1/endpoints instead';
      const formattedError = ToolIntegration.formatHierarchicalError(error, customSuggestion);

      expect(formattedError.suggestion).toBe(customSuggestion);
    });

    it('should handle non-SectionNotFoundError types', () => {
      const error = new AddressingError(
        'Invalid document path',
        'INVALID_PATH',
        { path: '/invalid/path.md' }
      );

      const formattedError = ToolIntegration.formatHierarchicalError(error);

      expect(formattedError.error).toBe('Invalid document path');
      expect(formattedError.context).toEqual({ path: '/invalid/path.md' });
      expect(formattedError.suggestion).toBeUndefined();
    });
  });

  describe('backward compatibility with existing methods', () => {
    it('should maintain existing formatDocumentInfo functionality', async () => {
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/api/authentication.md'
      });

      const documentInfo = ToolIntegration.formatDocumentInfo(addresses.document, {
        title: 'Authentication Guide'
      });

      expect(documentInfo).toEqual({
        slug: 'authentication',
        title: 'Authentication Guide',
        namespace: 'api'
      });
    });

    it('should maintain existing formatTaskPath functionality', async () => {
      const { addresses } = ToolIntegration.validateAndParse({
        document: '/project/setup.md',
        task: 'initialize-project'
      });

      const taskAddress = addresses.task;
      if (taskAddress == null) {
        throw new Error('Task address is required');
      }
      const taskPath = ToolIntegration.formatTaskPath(taskAddress);

      expect(taskPath).toBe('/project/setup.md#initialize-project (task)');
    });
  });
});