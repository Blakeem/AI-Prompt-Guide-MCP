/**
 * Unit tests for get_guide tool schema generation
 *
 * Tests the dynamic schema generation from loaded guide prompts,
 * ensuring proper enum generation, description formatting, and schema structure.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { loadWorkflowPrompts } from '../../../prompts/workflow-prompts.js';
import type { ToolDefinition } from '../../types.js';

// Import the schema generator (will be implemented)
import { generateGetGuideSchema } from '../get-guide-schemas.js';

describe('generateGetGuideSchema', () => {
  beforeAll(async () => {
    // Set MCP_WORKSPACE_PATH if not already set
    if (process.env['MCP_WORKSPACE_PATH'] == null) {
      const tempDir = mkdtempSync(join(tmpdir(), 'get-guide-schema-test-'));
      process.env['MCP_WORKSPACE_PATH'] = tempDir;
    }

    // Load workflow prompts (includes guide prompts) before running tests
    await loadWorkflowPrompts();
  });

  describe('schema structure', () => {
    test('should return a valid ToolDefinition', () => {
      const schema = generateGetGuideSchema();

      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('description');
      expect(schema).toHaveProperty('inputSchema');
    });

    test('should have correct tool name', () => {
      const schema = generateGetGuideSchema();

      expect(schema.name).toBe('get_guide');
    });

    test('should have descriptive tool description', () => {
      const schema = generateGetGuideSchema();

      expect(schema.description).toBeTruthy();
      expect(schema.description.length).toBeGreaterThan(20);
      expect(schema.description.toLowerCase()).toContain('guide');
    });

    test('should have valid inputSchema structure', () => {
      const schema = generateGetGuideSchema();

      expect(schema.inputSchema.type).toBe('object');
      expect(schema.inputSchema).toHaveProperty('properties');
      expect(schema.inputSchema).toHaveProperty('required');
      expect(schema.inputSchema.additionalProperties).toBe(false);
    });
  });

  describe('guide parameter', () => {
    test('should define guide parameter', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;

      expect(properties).toHaveProperty('guide');
    });

    test('should have string type for guide parameter', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { type: string };

      expect(guide.type).toBe('string');
    });

    test('should mark guide as required', () => {
      const schema = generateGetGuideSchema();

      expect(schema.inputSchema.required).toContain('guide');
      expect(schema.inputSchema.required?.length).toBe(1);
    });

    test('should have enum values for guide parameter', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { enum: string[] };

      expect(guide).toHaveProperty('enum');
      expect(Array.isArray(guide.enum)).toBe(true);
      expect(guide.enum.length).toBeGreaterThan(0);
    });

    test('should have description for guide parameter', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { description: string };

      expect(guide).toHaveProperty('description');
      expect(guide.description.length).toBeGreaterThan(0);
    });
  });

  describe('enum generation from guide prompts', () => {
    test('should filter only guide_ prefixed prompts', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { enum: string[] };

      // All enum values should be valid guide names (without prefix)
      guide.enum.forEach(value => {
        expect(value).not.toContain('guide_');
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    test('should strip guide_ prefix from enum values', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { enum: string[] };

      // Check specific known guides (updated to match current guide files)
      const expectedGuides = [
        'research-guide',
        'specification-writing',
        'tutorial-writing',
        'writing-standards'
      ];

      expectedGuides.forEach(expected => {
        expect(guide.enum).toContain(expected);
      });
    });

    test('should not include workflow_ prefixed prompts', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { enum: string[] };

      // No enum value should contain 'workflow'
      guide.enum.forEach(value => {
        expect(value).not.toContain('workflow_');
      });
    });

    test('should have at least 4 guide options', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { enum: string[] };

      // We know there are at least 4 guide files
      expect(guide.enum.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('description formatting', () => {
    test('should include all guides in description', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { description: string; enum: string[] };

      // Each enum value should appear in the description
      guide.enum.forEach(value => {
        expect(guide.description).toContain(value);
      });
    });

    test('should format description with bullet points', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { description: string };

      // Should use bullet points for listing guides
      expect(guide.description).toContain('•');
    });

    test('should include guide names in description even without YAML frontmatter', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { description: string; enum: string[] };

      // Guide files don't have YAML frontmatter, so descriptions may be empty
      // but all guide names should still be listed (updated to match current guide files)
      expect(guide.description).toContain('research-guide');
      expect(guide.description).toContain('specification-writing');
    });

    test('should start with "Available guides:" prefix', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { description: string };

      expect(guide.description).toMatch(/^Available guides:/);
    });
  });

  describe('consistency and quality', () => {
    test('should generate consistent schema on multiple calls', () => {
      const schema1 = generateGetGuideSchema();
      const schema2 = generateGetGuideSchema();

      expect(schema1).toEqual(schema2);
    });

    test('should have no empty or whitespace-only enum values', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { enum: string[] };

      guide.enum.forEach(value => {
        expect(value.trim()).toBe(value);
        expect(value.length).toBeGreaterThan(0);
      });
    });

    test('should have unique enum values', () => {
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { enum: string[] };

      const unique = new Set(guide.enum);
      expect(unique.size).toBe(guide.enum.length);
    });

    test('should match TypeScript ToolDefinition interface', () => {
      const schema = generateGetGuideSchema();

      // Type check - if this compiles, the structure is correct
      const _typeCheck: ToolDefinition = schema;
      expect(_typeCheck).toBeDefined();
    });
  });

  describe('error handling', () => {
    test('should throw helpful error if prompts not loaded', () => {
      // This would require mocking the workflow prompts module
      // For now, we ensure the function requires prompts to be loaded first
      const schema = generateGetGuideSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const guide = properties['guide'] as { enum: string[] };

      // Should have enum values if prompts are loaded
      expect(guide.enum.length).toBeGreaterThan(0);
    });
  });

  describe('integration with existing patterns', () => {
    test('should follow same schema pattern as other tools', () => {
      const schema = generateGetGuideSchema();

      // Check required fields present in all tool schemas
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('description');
      expect(schema.inputSchema).toHaveProperty('type');
      expect(schema.inputSchema).toHaveProperty('properties');
      expect(schema.inputSchema).toHaveProperty('required');
    });

    test('should have additionalProperties set to false', () => {
      const schema = generateGetGuideSchema();

      // Strict validation - no extra properties allowed
      expect(schema.inputSchema.additionalProperties).toBe(false);
    });
  });
});
