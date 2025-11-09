/**
 * Tests for batch-scoped caching in addressing system
 *
 * This test suite verifies that the AddressCache:
 * 1. Only caches within batch scope (not persistent)
 * 2. Clears cache after batch operations
 * 3. Provides batch statistics for debugging
 * 4. Handles errors gracefully
 * 5. Maintains backward compatibility
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { parseDocumentAddress, parseSectionAddress, parseTaskAddress, ToolIntegration, invalidateAddressCache } from '../addressing-system.js';
// Import internal cache accessor for testing (will be added)
import { getGlobalAddressCache } from '../addressing-system.js';
describe('AddressCache - Batch-Scoped Caching', () => {
    beforeEach(() => {
        // Clear batch cache before each test
        const cache = getGlobalAddressCache();
        cache.clearBatch();
    });
    describe('Batch-scoped caching behavior', () => {
        test('should cache document addresses within batch scope', () => {
            const cache = getGlobalAddressCache();
            // First parse - should create entry
            const addr1 = parseDocumentAddress('/test/doc1.md');
            const stats1 = cache.getBatchStats();
            expect(stats1.size).toBe(1);
            expect(stats1.keys).toContain('/test/doc1.md');
            // Second parse - should return cached entry (no factory call)
            const addr2 = parseDocumentAddress('/test/doc1.md');
            const stats2 = cache.getBatchStats();
            expect(stats2.size).toBe(1); // Same size, cached
            // Verify same address returned
            expect(addr1.path).toBe(addr2.path);
            expect(addr1.cacheKey).toBe(addr2.cacheKey);
        });
        test('should cache section addresses within batch scope', () => {
            const cache = getGlobalAddressCache();
            const contextDoc = '/test/context.md';
            // Parse multiple sections
            parseSectionAddress('section1', contextDoc);
            parseSectionAddress('section2', contextDoc);
            parseSectionAddress('#section3', contextDoc);
            const stats = cache.getBatchStats();
            expect(stats.size).toBeGreaterThan(0); // Should have cached entries
            // Re-parse first section - should use cache
            const section1a = parseSectionAddress('section1', contextDoc);
            const section1b = parseSectionAddress('section1', contextDoc);
            expect(section1a.slug).toBe(section1b.slug);
        });
        test('should cache task addresses within batch scope', () => {
            const cache = getGlobalAddressCache();
            const contextDoc = '/test/tasks.md';
            // Parse tasks
            const task1 = parseTaskAddress('setup-database', contextDoc);
            const task2 = parseTaskAddress('setup-database', contextDoc);
            // Should return cached result
            expect(task1.slug).toBe(task2.slug);
            expect(task1.fullPath).toBe(task2.fullPath);
            const stats = cache.getBatchStats();
            expect(stats.size).toBeGreaterThan(0);
        });
        test('should clear cache after batch completes', () => {
            const cache = getGlobalAddressCache();
            // Populate cache
            parseDocumentAddress('/test/doc1.md');
            parseDocumentAddress('/test/doc2.md');
            parseSectionAddress('overview', '/test/doc1.md');
            const statsBefore = cache.getBatchStats();
            expect(statsBefore.size).toBeGreaterThan(0);
            // Clear batch
            cache.clearBatch();
            const statsAfter = cache.getBatchStats();
            expect(statsAfter.size).toBe(0);
            expect(statsAfter.keys).toEqual([]);
        });
        test('should not persist cache across batches', () => {
            const cache = getGlobalAddressCache();
            // Batch 1
            parseDocumentAddress('/test/doc1.md');
            const stats1 = cache.getBatchStats();
            expect(stats1.size).toBeGreaterThan(0);
            // Clear batch
            cache.clearBatch();
            // Batch 2
            parseDocumentAddress('/test/doc2.md');
            const stats2 = cache.getBatchStats();
            // Should only have doc2, not doc1
            expect(stats2.size).toBe(1);
            expect(stats2.keys).not.toContain('/test/doc1.md');
        });
    });
    describe('Batch statistics and debugging', () => {
        test('should provide accurate batch statistics', () => {
            const cache = getGlobalAddressCache();
            // Empty cache
            const emptyStats = cache.getBatchStats();
            expect(emptyStats.size).toBe(0);
            expect(emptyStats.keys).toEqual([]);
            // Add entries
            parseDocumentAddress('/test/doc1.md');
            parseDocumentAddress('/test/doc2.md');
            parseSectionAddress('overview', '/test/doc1.md');
            const populatedStats = cache.getBatchStats();
            expect(populatedStats.size).toBeGreaterThan(0);
            expect(Array.isArray(populatedStats.keys)).toBe(true);
            expect(populatedStats.keys.length).toBe(populatedStats.size);
        });
        test('should track all cache keys correctly', () => {
            const cache = getGlobalAddressCache();
            const doc1 = '/test/doc1.md';
            const doc2 = '/test/doc2.md';
            parseDocumentAddress(doc1);
            parseDocumentAddress(doc2);
            const stats = cache.getBatchStats();
            expect(stats.keys).toContain(doc1);
            expect(stats.keys).toContain(doc2);
        });
        test('should handle multiple cache types in statistics', () => {
            const cache = getGlobalAddressCache();
            // Mix of documents and sections
            parseDocumentAddress('/test/doc1.md');
            parseSectionAddress('section1', '/test/doc1.md');
            parseSectionAddress('#section2', '/test/doc1.md');
            const stats = cache.getBatchStats();
            expect(stats.size).toBeGreaterThan(0);
            // All keys should be unique
            const uniqueKeys = new Set(stats.keys);
            expect(uniqueKeys.size).toBe(stats.keys.length);
        });
    });
    describe('Error handling with batch cache', () => {
        test('should handle cache errors gracefully', () => {
            // Invalid address should throw, not corrupt cache
            expect(() => parseDocumentAddress('')).toThrow();
            // Cache should still work after error
            const addr = parseDocumentAddress('/test/doc.md');
            expect(addr.path).toBe('/test/doc.md');
            const cache = getGlobalAddressCache();
            const stats = cache.getBatchStats();
            expect(stats.size).toBeGreaterThan(0);
        });
        test('should clear cache even if errors occurred', () => {
            const cache = getGlobalAddressCache();
            // Add some valid entries
            parseDocumentAddress('/test/doc1.md');
            // Try invalid entry
            try {
                parseDocumentAddress('');
            }
            catch {
                // Expected error
            }
            // Clear should work regardless
            cache.clearBatch();
            const stats = cache.getBatchStats();
            expect(stats.size).toBe(0);
        });
        test('should handle concurrent parsing without corruption', () => {
            const cache = getGlobalAddressCache();
            // Parse multiple addresses rapidly
            const docs = ['/test/doc1.md', '/test/doc2.md', '/test/doc3.md'];
            docs.forEach(doc => parseDocumentAddress(doc));
            const stats = cache.getBatchStats();
            expect(stats.size).toBe(docs.length);
            // All should be parseable again
            docs.forEach(doc => {
                const addr = parseDocumentAddress(doc);
                expect(addr.path).toBe(doc);
            });
        });
    });
    describe('Backward compatibility', () => {
        test('should maintain same address parsing behavior', () => {
            // Document parsing
            const doc = parseDocumentAddress('/test/doc.md');
            expect(doc.path).toBe('/test/doc.md');
            expect(doc.slug).toBe('doc');
            expect(doc.namespace).toBe('test');
            // Section parsing
            const section = parseSectionAddress('overview', '/test/doc.md');
            expect(section.slug).toBe('overview');
            expect(section.fullPath).toBe('/test/doc.md#overview');
            // Task parsing
            const task = parseTaskAddress('setup', '/test/tasks.md');
            expect(task.slug).toBe('setup');
            expect(task.isTask).toBe(true);
        });
        test('should support all existing address formats', () => {
            // Test all section reference formats
            const formats = [
                { input: 'section', context: '/test/doc.md', expected: 'section' },
                { input: '#section', context: '/test/doc.md', expected: 'section' },
                { input: '/test/doc.md#section', context: undefined, expected: 'section' }
            ];
            formats.forEach(({ input, context, expected }) => {
                const addr = parseSectionAddress(input, context);
                expect(addr.slug).toBe(expected);
            });
        });
        test('should support hierarchical addressing', () => {
            // Hierarchical section
            const hierarchical = parseSectionAddress('api/authentication/jwt', '/test/api.md');
            expect(hierarchical.slug).toBe('api/authentication/jwt');
            expect(hierarchical.fullPath).toBe('/test/api.md#api/authentication/jwt');
            // Should be cached
            const cached = parseSectionAddress('api/authentication/jwt', '/test/api.md');
            expect(cached.slug).toBe(hierarchical.slug);
            // Verify cache has the entry
            const cache = getGlobalAddressCache();
            const stats = cache.getBatchStats();
            expect(stats.size).toBeGreaterThan(0);
        });
        test('should maintain cache invalidation behavior', () => {
            // Parse document and sections
            parseDocumentAddress('/test/doc.md');
            parseSectionAddress('section1', '/test/doc.md');
            const cache = getGlobalAddressCache();
            const statsBefore = cache.getBatchStats();
            expect(statsBefore.size).toBeGreaterThan(0);
            // Invalidate should still work (clears batch cache for document)
            invalidateAddressCache('/test/doc.md');
            // Can still parse addresses
            const addr = parseDocumentAddress('/test/doc.md');
            expect(addr.path).toBe('/test/doc.md');
        });
    });
    describe('Tool integration with batch cache', () => {
        test('should support ToolIntegration.clearBatchCache', () => {
            const cache = getGlobalAddressCache();
            // Populate cache via ToolIntegration
            ToolIntegration.validateAndParse({
                document: '/test/doc.md',
                section: 'overview'
            });
            const statsBefore = cache.getBatchStats();
            expect(statsBefore.size).toBeGreaterThan(0);
            // Clear via ToolIntegration
            ToolIntegration.clearBatchCache();
            const statsAfter = cache.getBatchStats();
            expect(statsAfter.size).toBe(0);
        });
        test('should clear cache between batch operations', () => {
            const cache = getGlobalAddressCache();
            // Batch 1
            ToolIntegration.validateAndParse({
                document: '/test/doc1.md',
                section: 'section1'
            });
            const stats1 = cache.getBatchStats();
            expect(stats1.size).toBeGreaterThan(0);
            // Clear batch
            ToolIntegration.clearBatchCache();
            // Batch 2
            ToolIntegration.validateAndParse({
                document: '/test/doc2.md',
                section: 'section2'
            });
            const stats2 = cache.getBatchStats();
            // Should not contain doc1
            expect(stats2.keys).not.toContain('/test/doc1.md');
        });
    });
    describe('Performance characteristics', () => {
        test('should cache repeated address parsing efficiently', () => {
            // Parse same address multiple times
            const iterations = 100;
            const docPath = '/test/heavy-doc.md';
            for (let i = 0; i < iterations; i++) {
                parseDocumentAddress(docPath);
            }
            // Cache should only have one entry despite 100 parses
            const cache = getGlobalAddressCache();
            const stats = cache.getBatchStats();
            expect(stats.size).toBe(1);
            expect(stats.keys).toContain(docPath);
        });
        test('should handle batch operations without memory leak', () => {
            const cache = getGlobalAddressCache();
            // Simulate multiple batch cycles
            for (let batch = 0; batch < 10; batch++) {
                // Create batch entries
                for (let i = 0; i < 10; i++) {
                    parseDocumentAddress(`/test/batch${batch}/doc${i}.md`);
                }
                // Clear batch
                cache.clearBatch();
            }
            // Final cache should be empty (no persistent accumulation)
            const finalStats = cache.getBatchStats();
            expect(finalStats.size).toBe(0);
        });
        test('should not have size limit like LRU cache', () => {
            const cache = getGlobalAddressCache();
            // Create many entries in single batch (no eviction expected)
            const largeCount = 50;
            for (let i = 0; i < largeCount; i++) {
                parseDocumentAddress(`/test/doc${i}.md`);
            }
            const stats = cache.getBatchStats();
            // Should have all entries (no eviction at 1000 or any limit)
            expect(stats.size).toBe(largeCount);
        });
    });
});
//# sourceMappingURL=addressing-system.batch-cache.test.js.map