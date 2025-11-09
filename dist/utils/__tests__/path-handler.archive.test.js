/**
 * TDD tests for archive path generation with /archived/docs/ prefix
 *
 * These tests verify that documents archive to /archived/docs/ to preserve source context
 * and distinguish documents from coordinator tasks in archives.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DocumentManager } from '../../document-manager.js';
import { DocumentCache } from '../../document-cache.js';
describe('Archive Path Generation with /archived/docs/ prefix', () => {
    let cache;
    let manager;
    let tempDir;
    let testDocsRoot;
    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archive-path-test-'));
        testDocsRoot = tempDir;
        // Configure environment
        process.env['MCP_WORKSPACE_PATH'] = tempDir;
        cache = new DocumentCache(testDocsRoot);
        // Explicitly pass archivedBasePath to ensure it uses test directory
        const archivedBasePath = path.join(testDocsRoot, 'archived');
        manager = new DocumentManager(testDocsRoot, cache, undefined, archivedBasePath);
    });
    afterEach(async () => {
        await cache.destroy();
        // Clean up temporary directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch {
            // Ignore if directory doesn't exist
        }
    });
    describe('Simple root-level document paths', () => {
        it('should archive /readme.md to /archived/docs/readme.md', async () => {
            // Create test document WITHOUT /docs/ prefix (as it's in workspace root)
            const absPath = path.join(testDocsRoot, 'readme.md');
            await fs.writeFile(absPath, '# README\n\nTest content.', 'utf8');
            // Archive the document
            const result = await manager.archiveDocument('/readme.md');
            // Verify archive path includes /archived/docs/ prefix (now absolute)
            const expectedArchivePath = path.join(testDocsRoot, 'archived/docs/readme.md');
            expect(result.archivePath).toBe(expectedArchivePath);
            // Verify file exists at correct location
            await expect(fs.access(expectedArchivePath)).resolves.not.toThrow();
            // Verify audit file exists
            const auditPath = path.join(testDocsRoot, 'archived/docs/readme.md.audit');
            await expect(fs.access(auditPath)).resolves.not.toThrow();
        });
    });
    describe('Single-level namespace paths', () => {
        it('should archive /api/auth.md to /archived/docs/api/auth.md', async () => {
            // Create test document in api namespace (workspace root, not under docs/)
            await fs.mkdir(path.join(testDocsRoot, 'api'), { recursive: true });
            const absPath = path.join(testDocsRoot, 'api/auth.md');
            await fs.writeFile(absPath, '# Authentication\n\nAuth docs.', 'utf8');
            // Archive the document
            const result = await manager.archiveDocument('/api/auth.md');
            // Verify archive path includes /archived/docs/ prefix and preserves namespace (now absolute)
            const expectedArchivePath = path.join(testDocsRoot, 'archived/docs/api/auth.md');
            expect(result.archivePath).toBe(expectedArchivePath);
            // Verify file exists at correct location
            await expect(fs.access(expectedArchivePath)).resolves.not.toThrow();
            // Verify audit file exists
            const auditPath = path.join(testDocsRoot, 'archived/docs/api/auth.md.audit');
            await expect(fs.access(auditPath)).resolves.not.toThrow();
        });
    });
    describe('Multi-level nested namespace paths', () => {
        it('should archive /api/v2/endpoints/users.md to /archived/docs/api/v2/endpoints/users.md', async () => {
            // Create test document in nested namespace
            await fs.mkdir(path.join(testDocsRoot, 'api/v2/endpoints'), { recursive: true });
            const absPath = path.join(testDocsRoot, 'api/v2/endpoints/users.md');
            await fs.writeFile(absPath, '# Users API\n\nUser endpoints.', 'utf8');
            // Archive the document
            const result = await manager.archiveDocument('/api/v2/endpoints/users.md');
            // Verify archive path includes /archived/docs/ prefix and preserves full namespace (now absolute)
            const expectedArchivePath = path.join(testDocsRoot, 'archived/docs/api/v2/endpoints/users.md');
            expect(result.archivePath).toBe(expectedArchivePath);
            // Verify file exists at correct location
            await expect(fs.access(expectedArchivePath)).resolves.not.toThrow();
            // Verify audit file exists
            const auditPath = path.join(testDocsRoot, 'archived/docs/api/v2/endpoints/users.md.audit');
            await expect(fs.access(auditPath)).resolves.not.toThrow();
        });
    });
    describe('Duplicate handling with /docs/ prefix', () => {
        it('should handle duplicate archives with counter suffix', async () => {
            // Create test document in api namespace
            await fs.mkdir(path.join(testDocsRoot, 'api'), { recursive: true });
            const absPath = path.join(testDocsRoot, 'api/test.md');
            await fs.writeFile(absPath, '# Test 1\n\nFirst version.', 'utf8');
            // First archive
            const result1 = await manager.archiveDocument('/api/test.md');
            const expectedArchivePath1 = path.join(testDocsRoot, 'archived/docs/api/test.md');
            expect(result1.archivePath).toBe(expectedArchivePath1);
            // Create same document again
            await fs.writeFile(absPath, '# Test 2\n\nSecond version.', 'utf8');
            // Second archive - should get counter suffix
            const result2 = await manager.archiveDocument('/api/test.md');
            const expectedArchivePath2 = path.join(testDocsRoot, 'archived/docs/api/test_1.md');
            expect(result2.archivePath).toBe(expectedArchivePath2);
            // Verify both files exist
            const archivePath1 = path.join(testDocsRoot, 'archived/docs/api/test.md');
            const archivePath2 = path.join(testDocsRoot, 'archived/docs/api/test_1.md');
            await expect(fs.access(archivePath1)).resolves.not.toThrow();
            await expect(fs.access(archivePath2)).resolves.not.toThrow();
        });
    });
    describe('Audit trail verification', () => {
        it('should create audit file with correct original path reference', async () => {
            // Create test document in api namespace
            await fs.mkdir(path.join(testDocsRoot, 'api'), { recursive: true });
            const absPath = path.join(testDocsRoot, 'api/spec.md');
            await fs.writeFile(absPath, '# Spec\n\nAPI specification.', 'utf8');
            // Archive the document
            await manager.archiveDocument('/api/spec.md');
            // Read and verify audit file
            const auditPath = path.join(testDocsRoot, 'archived/docs/api/spec.md.audit');
            const auditContent = await fs.readFile(auditPath, 'utf8');
            const auditInfo = JSON.parse(auditContent);
            expect(auditInfo['originalPath']).toBe('/api/spec.md');
            expect(auditInfo['type']).toBe('file');
            expect(auditInfo['archivedBy']).toBe('MCP Document Manager');
            expect(auditInfo['archivedAt']).toBeDefined();
        });
    });
    describe('Archive path format consistency', () => {
        it('should always start archive paths with /archived/docs/', async () => {
            const testCases = [
                { input: '/simple.md', expectedRelative: '/archived/docs/simple.md' },
                { input: '/guides/tutorial.md', expectedRelative: '/archived/docs/guides/tutorial.md' },
                { input: '/specs/api/v1/auth.md', expectedRelative: '/archived/docs/specs/api/v1/auth.md' }
            ];
            for (const { input, expectedRelative } of testCases) {
                // Extract path parts
                const parts = input.split('/').filter(p => p !== '');
                const fileName = parts[parts.length - 1] ?? '';
                const namespace = parts.slice(0, -1).join('/');
                // Create document in workspace (not under docs/)
                const docPath = namespace !== '' ? `${namespace}/${fileName}` : fileName;
                const absPath = path.join(testDocsRoot, docPath);
                if (namespace !== '') {
                    await fs.mkdir(path.join(testDocsRoot, namespace), { recursive: true });
                }
                await fs.writeFile(absPath, `# Test\n\nContent for ${input}`, 'utf8');
                // Archive and verify (now expects absolute path)
                const result = await manager.archiveDocument(input);
                const expectedAbsolute = path.join(testDocsRoot, expectedRelative.slice(1)); // Remove leading /
                expect(result.archivePath).toBe(expectedAbsolute);
                // Clean up for next iteration
                await fs.unlink(expectedAbsolute);
                await fs.unlink(`${expectedAbsolute}.audit`);
            }
        });
    });
});
//# sourceMappingURL=path-handler.archive.test.js.map