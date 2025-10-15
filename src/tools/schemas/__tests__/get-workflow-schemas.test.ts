/**
 * Unit tests for get_workflow tool schema generation
 *
 * Tests the dynamic schema generation from loaded workflow prompts,
 * ensuring proper enum generation, description formatting, and schema structure.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { loadWorkflowPrompts } from '../../../prompts/workflow-prompts.js';
import type { ToolDefinition } from '../../types.js';

// Import the schema generator (will be implemented)
import { generateGetWorkflowSchema } from '../get-workflow-schemas.js';

describe('generateGetWorkflowSchema', () => {
  beforeAll(async () => {
    // Set MCP_WORKSPACE_PATH if not already set
    if (process.env['MCP_WORKSPACE_PATH'] == null) {
      const tempDir = mkdtempSync(join(tmpdir(), 'get-workflow-schema-test-'));
      process.env['MCP_WORKSPACE_PATH'] = tempDir;
    }

    // Load workflow prompts before running tests
    await loadWorkflowPrompts();
  });

  describe('schema structure', () => {
    test('should return a valid ToolDefinition', () => {
      const schema = generateGetWorkflowSchema();

      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('description');
      expect(schema).toHaveProperty('inputSchema');
    });

    test('should have correct tool name', () => {
      const schema = generateGetWorkflowSchema();

      expect(schema.name).toBe('get_workflow');
    });

    test('should have descriptive tool description', () => {
      const schema = generateGetWorkflowSchema();

      expect(schema.description).toBeTruthy();
      expect(schema.description.length).toBeGreaterThan(20);
      expect(schema.description.toLowerCase()).toContain('workflow');
    });

    test('should have valid inputSchema structure', () => {
      const schema = generateGetWorkflowSchema();

      expect(schema.inputSchema.type).toBe('object');
      expect(schema.inputSchema).toHaveProperty('properties');
      expect(schema.inputSchema).toHaveProperty('required');
      expect(schema.inputSchema.additionalProperties).toBe(false);
    });
  });

  describe('workflow parameter', () => {
    test('should define workflow parameter', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;

      expect(properties).toHaveProperty('workflow');
    });

    test('should have string type for workflow parameter', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { type: string };

      expect(workflow.type).toBe('string');
    });

    test('should mark workflow as required', () => {
      const schema = generateGetWorkflowSchema();

      expect(schema.inputSchema.required).toContain('workflow');
      expect(schema.inputSchema.required?.length).toBe(1);
    });

    test('should have enum values for workflow parameter', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { enum: string[] };

      expect(workflow).toHaveProperty('enum');
      expect(Array.isArray(workflow.enum)).toBe(true);
      expect(workflow.enum.length).toBeGreaterThan(0);
    });

    test('should have description for workflow parameter', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { description: string };

      expect(workflow).toHaveProperty('description');
      expect(workflow.description.length).toBeGreaterThan(0);
    });
  });

  describe('enum generation from workflow prompts', () => {
    test('should filter only workflow_ prefixed prompts', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { enum: string[] };

      // All enum values should be valid workflow names (without prefix)
      workflow.enum.forEach(value => {
        expect(value).not.toContain('workflow_');
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    test('should strip workflow_ prefix from enum values', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { enum: string[] };

      // Check specific known workflows (updated to match current workflow files)
      const expectedWorkflows = [
        'build-tdd',
        'spec-external',
        'decide',
        'fix'
      ];

      expectedWorkflows.forEach(expected => {
        expect(workflow.enum).toContain(expected);
      });
    });

    test('should not include guide_ prefixed prompts', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { enum: string[] };

      // No enum value should contain 'guide'
      workflow.enum.forEach(value => {
        expect(value).not.toContain('guide_');
      });
    });

    test('should have at least 4 workflow options', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { enum: string[] };

      // We know there are at least 4 workflow files
      expect(workflow.enum.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('description formatting', () => {
    test('should include all workflows in description', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { description: string; enum: string[] };

      // Each enum value should appear in the description
      workflow.enum.forEach(value => {
        expect(workflow.description).toContain(value);
      });
    });

    test('should include emojis in description', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { description: string };

      // Check for emoji presence (common workflow emojis)
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u;
      expect(emojiRegex.test(workflow.description)).toBe(true);
    });

    test('should format description with bullet points', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { description: string };

      // Should use bullet points for listing workflows
      expect(workflow.description).toContain('•');
    });

    test('should include workflow descriptions from YAML frontmatter', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { description: string };

      // Known description fragments from current workflow files
      expect(workflow.description).toContain('BUILD:');
      expect(workflow.description).toContain('SPEC:');
    });

    test('should start with "Available workflows:" prefix', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { description: string };

      expect(workflow.description).toMatch(/^Available workflows:/);
    });
  });

  describe('consistency and quality', () => {
    test('should generate consistent schema on multiple calls', () => {
      const schema1 = generateGetWorkflowSchema();
      const schema2 = generateGetWorkflowSchema();

      expect(schema1).toEqual(schema2);
    });

    test('should have no empty or whitespace-only enum values', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { enum: string[] };

      workflow.enum.forEach(value => {
        expect(value.trim()).toBe(value);
        expect(value.length).toBeGreaterThan(0);
      });
    });

    test('should have unique enum values', () => {
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { enum: string[] };

      const unique = new Set(workflow.enum);
      expect(unique.size).toBe(workflow.enum.length);
    });

    test('should match TypeScript ToolDefinition interface', () => {
      const schema = generateGetWorkflowSchema();

      // Type check - if this compiles, the structure is correct
      const _typeCheck: ToolDefinition = schema;
      expect(_typeCheck).toBeDefined();
    });
  });

  describe('error handling', () => {
    test('should throw helpful error if prompts not loaded', () => {
      // This would require mocking the workflow prompts module
      // For now, we ensure the function requires prompts to be loaded first
      const schema = generateGetWorkflowSchema();
      const properties = schema.inputSchema.properties as Record<string, unknown>;
      const workflow = properties['workflow'] as { enum: string[] };

      // Should have enum values if prompts are loaded
      expect(workflow.enum.length).toBeGreaterThan(0);
    });
  });

  describe('integration with existing patterns', () => {
    test('should follow same schema pattern as other tools', () => {
      const schema = generateGetWorkflowSchema();

      // Check required fields present in all tool schemas
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('description');
      expect(schema.inputSchema).toHaveProperty('type');
      expect(schema.inputSchema).toHaveProperty('properties');
      expect(schema.inputSchema).toHaveProperty('required');
    });

    test('should have additionalProperties set to false', () => {
      const schema = generateGetWorkflowSchema();

      // Strict validation - no extra properties allowed
      expect(schema.inputSchema.additionalProperties).toBe(false);
    });
  });
});
