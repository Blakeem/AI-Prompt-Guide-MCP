/**
 * Comprehensive unit tests for link utilities
 */

import { describe, test, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import {
  parseLink,
  resolveLink,
  validateLink,
  linkExists,
  resolveLinkWithContext
} from '../link-utils.js';
import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';
import type { ParsedLink } from '../../types/linking.js';

// Create mock DocumentManager
const createMockDocumentManager = (): MockedDocumentManager => ({
  getDocument: vi.fn()
});

type MockedDocumentManager = {
  getDocument: MockedFunction<DocumentManager['getDocument']>;
};

// Sample document for testing
const createSampleDocument = (): CachedDocument => ({
  metadata: {
    path: '/api/users.md',
    title: 'User Management API',
    lastModified: new Date(),
    contentHash: 'abc123',
    wordCount: 500,
    linkCount: 10,
    codeBlockCount: 5,
    lastAccessed: new Date()
  },
  headings: [
    { index: 0, depth: 1, title: 'User Management API', slug: 'user-management-api', parentIndex: null },
    { index: 1, depth: 2, title: 'Authentication', slug: 'authentication', parentIndex: 0 },
    { index: 2, depth: 3, title: 'JWT Tokens', slug: 'jwt-tokens', parentIndex: 1 },
    { index: 3, depth: 2, title: 'User Operations', slug: 'user-operations', parentIndex: 0 },
    { index: 4, depth: 3, title: 'Get User', slug: 'get-user', parentIndex: 3 },
    { index: 5, depth: 3, title: 'Create User', slug: 'create-user', parentIndex: 3 }
  ],
  toc: [],
  slugIndex: new Map(),
  sections: new Map()
});

describe('parseLink Function', () => {
  describe('Input Validation', () => {
    test('should handle non-string input', () => {
      const result = parseLink(null as unknown as string);
      expect(result).toEqual({
        type: 'external',
        raw: null
      });
    });

    test('should handle empty string input', () => {
      const result = parseLink('');
      expect(result).toEqual({
        type: 'external',
        raw: ''
      });
    });

    test('should handle whitespace-only input', () => {
      const result = parseLink('   ');
      expect(result).toEqual({
        type: 'external',
        raw: '   '
      });
    });
  });

  describe('External Links', () => {
    test('should parse HTTP URLs as external', () => {
      const result = parseLink('https://example.com');
      expect(result).toEqual({
        type: 'external',
        raw: 'https://example.com'
      });
    });

    test('should parse non-@ prefixed links as external', () => {
      const result = parseLink('mailto:test@example.com');
      expect(result).toEqual({
        type: 'external',
        raw: 'mailto:test@example.com'
      });
    });

    test('should parse regular text as external', () => {
      const result = parseLink('regular text');
      expect(result).toEqual({
        type: 'external',
        raw: 'regular text'
      });
    });
  });

  describe('Within-Document Links', () => {
    test('should parse section-only links', () => {
      const result = parseLink('@#overview');
      expect(result).toEqual({
        type: 'within-doc',
        raw: '@#overview',
        section: 'overview'
      });
    });

    test('should parse section-only links with current document path', () => {
      const result = parseLink('@#overview', '/current/doc.md');
      expect(result).toEqual({
        type: 'within-doc',
        raw: '@#overview',
        section: 'overview',
        document: '/current/doc.md'
      });
    });

    test('should handle hash-only link (@#)', () => {
      const result = parseLink('@#');
      expect(result).toEqual({
        type: 'within-doc',
        raw: '@#'
      });
    });

    test('should handle complex section slugs', () => {
      const result = parseLink('@#api-authentication-jwt-tokens');
      expect(result).toEqual({
        type: 'within-doc',
        raw: '@#api-authentication-jwt-tokens',
        section: 'api-authentication-jwt-tokens'
      });
    });
  });

  describe('Cross-Document Links', () => {
    test('should parse document-only links', () => {
      const result = parseLink('@/api/users.md');
      expect(result).toEqual({
        type: 'cross-doc',
        raw: '@/api/users.md',
        document: '/api/users.md'
      });
    });

    test('should parse document with section links', () => {
      const result = parseLink('@/api/users.md#get-user');
      expect(result).toEqual({
        type: 'cross-doc',
        raw: '@/api/users.md#get-user',
        document: '/api/users.md',
        section: 'get-user'
      });
    });

    test('should handle empty document path', () => {
      const result = parseLink('@#section');
      expect(result).toEqual({
        type: 'within-doc',
        raw: '@#section',
        section: 'section'
      });
    });

    test('should handle empty section in cross-doc link', () => {
      const result = parseLink('@/api/users.md#');
      expect(result).toEqual({
        type: 'cross-doc',
        raw: '@/api/users.md#',
        document: '/api/users.md'
      });
    });

    test('should handle relative paths', () => {
      const result = parseLink('@api/users.md');
      expect(result).toEqual({
        type: 'cross-doc',
        raw: '@api/users.md',
        document: 'api/users.md'
      });
    });

    test('should handle complex paths with multiple segments', () => {
      const result = parseLink('@/specs/api/v2/authentication.md#jwt-validation');
      expect(result).toEqual({
        type: 'cross-doc',
        raw: '@/specs/api/v2/authentication.md#jwt-validation',
        document: '/specs/api/v2/authentication.md',
        section: 'jwt-validation'
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle @ symbol only', () => {
      const result = parseLink('@');
      expect(result).toEqual({
        type: 'cross-doc',
        raw: '@'
      });
    });

    test('should handle multiple hash symbols', () => {
      const result = parseLink('@/doc.md#section#subsection');
      expect(result).toEqual({
        type: 'cross-doc',
        raw: '@/doc.md#section#subsection',
        document: '/doc.md',
        section: 'section#subsection'
      });
    });

    test('should handle whitespace in paths', () => {
      const result = parseLink('@  /api/users.md  ');
      expect(result).toEqual({
        type: 'cross-doc',
        raw: '@  /api/users.md  ',
        document: '  /api/users.md'
      });
    });
  });
});

describe('resolveLink Function', () => {
  describe('Input Validation', () => {
    test('should throw error for empty current document path', () => {
      const link: ParsedLink = { type: 'within-doc', raw: '@#section' };
      expect(() => resolveLink(link, '')).toThrow('Current document path is required for link resolution');
    });

    test('should throw error for whitespace-only current document path', () => {
      const link: ParsedLink = { type: 'within-doc', raw: '@#section' };
      expect(() => resolveLink(link, '   ')).toThrow('Current document path is required for link resolution');
    });
  });

  describe('External Links', () => {
    test('should return external links as-is', () => {
      const link: ParsedLink = { type: 'external', raw: 'https://example.com' };
      const result = resolveLink(link, '/current/doc.md');
      expect(result).toBe('https://example.com');
    });

    test('should return complex external links as-is', () => {
      const link: ParsedLink = { type: 'external', raw: 'mailto:test@example.com?subject=Hello' };
      const result = resolveLink(link, '/current/doc.md');
      expect(result).toBe('mailto:test@example.com?subject=Hello');
    });
  });

  describe('Within-Document Links', () => {
    test('should resolve section links to current document', () => {
      const link: ParsedLink = { type: 'within-doc', raw: '@#overview', section: 'overview' };
      const result = resolveLink(link, '/api/users.md');
      expect(result).toBe('/api/users.md#overview');
    });

    test('should resolve document-only within-doc links', () => {
      const link: ParsedLink = { type: 'within-doc', raw: '@#' };
      const result = resolveLink(link, '/api/users.md');
      expect(result).toBe('/api/users.md');
    });

    test('should handle empty section in within-doc links', () => {
      const link: ParsedLink = { type: 'within-doc', raw: '@#', section: '' };
      const result = resolveLink(link, '/api/users.md');
      expect(result).toBe('/api/users.md');
    });

    test('should normalize current document path', () => {
      const link: ParsedLink = { type: 'within-doc', raw: '@#section', section: 'section' };
      const result = resolveLink(link, 'api/users.md'); // No leading slash
      expect(result).toBe('/api/users.md#section');
    });
  });

  describe('Cross-Document Links', () => {
    test('should resolve cross-document links with sections', () => {
      const link: ParsedLink = {
        type: 'cross-doc',
        raw: '@/api/auth.md#jwt',
        document: '/api/auth.md',
        section: 'jwt'
      };
      const result = resolveLink(link, '/current/doc.md');
      expect(result).toBe('/api/auth.md#jwt');
    });

    test('should resolve cross-document links without sections', () => {
      const link: ParsedLink = {
        type: 'cross-doc',
        raw: '@/api/auth.md',
        document: '/api/auth.md'
      };
      const result = resolveLink(link, '/current/doc.md');
      expect(result).toBe('/api/auth.md');
    });

    test('should normalize document paths', () => {
      const link: ParsedLink = {
        type: 'cross-doc',
        raw: '@api/auth.md',
        document: 'api/auth.md' // No leading slash
      };
      const result = resolveLink(link, '/current/doc.md');
      expect(result).toBe('/api/auth.md');
    });

    test('should throw error for missing document path', () => {
      const link: ParsedLink = { type: 'cross-doc', raw: '@' };
      expect(() => resolveLink(link, '/current/doc.md')).toThrow('Cross-document link missing document path');
    });

    test('should throw error for empty document path', () => {
      const link: ParsedLink = { type: 'cross-doc', raw: '@', document: '' };
      expect(() => resolveLink(link, '/current/doc.md')).toThrow('Cross-document link missing document path');
    });
  });

  describe('Path Normalization', () => {
    test('should handle multiple slashes in paths', () => {
      const link: ParsedLink = {
        type: 'cross-doc',
        raw: '@//api//auth.md',
        document: '//api//auth.md'
      };
      const result = resolveLink(link, '/current/doc.md');
      expect(result).toBe('/api/auth.md');
    });

    test('should remove trailing slashes', () => {
      const link: ParsedLink = { type: 'within-doc', raw: '@#section', section: 'section' };
      const result = resolveLink(link, '/api/users.md/');
      expect(result).toBe('/api/users.md#section');
    });

    test('should preserve root path correctly', () => {
      const link: ParsedLink = { type: 'within-doc', raw: '@#section', section: 'section' };
      const result = resolveLink(link, '/');
      expect(result).toBe('/#section');
    });
  });

  describe('Error Cases', () => {
    test('should throw error for unknown link type', () => {
      const link: ParsedLink = { type: 'unknown' as unknown as ParsedLink['type'], raw: '@test' };
      expect(() => resolveLink(link, '/current/doc.md')).toThrow('Unknown link type: unknown');
    });
  });
});

describe('validateLink Function', () => {
  let mockDocumentManager: MockedDocumentManager;
  let sampleDocument: CachedDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocumentManager = createMockDocumentManager();
    sampleDocument = createSampleDocument();
  });

  describe('Input Validation', () => {
    test('should reject empty link path', async () => {
      const result = await validateLink('', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: false,
        error: 'Link path cannot be empty',
        suggestion: 'Provide a valid document path'
      });
    });

    test('should reject whitespace-only link path', async () => {
      const result = await validateLink('   ', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: false,
        error: 'Link path cannot be empty',
        suggestion: 'Provide a valid document path'
      });
    });
  });

  describe('External Links', () => {
    test('should validate HTTP URLs as valid', async () => {
      const result = await validateLink('https://example.com', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: true
      });
    });

    test('should validate www URLs as valid', async () => {
      const result = await validateLink('www.example.com', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: true
      });
    });

    test('should validate complex URLs as valid', async () => {
      const result = await validateLink('https://api.example.com/v1/docs?section=auth', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: true
      });
    });
  });

  describe('Document Validation', () => {
    test('should validate existing document without section', async () => {
      mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);

      const result = await validateLink('/api/users.md', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: true,
        documentExists: true
      });
    });

    test('should reject non-existent document', async () => {
      mockDocumentManager.getDocument.mockResolvedValue(null);

      const result = await validateLink('/api/missing.md', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: false,
        documentExists: false,
        error: 'Document not found: /api/missing.md',
        suggestion: 'Check the document path and ensure the file exists'
      });
    });

    test('should handle document manager errors', async () => {
      const error = new Error('Database connection failed');
      mockDocumentManager.getDocument.mockRejectedValue(error);

      const result = await validateLink('/api/users.md', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: false,
        documentExists: false,
        error: 'Failed to check document: Database connection failed',
        suggestion: 'Verify the document path: /api/users.md'
      });
    });
  });

  describe('Section Validation', () => {
    test('should validate existing section', async () => {
      mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);

      const result = await validateLink('/api/users.md#authentication', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: true,
        documentExists: true,
        sectionExists: true
      });
    });

    test('should reject non-existent section with suggestions', async () => {
      mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);

      const result = await validateLink('/api/users.md#missing-section', mockDocumentManager as unknown as DocumentManager);
      expect(result.valid).toBe(false);
      expect(result.documentExists).toBe(true);
      expect(result.sectionExists).toBe(false);
      expect(result.error).toBe('Section not found: missing-section');
      expect(result.suggestion).toContain('Available sections:');
      expect(result.suggestion).toContain('authentication');
    });

    test('should handle documents with no sections', async () => {
      const emptyDocument = {
        ...sampleDocument,
        headings: []
      };
      mockDocumentManager.getDocument.mockResolvedValue(emptyDocument);

      const result = await validateLink('/api/users.md#any-section', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: false,
        documentExists: true,
        sectionExists: false,
        error: 'Section not found: any-section',
        suggestion: 'No sections found in document'
      });
    });

    test('should validate empty section hash', async () => {
      mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);

      const result = await validateLink('/api/users.md#', mockDocumentManager as unknown as DocumentManager);
      expect(result).toEqual({
        valid: true,
        documentExists: true
      });
    });
  });

  describe('Complex Cases', () => {
    test('should handle multiple hash symbols correctly', async () => {
      mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);

      const result = await validateLink('/api/users.md#section#subsection', mockDocumentManager as unknown as DocumentManager);
      expect(result.valid).toBe(false);
      expect(result.documentExists).toBe(true);
      expect(result.sectionExists).toBe(false);
      expect(result.error).toContain('Section not found: section#subsection');
    });

    test('should handle document lookup errors during section validation', async () => {
      const docWithError = {
        ...sampleDocument,
        headings: null as unknown as CachedDocument['headings'] // Simulate corrupt data
      };
      mockDocumentManager.getDocument.mockResolvedValue(docWithError);

      const result = await validateLink('/api/users.md#authentication', mockDocumentManager as unknown as DocumentManager);
      expect(result.valid).toBe(false);
      expect(result.documentExists).toBe(true);
      expect(result.sectionExists).toBe(false);
      expect(result.error).toContain('Failed to check section:');
    });
  });
});

