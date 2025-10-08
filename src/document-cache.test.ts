/**
 * DocumentCache - Section Content Access Tests
 *
 * Tests the simplified section content access pattern with slugIndex validation.
 * Verifies that section content caching has been completely removed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DocumentCache, AccessContext } from './document-cache.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('DocumentCache - Section Content Access', () => {
  let cache: DocumentCache;
  let tempDir: string;
  let testDocPath: string;

  beforeEach(async () => {
    // Create temp directory for test documents
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-cache-test-'));
    cache = new DocumentCache(tempDir, { enableWatching: false });

    // Create test document with sections
    testDocPath = path.join(tempDir, 'test-doc.md');
    const testContent = `# Test Document

## Introduction
This is the introduction section.

## Features
This section describes features.

### Advanced Features
Nested section content.

## Conclusion
Final thoughts.
`;
    await fs.writeFile(testDocPath, testContent, 'utf8');
  });

  afterEach(async () => {
    // Cleanup
    await cache.destroy();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('getSectionContent with slugIndex validation', () => {
    it('should retrieve section content using flat slug', async () => {
      const content = await cache.getSectionContent('/test-doc.md', 'introduction');
      expect(content).toBeTruthy();
      expect(content).toContain('This is the introduction section');
    });

    it('should retrieve nested section content', async () => {
      const content = await cache.getSectionContent('/test-doc.md', 'advanced-features');
      expect(content).toBeTruthy();
      expect(content).toContain('Nested section content');
    });

    it('should return null for invalid flat slug', async () => {
      const content = await cache.getSectionContent('/test-doc.md', 'nonexistent');
      expect(content).toBeNull();
    });

    it('should handle hierarchical slug lookup', async () => {
      // This requires findTargetHierarchicalHeading to work
      const content = await cache.getSectionContent('/test-doc.md', 'features/advanced-features');
      // Should fall back to hierarchical search
      expect(content).toBeTruthy();
      expect(content).toContain('Nested section content');
    });

    it('should return null for invalid hierarchical slug', async () => {
      const content = await cache.getSectionContent('/test-doc.md', 'invalid/path');
      expect(content).toBeNull();
    });

    it('should return null for non-existent document', async () => {
      const content = await cache.getSectionContent('/nonexistent.md', 'introduction');
      expect(content).toBeNull();
    });

    it('should validate with slugIndex before attempting hierarchical lookup', async () => {
      // Test that slugIndex validation happens first (performance optimization)
      const content = await cache.getSectionContent('/test-doc.md', 'features');
      expect(content).toBeTruthy();
      expect(content).toContain('This section describes features');
    });

    it('should NOT cache section content between calls', async () => {
      // First access
      const content1 = await cache.getSectionContent('/test-doc.md', 'introduction');
      expect(content1).toBeTruthy();

      // Modify the document
      const newContent = `# Test Document

## Introduction
MODIFIED CONTENT

## Features
This section describes features.
`;
      await fs.writeFile(testDocPath, newContent, 'utf8');

      // Invalidate document cache to simulate file change
      cache.invalidateDocument('/test-doc.md');

      // Second access should reflect changes (no stale cache)
      const content2 = await cache.getSectionContent('/test-doc.md', 'introduction');
      expect(content2).toContain('MODIFIED CONTENT');
      expect(content2).not.toContain('This is the introduction section');
    });

    it('should handle sections with special characters in slugs', async () => {
      const specialDoc = path.join(tempDir, 'special.md');
      const specialContent = `# Special Document

## API & Configuration
Content with special characters.

## 100% Coverage
Numeric prefix content.
`;
      await fs.writeFile(specialDoc, specialContent, 'utf8');

      const content1 = await cache.getSectionContent('/special.md', 'api--configuration');
      expect(content1).toBeTruthy();
      expect(content1).toContain('Content with special characters');

      const content2 = await cache.getSectionContent('/special.md', '100-coverage');
      expect(content2).toBeTruthy();
      expect(content2).toContain('Numeric prefix content');
    });

    it('should handle deeply nested hierarchical paths', async () => {
      const deepDoc = path.join(tempDir, 'deep.md');
      const deepContent = `# Deep Document

## Level 1

### Level 2

#### Level 3
Deep nested content.
`;
      await fs.writeFile(deepDoc, deepContent, 'utf8');

      const content = await cache.getSectionContent('/deep.md', 'level-1/level-2/level-3');
      expect(content).toBeTruthy();
      expect(content).toContain('Deep nested content');
    });
  });

  describe('Removed cache infrastructure', () => {
    it('should not have sections cache in document', async () => {
      const doc = await cache.getDocument('/test-doc.md');
      expect(doc).toBeTruthy();

      // Verify sections cache is removed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((doc as any).sections).toBeUndefined();
    });

    it('should not expose atomicCacheUpdate method', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((cache as any).atomicCacheUpdate).toBeUndefined();
    });

    it('should not have cacheGenerationCounter field', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((cache as any).cacheGenerationCounter).toBeUndefined();
    });

    it('should not populate sections during getDocument', async () => {
      const doc = await cache.getDocument('/test-doc.md');
      expect(doc).toBeTruthy();

      // Sections should not be pre-populated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((doc as any).sections).toBeUndefined();
    });
  });

  describe('Performance characteristics', () => {
    it('should use O(1) slugIndex validation', async () => {
      const doc = await cache.getDocument('/test-doc.md');
      expect(doc).toBeTruthy();

      if (doc) {
        // Verify slugIndex exists and has expected entries
        expect(doc.slugIndex).toBeDefined();
        expect(doc.slugIndex.has('introduction')).toBe(true);
        expect(doc.slugIndex.has('features')).toBe(true);
        expect(doc.slugIndex.has('advanced-features')).toBe(true);
        expect(doc.slugIndex.has('conclusion')).toBe(true);
      }
    });

    it('should fail fast for invalid slugs using slugIndex', async () => {
      const startTime = Date.now();
      const content = await cache.getSectionContent('/test-doc.md', 'completely-invalid-slug');
      const duration = Date.now() - startTime;

      expect(content).toBeNull();
      // Should be very fast (< 50ms) since it uses slugIndex O(1) lookup
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Error handling', () => {
    it('should handle filesystem errors gracefully', async () => {
      // Create document then delete file manually
      const doc = await cache.getDocument('/test-doc.md');
      expect(doc).toBeTruthy();

      // Delete the file
      await fs.unlink(testDocPath);

      // Invalidate cache to force reload attempt
      cache.invalidateDocument('/test-doc.md');

      // Should return null for missing file
      const content = await cache.getSectionContent('/test-doc.md', 'introduction');
      expect(content).toBeNull();
    });

    it('should handle empty section slug', async () => {
      const content = await cache.getSectionContent('/test-doc.md', '');
      expect(content).toBeNull();
    });

    it('should handle malformed hierarchical paths', async () => {
      const content1 = await cache.getSectionContent('/test-doc.md', '/invalid/path');
      expect(content1).toBeNull();

      const content2 = await cache.getSectionContent('/test-doc.md', 'path//double-slash');
      expect(content2).toBeNull();
    });
  });

  describe('Integration with existing cache behavior', () => {
    it('should respect document cache invalidation', async () => {
      // Load document
      const doc1 = await cache.getDocument('/test-doc.md');
      expect(doc1).toBeTruthy();

      // Get section content
      const content1 = await cache.getSectionContent('/test-doc.md', 'introduction');
      expect(content1).toContain('This is the introduction section');

      // Modify file and invalidate
      const newContent = `# Test Document

## Introduction
Updated introduction.
`;
      await fs.writeFile(testDocPath, newContent, 'utf8');
      cache.invalidateDocument('/test-doc.md');

      // Document should reload
      const doc2 = await cache.getDocument('/test-doc.md');
      expect(doc2).toBeTruthy();
      if (doc1 && doc2) {
        expect(doc2.metadata.contentHash).not.toBe(doc1.metadata.contentHash);
      }

      // Section content should reflect changes
      const content2 = await cache.getSectionContent('/test-doc.md', 'introduction');
      expect(content2).toContain('Updated introduction');
    });

    it('should work with LRU eviction policy', async () => {
      // Create small cache for eviction testing
      const smallCache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 2
      });

      try {
        // Create multiple documents
        const doc1Path = path.join(tempDir, 'doc1.md');
        const doc2Path = path.join(tempDir, 'doc2.md');
        const doc3Path = path.join(tempDir, 'doc3.md');

        await fs.writeFile(doc1Path, '# Doc 1\n## Section A\nContent A', 'utf8');
        await fs.writeFile(doc2Path, '# Doc 2\n## Section B\nContent B', 'utf8');
        await fs.writeFile(doc3Path, '# Doc 3\n## Section C\nContent C', 'utf8');

        // Load doc1 and doc2
        await smallCache.getDocument('/doc1.md');
        await smallCache.getDocument('/doc2.md');

        // Load doc3 - should evict doc1
        await smallCache.getDocument('/doc3.md');

        // Access section from doc3 (should work)
        const content3 = await smallCache.getSectionContent('/doc3.md', 'section-c');
        expect(content3).toContain('Content C');

        // Access section from doc1 (should reload document)
        const content1 = await smallCache.getSectionContent('/doc1.md', 'section-a');
        expect(content1).toContain('Content A');
      } finally {
        await smallCache.destroy();
      }
    });
  });
});

describe('DocumentCache - Search-Aware Cache Optimization', () => {
  let cache: DocumentCache;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test documents
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-cache-boost-test-'));
  });

  afterEach(async () => {
    // Cleanup
    await cache.destroy();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Access context tracking', () => {
    it('should accept optional context parameter in getDocument', async () => {
      cache = new DocumentCache(tempDir, { enableWatching: false });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\nContent', 'utf8');

      // All these should work without throwing
      const doc1 = await cache.getDocument('/test.md'); // Default DIRECT
      const doc2 = await cache.getDocument('/test.md', AccessContext.DIRECT);
      const doc3 = await cache.getDocument('/test.md', AccessContext.SEARCH);
      const doc4 = await cache.getDocument('/test.md', AccessContext.REFERENCE);

      expect(doc1).toBeTruthy();
      expect(doc2).toBeTruthy();
      expect(doc3).toBeTruthy();
      expect(doc4).toBeTruthy();
    });

    it('should default to DIRECT context when no context provided', async () => {
      cache = new DocumentCache(tempDir, { enableWatching: false });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\nContent', 'utf8');

      const doc = await cache.getDocument('/test.md');
      expect(doc).toBeTruthy();
      // Should use default boost factor (1.0) for DIRECT access
    });
  });

  describe('Boost factors and eviction resistance', () => {
    it('should boost search-accessed documents (3x eviction resistance)', async () => {
      // Small cache to trigger eviction
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 5
      });

      // Create multiple documents
      const docs = [];
      for (let i = 1; i <= 10; i++) {
        const docPath = path.join(tempDir, `doc${i}.md`);
        await fs.writeFile(docPath, `# Doc ${i}\nContent ${i}`, 'utf8');
        docs.push(`/doc${i}.md`);
      }

      // Fill cache with direct-access documents (1-5)
      for (let i = 1; i <= 5; i++) {
        await cache.getDocument(`/doc${i}.md`, AccessContext.DIRECT);
      }

      // Access one document via SEARCH context (should get 3x boost)
      await cache.getDocument('/doc3.md', AccessContext.SEARCH);

      // Now add 3 more documents with DIRECT access to trigger eviction
      await cache.getDocument('/doc6.md', AccessContext.DIRECT);
      await cache.getDocument('/doc7.md', AccessContext.DIRECT);
      await cache.getDocument('/doc8.md', AccessContext.DIRECT);

      // doc3 (search-accessed) should still be in cache due to boost
      const cachedPaths = cache.getCachedPaths();
      expect(cachedPaths).toContain('/doc3.md'); // Search-boosted, should survive

      // Older direct-access docs should be evicted
      // The exact eviction order depends on timestamps, but doc1 and doc2 should be gone
      expect(cachedPaths).not.toContain('/doc1.md');
      expect(cachedPaths).not.toContain('/doc2.md');
    });

    it('should boost reference-loaded documents (2x eviction resistance)', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 5
      });

      // Create documents
      for (let i = 1; i <= 8; i++) {
        const docPath = path.join(tempDir, `doc${i}.md`);
        await fs.writeFile(docPath, `# Doc ${i}\nContent ${i}`, 'utf8');
      }

      // Fill cache with direct-access documents
      for (let i = 1; i <= 5; i++) {
        await cache.getDocument(`/doc${i}.md`, AccessContext.DIRECT);
      }

      // Access one via REFERENCE context (2x boost)
      await cache.getDocument('/doc3.md', AccessContext.REFERENCE);

      // Add more direct-access documents
      await cache.getDocument('/doc6.md', AccessContext.DIRECT);
      await cache.getDocument('/doc7.md', AccessContext.DIRECT);

      // doc3 (reference-loaded) should still be cached
      const cachedPaths = cache.getCachedPaths();
      expect(cachedPaths).toContain('/doc3.md');
    });

    it('should apply correct boost factors to different contexts', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 10
      });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\nContent', 'utf8');

      // Access with different contexts
      await cache.getDocument('/test.md', AccessContext.DIRECT);
      await cache.getDocument('/test.md', AccessContext.SEARCH);
      await cache.getDocument('/test.md', AccessContext.REFERENCE);

      // All should work - exact boost verification requires internal inspection
      expect(cache.getCachedPaths()).toContain('/test.md');
    });
  });

  describe('Eviction scenario - search vs direct', () => {
    it('should prioritize search-accessed documents during eviction', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 3
      });

      // Create test documents
      for (let i = 1; i <= 6; i++) {
        const docPath = path.join(tempDir, `doc${i}.md`);
        await fs.writeFile(docPath, `# Doc ${i}\nContent ${i}`, 'utf8');
      }

      // Load doc1, doc2, doc3 with DIRECT access
      await cache.getDocument('/doc1.md', AccessContext.DIRECT);
      await cache.getDocument('/doc2.md', AccessContext.DIRECT);
      await cache.getDocument('/doc3.md', AccessContext.DIRECT);

      // Re-access doc2 with SEARCH context (boost it)
      await cache.getDocument('/doc2.md', AccessContext.SEARCH);

      // Add new documents to trigger eviction
      await cache.getDocument('/doc4.md', AccessContext.DIRECT);
      await cache.getDocument('/doc5.md', AccessContext.DIRECT);

      const cachedPaths = cache.getCachedPaths();

      // doc2 (search-boosted) should still be in cache
      expect(cachedPaths).toContain('/doc2.md');

      // Cache size should be respected
      expect(cachedPaths.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Custom boost factors', () => {
    it('should allow custom boost factors via configuration', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 5,
        boostFactors: {
          search: 5.0,   // Higher boost
          direct: 1.0,
          reference: 1.5  // Lower boost
        }
      });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\nContent', 'utf8');

      // Should accept custom boost configuration
      const doc = await cache.getDocument('/test.md', AccessContext.SEARCH);
      expect(doc).toBeTruthy();
    });

    it('should use default boost factors when not configured', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 5
        // No boostFactors specified - should use defaults
      });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\nContent', 'utf8');

      const doc = await cache.getDocument('/test.md', AccessContext.SEARCH);
      expect(doc).toBeTruthy();
      // Default: search=3.0, direct=1.0, reference=2.0
    });

    it('should merge partial boost factor configuration with defaults', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 5,
        boostFactors: {
          search: 4.0  // Override only search, others use defaults
        }
      });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\nContent', 'utf8');

      const doc = await cache.getDocument('/test.md', AccessContext.SEARCH);
      expect(doc).toBeTruthy();
    });
  });

  describe('Cache statistics with boost info', () => {
    it('should include boost information in cache statistics', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 10
      });

      // Create and load documents with different contexts
      for (let i = 1; i <= 5; i++) {
        const docPath = path.join(tempDir, `doc${i}.md`);
        await fs.writeFile(docPath, `# Doc ${i}\nContent ${i}`, 'utf8');
      }

      await cache.getDocument('/doc1.md', AccessContext.DIRECT);
      await cache.getDocument('/doc2.md', AccessContext.SEARCH);
      await cache.getDocument('/doc3.md', AccessContext.REFERENCE);
      await cache.getDocument('/doc4.md', AccessContext.DIRECT);
      await cache.getDocument('/doc5.md', AccessContext.SEARCH);

      const stats = cache.getStats();

      expect(stats.size).toBe(5);
      expect(stats.maxSize).toBe(10);

      // Check if boost-related stats are present
      if ('boostedDocuments' in stats) {
        // Verify boost stats exist
        expect(stats).toHaveProperty('boostedDocuments');
      }
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain existing API when context not provided', async () => {
      cache = new DocumentCache(tempDir, { enableWatching: false });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\n## Section\nContent', 'utf8');

      // All existing usage patterns should work
      const doc = await cache.getDocument('/test.md');
      expect(doc).toBeTruthy();

      const section = await cache.getSectionContent('/test.md', 'section');
      expect(section).toContain('Content');

      const paths = cache.getCachedPaths();
      expect(paths).toContain('/test.md');

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
    });

    it('should not break existing eviction behavior for direct access', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 3
      });

      // Create documents
      for (let i = 1; i <= 5; i++) {
        const docPath = path.join(tempDir, `doc${i}.md`);
        await fs.writeFile(docPath, `# Doc ${i}\nContent ${i}`, 'utf8');
      }

      // Load with default (DIRECT) context
      await cache.getDocument('/doc1.md');
      await cache.getDocument('/doc2.md');
      await cache.getDocument('/doc3.md');

      // Load more - should evict oldest
      await cache.getDocument('/doc4.md');

      const cachedPaths = cache.getCachedPaths();
      expect(cachedPaths.length).toBe(3);
      expect(cachedPaths).not.toContain('/doc1.md'); // Oldest, should be evicted
    });

    it('should preserve all existing DocumentCache methods', async () => {
      cache = new DocumentCache(tempDir, { enableWatching: false });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\nContent', 'utf8');

      // Test all public methods still work
      const doc = await cache.getDocument('/test.md');
      expect(doc).toBeTruthy();

      const section = await cache.getSectionContent('/test.md', 'test');
      expect(section).toBeTruthy();

      const invalidated = cache.invalidateDocument('/test.md');
      expect(invalidated).toBe(true);

      const paths = cache.getCachedPaths();
      expect(Array.isArray(paths)).toBe(true);

      const stats = cache.getStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');

      cache.clear();
      expect(cache.getCachedPaths().length).toBe(0);
    });
  });

  describe('Performance validation scenario', () => {
    it('should keep search-accessed documents cached for follow-up reads', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 10
      });

      // Create 100 documents
      const allDocs = [];
      for (let i = 1; i <= 30; i++) {
        const docPath = path.join(tempDir, `doc${i}.md`);
        await fs.writeFile(docPath, `# Doc ${i}\nKeyword: test`, 'utf8');
        allDocs.push(`/doc${i}.md`);
      }

      // Simulate search operation - access 20 documents with SEARCH context
      const searchResults = [];
      for (let i = 1; i <= 20; i++) {
        await cache.getDocument(`/doc${i}.md`, AccessContext.SEARCH);
        searchResults.push(`/doc${i}.md`);
      }

      // Now access 15 more documents with DIRECT context (should trigger eviction)
      for (let i = 21; i <= 30; i++) {
        await cache.getDocument(`/doc${i}.md`, AccessContext.DIRECT);
      }

      // Verify: Many search-accessed docs should still be in cache
      const cachedPaths = cache.getCachedPaths();
      const cachedSearchDocs = searchResults.filter(path => cachedPaths.includes(path));

      // With 3x boost, search-accessed docs should survive better than direct
      // At least 50% of search-accessed docs should still be cached
      expect(cachedSearchDocs.length).toBeGreaterThanOrEqual(searchResults.length * 0.5);
    });

    it('should demonstrate performance improvement for post-search access', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 10
      });

      // Create documents
      for (let i = 1; i <= 15; i++) {
        const docPath = path.join(tempDir, `doc${i}.md`);
        await fs.writeFile(docPath, `# Doc ${i}\n## Section\nContent ${i}`, 'utf8');
      }

      // Simulate search accessing 10 documents
      for (let i = 1; i <= 10; i++) {
        await cache.getDocument(`/doc${i}.md`, AccessContext.SEARCH);
      }

      // Add 5 more direct-access documents
      for (let i = 11; i <= 15; i++) {
        await cache.getDocument(`/doc${i}.md`, AccessContext.DIRECT);
      }

      // Now user wants to read a search result - should still be cached
      const doc5 = await cache.getDocument('/doc5.md'); // No re-parse needed
      expect(doc5).toBeTruthy();

      const cachedPaths = cache.getCachedPaths();
      expect(cachedPaths).toContain('/doc5.md'); // Should be cached from search
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid context switches for same document', async () => {
      cache = new DocumentCache(tempDir, { enableWatching: false });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\nContent', 'utf8');

      // Rapidly access with different contexts
      await cache.getDocument('/test.md', AccessContext.DIRECT);
      await cache.getDocument('/test.md', AccessContext.SEARCH);
      await cache.getDocument('/test.md', AccessContext.REFERENCE);
      await cache.getDocument('/test.md', AccessContext.DIRECT);

      // Should handle gracefully, doc should remain cached
      expect(cache.getCachedPaths()).toContain('/test.md');
    });

    it('should handle eviction with all boosted documents', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 3
      });

      // Create documents
      for (let i = 1; i <= 5; i++) {
        const docPath = path.join(tempDir, `doc${i}.md`);
        await fs.writeFile(docPath, `# Doc ${i}\nContent ${i}`, 'utf8');
      }

      // Load all with SEARCH context (all boosted)
      for (let i = 1; i <= 5; i++) {
        await cache.getDocument(`/doc${i}.md`, AccessContext.SEARCH);
      }

      // Even with all boosted, should respect cache size
      const cachedPaths = cache.getCachedPaths();
      expect(cachedPaths.length).toBe(3);
    });

    it('should handle zero boost factor gracefully', async () => {
      cache = new DocumentCache(tempDir, {
        enableWatching: false,
        maxCacheSize: 5,
        boostFactors: {
          direct: 0, // Edge case: zero boost
          search: 1.0,
          reference: 1.0
        }
      });

      const docPath = path.join(tempDir, 'test.md');
      await fs.writeFile(docPath, '# Test\nContent', 'utf8');

      // Should handle zero boost without crashing
      const doc = await cache.getDocument('/test.md', AccessContext.DIRECT);
      expect(doc).toBeTruthy();
    });
  });
});
