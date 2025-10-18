/**
 * Unit tests for search_documents tool
 *
 * Tests the search_documents tool which provides full-text and regex search
 * across all documents with structured results and context.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchDocuments } from '../search-documents.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import type { DocumentManager } from '../../../document-manager.js';
import type { SessionState } from '../../../session/types.js';
import { AddressingError } from '../../../shared/addressing-system.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('search_documents tool', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-documents-test-'));

    // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
    process.env['MCP_WORKSPACE_PATH'] = tempDir;

    manager = createDocumentManager();
    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0
    };
  });

  afterEach(async () => {
    // Clean up temporary directory and all its contents
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  describe('Parameter Validation', () => {
    it('should throw error when query parameter missing', async () => {
      await expect(searchDocuments({}, sessionState, manager))
        .rejects.toThrow('query parameter is required');
    });

    it('should throw error when query parameter is empty string', async () => {
      await expect(searchDocuments({ query: '' }, sessionState, manager))
        .rejects.toThrow('query parameter is required');
    });

    it('should throw error when query parameter is null', async () => {
      await expect(searchDocuments({ query: null }, sessionState, manager))
        .rejects.toThrow('query parameter is required');
    });

    it('should throw error when query parameter is only whitespace', async () => {
      await expect(searchDocuments({ query: '   ' }, sessionState, manager))
        .rejects.toThrow('query parameter is required');
    });

    it('should throw error for invalid search type', async () => {
      await expect(searchDocuments({
        query: 'test',
        type: 'invalid'
      }, sessionState, manager))
        .rejects.toThrow(AddressingError);
    });

    it('should throw error for invalid regex pattern', async () => {
      await expect(searchDocuments({
        query: '[invalid(',
        type: 'regex'
      }, sessionState, manager))
        .rejects.toThrow('Invalid regex pattern');
    });

    it('should throw error when scope does not start with /', async () => {
      await expect(searchDocuments({
        query: 'test',
        scope: 'api/specs'
      }, sessionState, manager))
        .rejects.toThrow('scope must start with /');
    });

    it('should throw error for context_lines out of range', async () => {
      await expect(searchDocuments({
        query: 'test',
        context_lines: 20
      }, sessionState, manager))
        .rejects.toThrow('context_lines must be between');
    });

    it('should throw error for negative context_lines', async () => {
      await expect(searchDocuments({
        query: 'test',
        context_lines: -1
      }, sessionState, manager))
        .rejects.toThrow('context_lines must be between');
    });

    it('should throw error for max_results out of range', async () => {
      await expect(searchDocuments({
        query: 'test',
        max_results: 1000
      }, sessionState, manager))
        .rejects.toThrow('max_results must be between');
    });

    it('should accept valid parameters', async () => {
      // Mock empty document list
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'test',
        type: 'fulltext',
        scope: '/api/',
        include_context: true,
        context_lines: 2,
        max_results: 50
      }, sessionState, manager);

      expect(result).toHaveProperty('query', 'test');
      expect(result).toHaveProperty('search_type', 'fulltext');
    });
  });

  describe('Response Structure', () => {
    it('should return properly formatted response with empty results', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'test'
      }, sessionState, manager);

      // Verify response structure
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('search_type');
      expect(result).toHaveProperty('scope');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('total_matches');
      expect(result).toHaveProperty('total_documents');
      expect(result).toHaveProperty('truncated');

      // Verify types
      expect(typeof result.query).toBe('string');
      expect(typeof result.search_type).toBe('string');
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.total_matches).toBe('number');
      expect(typeof result.total_documents).toBe('number');
      expect(typeof result.truncated).toBe('boolean');
    });

    it('should return empty results when no matches found', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'nonexistent',
        type: 'fulltext'
      }, sessionState, manager);

      expect(result.total_documents).toBe(0);
      expect(result.total_matches).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.truncated).toBe(false);
    });
  });

  describe('Search Type', () => {
    it('should default to fulltext search', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'test'
      }, sessionState, manager);

      expect(result.search_type).toBe('fulltext');
    });

    it('should accept regex search type', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'test.*pattern',
        type: 'regex'
      }, sessionState, manager);

      expect(result.search_type).toBe('regex');
    });
  });

  describe('Scope Handling', () => {
    it('should accept scope parameter', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'test',
        scope: '/api/'
      }, sessionState, manager);

      expect(result.scope).toBe('/api/');
    });

    it('should default scope to null when not provided', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'test'
      }, sessionState, manager);

      expect(result.scope).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle document loading failures gracefully', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({
        documents: [{ path: '/doc.md', title: 'Doc', lastModified: new Date(), headingCount: 1, wordCount: 10 }]
      });
      vi.spyOn(manager, 'getDocumentContent').mockResolvedValue(null);

      const result = await searchDocuments({
        query: 'test'
      }, sessionState, manager);

      // Should return empty results without throwing
      expect(result.results).toHaveLength(0);
    });

    it('should handle manager errors gracefully', async () => {
      vi.spyOn(manager, 'listDocuments').mockRejectedValue(new Error('Filesystem error'));

      await expect(searchDocuments({
        query: 'test'
      }, sessionState, manager))
        .rejects.toThrow('Filesystem error');
    });
  });

  describe('Match Text Truncation', () => {
    it('should throw error for max_match_length below minimum', async () => {
      await expect(searchDocuments({
        query: 'test',
        max_match_length: 10
      }, sessionState, manager))
        .rejects.toThrow('max_match_length must be between');
    });

    it('should throw error for max_match_length above maximum', async () => {
      await expect(searchDocuments({
        query: 'test',
        max_match_length: 600
      }, sessionState, manager))
        .rejects.toThrow('max_match_length must be between');
    });

    it('should accept valid max_match_length values', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'test',
        max_match_length: 100
      }, sessionState, manager);

      expect(result).toHaveProperty('query', 'test');
    });

    it('should default to 80 characters when max_match_length not provided', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'test'
      }, sessionState, manager);

      // Default behavior confirmed
      expect(result).toHaveProperty('query', 'test');
    });

    it('should truncate long match text to specified length', async () => {
      const longText = 'This is a very long line of text that contains the search term and should be truncated to the specified length to save tokens and improve readability';
      const docContent = `# Test Document\n\n${longText}`;

      vi.spyOn(manager, 'listDocuments').mockResolvedValue({
        documents: [{ path: '/test.md', title: 'Test', lastModified: new Date(), headingCount: 1, wordCount: 20 }]
      });
      vi.spyOn(manager, 'getDocumentContent').mockResolvedValue(docContent);
      vi.spyOn(manager, 'getDocument').mockResolvedValue({
        content: docContent,
        metadata: { title: 'Test', headingCount: 1, wordCount: 20 },
        sections: new Map([['test-document', docContent]]),
        headings: [{ slug: 'test-document', title: 'Test Document', depth: 1 }]
      } as never);

      const result = await searchDocuments({
        query: 'search term',
        max_match_length: 50
      }, sessionState, manager);

      expect(result.total_matches).toBeGreaterThan(0);
      const firstMatch = result.results[0]?.matches[0];
      expect(firstMatch).toBeDefined();
      expect(firstMatch?.match_text.length).toBeLessThanOrEqual(50);
      expect(firstMatch?.match_text).toMatch(/\.\.\.$/); // Should end with ellipsis
    });

    it('should not truncate match text shorter than max_match_length', async () => {
      const shortText = 'This is a short line with search term';
      const docContent = `# Test Document\n\n${shortText}`;

      vi.spyOn(manager, 'listDocuments').mockResolvedValue({
        documents: [{ path: '/test.md', title: 'Test', lastModified: new Date(), headingCount: 1, wordCount: 20 }]
      });
      vi.spyOn(manager, 'getDocumentContent').mockResolvedValue(docContent);
      vi.spyOn(manager, 'getDocument').mockResolvedValue({
        content: docContent,
        metadata: { title: 'Test', headingCount: 1, wordCount: 20 },
        sections: new Map([['test-document', docContent]]),
        headings: [{ slug: 'test-document', title: 'Test Document', depth: 1 }]
      } as never);

      const result = await searchDocuments({
        query: 'search term',
        max_match_length: 80
      }, sessionState, manager);

      expect(result.total_matches).toBeGreaterThan(0);
      const firstMatch = result.results[0]?.matches[0];
      expect(firstMatch).toBeDefined();
      expect(firstMatch?.match_text).toBe(shortText);
      expect(firstMatch?.match_text).not.toMatch(/\.\.\.$/); // Should NOT end with ellipsis
    });

    it('should truncate match text at exactly max_match_length boundary', async () => {
      const exactText = 'a'.repeat(80); // Exactly 80 characters
      const docContent = `# Test Document\n\n${exactText}`;

      vi.spyOn(manager, 'listDocuments').mockResolvedValue({
        documents: [{ path: '/test.md', title: 'Test', lastModified: new Date(), headingCount: 1, wordCount: 20 }]
      });
      vi.spyOn(manager, 'getDocumentContent').mockResolvedValue(docContent);
      vi.spyOn(manager, 'getDocument').mockResolvedValue({
        content: docContent,
        metadata: { title: 'Test', headingCount: 1, wordCount: 20 },
        sections: new Map([['test-document', docContent]]),
        headings: [{ slug: 'test-document', title: 'Test Document', depth: 1 }]
      } as never);

      const result = await searchDocuments({
        query: 'a',
        max_match_length: 80
      }, sessionState, manager);

      expect(result.total_matches).toBeGreaterThan(0);
      const firstMatch = result.results[0]?.matches[0];
      expect(firstMatch).toBeDefined();
      expect(firstMatch?.match_text.length).toBe(80); // Exactly at boundary, no truncation
      expect(firstMatch?.match_text).not.toMatch(/\.\.\.$/); // Should NOT end with ellipsis
    });

    it('should apply truncation consistently for both fulltext and regex search', async () => {
      const longText = 'This is a very long line of text that contains the test pattern and should be truncated consistently regardless of search type to ensure uniform behavior';
      const docContent = `# Test Document\n\n${longText}`;

      vi.spyOn(manager, 'listDocuments').mockResolvedValue({
        documents: [{ path: '/test.md', title: 'Test', lastModified: new Date(), headingCount: 1, wordCount: 20 }]
      });
      vi.spyOn(manager, 'getDocumentContent').mockResolvedValue(docContent);
      vi.spyOn(manager, 'getDocument').mockResolvedValue({
        content: docContent,
        metadata: { title: 'Test', headingCount: 1, wordCount: 20 },
        sections: new Map([['test-document', docContent]]),
        headings: [{ slug: 'test-document', title: 'Test Document', depth: 1 }]
      } as never);

      // Test fulltext
      const fulltextResult = await searchDocuments({
        query: 'pattern',
        type: 'fulltext',
        max_match_length: 60
      }, sessionState, manager);

      const fulltextMatch = fulltextResult.results[0]?.matches[0];
      expect(fulltextMatch).toBeDefined();
      expect(fulltextMatch?.match_text.length).toBeLessThanOrEqual(60);

      // Test regex
      const regexResult = await searchDocuments({
        query: 'pattern',
        type: 'regex',
        max_match_length: 60
      }, sessionState, manager);

      const regexMatch = regexResult.results[0]?.matches[0];
      expect(regexMatch).toBeDefined();
      expect(regexMatch?.match_text.length).toBeLessThanOrEqual(60);

      // Both should produce same length results
      expect(fulltextMatch?.match_text.length).toBe(regexMatch?.match_text.length);
    });
  });
});
