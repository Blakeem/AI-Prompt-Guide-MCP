/**
 * Unit tests for delete_document tool
 *
 * Each test creates its own unique test document to avoid conflicts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { deleteDocument } from '../implementations/delete-document.js';
import { DocumentManager } from '../../document-manager.js';
import { DocumentCache } from '../../document-cache.js';
import { AddressingError, DocumentNotFoundError } from '../../shared/addressing-system.js';
describe('delete_document', () => {
    let cache;
    let manager;
    let tempDir;
    let testDocsRoot;
    let sessionState;
    let testCounter = 0;
    // Helper to create a unique test document
    async function createTestDoc() {
        testCounter++;
        const timestamp = Date.now();
        const slug = `test-del-doc-${timestamp}-${testCounter}`;
        // Virtual path should NOT include 'docs' prefix - that's part of physical structure
        const docPath = `/${slug}.md`;
        // testDocsRoot now points to the docs directory itself
        const absPath = path.join(testDocsRoot, `${slug}.md`);
        const content = `# Test Document ${testCounter}\n\n## Overview\nTest content.\n`;
        // Ensure file is written and synced
        await fs.writeFile(absPath, content, 'utf8');
        const stats = await fs.stat(absPath);
        if (!stats.isFile()) {
            throw new Error(`Failed to create test file: ${absPath}`);
        }
        return { docPath, absPath, slug };
    }
    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'delete-document-test-'));
        // CRITICAL: docsRoot should be the actual docs directory, not the parent
        testDocsRoot = path.join(tempDir, 'docs');
        // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
        process.env['MCP_WORKSPACE_PATH'] = tempDir;
        await fs.mkdir(testDocsRoot, { recursive: true });
        cache = new DocumentCache(testDocsRoot);
        // Pass explicit archived path to match test expectations
        const archivedPath = path.join(tempDir, 'archived');
        manager = new DocumentManager(testDocsRoot, cache, undefined, archivedPath);
        sessionState = {
            sessionId: 'test-session',
            createDocumentStage: 0,
        };
    });
    afterEach(async () => {
        // Clean up temporary directory and all its contents
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch {
            // Ignore if directory doesn't exist
        }
    });
    afterEach(async () => {
        await cache.destroy();
    });
    describe('permanent deletion', () => {
        it('should permanently delete a document when archive is false', async () => {
            const { docPath, absPath } = await createTestDoc();
            const result = await deleteDocument({ document: docPath, archive: false }, sessionState, manager);
            expect(result).toMatchObject({ success: true, operation: 'deleted' });
            await expect(fs.access(absPath)).rejects.toThrow();
        });
        it('should permanently delete a document when archive is not provided', async () => {
            const { docPath, absPath } = await createTestDoc();
            const result = await deleteDocument({ document: docPath }, sessionState, manager);
            expect(result).toMatchObject({ success: true, operation: 'deleted' });
            await expect(fs.access(absPath)).rejects.toThrow();
        });
        it('should not include optional fields in permanent delete result', async () => {
            const { docPath } = await createTestDoc();
            const result = await deleteDocument({ document: docPath, archive: false }, sessionState, manager);
            expect(result['success']).toBe(true);
            expect(result['operation']).toBe('deleted');
            expect(result['archived_to']).toBeUndefined();
            expect(result['audit_file']).toBeUndefined();
        });
    });
    describe('archive deletion', () => {
        it('should archive a document when archive is true', async () => {
            const { docPath, absPath, slug } = await createTestDoc();
            const result = await deleteDocument({ document: docPath, archive: true }, sessionState, manager);
            expect(result).toMatchObject({ success: true, operation: 'archived' });
            expect(result).toHaveProperty('archived_to');
            expect(result).toHaveProperty('audit_file');
            await expect(fs.access(absPath)).rejects.toThrow();
            // Archive is at tempDir/archived/docs/ (not testDocsRoot/archived/docs/)
            const archivedPath = path.join(tempDir, 'archived/docs', `${slug}.md`);
            await expect(fs.access(archivedPath)).resolves.not.toThrow();
            const auditPath = path.join(tempDir, 'archived/docs', `${slug}.md.audit`);
            await expect(fs.access(auditPath)).resolves.not.toThrow();
            // Cleanup archived files
            await fs.unlink(archivedPath);
            await fs.unlink(auditPath);
        });
        it('should include correct paths in archive result', async () => {
            const { docPath, slug } = await createTestDoc();
            const result = await deleteDocument({ document: docPath, archive: true }, sessionState, manager);
            expect(result.archived_to).toContain('archived');
            expect(result.audit_file).toContain('.audit');
            // Cleanup
            const archivedPath = path.join(tempDir, 'archived/docs', `${slug}.md`);
            const auditPath = path.join(tempDir, 'archived/docs', `${slug}.md.audit`);
            await fs.unlink(archivedPath);
            await fs.unlink(auditPath);
        });
        it('should include all required fields for archive operation', async () => {
            const { docPath, slug } = await createTestDoc();
            const result = await deleteDocument({ document: docPath, archive: true }, sessionState, manager);
            expect(result['success']).toBe(true);
            expect(result['operation']).toBe('archived');
            expect(result['archived_to']).toBeDefined();
            expect(result['audit_file']).toBeDefined();
            // Cleanup
            const archivedPath = path.join(tempDir, 'archived/docs', `${slug}.md`);
            const auditPath = path.join(tempDir, 'archived/docs', `${slug}.md.audit`);
            await fs.unlink(archivedPath);
            await fs.unlink(auditPath);
        });
    });
    describe('error handling', () => {
        it('should throw DocumentNotFoundError when document does not exist', async () => {
            await expect(deleteDocument({ document: '/docs/nonexistent.md', archive: false }, sessionState, manager)).rejects.toThrow(DocumentNotFoundError);
        });
        it('should throw AddressingError when document parameter is missing', async () => {
            await expect(deleteDocument({}, sessionState, manager)).rejects.toThrow(AddressingError);
        });
        it('should throw AddressingError when document parameter is invalid', async () => {
            await expect(deleteDocument({ document: '' }, sessionState, manager)).rejects.toThrow(AddressingError);
        });
        it('should handle file system errors gracefully', async () => {
            const { docPath } = await createTestDoc();
            const originalUnlink = fs.unlink;
            vi.spyOn(fs, 'unlink').mockRejectedValueOnce(new Error('Permission denied'));
            await expect(deleteDocument({ document: docPath, archive: false }, sessionState, manager)).rejects.toThrow(AddressingError);
            vi.spyOn(fs, 'unlink').mockImplementation(originalUnlink);
        });
    });
    describe('cache invalidation', () => {
        it('should invalidate cache after permanent deletion', async () => {
            const { docPath } = await createTestDoc();
            await manager.getDocument(docPath);
            const cachedBefore = await cache.getDocument(docPath);
            expect(cachedBefore).not.toBeNull();
            await deleteDocument({ document: docPath, archive: false }, sessionState, manager);
            const cachedAfter = await manager.getDocument(docPath);
            expect(cachedAfter).toBeNull();
        });
        it('should invalidate cache after archive', async () => {
            const { docPath, slug } = await createTestDoc();
            await manager.getDocument(docPath);
            const cachedBefore = await cache.getDocument(docPath);
            expect(cachedBefore).not.toBeNull();
            await deleteDocument({ document: docPath, archive: true }, sessionState, manager);
            const cachedAfter = await manager.getDocument(docPath);
            expect(cachedAfter).toBeNull();
            // Cleanup
            const archivedPath = path.join(tempDir, 'archived/docs', `${slug}.md`);
            const auditPath = path.join(tempDir, 'archived/docs', `${slug}.md.audit`);
            await fs.unlink(archivedPath);
            await fs.unlink(auditPath);
        });
    });
    describe('Filesystem Path Verification (Regression Prevention)', () => {
        let testDir;
        let docsDir;
        let manager;
        let cache;
        let sessionState;
        beforeEach(async () => {
            // Create production-like directory structure
            const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
            testDir = await fs.mkdtemp(path.join(os.tmpdir(), `delete-doc-fs-test-${uniqueId}-`));
            // Create docs subdirectory (matches production structure)
            docsDir = path.resolve(testDir, 'docs');
            await fs.mkdir(docsDir, { recursive: true });
            await fs.mkdir(path.join(docsDir, 'api'), { recursive: true });
            // Set workspace path
            process.env['MCP_WORKSPACE_PATH'] = testDir;
            // CRITICAL: Create manager with docsDir (correct pattern)
            cache = new DocumentCache(docsDir);
            manager = new DocumentManager(docsDir, cache);
            sessionState = {
                sessionId: `test-${Date.now()}-${Math.random()}`,
                createDocumentStage: 0,
            };
        });
        afterEach(async () => {
            await cache.destroy();
            await fs.rm(testDir, { recursive: true, force: true });
        });
        it('should permanently delete file from correct docs location', async () => {
            // Create document in docs directory
            const docPath = path.join(docsDir, 'api', 'test.md');
            await fs.writeFile(docPath, '# Test\n\nContent', 'utf-8');
            // Invalidate cache to pick up manually created file
            cache.invalidateDocument('/api/test.md');
            // Delete via tool
            const result = await deleteDocument({
                document: '/api/test.md',
                archive: false
            }, sessionState, manager);
            expect(result['success']).toBe(true);
            expect(result['operation']).toBe('deleted');
            // VERIFY: File deleted from CORRECT location
            await expect(fs.access(docPath)).rejects.toThrow();
            // VERIFY: No file left at WRONG location
            const wrongPath = path.join(testDir, 'api', 'test.md');
            await expect(fs.access(wrongPath)).rejects.toThrow();
        });
        it('should archive to namespace-specific path', async () => {
            // Create nested namespace document
            await fs.mkdir(path.join(docsDir, 'api', 'specs'), { recursive: true });
            const docPath = path.join(docsDir, 'api', 'specs', 'auth.md');
            await fs.writeFile(docPath, '# Auth API\n\nEndpoints', 'utf-8');
            // Load document into cache
            const doc = await manager.getDocument('/api/specs/auth.md');
            expect(doc).not.toBeNull();
            // Archive via tool
            const result = await deleteDocument({
                document: '/api/specs/auth.md',
                archive: true
            }, sessionState, manager);
            expect(result['success']).toBe(true);
            expect(result['operation']).toBe('archived');
            // VERIFY: Original deleted from correct location
            await expect(fs.access(docPath)).rejects.toThrow();
            // VERIFY: Archived to CORRECT location
            const archivedPath = path.join(testDir, 'archived', 'docs', 'api', 'specs', 'auth.md');
            await expect(fs.access(archivedPath)).resolves.not.toThrow();
            // VERIFY: Audit file exists
            const auditPath = `${archivedPath}.audit`;
            await expect(fs.access(auditPath)).resolves.not.toThrow();
            // VERIFY: NOT archived to wrong locations
            const wrongArchive1 = path.join(testDir, 'api', 'specs', 'auth.md');
            await expect(fs.access(wrongArchive1)).rejects.toThrow();
            const wrongArchive2 = path.join(docsDir, 'archived', 'api', 'specs', 'auth.md');
            await expect(fs.access(wrongArchive2)).rejects.toThrow();
            // Cleanup
            await fs.unlink(archivedPath);
            await fs.unlink(auditPath);
        });
        it('should handle root-level document deletion correctly', async () => {
            const docPath = path.join(docsDir, 'readme.md');
            await fs.writeFile(docPath, '# README\n\nProject info', 'utf-8');
            // Load document into cache
            const doc = await manager.getDocument('/readme.md');
            expect(doc).not.toBeNull();
            await deleteDocument({
                document: '/readme.md',
                archive: false
            }, sessionState, manager);
            // VERIFY: Deleted from correct location
            await expect(fs.access(docPath)).rejects.toThrow();
            // VERIFY: Not at wrong location
            const wrongPath = path.join(testDir, 'readme.md');
            await expect(fs.access(wrongPath)).rejects.toThrow();
        });
        it('should create archive directory structure if it does not exist', async () => {
            const docPath = path.join(docsDir, 'new-namespace', 'test.md');
            await fs.mkdir(path.join(docsDir, 'new-namespace'), { recursive: true });
            await fs.writeFile(docPath, '# Test\n\nContent', 'utf-8');
            // Load document into cache
            const doc = await manager.getDocument('/new-namespace/test.md');
            expect(doc).not.toBeNull();
            await deleteDocument({
                document: '/new-namespace/test.md',
                archive: true
            }, sessionState, manager);
            // VERIFY: Archive directory was created
            const archiveDir = path.join(testDir, 'archived', 'docs', 'new-namespace');
            const archivedFile = path.join(archiveDir, 'test.md');
            await expect(fs.access(archivedFile)).resolves.not.toThrow();
            // Cleanup
            await fs.rm(archiveDir, { recursive: true });
        });
        it('should validate audit file contains correct metadata', async () => {
            const docPath = path.join(docsDir, 'api', 'test-audit.md');
            await fs.writeFile(docPath, '# Test\n\nContent for audit', 'utf-8');
            // Load document into cache
            const doc = await manager.getDocument('/api/test-audit.md');
            expect(doc).not.toBeNull();
            await deleteDocument({
                document: '/api/test-audit.md',
                archive: true
            }, sessionState, manager);
            // Read and validate audit file
            const auditPath = path.join(testDir, 'archived', 'docs', 'api', 'test-audit.md.audit');
            const auditContent = await fs.readFile(auditPath, 'utf-8');
            const audit = JSON.parse(auditContent);
            expect(audit).toHaveProperty('originalPath');
            expect(audit).toHaveProperty('archivedAt');
            expect(audit).toHaveProperty('reason', 'User requested archive');
            expect(audit.originalPath).toContain('/api/test-audit.md');
            // Cleanup
            await fs.rm(path.join(testDir, 'archived', 'docs', 'api'), { recursive: true });
        });
    });
});
//# sourceMappingURL=delete-document.test.js.map