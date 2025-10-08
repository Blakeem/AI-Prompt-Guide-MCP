/**
 * Unit tests for ReferenceLoader
 *
 * Tests hierarchical content loading with recursive reference processing,
 * cycle detection, and depth management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReferenceLoader, type HierarchicalContent } from '../reference-loader.js';
import type { NormalizedReference } from '../reference-extractor.js';
import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';

// Mock DocumentManager
const createMockDocumentManager = (): DocumentManager => {
  const mockDocs = new Map<string, CachedDocument>();
  const mockContents = new Map<string, string>();
  const mockSectionContents = new Map<string, Map<string, string>>();

  // Section content for /api/auth.md
  const authSections = new Map<string, string>();
  authSections.set('overview', 'Authentication overview content');
  authSections.set('setup', 'Setup instructions content');
  mockSectionContents.set('/api/auth.md', authSections);

  // Section content for /api/tokens.md
  const tokenSections = new Map<string, string>();
  tokenSections.set('token-types', 'Different types of tokens available');
  mockSectionContents.set('/api/tokens.md', tokenSections);

  // Section content for /api/errors.md
  const errorSections = new Map<string, string>();
  errorSections.set('error-codes', 'List of error codes and meanings');
  mockSectionContents.set('/api/errors.md', errorSections);

  // Sample documents for testing
  mockDocs.set('/api/auth.md', {
    metadata: {
      path: '/api/auth.md',
      title: 'Authentication Guide',
      lastModified: new Date(),
      contentHash: 'hash1',
      wordCount: 100,
      linkCount: 1,
      codeBlockCount: 0,
      lastAccessed: new Date(),
      cacheGeneration: 1,
      namespace: 'api',
      keywords: ['auth', 'authentication'],
      fingerprintGenerated: new Date()
    },
    headings: [
      { index: 0, depth: 2, title: 'Overview', slug: 'overview', parentIndex: null },
      { index: 1, depth: 2, title: 'Setup', slug: 'setup', parentIndex: null }
    ],
    toc: [],
    slugIndex: new Map([
      ['overview', 0],
      ['setup', 1]
    ])
  } as CachedDocument);
  mockContents.set('/api/auth.md', 'Authentication guide. See @/api/tokens.md for token details.');

  mockDocs.set('/api/tokens.md', {
    metadata: {
      path: '/api/tokens.md',
      title: 'Token Management',
      lastModified: new Date(),
      contentHash: 'hash2',
      wordCount: 80,
      linkCount: 1,
      codeBlockCount: 0,
      lastAccessed: new Date(),
      cacheGeneration: 1,
      namespace: 'api',
      keywords: ['token', 'management'],
      fingerprintGenerated: new Date()
    },
    headings: [
      { index: 0, depth: 2, title: 'Token Types', slug: 'token-types', parentIndex: null }
    ],
    toc: [],
    slugIndex: new Map([
      ['token-types', 0]
    ]),
  } as CachedDocument);

  mockDocs.set('/api/errors.md', {
    metadata: {
      path: '/api/errors.md',
      title: 'Error Handling',
      lastModified: new Date(),
      contentHash: 'hash3',
      wordCount: 60,
      linkCount: 0,
      codeBlockCount: 0,
      lastAccessed: new Date(),
      cacheGeneration: 1,
      namespace: 'api',
      keywords: ['error', 'handling'],
      fingerprintGenerated: new Date()
    },
    headings: [
      { index: 0, depth: 2, title: 'Error Codes', slug: 'error-codes', parentIndex: null }
    ],
    toc: [],
    slugIndex: new Map([
      ['error-codes', 0]
    ]),
  } as CachedDocument);

  mockDocs.set('/circular/a.md', {
    metadata: {
      path: '/circular/a.md',
      title: 'Document A',
      lastModified: new Date(),
      contentHash: 'hash4',
      wordCount: 20,
      linkCount: 1,
      codeBlockCount: 0,
      lastAccessed: new Date(),
      cacheGeneration: 1,
      namespace: 'circular',
      keywords: ['document', 'circular'],
      fingerprintGenerated: new Date()
    },
    headings: [],
    toc: [],
    slugIndex: new Map(),
  } as CachedDocument);

  mockDocs.set('/circular/b.md', {
    metadata: {
      path: '/circular/b.md',
      title: 'Document B',
      lastModified: new Date(),
      contentHash: 'hash5',
      wordCount: 20,
      linkCount: 1,
      codeBlockCount: 0,
      lastAccessed: new Date(),
      cacheGeneration: 1,
      namespace: 'circular',
      keywords: ['document', 'circular'],
      fingerprintGenerated: new Date()
    },
    headings: [],
    toc: [],
    slugIndex: new Map(),
  } as CachedDocument);

  // Add content entries for documents
  mockContents.set('/api/tokens.md', 'Token management guide. References @/api/errors.md for error handling.');
  mockContents.set('/api/errors.md', 'Error handling documentation. No external references.');
  mockContents.set('/circular/a.md', 'Document A references @/circular/b.md');
  mockContents.set('/circular/b.md', 'Document B references @/circular/a.md');

  return {
    async getDocument(path: string) {
      return mockDocs.get(path) ?? null;
    },
    async getSectionContent(path: string, slug: string) {
      const doc = mockDocs.get(path);
      if (doc == null) {
        return null;
      }
      // Get section content from mock data
      const sections = mockSectionContents.get(path);
      return sections?.get(slug) ?? null;
    },
    cache: {
      async getDocument(path: string) {
        return mockDocs.get(path) ?? null;
      },
      async readDocumentContent(path: string) {
        return mockContents.get(path) ?? null;
      }
    }
  } as unknown as DocumentManager;
};

describe('ReferenceLoader', () => {
  let loader: ReferenceLoader;
  let mockManager: DocumentManager;

  beforeEach(() => {
    loader = new ReferenceLoader();
    mockManager = createMockDocumentManager();
  });

  describe('loadReferences', () => {
    it('should load basic references without recursion', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/api/auth.md',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md'
        } as NormalizedReference
      ];

      const hierarchy = await loader.loadReferences(refs, mockManager, 1, 0);

      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0]).toMatchObject({
        path: '/api/auth.md',
        title: 'Authentication Guide',
        depth: 0,
        namespace: 'api',
        children: expect.any(Array)
      });
      expect(hierarchy[0]?.content).toContain('Authentication guide');
    });

    it('should load section-specific content', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/api/auth.md#overview',
          resolvedPath: '/api/auth.md#overview',
          documentPath: '/api/auth.md',
          sectionSlug: 'overview'
        }
      ];

      const hierarchy = await loader.loadReferences(refs, mockManager, 1, 0);

      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0]).toMatchObject({
        path: '/api/auth.md',
        title: 'Overview',
        content: 'Authentication overview content',
        depth: 0
      });
    });

    it('should handle missing sections gracefully', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/api/auth.md#nonexistent',
          resolvedPath: '/api/auth.md#nonexistent',
          documentPath: '/api/auth.md',
          sectionSlug: 'nonexistent'
        }
      ];

      // Mock console.warn to verify warning is logged
      const originalWarn = console.warn;
      const warnMock = vi.fn();
      console.warn = warnMock;

      const hierarchy = await loader.loadReferences(refs, mockManager, 1, 0);

      expect(hierarchy).toHaveLength(0);
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('Section "nonexistent" not found in')
      );

      console.warn = originalWarn;
    });

    it('should handle missing documents gracefully', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/nonexistent/doc.md',
          resolvedPath: '/nonexistent/doc.md',
          documentPath: '/nonexistent/doc.md'
        } as NormalizedReference
      ];

      // Mock console.warn to verify warning is logged
      const originalWarn = console.warn;
      const warnMock = vi.fn();
      console.warn = warnMock;

      const hierarchy = await loader.loadReferences(refs, mockManager, 1, 0);

      expect(hierarchy).toHaveLength(0);
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('Document not found: /nonexistent/doc.md')
      );

      console.warn = originalWarn;
    });

    it('should load nested references recursively', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/api/auth.md',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md'
        } as NormalizedReference
      ];

      // Load with depth 3 to allow recursive loading
      const hierarchy = await loader.loadReferences(refs, mockManager, 3, 0);

      expect(hierarchy).toHaveLength(1);

      // Check root document
      const authDoc = hierarchy[0];
      expect(authDoc?.path).toBe('/api/auth.md');
      expect(authDoc?.children).toHaveLength(1);

      // Check nested document (tokens.md referenced from auth.md)
      const tokensDoc = authDoc?.children[0];
      expect(tokensDoc?.path).toBe('/api/tokens.md');
      expect(tokensDoc?.depth).toBe(1);
      expect(tokensDoc?.children).toHaveLength(1);

      // Check deeply nested document (errors.md referenced from tokens.md)
      const errorsDoc = tokensDoc?.children[0];
      expect(errorsDoc?.path).toBe('/api/errors.md');
      expect(errorsDoc?.depth).toBe(2);
      expect(errorsDoc?.children).toHaveLength(0); // No further references
    });

    it('should respect depth limits', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/api/auth.md',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md'
        } as NormalizedReference
      ];

      // Load with depth 1 to limit recursion
      const hierarchy = await loader.loadReferences(refs, mockManager, 1, 0);

      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0]?.children).toHaveLength(0); // No children due to depth limit
    });

    it('should detect and prevent circular references', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/circular/a.md',
          resolvedPath: '/circular/a.md',
          documentPath: '/circular/a.md'
        } as NormalizedReference
      ];

      // Mock console.warn to verify cycle detection
      const originalWarn = console.warn;
      const warnMock = vi.fn();
      console.warn = warnMock;

      const hierarchy = await loader.loadReferences(refs, mockManager, 3, 0);

      expect(hierarchy).toHaveLength(1);

      // Should have detected cycle and logged warning
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('Cycle detected for path:')
      );

      console.warn = originalWarn;
    });

    it('should handle empty reference array', async () => {
      const hierarchy = await loader.loadReferences([], mockManager, 3, 0);
      expect(hierarchy).toEqual([]);
    });

    it('should validate input parameters', async () => {
      const refs: NormalizedReference[] = [];

      await expect(loader.loadReferences(refs, mockManager, -1, 0)).rejects.toThrow(
        'maxDepth must be a non-negative number'
      );

      await expect(loader.loadReferences(refs, mockManager, 3, -1)).rejects.toThrow(
        'currentDepth must be a non-negative number'
      );
    });

    it('should handle non-array input gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hierarchy = await loader.loadReferences(null as any, mockManager, 3, 0);
      expect(hierarchy).toEqual([]);
    });

    it('should continue processing when individual references fail', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/nonexistent.md',
          resolvedPath: '/nonexistent.md',
          documentPath: '/nonexistent.md'
        } as NormalizedReference,
        {
          originalRef: '@/api/auth.md',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md'
        } as NormalizedReference
      ];

      const hierarchy = await loader.loadReferences(refs, mockManager, 1, 0);

      // Should successfully load the valid reference
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0]?.path).toBe('/api/auth.md');
    });
  });

  describe('loadReferencesFromContent', () => {
    it('should extract and load references from content', async () => {
      const content = 'Check @/api/auth.md and @/api/tokens.md for details.';
      const contextPath = '/current/doc.md';

      const hierarchy = await loader.loadReferencesFromContent(
        content,
        contextPath,
        mockManager,
        2
      );

      // With proper cycle prevention, /api/tokens.md is loaded as child of /api/auth.md
      // and won't be loaded again at top level (prevents exponential growth)
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0]?.path).toBe('/api/auth.md');

      // Verify /api/tokens.md is loaded as a child instead
      expect(hierarchy[0]?.children).toHaveLength(1);
      expect(hierarchy[0]?.children[0]?.path).toBe('/api/tokens.md');
    });

    it('should handle content with no references', async () => {
      const content = 'This content has no references.';
      const contextPath = '/current/doc.md';

      const hierarchy = await loader.loadReferencesFromContent(
        content,
        contextPath,
        mockManager
      );

      expect(hierarchy).toEqual([]);
    });

    it('should handle within-document references', async () => {
      const content = 'See @#overview section for details.';
      const contextPath = '/api/auth.md';

      const hierarchy = await loader.loadReferencesFromContent(
        content,
        contextPath,
        mockManager
      );

      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0]?.path).toBe('/api/auth.md');
      expect(hierarchy[0]?.title).toBe('Overview');
    });
  });

  describe('flattenHierarchy', () => {
    it('should flatten hierarchy to list of paths', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/api/auth.md',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md',
          sectionSlug: undefined
        }
      ];

      const hierarchy = await loader.loadReferences(refs, mockManager, 3, 0);
      const flattened = loader.flattenHierarchy(hierarchy);

      expect(flattened).toEqual([
        '/api/auth.md',
        '/api/tokens.md',
        '/api/errors.md'
      ]);
    });

    it('should handle empty hierarchy', () => {
      const flattened = loader.flattenHierarchy([]);
      expect(flattened).toEqual([]);
    });

    it('should maintain depth-first order', async () => {
      // Create a more complex hierarchy for testing order
      const hierarchy: HierarchicalContent[] = [
        {
          path: '/a.md',
          title: 'A',
          content: '',
          depth: 0,
          namespace: 'root',
          children: [
            {
              path: '/a1.md',
              title: 'A1',
              content: '',
              depth: 1,
              namespace: 'root',
              children: []
            },
            {
              path: '/a2.md',
              title: 'A2',
              content: '',
              depth: 1,
              namespace: 'root',
              children: []
            }
          ]
        },
        {
          path: '/b.md',
          title: 'B',
          content: '',
          depth: 0,
          namespace: 'root',
          children: []
        }
      ];

      const flattened = loader.flattenHierarchy(hierarchy);
      expect(flattened).toEqual(['/a.md', '/a1.md', '/a2.md', '/b.md']);
    });
  });

  describe('getHierarchyStats', () => {
    it('should calculate hierarchy statistics', async () => {
      const refs: NormalizedReference[] = [
        {
          originalRef: '@/api/auth.md',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md',
          sectionSlug: undefined
        }
      ];

      const hierarchy = await loader.loadReferences(refs, mockManager, 3, 0);
      const stats = loader.getHierarchyStats(hierarchy);

      expect(stats).toEqual({
        totalDocuments: 3,
        maxDepth: 2,
        namespaces: ['api']
      });
    });

    it('should handle empty hierarchy', () => {
      const stats = loader.getHierarchyStats([]);
      expect(stats).toEqual({
        totalDocuments: 0,
        maxDepth: 0,
        namespaces: []
      });
    });

    it('should handle multiple namespaces', () => {
      const hierarchy: HierarchicalContent[] = [
        {
          path: '/api/auth.md',
          title: 'Auth',
          content: '',
          depth: 0,
          namespace: 'api',
          children: []
        },
        {
          path: '/docs/guide.md',
          title: 'Guide',
          content: '',
          depth: 1,
          namespace: 'docs',
          children: []
        }
      ];

      const stats = loader.getHierarchyStats(hierarchy);
      expect(stats.namespaces).toEqual(['api', 'docs']);
    });

    it('should calculate correct max depth', () => {
      const hierarchy: HierarchicalContent[] = [
        {
          path: '/root.md',
          title: 'Root',
          content: '',
          depth: 0,
          namespace: 'root',
          children: [
            {
              path: '/level1.md',
              title: 'Level 1',
              content: '',
              depth: 1,
              namespace: 'root',
              children: [
                {
                  path: '/level2.md',
                  title: 'Level 2',
                  content: '',
                  depth: 2,
                  namespace: 'root',
                  children: []
                }
              ]
            }
          ]
        }
      ];

      const stats = loader.getHierarchyStats(hierarchy);
      expect(stats.maxDepth).toBe(2);
      expect(stats.totalDocuments).toBe(3);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle corrupted document manager responses', async () => {
      const brokenManager = {
        async getDocument() {
          throw new Error('Database connection failed');
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const refs: NormalizedReference[] = [
        {
          originalRef: '@/api/auth.md',
          resolvedPath: '/api/auth.md',
          documentPath: '/api/auth.md'
        } as NormalizedReference
      ];

      // Import and mock the logger
      const { getGlobalLogger } = await import('../../utils/logger.js');
      const logger = getGlobalLogger();
      const warnMock = vi.spyOn(logger, 'warn');

      const hierarchy = await loader.loadReferences(refs, brokenManager, 1, 0);

      expect(hierarchy).toEqual([]);
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load reference'),
        expect.objectContaining({ error: expect.any(String) })
      );

      warnMock.mockRestore();
    });

    it('should handle documents with malformed headings', async () => {
      const malformedManager = {
        async getDocument(path: string) {
          if (path === '/malformed.md') {
            return {
              metadata: {
                path: '/malformed.md',
                title: 'Malformed',
                lastModified: new Date(),
                contentHash: 'hash-malformed',
                wordCount: 10,
                linkCount: 0,
                codeBlockCount: 0,
                lastAccessed: new Date(),
                cacheGeneration: 1,
                namespace: 'root',
                keywords: [],
                fingerprintGenerated: new Date()
              },
              headings: [],
              toc: [],
              slugIndex: new Map()
            } as CachedDocument;
          }
          return null;
        },
        cache: {
          async getDocument(path: string) {
            if (path === '/malformed.md') {
              return {
                metadata: {
                  path: '/malformed.md',
                  title: 'Malformed',
                  lastModified: new Date(),
                  contentHash: 'hash-malformed',
                  wordCount: 10,
                  linkCount: 0,
                  codeBlockCount: 0,
                  lastAccessed: new Date(),
                  cacheGeneration: 1,
                  namespace: 'root',
                  keywords: [],
                  fingerprintGenerated: new Date()
                },
                headings: [],
                toc: [],
                slugIndex: new Map()
              } as CachedDocument;
            }
            return null;
          },
          async readDocumentContent() {
            return null;
          }
        }
      } as unknown as DocumentManager;

      const refs: NormalizedReference[] = [
        {
          originalRef: '@/malformed.md',
          resolvedPath: '/malformed.md',
          documentPath: '/malformed.md'
        } as NormalizedReference
      ];

      // Should handle gracefully without crashing
      const hierarchy = await loader.loadReferences(refs, malformedManager, 1, 0);
      // Document is loaded successfully even with no headings
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0]?.path).toBe('/malformed.md');
      expect(hierarchy[0]?.title).toBe('Malformed');
    });
  });
});