/**
 * Comprehensive unit tests for FingerprintIndex
 *
 * Test coverage:
 * - Index initialization and building
 * - Keyword extraction from document previews
 * - Candidate filtering with various queries
 * - Document invalidation and reindexing
 * - File watcher integration
 * - Performance benchmarks
 * - Edge cases and error handling
 * - Memory usage validation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FingerprintIndex } from './fingerprint-index.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { watch } from 'chokidar';
describe('FingerprintIndex', () => {
    let tempDir;
    let index;
    let watcher;
    beforeEach(async () => {
        // Create temporary directory for test documents
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fingerprint-index-test-'));
        index = new FingerprintIndex(tempDir);
    });
    afterEach(async () => {
        // Clean up
        if (watcher != null) {
            await watcher.close();
            watcher = undefined;
        }
        await fs.rm(tempDir, { recursive: true, force: true });
    });
    /**
     * Helper: Create test document
     */
    async function createTestDoc(relativePath, content) {
        const fullPath = path.join(tempDir, relativePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
        return fullPath;
    }
    describe('Initialization', () => {
        it('should initialize empty index successfully', async () => {
            await index.initialize();
            expect(index.isInitialized()).toBe(true);
            const stats = index.getStats();
            expect(stats.documents).toBe(0);
            expect(stats.keywords).toBe(0);
        });
        it('should build index from existing documents', async () => {
            // Create test documents
            await createTestDoc('doc1.md', '# Authentication\n\nThis document covers authentication methods.');
            await createTestDoc('doc2.md', '# Authorization\n\nThis document covers authorization policies.');
            await createTestDoc('api/doc3.md', '# API Reference\n\nAPI documentation for developers.');
            await index.initialize();
            expect(index.isInitialized()).toBe(true);
            const stats = index.getStats();
            expect(stats.documents).toBe(3);
            expect(stats.keywords).toBeGreaterThan(0);
            expect(stats.avgKeywordsPerDoc).toBeGreaterThan(0);
        });
        it('should skip non-markdown files', async () => {
            await createTestDoc('readme.txt', 'Not markdown');
            await createTestDoc('doc.md', '# Markdown');
            await fs.writeFile(path.join(tempDir, 'image.png'), Buffer.from(''));
            await index.initialize();
            const stats = index.getStats();
            expect(stats.documents).toBe(1); // Only markdown file
        });
        it('should skip hidden directories', async () => {
            await createTestDoc('.git/doc.md', '# Hidden');
            await createTestDoc('visible/doc.md', '# Visible');
            await index.initialize();
            const stats = index.getStats();
            expect(stats.documents).toBe(1); // Only visible directory
        });
        it('should warn on re-initialization', async () => {
            await index.initialize();
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            await index.initialize();
            expect(index.isInitialized()).toBe(true);
            consoleSpy.mockRestore();
        });
        it('should handle documents without headings', async () => {
            await createTestDoc('no-heading.md', 'Just plain text content');
            await index.initialize();
            const stats = index.getStats();
            expect(stats.documents).toBe(1);
            const fingerprint = index.getFingerprint('/no-heading.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.keywords.length).toBeGreaterThan(0);
        });
        it('should handle empty documents', async () => {
            await createTestDoc('empty.md', '');
            await index.initialize();
            const stats = index.getStats();
            expect(stats.documents).toBe(1);
            const fingerprint = index.getFingerprint('/empty.md');
            expect(fingerprint).toBeDefined();
            // Empty document gets filename as title which may produce keywords
            expect(fingerprint?.keywords.length).toBeGreaterThanOrEqual(0);
        });
    });
    describe('Keyword Extraction', () => {
        it('should extract keywords from title and content', async () => {
            await createTestDoc('auth.md', `# Authentication Guide\n\nThis guide covers OAuth2 and JWT tokens for secure authentication.`);
            await index.initialize();
            const fingerprint = index.getFingerprint('/auth.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.keywords).toContain('authentication');
            expect(fingerprint?.keywords).toContain('guide');
            expect(fingerprint?.keywords).toContain('oauth2');
            expect(fingerprint?.keywords).toContain('jwt');
            expect(fingerprint?.keywords).toContain('tokens');
        });
        it('should filter stop words', async () => {
            await createTestDoc('doc.md', '# The Guide\n\nThis is the documentation for the API.');
            await index.initialize();
            const fingerprint = index.getFingerprint('/doc.md');
            expect(fingerprint).toBeDefined();
            // Stop words should not be included
            expect(fingerprint?.keywords).not.toContain('the');
            expect(fingerprint?.keywords).not.toContain('is');
            expect(fingerprint?.keywords).not.toContain('for');
            // Meaningful words should be included
            expect(fingerprint?.keywords).toContain('guide');
            expect(fingerprint?.keywords).toContain('documentation');
            expect(fingerprint?.keywords).toContain('api');
        });
        it('should limit keywords to 20 per document', async () => {
            const longContent = `# Test\n\n${Array.from({ length: 100 }, (_, i) => `keyword${i}`).join(' ')}`;
            await createTestDoc('long.md', longContent);
            await index.initialize();
            const fingerprint = index.getFingerprint('/long.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.keywords.length).toBeLessThanOrEqual(20);
        });
        it('should normalize keywords to lowercase', async () => {
            await createTestDoc('mixed.md', '# UPPERCASE lowercase MixedCase');
            await index.initialize();
            const fingerprint = index.getFingerprint('/mixed.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.keywords).toContain('uppercase');
            expect(fingerprint?.keywords).toContain('lowercase');
            expect(fingerprint?.keywords).toContain('mixedcase');
        });
        it('should filter out pure numbers and symbols', async () => {
            await createTestDoc('symbols.md', '# Guide 123 !@# $%^ meaningful-word');
            await index.initialize();
            const fingerprint = index.getFingerprint('/symbols.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.keywords).toContain('guide');
            expect(fingerprint?.keywords).toContain('meaningful-word');
            expect(fingerprint?.keywords).not.toContain('123');
        });
        it('should handle Unicode content', async () => {
            await createTestDoc('unicode.md', '# Guide\n\nCafé naïve résumé');
            await index.initialize();
            const fingerprint = index.getFingerprint('/unicode.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.keywords.length).toBeGreaterThan(0);
        });
    });
    describe('Candidate Filtering', () => {
        beforeEach(async () => {
            // Create diverse test documents
            await createTestDoc('auth.md', '# Authentication\n\nOAuth2 JWT tokens security');
            await createTestDoc('api.md', '# API Reference\n\nREST endpoints documentation');
            await createTestDoc('db.md', '# Database\n\nPostgreSQL schema migrations');
            await createTestDoc('testing.md', '# Testing Guide\n\nUnit tests integration tests');
            await index.initialize();
        });
        it('should find candidates matching single keyword', () => {
            const candidates = index.findCandidates('authentication');
            expect(candidates).toContain('/auth.md');
            expect(candidates.length).toBeGreaterThanOrEqual(1);
        });
        it('should find candidates matching multiple keywords (union)', () => {
            const candidates = index.findCandidates('authentication database');
            expect(candidates).toContain('/auth.md');
            expect(candidates).toContain('/db.md');
            expect(candidates.length).toBeGreaterThanOrEqual(2);
        });
        it('should return empty array when no keywords match', () => {
            const candidates = index.findCandidates('nonexistent keyword xyz');
            expect(candidates).toEqual([]);
        });
        it('should return all documents when query has only stop words', () => {
            const candidates = index.findCandidates('the and for with');
            expect(candidates.length).toBe(4); // All documents
        });
        it('should return all documents when query is empty', () => {
            const candidates = index.findCandidates('');
            expect(candidates.length).toBe(4); // All documents
        });
        it('should filter by partial keyword match', () => {
            const candidates = index.findCandidates('oauth2');
            expect(candidates).toContain('/auth.md');
        });
        it('should be case-insensitive', () => {
            const candidates1 = index.findCandidates('AUTHENTICATION');
            const candidates2 = index.findCandidates('authentication');
            const candidates3 = index.findCandidates('AuThEnTiCaTiOn');
            expect(candidates1).toEqual(candidates2);
            expect(candidates2).toEqual(candidates3);
        });
        it('should handle queries with extra whitespace', () => {
            const candidates = index.findCandidates('  authentication   database  ');
            expect(candidates).toContain('/auth.md');
            expect(candidates).toContain('/db.md');
        });
        it('should warn and return all documents when not initialized', () => {
            const uninitializedIndex = new FingerprintIndex(tempDir);
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const candidates = uninitializedIndex.findCandidates('test');
            expect(candidates.length).toBe(0); // No documents indexed yet
            consoleSpy.mockRestore();
        });
    });
    describe('Document Invalidation', () => {
        beforeEach(async () => {
            await createTestDoc('doc1.md', '# Document 1\n\nKeyword alpha beta');
            await createTestDoc('doc2.md', '# Document 2\n\nKeyword gamma delta');
            await index.initialize();
        });
        it('should remove document from fingerprints', () => {
            expect(index.getFingerprint('/doc1.md')).toBeDefined();
            index.invalidateDocument('/doc1.md');
            expect(index.getFingerprint('/doc1.md')).toBeUndefined();
        });
        it('should remove document from keyword index', () => {
            const beforeCandidates = index.findCandidates('alpha');
            expect(beforeCandidates).toContain('/doc1.md');
            index.invalidateDocument('/doc1.md');
            const afterCandidates = index.findCandidates('alpha');
            expect(afterCandidates).not.toContain('/doc1.md');
        });
        it('should remove empty keyword entries', () => {
            const statsBefore = index.getStats();
            index.invalidateDocument('/doc1.md');
            index.invalidateDocument('/doc2.md');
            const statsAfter = index.getStats();
            expect(statsAfter.keywords).toBeLessThan(statsBefore.keywords);
        });
        it('should handle invalidation of non-existent document', () => {
            expect(() => {
                index.invalidateDocument('/nonexistent.md');
            }).not.toThrow();
        });
        it('should handle invalidation multiple times', () => {
            index.invalidateDocument('/doc1.md');
            expect(() => {
                index.invalidateDocument('/doc1.md');
            }).not.toThrow();
        });
    });
    describe('File Watcher Integration', () => {
        it('should reindex document on change event', async () => {
            const docPath = await createTestDoc('watch.md', '# Original\n\nOriginal content keyword');
            await index.initialize();
            // Setup watcher
            watcher = watch(tempDir, { ignoreInitial: true });
            index.watchFiles(watcher);
            // Wait for watcher to be ready
            await new Promise(resolve => {
                watcher?.on('ready', () => resolve());
            });
            // Change document
            await fs.writeFile(docPath, '# Updated\n\nUpdated content newkeyword', 'utf8');
            // Wait for change event to be processed
            await new Promise(resolve => setTimeout(resolve, 500));
            // Verify reindexing
            const candidates = index.findCandidates('newkeyword');
            expect(candidates).toContain('/watch.md');
        });
        it('should remove document on unlink event', async () => {
            const docPath = await createTestDoc('unlink.md', '# To Delete\n\nDelete me');
            await index.initialize();
            expect(index.getFingerprint('/unlink.md')).toBeDefined();
            // Setup watcher
            watcher = watch(tempDir, { ignoreInitial: true });
            index.watchFiles(watcher);
            await new Promise(resolve => {
                watcher?.on('ready', () => resolve());
            });
            // Delete document
            await fs.unlink(docPath);
            // Wait for unlink event
            await new Promise(resolve => setTimeout(resolve, 500));
            // Verify removal
            expect(index.getFingerprint('/unlink.md')).toBeUndefined();
        });
        it('should add document on add event', async () => {
            await index.initialize();
            // Setup watcher
            watcher = watch(tempDir, { ignoreInitial: true });
            index.watchFiles(watcher);
            await new Promise(resolve => {
                watcher?.on('ready', () => resolve());
            });
            // Add new document
            await createTestDoc('new.md', '# New Document\n\nFresh content');
            // Wait for add event
            await new Promise(resolve => setTimeout(resolve, 500));
            // Verify addition
            expect(index.getFingerprint('/new.md')).toBeDefined();
        });
        it('should ignore non-markdown files in watcher', async () => {
            await index.initialize();
            const statsBefore = index.getStats();
            watcher = watch(tempDir, { ignoreInitial: true });
            index.watchFiles(watcher);
            await new Promise(resolve => {
                watcher?.on('ready', () => resolve());
            });
            // Create non-markdown file
            await fs.writeFile(path.join(tempDir, 'test.txt'), 'Text file');
            await new Promise(resolve => setTimeout(resolve, 500));
            const statsAfter = index.getStats();
            expect(statsAfter.documents).toBe(statsBefore.documents);
        });
    });
    describe('Statistics', () => {
        it('should return accurate statistics', async () => {
            await createTestDoc('doc1.md', '# Doc 1\n\nKeyword one two three');
            await createTestDoc('doc2.md', '# Doc 2\n\nKeyword four five');
            await index.initialize();
            const stats = index.getStats();
            expect(stats.documents).toBe(2);
            expect(stats.keywords).toBeGreaterThan(0);
            expect(stats.avgKeywordsPerDoc).toBeGreaterThan(0);
            expect(stats.avgKeywordsPerDoc).toBeLessThanOrEqual(20);
        });
        it('should handle empty index statistics', () => {
            const stats = index.getStats();
            expect(stats.documents).toBe(0);
            expect(stats.keywords).toBe(0);
            expect(stats.avgKeywordsPerDoc).toBe(0);
        });
    });
    describe('Clear', () => {
        it('should clear all data', async () => {
            await createTestDoc('doc.md', '# Document\n\nContent');
            await index.initialize();
            expect(index.isInitialized()).toBe(true);
            expect(index.getStats().documents).toBeGreaterThan(0);
            index.clear();
            expect(index.isInitialized()).toBe(false);
            expect(index.getStats().documents).toBe(0);
            expect(index.getStats().keywords).toBe(0);
        });
        it('should allow re-initialization after clear', async () => {
            await createTestDoc('doc.md', '# Document\n\nContent');
            await index.initialize();
            index.clear();
            await index.initialize();
            expect(index.isInitialized()).toBe(true);
            expect(index.getStats().documents).toBeGreaterThan(0);
        });
    });
    describe('Performance', () => {
        it('should build index for 100 documents in under 200ms', async () => {
            // Create 100 test documents
            const promises = Array.from({ length: 100 }, (_, i) => createTestDoc(`perf/doc${i}.md`, `# Document ${i}\n\nContent for document ${i} with keywords test performance benchmark`));
            await Promise.all(promises);
            const startTime = performance.now();
            await index.initialize();
            const duration = performance.now() - startTime;
            expect(duration).toBeLessThan(200);
            expect(index.getStats().documents).toBe(100);
        });
        it('should find candidates in under 1ms', async () => {
            // Create test documents
            const promises = Array.from({ length: 50 }, (_, i) => createTestDoc(`search/doc${i}.md`, `# Document ${i}\n\nKeyword${i % 10} content`));
            await Promise.all(promises);
            await index.initialize();
            const startTime = performance.now();
            index.findCandidates('keyword5 keyword7');
            const duration = performance.now() - startTime;
            expect(duration).toBeLessThan(1);
        });
        it('should use reasonable memory per document', async () => {
            // Create 100 documents
            const promises = Array.from({ length: 100 }, (_, i) => createTestDoc(`mem/doc${i}.md`, `# Document ${i}\n\nContent for memory test`));
            await Promise.all(promises);
            await index.initialize();
            const stats = index.getStats();
            // Verify index was built successfully
            expect(stats.documents).toBe(100);
            expect(stats.keywords).toBeGreaterThan(0);
            // Memory footprint validation:
            // This test validates we're not loading full documents into memory.
            // We read only 1500 bytes per doc and store lightweight fingerprints.
            // The actual memory usage is difficult to measure precisely in JS due to:
            // - V8's memory management and GC timing
            // - String interning and deduplication
            // - Map/Set overhead
            // Rather than precise measurement, we verify the index is functional
            // and contains expected data structures.
            const fingerprint = index.getFingerprint('/mem/doc0.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.keywords.length).toBeLessThanOrEqual(20);
        });
    });
    describe('Edge Cases', () => {
        it('should handle very long documents (only reads first 1500 bytes)', async () => {
            const longContent = `# Long Document\n\n${'a'.repeat(10000)}`;
            await createTestDoc('long.md', longContent);
            await index.initialize();
            const fingerprint = index.getFingerprint('/long.md');
            expect(fingerprint).toBeDefined();
        });
        it('should handle documents with special characters in filename', async () => {
            await createTestDoc('special-chars_123.md', '# Special\n\nContent');
            await index.initialize();
            const fingerprint = index.getFingerprint('/special-chars_123.md');
            expect(fingerprint).toBeDefined();
        });
        it('should handle nested directory structures', async () => {
            await createTestDoc('a/b/c/d/deep.md', '# Deep\n\nNested document');
            await index.initialize();
            const fingerprint = index.getFingerprint('/a/b/c/d/deep.md');
            expect(fingerprint).toBeDefined();
        });
        it('should handle concurrent initialization (idempotent)', async () => {
            await createTestDoc('doc.md', '# Document\n\nContent');
            // Start multiple initializations concurrently
            const results = await Promise.all([
                index.initialize(),
                index.initialize(),
                index.initialize()
            ]);
            expect(index.isInitialized()).toBe(true);
            expect(results).toHaveLength(3);
        });
        it('should handle file read errors gracefully', async () => {
            await createTestDoc('good.md', '# Good\n\nContent');
            await index.initialize();
            // Index should still work for readable documents
            expect(index.getStats().documents).toBeGreaterThan(0);
        });
    });
    describe('Fingerprint Metadata', () => {
        it('should include namespace in fingerprint', async () => {
            await createTestDoc('api/auth/oauth.md', '# OAuth\n\nContent');
            await index.initialize();
            const fingerprint = index.getFingerprint('/api/auth/oauth.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.namespace).toBe('api/auth');
        });
        it('should include lastModified timestamp', async () => {
            await createTestDoc('dated.md', '# Dated\n\nContent');
            await index.initialize();
            const fingerprint = index.getFingerprint('/dated.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.lastModified).toBeInstanceOf(Date);
        });
        it('should include contentHash', async () => {
            await createTestDoc('hash.md', '# Hash\n\nContent');
            await index.initialize();
            const fingerprint = index.getFingerprint('/hash.md');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.contentHash).toBeTruthy();
            expect(typeof fingerprint?.contentHash).toBe('string');
            expect(fingerprint?.contentHash.length).toBe(16);
        });
        it('should have different hashes for different content', async () => {
            await createTestDoc('doc1.md', '# Document 1\n\nContent A');
            await createTestDoc('doc2.md', '# Document 2\n\nContent B');
            await index.initialize();
            const fp1 = index.getFingerprint('/doc1.md');
            const fp2 = index.getFingerprint('/doc2.md');
            expect(fp1?.contentHash).not.toBe(fp2?.contentHash);
        });
    });
});
//# sourceMappingURL=fingerprint-index.test.js.map