/**
 * Tests for project configuration types and schema
 */

import { describe, it, expect } from 'vitest';

// Import types and schema
import type { ProjectConfig } from '../types/index.js';
import { ProjectConfigSchema } from '../config.js';

describe('ProjectConfig Types and Schema', () => {
  describe('Valid configurations', () => {
    it('should validate config with all paths', () => {
      const config = {
        env: {
          DOCS_BASE_PATH: '/path/to/docs',
          WORKFLOWS_BASE_PATH: '/path/to/workflows',
          GUIDES_BASE_PATH: '/path/to/guides'
        }
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.env.DOCS_BASE_PATH).toBe('/path/to/docs');
        expect(result.data.env.WORKFLOWS_BASE_PATH).toBe('/path/to/workflows');
        expect(result.data.env.GUIDES_BASE_PATH).toBe('/path/to/guides');
      }
    });

    it('should validate config with partial paths (only DOCS_BASE_PATH)', () => {
      const config = {
        env: {
          DOCS_BASE_PATH: '/path/to/docs'
        }
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.env.DOCS_BASE_PATH).toBe('/path/to/docs');
        expect(result.data.env.WORKFLOWS_BASE_PATH).toBeUndefined();
        expect(result.data.env.GUIDES_BASE_PATH).toBeUndefined();
      }
    });

    it('should validate config with only WORKFLOWS_BASE_PATH', () => {
      const config = {
        env: {
          WORKFLOWS_BASE_PATH: '/path/to/workflows'
        }
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.env.WORKFLOWS_BASE_PATH).toBe('/path/to/workflows');
        expect(result.data.env.DOCS_BASE_PATH).toBeUndefined();
        expect(result.data.env.GUIDES_BASE_PATH).toBeUndefined();
      }
    });

    it('should validate config with only GUIDES_BASE_PATH', () => {
      const config = {
        env: {
          GUIDES_BASE_PATH: '/path/to/guides'
        }
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.env.GUIDES_BASE_PATH).toBe('/path/to/guides');
        expect(result.data.env.DOCS_BASE_PATH).toBeUndefined();
        expect(result.data.env.WORKFLOWS_BASE_PATH).toBeUndefined();
      }
    });

    it('should validate config with empty env object', () => {
      const config = {
        env: {}
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.env).toEqual({});
      }
    });
  });

  describe('Invalid configurations', () => {
    it('should reject config missing env object', () => {
      const config = {};

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.path).toEqual(['env']);
      }
    });

    it('should reject config with null env', () => {
      const config = {
        env: null
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject config with DOCS_BASE_PATH as non-string (number)', () => {
      const config = {
        env: {
          DOCS_BASE_PATH: 123
        }
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        const docsPathError = result.error.issues.find(
          issue => issue.path.includes('DOCS_BASE_PATH')
        );
        expect(docsPathError).toBeDefined();
      }
    });

    it('should reject config with WORKFLOWS_BASE_PATH as non-string (boolean)', () => {
      const config = {
        env: {
          WORKFLOWS_BASE_PATH: true
        }
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        const workflowsPathError = result.error.issues.find(
          issue => issue.path.includes('WORKFLOWS_BASE_PATH')
        );
        expect(workflowsPathError).toBeDefined();
      }
    });

    it('should reject config with GUIDES_BASE_PATH as non-string (array)', () => {
      const config = {
        env: {
          GUIDES_BASE_PATH: ['/path/to/guides']
        }
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        const guidesPathError = result.error.issues.find(
          issue => issue.path.includes('GUIDES_BASE_PATH')
        );
        expect(guidesPathError).toBeDefined();
      }
    });

    it('should reject config with DOCS_BASE_PATH as empty string', () => {
      const config = {
        env: {
          DOCS_BASE_PATH: ''
        }
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        const docsPathError = result.error.issues.find(
          issue => issue.path.includes('DOCS_BASE_PATH')
        );
        expect(docsPathError).toBeDefined();
      }
    });

    it('should reject config with env as array', () => {
      const config = {
        env: []
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject config with env as string', () => {
      const config = {
        env: 'not an object'
      };

      const result = ProjectConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('Type checking', () => {
    it('should type-check valid ProjectConfig', () => {
      const config: ProjectConfig = {
        env: {
          DOCS_BASE_PATH: '/path/to/docs',
          WORKFLOWS_BASE_PATH: '/path/to/workflows',
          GUIDES_BASE_PATH: '/path/to/guides'
        }
      };

      expect(config.env.DOCS_BASE_PATH).toBe('/path/to/docs');
    });

    it('should type-check ProjectConfig with optional fields', () => {
      const config: ProjectConfig = {
        env: {
          DOCS_BASE_PATH: '/path/to/docs'
        }
      };

      expect(config.env.DOCS_BASE_PATH).toBe('/path/to/docs');
      expect(config.env.WORKFLOWS_BASE_PATH).toBeUndefined();
    });

    it('should type-check ProjectConfig with empty env', () => {
      const config: ProjectConfig = {
        env: {}
      };

      expect(config.env).toEqual({});
    });
  });
});
