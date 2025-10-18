/**
 * Unit tests for get_workflow tool
 *
 * Tests the get_workflow tool which retrieves workflow prompts by name
 * with formatted metadata and content.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { executeGetWorkflow } from '../get-workflow.js';
import { loadWorkflowPrompts, getWorkflowPrompt } from '../../../prompts/workflow-prompts.js';

// Mock the workflow-prompts module
vi.mock('../../../prompts/workflow-prompts.js', () => {
  const mockPrompts = [
    {
      name: 'workflow_tdd-incremental-orchestration',
      description: '🎯 COORDINATION: Orchestrate multi-agent development with TDD',
      content: '# TDD Incremental Orchestration\n\nThis is test content for TDD workflow.',
      whenToUse: [
        'Managing complex features requiring multiple developers',
        'When quality gates must be enforced',
        'Coordinating test-driven development workflows'
      ]
    },
    {
      name: 'workflow_spec-first-integration',
      description: '📋 INTEGRATION: Ensure correctness before coding',
      content: '# Spec-First Integration\n\nValidate against specifications first.',
      whenToUse: [
        'Adding new API integrations',
        'When external dependencies are involved',
        'Before implementing third-party features'
      ]
    },
    {
      name: 'workflow_multi-option-tradeoff',
      description: '⚖️ DECISION: Multi-criteria analysis for complex choices',
      content: '# Multi-Option Tradeoff Analysis\n\nStructured decision making.',
      whenToUse: [
        'Multiple solution approaches available',
        'Need to compare options objectively',
        'Complex architectural decisions'
      ]
    },
    {
      name: 'guide_documentation-standards',
      description: 'Documentation writing standards and best practices',
      content: '# Documentation Standards\n\nGuide content here.',
      whenToUse: [
        'Writing new documentation',
        'Reviewing documentation quality',
        'Establishing documentation patterns'
      ]
    }
  ];

  return {
    loadWorkflowPrompts: vi.fn().mockResolvedValue(mockPrompts),
    getWorkflowPrompt: vi.fn((name: string) => {
      return mockPrompts.find(p => p.name === name);
    }),
    getWorkflowPrompts: vi.fn(() => mockPrompts)
  };
});

describe('get_workflow tool', () => {
  beforeAll(async () => {
    // Ensure prompts are loaded
    await loadWorkflowPrompts();
  });

  describe('Parameter Validation', () => {
    it('should throw error when workflow parameter missing', async () => {
      await expect(executeGetWorkflow({}))
        .rejects.toThrow('workflow parameter is required');
    });

    it('should throw error when workflow parameter is empty string', async () => {
      await expect(executeGetWorkflow({ workflow: '' }))
        .rejects.toThrow('workflow parameter is required');
    });

    it('should throw error when workflow parameter is null', async () => {
      await expect(executeGetWorkflow({ workflow: null }))
        .rejects.toThrow('workflow parameter is required');
    });

    it('should throw error when workflow parameter is only whitespace', async () => {
      await expect(executeGetWorkflow({ workflow: '   ' }))
        .rejects.toThrow('workflow parameter is required');
    });

    it('should throw error when workflow parameter is not a string', async () => {
      await expect(executeGetWorkflow({ workflow: 123 }))
        .rejects.toThrow('workflow parameter must be a string');
    });

    it('should throw error when workflow parameter is an array', async () => {
      await expect(executeGetWorkflow({ workflow: ['test'] }))
        .rejects.toThrow('workflow parameter must be a string');
    });

    it('should throw error when workflow parameter is an object', async () => {
      await expect(executeGetWorkflow({ workflow: { name: 'test' } }))
        .rejects.toThrow('workflow parameter must be a string');
    });
  });

  describe('Workflow Lookup', () => {
    it('should find workflow by name without prefix', async () => {
      const result = await executeGetWorkflow({ workflow: 'tdd-incremental-orchestration' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'tdd-incremental-orchestration');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('content');
    });

    it('should handle workflow name with workflow_ prefix gracefully', async () => {
      const result = await executeGetWorkflow({ workflow: 'workflow_tdd-incremental-orchestration' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'tdd-incremental-orchestration');
    });

    it('should return error when workflow not found', async () => {
      const result = await executeGetWorkflow({ workflow: 'nonexistent-workflow' }) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('available');
      expect(result['error']).toContain('nonexistent-workflow');
      expect(result['error']).toContain('not found');
    });

    it('should return error with available workflows list when not found', async () => {
      const result = await executeGetWorkflow({ workflow: 'invalid-name' }) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('available');
      expect(Array.isArray(result['available'])).toBe(true);
      expect((result['available'] as string[]).length).toBeGreaterThan(0);
    });

    it('should strip workflow_ prefix from available workflows list', async () => {
      const result = await executeGetWorkflow({ workflow: 'invalid-name' }) as Record<string, unknown>;

      expect(result).toHaveProperty('available');
      const available = result['available'] as string[];

      // Should include workflows without prefix
      expect(available).toContain('tdd-incremental-orchestration');
      expect(available).toContain('spec-first-integration');
      expect(available).toContain('multi-option-tradeoff');

      // Should NOT include workflow_ prefix
      expect(available).not.toContain('workflow_tdd-incremental-orchestration');
    });

    it('should include guides in available list with guide_ prefix stripped', async () => {
      const result = await executeGetWorkflow({ workflow: 'invalid-name' }) as Record<string, unknown>;

      expect(result).toHaveProperty('available');
      const available = result['available'] as string[];

      // Should include guides without prefix
      expect(available).toContain('documentation-standards');

      // Should NOT include guide_ prefix
      expect(available).not.toContain('guide_documentation-standards');
    });

    it('should handle case-sensitive workflow names correctly', async () => {
      const result = await executeGetWorkflow({ workflow: 'TDD-Incremental-Orchestration' }) as Record<string, unknown>;

      // Should not find it (case-sensitive)
      expect(result).toHaveProperty('error');
    });
  });

  describe('Response Structure', () => {
    it('should return properly formatted response for valid workflow', async () => {
      const result = await executeGetWorkflow({ workflow: 'tdd-incremental-orchestration' }) as Record<string, unknown>;

      // Verify response structure
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('content');

      // Verify types
      expect(typeof result['name']).toBe('string');
      expect(typeof result['description']).toBe('string');
      expect(typeof result['content']).toBe('string');
    });

    it('should strip workflow_ prefix from returned name', async () => {
      const result = await executeGetWorkflow({ workflow: 'spec-first-integration' }) as Record<string, unknown>;

      expect(result['name']).toBe('spec-first-integration');
      expect((result['name'] as string)).not.toContain('workflow_');
    });

    it('should preserve original description content', async () => {
      const result = await executeGetWorkflow({ workflow: 'tdd-incremental-orchestration' }) as Record<string, unknown>;

      expect(result['description']).toBe('🎯 COORDINATION: Orchestrate multi-agent development with TDD');
    });

    it('should preserve original markdown content', async () => {
      const result = await executeGetWorkflow({ workflow: 'tdd-incremental-orchestration' }) as Record<string, unknown>;

      expect(result['content']).toContain('# TDD Incremental Orchestration');
      expect(result['content']).toContain('This is test content for TDD workflow.');
    });

    it('should not include tags field', async () => {
      const result = await executeGetWorkflow({ workflow: 'tdd-incremental-orchestration' }) as Record<string, unknown>;

      expect(result).not.toHaveProperty('tags');
    });

    it('should not include when_to_use field (visible in schema instead)', async () => {
      const result = await executeGetWorkflow({ workflow: 'tdd-incremental-orchestration' }) as Record<string, unknown>;

      expect(result).not.toHaveProperty('when_to_use');
    });
  });

  describe('Guide Access', () => {
    it('should access guides with guide_ prefix stripped', async () => {
      const result = await executeGetWorkflow({ workflow: 'documentation-standards' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'documentation-standards');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('content');
    });

    it('should handle guide_ prefix in input gracefully', async () => {
      const result = await executeGetWorkflow({ workflow: 'guide_documentation-standards' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'documentation-standards');
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow names with special characters', async () => {
      const result = await executeGetWorkflow({ workflow: 'multi-option-tradeoff' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'multi-option-tradeoff');
    });

    it('should handle workflow names with underscores correctly', async () => {
      // Since we strip workflow_ prefix, names with underscores should work
      const result = await executeGetWorkflow({ workflow: 'spec-first-integration' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'spec-first-integration');
    });

    it('should return error for empty available list if no prompts loaded', async () => {
      // Mock getWorkflowPrompt to return undefined
      const mockGetWorkflowPrompt = vi.mocked(getWorkflowPrompt);
      mockGetWorkflowPrompt.mockReturnValueOnce(undefined);

      const result = await executeGetWorkflow({ workflow: 'any-name' }) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('available');
    });
  });

  describe('Prefix Handling', () => {
    it('should add workflow_ prefix when looking up workflows', async () => {
      await executeGetWorkflow({ workflow: 'tdd-incremental-orchestration' });

      // Verify getWorkflowPrompt was called with workflow_ prefix
      expect(getWorkflowPrompt).toHaveBeenCalledWith('workflow_tdd-incremental-orchestration');
    });

    it('should add guide_ prefix when looking up guides', async () => {
      await executeGetWorkflow({ workflow: 'documentation-standards' });

      // Should first try workflow_ prefix, then guide_ prefix
      expect(getWorkflowPrompt).toHaveBeenCalledWith('workflow_documentation-standards');
    });

    it('should try both workflow_ and guide_ prefixes', async () => {
      await executeGetWorkflow({ workflow: 'documentation-standards' });

      // Should be called at least twice (workflow_ and guide_ attempts)
      expect(getWorkflowPrompt).toHaveBeenCalled();
    });
  });
});
