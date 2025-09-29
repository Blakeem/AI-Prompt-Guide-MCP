/**
 * Unit tests for ReferenceExtractor
 *
 * Tests extraction and normalization of @references from document content
 * with comprehensive coverage of all supported formats and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReferenceExtractor } from '../reference-extractor.js';

describe('ReferenceExtractor', () => {
  let extractor: ReferenceExtractor;

  beforeEach(() => {
    extractor = new ReferenceExtractor();
  });

  describe('extractReferences', () => {
    it('should extract basic cross-document references', () => {
      const content = 'See @/api/auth.md for authentication details.';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@/api/auth.md']);
    });

    it('should extract within-document section references', () => {
      const content = 'Check @#overview section above.';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@#overview']);
    });

    it('should extract cross-document with section references', () => {
      const content = 'Review @/api/auth.md#token-validation process.';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@/api/auth.md#token-validation']);
    });

    it('should extract multiple references from content', () => {
      const content = `
        Authentication flow:
        1. See @/api/auth.md#login for login process
        2. Check @#token-storage for local storage
        3. Review @/api/tokens.md for token management
      `;
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual([
        '@/api/auth.md#login',
        '@#token-storage',
        '@/api/tokens.md'
      ]);
    });

    it('should handle references without file extensions', () => {
      const content = 'See @/api/auth and @/docs/guide for details.';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@/api/auth', '@/docs/guide']);
    });

    it('should remove duplicate references', () => {
      const content = `
        First mention: @/api/auth.md
        Second mention: @/api/auth.md
        Different reference: @/api/tokens.md
      `;
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@/api/auth.md', '@/api/tokens.md']);
    });

    it('should handle references in markdown links', () => {
      const content = 'Check [authentication guide](@/api/auth.md) for details.';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@/api/auth.md']);
    });

    it('should handle empty content', () => {
      const refs = extractor.extractReferences('');
      expect(refs).toEqual([]);
    });

    it('should handle null/undefined content safely', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(extractor.extractReferences(null as any)).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(extractor.extractReferences(undefined as any)).toEqual([]);
    });

    it('should handle content with no references', () => {
      const content = 'This is regular content without any references.';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual([]);
    });

    it('should extract references with special characters in paths', () => {
      const content = 'See @/api/auth-v2.md and @/guides/setup_guide.md';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@/api/auth-v2.md', '@/guides/setup_guide.md']);
    });

    it('should handle references with nested paths', () => {
      const content = 'Check @/deep/nested/path/document.md#section';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@/deep/nested/path/document.md#section']);
    });

    it('should handle section-only references', () => {
      const content = 'See @# for empty section or @#section-name';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@#', '@#section-name']);
    });
  });

  describe('normalizeReferences', () => {
    const contextPath = '/current/doc.md';

    it('should normalize cross-document references with .md extension', () => {
      const refs = ['@/api/auth'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      expect(normalized).toEqual([
        {
          originalRef: '@/api/auth',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md',
          sectionSlug: undefined
        }
      ]);
    });

    it('should normalize cross-document references with existing .md extension', () => {
      const refs = ['@/api/auth.md'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      expect(normalized).toEqual([
        {
          originalRef: '@/api/auth.md',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md',
          sectionSlug: undefined
        }
      ]);
    });

    it('should normalize within-document section references', () => {
      const refs = ['@#overview'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      expect(normalized).toEqual([
        {
          originalRef: '@#overview',
          resolvedPath: '/current/doc.md#overview',
          documentPath: '/current/doc.md',
          sectionSlug: 'overview'
        }
      ]);
    });

    it('should normalize cross-document references with sections', () => {
      const refs = ['@/api/auth.md#token-validation'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      expect(normalized).toEqual([
        {
          originalRef: '@/api/auth.md#token-validation',
          resolvedPath: '/api/auth.md#token-validation',
          documentPath: '/api/auth.md',
          sectionSlug: 'token-validation'
        }
      ]);
    });

    it('should normalize references without .md extension but with sections', () => {
      const refs = ['@/api/auth#setup'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      expect(normalized).toEqual([
        {
          originalRef: '@/api/auth#setup',
          resolvedPath: '/api/auth.md#setup',
          documentPath: '/api/auth.md',
          sectionSlug: 'setup'
        }
      ]);
    });

    it('should handle multiple references of different types', () => {
      const refs = ['@/api/auth.md', '@#overview', '@/docs/guide#setup'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      expect(normalized).toHaveLength(3);
      expect(normalized[0]?.documentPath).toBe('/api/auth.md');
      expect(normalized[1]?.documentPath).toBe('/current/doc.md');
      expect(normalized[1]?.sectionSlug).toBe('overview');
      expect(normalized[2]?.documentPath).toBe('/docs/guide.md');
      expect(normalized[2]?.sectionSlug).toBe('setup');
    });

    it('should handle empty section references gracefully', () => {
      const refs = ['@#', '@/api/auth.md#'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      expect(normalized).toEqual([
        {
          originalRef: '@#',
          resolvedPath: '/current/doc.md#',
          documentPath: '/current/doc.md',
          sectionSlug: undefined
        },
        {
          originalRef: '@/api/auth.md#',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md',
          sectionSlug: undefined
        }
      ]);
    });

    it('should throw error for missing context path', () => {
      const refs = ['@/api/auth.md'];

      expect(() => extractor.normalizeReferences(refs, '')).toThrow('Context path is required');
      expect(() => extractor.normalizeReferences(refs, '   ')).toThrow('Context path is required');
    });

    it('should handle non-array input gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized = extractor.normalizeReferences(null as any, contextPath);
      expect(normalized).toEqual([]);
    });

    it('should skip invalid reference strings', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const refs = ['@/api/auth.md', '', null as any, undefined as any, '@/valid/path.md'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      expect(normalized).toHaveLength(2);
      expect(normalized[0]?.originalRef).toBe('@/api/auth.md');
      expect(normalized[1]?.originalRef).toBe('@/valid/path.md');
    });

    it('should normalize context path to absolute', () => {
      const refs = ['@#section'];
      const relativeContext = 'relative/path.md';
      const normalized = extractor.normalizeReferences(refs, relativeContext);

      expect(normalized[0]?.documentPath).toBe('/relative/path.md');
    });

    it('should handle nested path normalization', () => {
      const refs = ['@/deep/nested/path/doc'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      expect(normalized[0]?.documentPath).toBe('/deep/nested/path/doc.md');
    });

    it('should normalize section slugs properly', () => {
      const refs = ['@#Token-Validation', '@/api/auth#Multi-Word-Section'];
      const normalized = extractor.normalizeReferences(refs, contextPath);

      // Assuming titleToSlug converts to lowercase with dashes
      expect(normalized[0]?.sectionSlug).toBe('token-validation');
      expect(normalized[1]?.sectionSlug).toBe('multi-word-section');
    });

    it('should handle references that are not @ prefixed', () => {
      const refs = ['/not/a/reference', '@/valid/reference.md'];

      // Mock console.warn to verify warning is logged
      const originalWarn = console.warn;
      const warnMock = vi.fn();
      console.warn = warnMock;

      const normalized = extractor.normalizeReferences(refs, contextPath);

      // Should only return the valid reference
      expect(normalized).toHaveLength(1);
      expect(normalized[0]?.originalRef).toBe('@/valid/reference.md');

      // Should have warned about invalid reference
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('Failed to normalize reference'),
        expect.any(Error)
      );

      console.warn = originalWarn;
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed references gracefully', () => {
      const content = 'Check @ and @@ and @/path with spaces';
      const refs = extractor.extractReferences(content);

      // The regex catches partial matches like '@/path' but not bare '@' or '@@'
      expect(refs).toEqual(['@/path']);
    });

    it('should handle references at end of content', () => {
      const content = 'See documentation at @/api/auth.md';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@/api/auth.md']);
    });

    it('should handle references at start of content', () => {
      const content = '@/api/auth.md contains authentication details';
      const refs = extractor.extractReferences(content);

      expect(refs).toEqual(['@/api/auth.md']);
    });

    it('should handle references with punctuation', () => {
      const content = 'See @/api/auth.md, @/api/tokens.md; and @/api/errors.md.';
      const refs = extractor.extractReferences(content);

      // Trailing punctuation should be cleaned up
      expect(refs).toEqual(['@/api/auth.md', '@/api/tokens.md', '@/api/errors.md']);
    });
  });
});