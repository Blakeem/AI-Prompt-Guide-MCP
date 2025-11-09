import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { editDocument } from '../implementations/edit-document.js';
import { createDocumentManager } from '../../shared/utilities.js';
import { DocumentManager } from '../../document-manager.js';
import { DocumentCache } from '../../document-cache.js';
import { AddressingError, DocumentNotFoundError } from '../../shared/addressing-system.js';
import * as sections from '../../sections.js';
import * as fsio from '../../fsio.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
describe('edit_document Tool', () => {
    let sessionState;
    let manager;
    let tempDir;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renameHeadingSpy;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let readFileSnapshotSpy;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let writeFileIfUnchangedSpy;
    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'edit-document-test-'));
        // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
        process.env['MCP_WORKSPACE_PATH'] = tempDir;
        manager = createDocumentManager();
        sessionState = {
            sessionId: `test-${Date.now()}-${Math.random()}`,
            createDocumentStage: 0,
        };
        // Mock fsio functions
        readFileSnapshotSpy = vi.spyOn(fsio, 'readFileSnapshot');
        writeFileIfUnchangedSpy = vi.spyOn(fsio, 'writeFileIfUnchanged').mockResolvedValue(undefined);
        // Mock renameHeading
        renameHeadingSpy = vi.spyOn(sections, 'renameHeading');
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
    afterEach(() => {
        vi.restoreAllMocks();
    });
    describe('Input Validation', () => {
        it('should throw error when neither title nor overview provided', async () => {
            await expect(editDocument({ document: '/test.md' }, sessionState, manager)).rejects.toThrow(AddressingError);
        });
        it('should throw error when document not found', async () => {
            vi.spyOn(manager, 'getDocument').mockResolvedValue(null);
            await expect(editDocument({ document: '/nonexistent.md', title: 'New Title' }, sessionState, manager)).rejects.toThrow(DocumentNotFoundError);
        });
        it('should throw error when document has no title (H1)', async () => {
            const content = '## Section\n\nContent without title';
            const mockDoc = {
                headings: [{ slug: 'section', title: 'Section', depth: 2 }],
                sections: new Map([['section', 'Content without title']]),
                metadata: {
                    path: '/no-title.md',
                    title: 'Section',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 3,
                },
            };
            vi.spyOn(manager, 'getDocument').mockResolvedValue(mockDoc);
            readFileSnapshotSpy.mockResolvedValue({ content, mtimeMs: 1000 });
            await expect(editDocument({ document: '/no-title.md', title: 'New Title' }, sessionState, manager)).rejects.toThrow(AddressingError);
        });
    });
    describe('Title Editing', () => {
        it('should successfully edit document title only', async () => {
            const originalContent = '# Original Title\n\nOriginal overview content\n\n## Section\n\nSection content';
            const mockDoc = {
                headings: [
                    { slug: 'original-title', title: 'Original Title', depth: 1 },
                    { slug: 'section', title: 'Section', depth: 2 },
                ],
                sections: new Map([
                    ['original-title', ''],
                    ['section', 'Section content'],
                ]),
                metadata: {
                    path: '/test.md',
                    title: 'Original Title',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 5,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce({
                ...mockDoc,
                metadata: { ...mockDoc.metadata, title: 'Updated Title' },
            });
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            renameHeadingSpy.mockReturnValue('# Updated Title\n\nOriginal overview content\n\n## Section\n\nSection content');
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({ document: '/test.md', title: 'Updated Title' }, sessionState, manager);
            expect(result).toMatchObject({
                success: true,
                updated: ['title'],
                title: 'Updated Title',
                previous_title: 'Original Title',
            });
            // Should NOT include previous_overview since overview wasn't changed
            expect(result).not.toHaveProperty('previous_overview');
            // Verify renameHeading was called
            expect(renameHeadingSpy).toHaveBeenCalledWith(originalContent, 'original-title', 'Updated Title');
            // Verify file was written
            expect(writeFileIfUnchangedSpy).toHaveBeenCalled();
            // Verify cache was invalidated
            expect(manager.cache.invalidateDocument).toHaveBeenCalledWith('/test.md');
        });
    });
    describe('Overview Editing', () => {
        it('should successfully edit document overview only', async () => {
            const originalContent = '# Test Title\n\nOriginal overview\n\n## Section\n\nSection content';
            const mockDoc = {
                headings: [
                    { slug: 'test-title', title: 'Test Title', depth: 1 },
                    { slug: 'section', title: 'Section', depth: 2 },
                ],
                sections: new Map([
                    ['test-title', ''],
                    ['section', 'Section content'],
                ]),
                metadata: {
                    path: '/test.md',
                    title: 'Test Title',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 5,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce(mockDoc);
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({ document: '/test.md', overview: 'Updated overview content' }, sessionState, manager);
            expect(result).toMatchObject({
                success: true,
                updated: ['overview'],
                previous_overview: 'Original overview',
            });
            // Should NOT include previous_title since title wasn't changed
            expect(result).not.toHaveProperty('previous_title');
            // Verify file was written with new overview
            expect(writeFileIfUnchangedSpy).toHaveBeenCalled();
            const writtenContent = writeFileIfUnchangedSpy.mock.calls[0]?.[2];
            expect(writtenContent).toContain('# Test Title');
            expect(writtenContent).toContain('Updated overview content');
            expect(writtenContent).toContain('## Section');
            // Verify cache was invalidated
            expect(manager.cache.invalidateDocument).toHaveBeenCalledWith('/test.md');
        });
        it('should handle document with no H2 sections', async () => {
            const originalContent = '# Title Only\n\nOriginal overview content';
            const mockDoc = {
                headings: [{ slug: 'title-only', title: 'Title Only', depth: 1 }],
                sections: new Map([['title-only', '']]),
                metadata: {
                    path: '/no-sections.md',
                    title: 'Title Only',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 3,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce(mockDoc);
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({ document: '/no-sections.md', overview: 'New overview for document without sections' }, sessionState, manager);
            expect(result).toMatchObject({
                success: true,
                updated: ['overview'],
            });
        });
    });
    describe('Combined Title and Overview Editing', () => {
        it('should successfully edit both title and overview', async () => {
            const originalContent = '# Original Title\n\nOriginal overview\n\n## Section\n\nSection content';
            const mockDoc = {
                headings: [
                    { slug: 'original-title', title: 'Original Title', depth: 1 },
                    { slug: 'section', title: 'Section', depth: 2 },
                ],
                sections: new Map([
                    ['original-title', ''],
                    ['section', 'Section content'],
                ]),
                metadata: {
                    path: '/both.md',
                    title: 'Original Title',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 5,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce({
                ...mockDoc,
                metadata: { ...mockDoc.metadata, title: 'Updated Title' },
            });
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            renameHeadingSpy.mockReturnValue('# Updated Title\n\nOriginal overview\n\n## Section\n\nSection content');
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({
                document: '/both.md',
                title: 'Updated Title',
                overview: 'Updated overview',
            }, sessionState, manager);
            expect(result).toMatchObject({
                success: true,
                updated: ['title', 'overview'],
                title: 'Updated Title',
                previous_title: 'Original Title',
                previous_overview: 'Original overview',
            });
            // Both previous values should be included since both fields changed
            expect(result).toHaveProperty('previous_title');
            expect(result).toHaveProperty('previous_overview');
        });
    });
    describe('Edge Cases', () => {
        it('should handle empty string title (treated as not provided)', async () => {
            const originalContent = '# Original Title\n\nOriginal overview';
            const mockDoc = {
                headings: [{ slug: 'original-title', title: 'Original Title', depth: 1 }],
                sections: new Map([['original-title', '']]),
                metadata: {
                    path: '/empty-title.md',
                    title: 'Original Title',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 3,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce(mockDoc);
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({
                document: '/empty-title.md',
                title: '',
                overview: 'New overview',
            }, sessionState, manager);
            // Empty title should not be in updated
            expect(result).toMatchObject({
                updated: ['overview'],
            });
            // Verify renameHeading was NOT called
            expect(renameHeadingSpy).not.toHaveBeenCalled();
        });
        it('should handle empty string overview (treated as not provided)', async () => {
            const originalContent = '# Original Title\n\nOriginal overview';
            const mockDoc = {
                headings: [{ slug: 'original-title', title: 'Original Title', depth: 1 }],
                sections: new Map([['original-title', '']]),
                metadata: {
                    path: '/empty-overview.md',
                    title: 'Original Title',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 3,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce({
                ...mockDoc,
                metadata: { ...mockDoc.metadata, title: 'New Title' },
            });
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            renameHeadingSpy.mockReturnValue('# New Title\n\nOriginal overview');
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({
                document: '/empty-overview.md',
                title: 'New Title',
                overview: '',
            }, sessionState, manager);
            // Empty overview should not be in updated
            expect(result).toMatchObject({
                updated: ['title'],
            });
        });
    });
    describe('Cache Invalidation', () => {
        it('should invalidate cache after editing', async () => {
            const originalContent = '# Original\n\nOriginal overview';
            const mockDoc = {
                headings: [{ slug: 'original', title: 'Original', depth: 1 }],
                sections: new Map([['original', '']]),
                metadata: {
                    path: '/cache-test.md',
                    title: 'Original',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 2,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce({
                ...mockDoc,
                metadata: { ...mockDoc.metadata, title: 'Updated' },
            });
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            renameHeadingSpy.mockReturnValue('# Updated\n\nOriginal overview');
            const invalidateSpy = vi.spyOn(manager.cache, 'invalidateDocument');
            await editDocument({ document: '/cache-test.md', title: 'Updated' }, sessionState, manager);
            expect(invalidateSpy).toHaveBeenCalledWith('/cache-test.md');
        });
    });
    describe('Response Format', () => {
        it('should include all required response fields', async () => {
            const originalContent = '# Title\n\nOverview';
            const mockDoc = {
                headings: [{ slug: 'title', title: 'Title', depth: 1 }],
                sections: new Map([['title', '']]),
                metadata: {
                    path: '/response.md',
                    title: 'Title',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 2,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce({
                ...mockDoc,
                metadata: { ...mockDoc.metadata, title: 'New Title' },
            });
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            renameHeadingSpy.mockReturnValue('# New Title\n\nOverview');
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({
                document: '/response.md',
                title: 'New Title',
            }, sessionState, manager);
            expect(result).toHaveProperty('success', true);
            expect(result).toHaveProperty('updated');
            expect(result).toHaveProperty('title', 'New Title');
            const resultObj = result;
            expect(Array.isArray(resultObj['updated'])).toBe(true);
        });
    });
    describe('Conditional Previous Values (Token Optimization)', () => {
        it('should only include previous_title when title changed', async () => {
            const originalContent = '# Original Title\n\nOverview content\n\n## Section\n\nContent';
            const mockDoc = {
                headings: [
                    { slug: 'original-title', title: 'Original Title', depth: 1 },
                    { slug: 'section', title: 'Section', depth: 2 },
                ],
                sections: new Map([
                    ['original-title', ''],
                    ['section', 'Content'],
                ]),
                metadata: {
                    path: '/title-only.md',
                    title: 'Original Title',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 5,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce({
                ...mockDoc,
                metadata: { ...mockDoc.metadata, title: 'New Title' },
            });
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            renameHeadingSpy.mockReturnValue('# New Title\n\nOverview content\n\n## Section\n\nContent');
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({ document: '/title-only.md', title: 'New Title' }, sessionState, manager);
            // Should include previous_title
            expect(result).toHaveProperty('previous_title', 'Original Title');
            // Should NOT include previous_overview
            expect(result).not.toHaveProperty('previous_overview');
            // Should always include current title
            expect(result).toHaveProperty('title', 'New Title');
            expect(result).toHaveProperty('updated', ['title']);
        });
        it('should only include previous_overview when overview changed', async () => {
            const originalContent = '# Test Title\n\nOriginal overview\n\n## Section\n\nContent';
            const mockDoc = {
                headings: [
                    { slug: 'test-title', title: 'Test Title', depth: 1 },
                    { slug: 'section', title: 'Section', depth: 2 },
                ],
                sections: new Map([
                    ['test-title', ''],
                    ['section', 'Content'],
                ]),
                metadata: {
                    path: '/overview-only.md',
                    title: 'Test Title',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 5,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce(mockDoc);
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({ document: '/overview-only.md', overview: 'New overview content' }, sessionState, manager);
            // Should include previous_overview
            expect(result).toHaveProperty('previous_overview', 'Original overview');
            // Should NOT include previous_title
            expect(result).not.toHaveProperty('previous_title');
            // Should always include current title
            expect(result).toHaveProperty('title', 'Test Title');
            expect(result).toHaveProperty('updated', ['overview']);
        });
        it('should include both previous values when both fields changed', async () => {
            const originalContent = '# Old Title\n\nOld overview\n\n## Section\n\nContent';
            const mockDoc = {
                headings: [
                    { slug: 'old-title', title: 'Old Title', depth: 1 },
                    { slug: 'section', title: 'Section', depth: 2 },
                ],
                sections: new Map([
                    ['old-title', ''],
                    ['section', 'Content'],
                ]),
                metadata: {
                    path: '/both-changed.md',
                    title: 'Old Title',
                    lastModified: new Date(),
                    contentHash: 'hash1',
                    wordCount: 5,
                },
            };
            vi.spyOn(manager, 'getDocument')
                .mockResolvedValueOnce(mockDoc)
                .mockResolvedValueOnce({
                ...mockDoc,
                metadata: { ...mockDoc.metadata, title: 'New Title' },
            });
            readFileSnapshotSpy.mockResolvedValue({ content: originalContent, mtimeMs: 1000 });
            renameHeadingSpy.mockReturnValue('# New Title\n\nOld overview\n\n## Section\n\nContent');
            vi.spyOn(manager.cache, 'invalidateDocument');
            const result = await editDocument({
                document: '/both-changed.md',
                title: 'New Title',
                overview: 'New overview',
            }, sessionState, manager);
            // Should include BOTH previous values
            expect(result).toHaveProperty('previous_title', 'Old Title');
            expect(result).toHaveProperty('previous_overview', 'Old overview');
            expect(result).toHaveProperty('title', 'New Title');
            expect(result).toHaveProperty('updated', ['title', 'overview']);
        });
    });
    describe('Integration - File I/O with bypassValidation', () => {
        let testDir;
        beforeEach(async () => {
            // Create test directory structure
            testDir = join(process.cwd(), `.test-edit-document-${Date.now()}`);
            const apiSpecsDir = join(testDir, 'api', 'specs');
            mkdirSync(apiSpecsDir, { recursive: true });
            // Create test document in nested directory
            const testDocPath = join(apiSpecsDir, 'test-alpha-api.md');
            const testContent = `# Test Alpha API

This is the original overview content.

## Endpoints

API endpoints documentation.
`;
            writeFileSync(testDocPath, testContent, 'utf-8');
        });
        afterEach(() => {
            // Clean up test directory
            if (testDir != null) {
                rmSync(testDir, { recursive: true, force: true });
            }
        });
        it('should read and write file with absolute path using bypassValidation', async () => {
            // This test verifies the FIX for the bypassValidation bug in edit_document tool
            // Before the fix, readFileSnapshot and writeFileIfUnchanged would fail with "File not found"
            // when called with absolute paths in the edit_document implementation
            const { readFileSnapshot, writeFileIfUnchanged } = await import('../../fsio.js');
            const absolutePath = join(testDir, 'api', 'specs', 'test-alpha-api.md');
            // This should NOT throw "File not found" error with bypassValidation
            const snapshot = await readFileSnapshot(absolutePath, { bypassValidation: true });
            expect(snapshot.content).toContain('# Test Alpha API');
            expect(snapshot.content).toContain('This is the original overview content');
            // writeFileIfUnchanged checks mtime - if file changes between read and write, it fails
            // For this test, we just need to verify that bypassValidation works (no "File not found")
            // So we'll use the same mtime and write the same content - the important part is no error
            await expect(writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, snapshot.content, { bypassValidation: true }))
                .resolves.not.toThrow();
            // The real test: these operations should complete without "File not found" errors
            // which would have occurred without the bypassValidation fix
        });
    });
    describe('Filesystem Path Verification (Regression Prevention)', () => {
        let testDir;
        let docsDir;
        let manager;
        let cache;
        let sessionState;
        beforeEach(async () => {
            // CRITICAL: Restore mocks to allow real filesystem operations
            // The parent beforeEach() sets up spies that would interfere with these tests
            vi.restoreAllMocks();
            // Create production-like directory structure
            const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
            testDir = await fs.mkdtemp(path.join(os.tmpdir(), `edit-doc-fs-test-${uniqueId}-`));
            // Create docs subdirectory (matches production structure)
            docsDir = path.resolve(testDir, 'docs');
            await fs.mkdir(docsDir, { recursive: true });
            // Create nested namespace directory
            await fs.mkdir(path.join(docsDir, 'api'), { recursive: true });
            // Set workspace path
            process.env['MCP_WORKSPACE_PATH'] = testDir;
            // CRITICAL: Create manager directly to avoid config caching issues
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
        it('should edit file at correct docs namespace location', async () => {
            // Create document in docs directory
            const docPath = path.join(docsDir, 'api', 'test.md');
            await fs.writeFile(docPath, '# Original Title\n\nOriginal overview\n\n## Section\n\nContent', 'utf-8');
            // Load document into cache (bypassing cache forces filesystem read)
            const doc = await manager.getDocument('/api/test.md');
            expect(doc).not.toBeNull();
            // Edit via tool
            const result = await editDocument({
                document: '/api/test.md',
                title: 'Updated Title',
                overview: 'Updated overview'
            }, sessionState, manager);
            expect(result['success']).toBe(true);
            expect(result['updated']).toEqual(['title', 'overview']);
            // VERIFY: File exists at CORRECT location
            const content = await fs.readFile(docPath, 'utf-8');
            expect(content).toContain('# Updated Title');
            expect(content).toContain('Updated overview');
            // VERIFY: File does NOT exist at WRONG location (this would fail with old path bug)
            const wrongPath = path.join(testDir, 'api', 'test.md');
            await expect(fs.access(wrongPath)).rejects.toThrow();
        });
        it('should handle nested namespace paths correctly', async () => {
            // Create nested directory structure
            await fs.mkdir(path.join(docsDir, 'api', 'specs'), { recursive: true });
            const docPath = path.join(docsDir, 'api', 'specs', 'auth.md');
            await fs.writeFile(docPath, '# Auth API\n\nAuthentication endpoints', 'utf-8');
            // Load document into cache
            const doc = await manager.getDocument('/api/specs/auth.md');
            expect(doc).not.toBeNull();
            // Edit document in nested path
            await editDocument({
                document: '/api/specs/auth.md',
                title: 'Updated Auth API'
            }, sessionState, manager);
            // VERIFY: File at correct nested location
            const content = await fs.readFile(docPath, 'utf-8');
            expect(content).toContain('# Updated Auth API');
            // VERIFY: File NOT at wrong locations
            const wrongPath1 = path.join(testDir, 'api', 'specs', 'auth.md');
            await expect(fs.access(wrongPath1)).rejects.toThrow();
            const wrongPath2 = path.join(testDir, 'specs', 'auth.md');
            await expect(fs.access(wrongPath2)).rejects.toThrow();
        });
        it('should handle paths with and without leading slash correctly', async () => {
            const docPath = path.join(docsDir, 'test.md');
            await fs.writeFile(docPath, '# Test\n\nContent', 'utf-8');
            // Load document into cache
            const doc = await manager.getDocument('/test.md');
            expect(doc).not.toBeNull();
            // Test with leading slash
            await editDocument({
                document: '/test.md',
                title: 'Updated Test'
            }, sessionState, manager);
            let content = await fs.readFile(docPath, 'utf-8');
            expect(content).toContain('# Updated Test');
            // Reset file
            await fs.writeFile(docPath, '# Test\n\nContent', 'utf-8');
            manager.cache.invalidateDocument('/test.md');
            // Test without leading slash (should work the same)
            await editDocument({
                document: 'test.md',
                title: 'Updated Again'
            }, sessionState, manager);
            content = await fs.readFile(docPath, 'utf-8');
            expect(content).toContain('# Updated Again');
            // VERIFY: No file created at wrong location
            const wrongPath = path.join(testDir, 'test.md');
            await expect(fs.access(wrongPath)).rejects.toThrow();
        });
        it('should persist changes to actual filesystem', async () => {
            const docPath = path.join(docsDir, 'persist-test.md');
            const originalContent = '# Original\n\nOriginal overview\n\n## Section\n\nSection content';
            await fs.writeFile(docPath, originalContent, 'utf-8');
            // Load document into cache
            const doc = await manager.getDocument('/persist-test.md');
            expect(doc).not.toBeNull();
            // Edit document
            await editDocument({
                document: '/persist-test.md',
                overview: 'Modified overview content'
            }, sessionState, manager);
            // Read file again (new read, not from cache)
            const updatedContent = await fs.readFile(docPath, 'utf-8');
            expect(updatedContent).toContain('# Original');
            expect(updatedContent).toContain('Modified overview content');
            expect(updatedContent).not.toContain('Original overview');
            // Verify original structure preserved
            expect(updatedContent).toContain('## Section');
            expect(updatedContent).toContain('Section content');
        });
    });
});
//# sourceMappingURL=edit-document.test.js.map