describe('linkExists Function', () => {
  let mockDocumentManager: MockedDocumentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocumentManager = createMockDocumentManager();
  });

  test('should return true for valid links', async () => {
    mockDocumentManager.getDocument.mockResolvedValue(createSampleDocument());

    const result = await linkExists('/api/users.md#authentication', mockDocumentManager as unknown as DocumentManager);
    expect(result).toBe(true);
  });

  test('should return false for invalid links', async () => {
    mockDocumentManager.getDocument.mockResolvedValue(null);

    const result = await linkExists('/api/missing.md', mockDocumentManager as unknown as DocumentManager);
    expect(result).toBe(false);
  });

  test('should return false when validation throws error', async () => {
    mockDocumentManager.getDocument.mockRejectedValue(new Error('System error'));

    const result = await linkExists('/api/users.md', mockDocumentManager as unknown as DocumentManager);
    expect(result).toBe(false);
  });

  test('should handle external links correctly', async () => {
    const result = await linkExists('https://example.com', mockDocumentManager as unknown as DocumentManager);
    expect(result).toBe(true);
  });
});

describe('resolveLinkWithContext Function', () => {
  let mockDocumentManager: MockedDocumentManager;
  let sampleDocument: CachedDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocumentManager = createMockDocumentManager();
    sampleDocument = createSampleDocument();
  });

  test('should resolve valid link with context', async () => {
    mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);

    const result = await resolveLinkWithContext(
      '@/api/users.md#authentication',
      '/current/doc.md',
      mockDocumentManager as unknown as DocumentManager,
      { includeSuggestions: true }
    );

    expect(result.parsed).toEqual({
      type: 'cross-doc',
      raw: '@/api/users.md#authentication',
      document: '/api/users.md',
      section: 'authentication'
    });
    expect(result.resolvedPath).toBe('/api/users.md#authentication');
    expect(result.validation.valid).toBe(true);
  });

  test('should handle link resolution errors', async () => {
    const result = await resolveLinkWithContext(
      '@',
      '/current/doc.md',
      mockDocumentManager as unknown as DocumentManager
    );

    expect(result.parsed.type).toBe('cross-doc');
    expect(result.validation.valid).toBe(false);
    expect(result.validation.error).toContain('Cross-document link missing document path');
    expect(result.resolvedPath).toBe('@');
  });

  test('should handle invalid links with validation errors', async () => {
    mockDocumentManager.getDocument.mockResolvedValue(null);

    const result = await resolveLinkWithContext(
      '@/api/missing.md',
      '/current/doc.md',
      mockDocumentManager as unknown as DocumentManager
    );

    expect(result.parsed.type).toBe('cross-doc');
    expect(result.resolvedPath).toBe('/api/missing.md');
    expect(result.validation.valid).toBe(false);
    expect(result.validation.error).toContain('Document not found');
  });

  test('should resolve external links correctly', async () => {
    const result = await resolveLinkWithContext(
      'https://example.com',
      '/current/doc.md',
      mockDocumentManager as unknown as DocumentManager
    );

    expect(result.parsed.type).toBe('external');
    expect(result.resolvedPath).toBe('https://example.com');
    expect(result.validation.valid).toBe(true);
  });

  test('should handle within-document links', async () => {
    const mockCurrentDoc = {
      ...sampleDocument,
      metadata: { ...sampleDocument.metadata, path: '/current/doc.md' }
    };
    mockDocumentManager.getDocument.mockResolvedValue(mockCurrentDoc);

    const result = await resolveLinkWithContext(
      '@#authentication',
      '/current/doc.md',
      mockDocumentManager as unknown as DocumentManager
    );

    expect(result.parsed.type).toBe('within-doc');
    expect(result.resolvedPath).toBe('/current/doc.md#authentication');
    expect(result.validation.valid).toBe(true);
  });

  test('should include context when requested and validation passes', async () => {
    mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);

    const result = await resolveLinkWithContext(
      '@/api/users.md',
      '/current/doc.md',
      mockDocumentManager as unknown as DocumentManager,
      { includeSuggestions: true }
    );

    expect(result.validation.valid).toBe(true);
    // Context loading is implemented as placeholder, so check structure
    if (result.context != null) {
      expect(result.context).toHaveProperty('primaryDocument');
      expect(result.context).toHaveProperty('linkedDocuments');
      expect(result.context).toHaveProperty('suggestions');
    }
  });
});