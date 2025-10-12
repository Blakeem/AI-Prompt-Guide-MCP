/**
 * Unit tests for search_documents tool
 *
 * Tests the search_documents tool which provides full-text and regex search
 * across all documents with structured results and context.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchDocuments } from '../search-documents.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import type { DocumentManager } from '../../../document-manager.js';
import type { SessionState } from '../../../session/types.js';
import { AddressingError } from '../../../shared/addressing-system.js';

describe('search_documents tool', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;

  beforeEach(() => {
    manager = createDocumentManager();
    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0
    };
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
      expect(result).toHaveProperty('timestamp');

      // Verify types
      expect(typeof result.query).toBe('string');
      expect(typeof result.search_type).toBe('string');
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.total_matches).toBe('number');
      expect(typeof result.total_documents).toBe('number');
      expect(typeof result.truncated).toBe('boolean');
      expect(typeof result.timestamp).toBe('string');
    });

    it('should format timestamp as date only', async () => {
      vi.spyOn(manager, 'listDocuments').mockResolvedValue({ documents: [] });

      const result = await searchDocuments({
        query: 'test'
      }, sessionState, manager);

      // Timestamp should be YYYY-MM-DD format
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
});
