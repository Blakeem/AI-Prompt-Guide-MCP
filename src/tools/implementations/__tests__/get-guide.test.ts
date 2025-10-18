/**
 * Unit tests for get_guide tool
 *
 * Tests the get_guide tool which retrieves guide prompts by name
 * with formatted metadata and content.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { executeGetGuide } from '../get-guide.js';
import { loadWorkflowPrompts, getWorkflowPrompt } from '../../../prompts/workflow-prompts.js';

// Mock the workflow-prompts module
vi.mock('../../../prompts/workflow-prompts.js', () => {
  const mockPrompts = [
    {
      name: 'guide_activate-guide-documentation',
      description: 'How to create actionable guides and tutorials',
      content: '# Activate Guide Documentation\n\nThis is test content for guide documentation.',
      tags: ['documentation', 'guides', 'tutorials'],
      whenToUse: [
        'Creating new guides',
        'Writing tutorial content',
        'Documenting step-by-step processes'
      ]
    },
    {
      name: 'guide_activate-specification-documentation',
      description: 'How to write technical specifications',
      content: '# Activate Specification Documentation\n\nTest content for specifications.',
      tags: ['documentation', 'specifications', 'technical'],
      whenToUse: [
        'Writing API specifications',
        'Documenting technical requirements',
        'Creating system specifications'
      ]
    },
    {
      name: 'guide_documentation-standards',
      description: 'Documentation writing standards and best practices',
      content: '# Documentation Standards\n\nBest practices for documentation.',
      tags: ['documentation', 'standards', 'writing'],
      whenToUse: [
        'Writing new documentation',
        'Reviewing documentation quality',
        'Establishing documentation patterns'
      ]
    },
    {
      name: 'workflow_tdd-incremental-orchestration',
      description: '🎯 COORDINATION: Orchestrate multi-agent development with TDD',
      content: '# TDD Incremental Orchestration\n\nThis is test content for TDD workflow.',
      tags: ['coordination', 'tdd', 'development'],
      whenToUse: [
        'Managing complex features requiring multiple developers',
        'When quality gates must be enforced',
        'Coordinating test-driven development workflows'
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

describe('get_guide tool', () => {
  beforeAll(async () => {
    // Ensure prompts are loaded
    await loadWorkflowPrompts();
  });

  describe('Parameter Validation', () => {
    it('should throw error when guide parameter missing', async () => {
      await expect(executeGetGuide({}))
        .rejects.toThrow('guide parameter is required');
    });

    it('should throw error when guide parameter is empty string', async () => {
      await expect(executeGetGuide({ guide: '' }))
        .rejects.toThrow('guide parameter is required');
    });

    it('should throw error when guide parameter is null', async () => {
      await expect(executeGetGuide({ guide: null }))
        .rejects.toThrow('guide parameter is required');
    });

    it('should throw error when guide parameter is only whitespace', async () => {
      await expect(executeGetGuide({ guide: '   ' }))
        .rejects.toThrow('guide parameter is required');
    });

    it('should throw error when guide parameter is not a string', async () => {
      await expect(executeGetGuide({ guide: 123 }))
        .rejects.toThrow('guide parameter must be a string');
    });

    it('should throw error when guide parameter is an array', async () => {
      await expect(executeGetGuide({ guide: ['test'] }))
        .rejects.toThrow('guide parameter must be a string');
    });

    it('should throw error when guide parameter is an object', async () => {
      await expect(executeGetGuide({ guide: { name: 'test' } }))
        .rejects.toThrow('guide parameter must be a string');
    });
  });

  describe('Guide Lookup', () => {
    it('should find guide by name without prefix', async () => {
      const result = await executeGetGuide({ guide: 'activate-guide-documentation' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'activate-guide-documentation');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('when_to_use');
    });

    it('should handle guide name with guide_ prefix gracefully', async () => {
      const result = await executeGetGuide({ guide: 'guide_activate-guide-documentation' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'activate-guide-documentation');
    });

    it('should return error when guide not found', async () => {
      const result = await executeGetGuide({ guide: 'nonexistent-guide' }) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('available');
      expect(result['error']).toContain('nonexistent-guide');
      expect(result['error']).toContain('not found');
    });

    it('should return error with available guides list when not found', async () => {
      const result = await executeGetGuide({ guide: 'invalid-name' }) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('available');
      expect(Array.isArray(result['available'])).toBe(true);
      expect((result['available'] as string[]).length).toBeGreaterThan(0);
    });

    it('should strip guide_ prefix from available guides list', async () => {
      const result = await executeGetGuide({ guide: 'invalid-name' }) as Record<string, unknown>;

      expect(result).toHaveProperty('available');
      const available = result['available'] as string[];

      // Should include guides without prefix
      expect(available).toContain('activate-guide-documentation');
      expect(available).toContain('activate-specification-documentation');
      expect(available).toContain('documentation-standards');

      // Should NOT include guide_ prefix
      expect(available).not.toContain('guide_activate-guide-documentation');
    });

    it('should NOT include workflows in available list', async () => {
      const result = await executeGetGuide({ guide: 'invalid-name' }) as Record<string, unknown>;

      expect(result).toHaveProperty('available');
      const available = result['available'] as string[];

      // Should NOT include workflows (these are for get_workflow tool)
      expect(available).not.toContain('tdd-incremental-orchestration');
      expect(available).not.toContain('workflow_tdd-incremental-orchestration');
    });

    it('should handle case-sensitive guide names correctly', async () => {
      const result = await executeGetGuide({ guide: 'Activate-Guide-Documentation' }) as Record<string, unknown>;

      // Should not find it (case-sensitive)
      expect(result).toHaveProperty('error');
    });
  });

  describe('Response Structure', () => {
    it('should return properly formatted response for valid guide', async () => {
      const result = await executeGetGuide({ guide: 'activate-guide-documentation' }) as Record<string, unknown>;

      // Verify response structure
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('when_to_use');

      // Verify types
      expect(typeof result['name']).toBe('string');
      expect(typeof result['description']).toBe('string');
      expect(typeof result['content']).toBe('string');
      expect(Array.isArray(result['when_to_use'])).toBe(true);
    });

    it('should strip guide_ prefix from returned name', async () => {
      const result = await executeGetGuide({ guide: 'activate-specification-documentation' }) as Record<string, unknown>;

      expect(result['name']).toBe('activate-specification-documentation');
      expect((result['name'] as string)).not.toContain('guide_');
    });

    it('should preserve original description content', async () => {
      const result = await executeGetGuide({ guide: 'activate-guide-documentation' }) as Record<string, unknown>;

      expect(result['description']).toBe('How to create actionable guides and tutorials');
    });

    it('should preserve original markdown content', async () => {
      const result = await executeGetGuide({ guide: 'activate-guide-documentation' }) as Record<string, unknown>;

      expect(result['content']).toContain('# Activate Guide Documentation');
      expect(result['content']).toContain('This is test content for guide documentation.');
    });

    it('should return when_to_use as array', async () => {
      const result = await executeGetGuide({ guide: 'activate-guide-documentation' }) as Record<string, unknown>;

      expect(Array.isArray(result['when_to_use'])).toBe(true);
      expect((result['when_to_use'] as string[]).length).toBeGreaterThan(0);
      expect((result['when_to_use'] as string[])[0]).toContain('Creating new guides');
    });

    it('should not include tags field', async () => {
      const result = await executeGetGuide({ guide: 'activate-guide-documentation' }) as Record<string, unknown>;

      expect(result).not.toHaveProperty('tags');
    });
  });

  describe('Edge Cases', () => {
    it('should handle guide names with special characters', async () => {
      const result = await executeGetGuide({ guide: 'activate-specification-documentation' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'activate-specification-documentation');
    });

    it('should handle guide names with underscores correctly', async () => {
      // Since we strip guide_ prefix, names with underscores should work
      const result = await executeGetGuide({ guide: 'documentation-standards' }) as Record<string, unknown>;

      expect(result).toHaveProperty('name', 'documentation-standards');
    });

    it('should return error for empty available list if no prompts loaded', async () => {
      // Mock getWorkflowPrompt to return undefined
      const mockGetWorkflowPrompt = vi.mocked(getWorkflowPrompt);
      mockGetWorkflowPrompt.mockReturnValueOnce(undefined);

      const result = await executeGetGuide({ guide: 'any-name' }) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('available');
    });
  });

  describe('Prefix Handling', () => {
    it('should add guide_ prefix when looking up guides', async () => {
      await executeGetGuide({ guide: 'activate-guide-documentation' });

      // Verify getWorkflowPrompt was called with guide_ prefix
      expect(getWorkflowPrompt).toHaveBeenCalledWith('guide_activate-guide-documentation');
    });

    it('should NOT try workflow_ prefix for guides', async () => {
      await executeGetGuide({ guide: 'activate-guide-documentation' });

      // Should only use guide_ prefix, not workflow_
      expect(getWorkflowPrompt).not.toHaveBeenCalledWith('workflow_activate-guide-documentation');
    });

    it('should use provided prefix if already present', async () => {
      await executeGetGuide({ guide: 'guide_documentation-standards' });

      // Should use as-is when prefix already present
      expect(getWorkflowPrompt).toHaveBeenCalledWith('guide_documentation-standards');
    });
  });

  describe('Filter Guides Only', () => {
    it('should only return guides in available list, not workflows', async () => {
      const result = await executeGetGuide({ guide: 'nonexistent' }) as Record<string, unknown>;

      expect(result).toHaveProperty('available');
      const available = result['available'] as string[];

      // Should include guides
      expect(available).toContain('activate-guide-documentation');
      expect(available).toContain('documentation-standards');

      // Should NOT include workflows
      expect(available).not.toContain('tdd-incremental-orchestration');
    });

    it('should NOT find workflows when searching for guides', async () => {
      const result = await executeGetGuide({ guide: 'tdd-incremental-orchestration' }) as Record<string, unknown>;

      // Should return error - workflows are not guides
      expect(result).toHaveProperty('error');
      expect(result['error']).toContain('not found');
    });
  });
});
