/**
 * Comprehensive unit tests for the performSectionEdit utility function
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { performSectionEdit } from './utilities.js';
// Mock imports
vi.mock('../slug.js', () => ({
    titleToSlug: vi.fn((title) => title.toLowerCase().replace(/\s+/g, '-'))
}));
// Create mock DocumentManager
const createMockDocumentManager = () => ({
    getDocument: vi.fn(),
    updateSection: vi.fn(),
    insertSection: vi.fn(),
    getSectionContent: vi.fn()
});
// Sample document structure for testing
const createSampleDocument = () => ({
    metadata: {
        path: '/test-doc.md',
        title: 'Test Document',
        lastModified: new Date(),
        contentHash: 'abc123',
        wordCount: 100,
        linkCount: 0,
        codeBlockCount: 0,
        lastAccessed: new Date(),
        cacheGeneration: 1,
        namespace: 'root',
        keywords: ['test', 'document'],
        fingerprintGenerated: new Date()
    },
    headings: [
        { index: 0, depth: 1, title: 'Test Document', slug: 'test-document', parentIndex: null },
        { index: 1, depth: 2, title: 'Overview', slug: 'overview', parentIndex: 0 },
        { index: 2, depth: 3, title: 'Quick Start', slug: 'quick-start', parentIndex: 1 },
        { index: 3, depth: 2, title: 'Features', slug: 'features', parentIndex: 0 },
        { index: 4, depth: 3, title: 'Feature A', slug: 'feature-a', parentIndex: 3 },
        { index: 5, depth: 3, title: 'Feature B', slug: 'feature-b', parentIndex: 3 },
        { index: 6, depth: 2, title: 'API Reference', slug: 'api-reference', parentIndex: 0 },
        { index: 7, depth: 3, title: 'Authentication', slug: 'authentication', parentIndex: 6 }
    ],
    toc: [],
    slugIndex: new Map()
});
describe('performSectionEdit Utility Function', () => {
    let tempDir;
    let mockDocumentManager;
    let sampleDocument;
    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'utilities-test-'));
        // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
        process.env['MCP_WORKSPACE_PATH'] = tempDir;
        vi.clearAllMocks();
        mockDocumentManager = createMockDocumentManager();
        sampleDocument = createSampleDocument();
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
    describe('Document Validation', () => {
        test('should throw error when document does not exist', async () => {
            // Arrange
            mockDocumentManager.getDocument.mockResolvedValue(null);
            // Act & Assert
            await expect(performSectionEdit(mockDocumentManager, '/non-existent.md', 'overview', 'Content', 'replace')).rejects.toThrow('Document not found: /non-existent.md');
        });
        test('should proceed when document exists', async () => {
            // Arrange
            mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);
            // Act & Assert
            await expect(performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', 'Updated content', 'replace')).resolves.toEqual({
                action: 'edited',
                section: 'overview'
            });
        });
    });
    describe('Edit Operations', () => {
        beforeEach(async () => {
            mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);
        });
        test('should handle replace operation successfully', async () => {
            // Arrange
            const content = 'Completely new content for overview.';
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', content, 'replace');
            // Assert
            expect(mockDocumentManager.updateSection).toHaveBeenCalledWith('/test-doc.md', 'overview', content, {
                updateToc: true,
                validateLinks: true
            });
            expect(result).toEqual({
                action: 'edited',
                section: 'overview'
            });
        });
        test('should throw error for replace operation when section not found', async () => {
            // Arrange
            const content = 'Content for non-existent section.';
            // Act & Assert
            await expect(performSectionEdit(mockDocumentManager, '/test-doc.md', 'non-existent-section', content, 'replace')).rejects.toThrow();
            expect(mockDocumentManager.updateSection).not.toHaveBeenCalled();
        });
        test('should handle append operation with existing content', async () => {
            // Arrange
            const existingContent = 'This is the current overview.';
            const newContent = 'Additional information.';
            const expectedContent = `${existingContent}\n\n${newContent}`;
            mockDocumentManager.getSectionContent.mockResolvedValue(existingContent);
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', newContent, 'append');
            // Assert
            expect(mockDocumentManager.getSectionContent).toHaveBeenCalledWith('/test-doc.md', 'overview');
            expect(mockDocumentManager.updateSection).toHaveBeenCalledWith('/test-doc.md', 'overview', expectedContent, {
                updateToc: true,
                validateLinks: true
            });
            expect(result).toEqual({
                action: 'edited',
                section: 'overview'
            });
        });
        test('should handle append operation with empty existing content', async () => {
            // Arrange
            const newContent = 'New content for empty section.';
            mockDocumentManager.getSectionContent.mockResolvedValue('');
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', newContent, 'append');
            // Assert
            expect(mockDocumentManager.updateSection).toHaveBeenCalledWith('/test-doc.md', 'overview', newContent, // Should use new content directly
            {
                updateToc: true,
                validateLinks: true
            });
            expect(result).toEqual({
                action: 'edited',
                section: 'overview'
            });
        });
        test('should handle append operation with null existing content', async () => {
            // Arrange
            const newContent = 'New content for null section.';
            mockDocumentManager.getSectionContent.mockResolvedValue(null);
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', newContent, 'append');
            // Assert
            expect(mockDocumentManager.updateSection).toHaveBeenCalledWith('/test-doc.md', 'overview', newContent, // Should use new content directly
            {
                updateToc: true,
                validateLinks: true
            });
            expect(result).toEqual({
                action: 'edited',
                section: 'overview'
            });
        });
        test('should handle prepend operation with existing content', async () => {
            // Arrange
            const existingContent = 'This is the current overview.';
            const newContent = 'Important note at the beginning.';
            const expectedContent = `${newContent}\n\n${existingContent}`;
            mockDocumentManager.getSectionContent.mockResolvedValue(existingContent);
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', newContent, 'prepend');
            // Assert
            expect(mockDocumentManager.updateSection).toHaveBeenCalledWith('/test-doc.md', 'overview', expectedContent, {
                updateToc: true,
                validateLinks: true
            });
            expect(result).toEqual({
                action: 'edited',
                section: 'overview'
            });
        });
        test('should handle prepend operation with empty existing content', async () => {
            // Arrange
            const newContent = 'Content for previously empty section.';
            mockDocumentManager.getSectionContent.mockResolvedValue('   '); // Whitespace-only
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', newContent, 'prepend');
            // Assert
            expect(mockDocumentManager.updateSection).toHaveBeenCalledWith('/test-doc.md', 'overview', newContent, // Should use new content directly
            {
                updateToc: true,
                validateLinks: true
            });
            expect(result).toEqual({
                action: 'edited',
                section: 'overview'
            });
        });
        test('should throw error for invalid edit operation', async () => {
            // Arrange
            const content = 'Some content.';
            // Act & Assert
            await expect(performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', content, 'invalid_operation')).rejects.toThrow('Invalid operation: invalid_operation');
        });
    });
    describe('Creation Operations', () => {
        beforeEach(async () => {
            mockDocumentManager.getDocument
                .mockResolvedValueOnce(sampleDocument) // Initial check
                .mockResolvedValueOnce({
                ...sampleDocument,
                headings: [
                    ...sampleDocument.headings,
                    { index: 8, depth: 2, title: 'New Section', slug: 'new-section', parentIndex: 0 }
                ]
            });
        });
        test('should handle insert_before operation successfully', async () => {
            // Arrange
            const content = 'Content for new section.';
            const title = 'New Section';
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', content, 'insert_before', title);
            // Assert
            expect(mockDocumentManager.insertSection).toHaveBeenCalledWith('/test-doc.md', 'features', 'insert_before', undefined, // Auto-calculate depth
            title, content, { updateToc: true });
            expect(result).toEqual({
                action: 'created',
                section: 'new-section',
                depth: 2
            });
        });
        test('should handle insert_after operation successfully', async () => {
            // Arrange
            const content = 'Content for new section.';
            const title = 'New Section';
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', content, 'insert_after', title);
            // Assert
            expect(mockDocumentManager.insertSection).toHaveBeenCalledWith('/test-doc.md', 'overview', 'insert_after', undefined, // Auto-calculate depth
            title, content, { updateToc: true });
            expect(result).toEqual({
                action: 'created',
                section: 'new-section',
                depth: 2
            });
        });
        test('should handle append_child operation successfully', async () => {
            // Arrange
            mockDocumentManager.getDocument
                .mockReset()
                .mockResolvedValueOnce(sampleDocument) // Initial check
                .mockResolvedValueOnce({
                ...sampleDocument,
                headings: [
                    ...sampleDocument.headings,
                    { index: 8, depth: 3, title: 'New Child Section', slug: 'new-child-section', parentIndex: 3 }
                ]
            });
            const content = 'Content for new child section.';
            const title = 'New Child Section';
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', content, 'append_child', title);
            // Assert
            expect(mockDocumentManager.insertSection).toHaveBeenCalledWith('/test-doc.md', 'features', 'append_child', undefined, // Auto-calculate depth
            title, content, { updateToc: true });
            expect(result).toEqual({
                action: 'created',
                section: 'new-child-section',
                depth: 3
            });
        });
        test('should throw error for creation operation without title', async () => {
            // Arrange
            const content = 'Content for new section.';
            // Act & Assert
            await expect(performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', content, 'insert_before'
            // No title provided
            )).rejects.toThrow('Title is required for creation operation: insert_before');
            expect(mockDocumentManager.insertSection).not.toHaveBeenCalled();
        });
        test('should throw error for creation operation with empty title', async () => {
            // Arrange
            const content = 'Content for new section.';
            const title = '';
            // Act & Assert
            await expect(performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', content, 'insert_after', title)).rejects.toThrow('Title is required for creation operation: insert_after');
            expect(mockDocumentManager.insertSection).not.toHaveBeenCalled();
        });
        test('should throw error when failed to retrieve updated document', async () => {
            // Arrange
            mockDocumentManager.getDocument
                .mockReset()
                .mockResolvedValueOnce(sampleDocument) // Initial check
                .mockResolvedValueOnce(null); // Failed to retrieve updated document
            const content = 'Content for new section.';
            const title = 'New Section';
            // Act & Assert - Error message changed to DocumentNotFoundError format
            await expect(performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', content, 'insert_before', title)).rejects.toThrow('Document not found: /test-doc.md');
        });
        test('should handle creation when new section is not found in updated document', async () => {
            // Arrange
            mockDocumentManager.getDocument
                .mockReset()
                .mockResolvedValueOnce(sampleDocument) // Initial check
                .mockResolvedValueOnce(sampleDocument); // Same document (new section not found)
            const content = 'Content for new section.';
            const title = 'Missing Section';
            // Act
            const result = await performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', content, 'insert_before', title);
            // Assert - Should still return created result even if section not found in headings
            expect(result).toEqual({
                action: 'created',
                section: 'missing-section'
                // No depth property when section not found
            });
        });
    });
    describe('Operation Type Detection', () => {
        beforeEach(async () => {
            mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);
        });
        test('should correctly identify edit operations', async () => {
            // Test all edit operations
            const editOps = ['replace', 'append', 'prepend'];
            for (const op of editOps) {
                // Reset mocks for each iteration
                vi.clearAllMocks();
                mockDocumentManager.getDocument.mockResolvedValue(sampleDocument);
                if (op === 'replace') {
                    // For replace, we don't call getSectionContent
                    await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', 'Content', op);
                    expect(mockDocumentManager.getSectionContent).not.toHaveBeenCalled();
                }
                else {
                    // For append/prepend, we do call getSectionContent
                    mockDocumentManager.getSectionContent.mockResolvedValue('existing content');
                    await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', 'Content', op);
                    expect(mockDocumentManager.getSectionContent).toHaveBeenCalled();
                }
                expect(mockDocumentManager.insertSection).not.toHaveBeenCalled();
            }
        });
        test('should correctly identify creation operations', async () => {
            // Test all creation operations
            const creationOps = ['insert_before', 'insert_after', 'append_child'];
            for (const op of creationOps) {
                // Reset mocks for each iteration
                vi.clearAllMocks();
                mockDocumentManager.getDocument
                    .mockResolvedValueOnce(sampleDocument) // Initial check
                    .mockResolvedValueOnce({
                    ...sampleDocument,
                    headings: [
                        ...sampleDocument.headings,
                        { index: 8, depth: 2, title: 'Test Section', slug: 'test-section', parentIndex: 0 }
                    ]
                });
                await performSectionEdit(mockDocumentManager, '/test-doc.md', 'overview', 'Content', op, 'Test Section');
                expect(mockDocumentManager.insertSection).toHaveBeenCalled();
                expect(mockDocumentManager.updateSection).not.toHaveBeenCalled();
                expect(mockDocumentManager.getSectionContent).not.toHaveBeenCalled();
            }
        });
    });
    describe('Insert Mode Mapping', () => {
        beforeEach(async () => {
            mockDocumentManager.getDocument
                .mockResolvedValueOnce(sampleDocument) // Initial check
                .mockResolvedValueOnce({
                ...sampleDocument,
                headings: [
                    ...sampleDocument.headings,
                    { index: 8, depth: 2, title: 'Test Section', slug: 'test-section', parentIndex: 0 }
                ]
            });
        });
        test('should map insert_before operation to correct InsertMode', async () => {
            // Act
            await performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', 'Content', 'insert_before', 'Test Section');
            // Assert
            expect(mockDocumentManager.insertSection).toHaveBeenCalledWith('/test-doc.md', 'features', 'insert_before', undefined, 'Test Section', 'Content', { updateToc: true });
        });
        test('should map insert_after operation to correct InsertMode', async () => {
            // Act
            await performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', 'Content', 'insert_after', 'Test Section');
            // Assert
            expect(mockDocumentManager.insertSection).toHaveBeenCalledWith('/test-doc.md', 'features', 'insert_after', undefined, 'Test Section', 'Content', { updateToc: true });
        });
        test('should map append_child operation to correct InsertMode', async () => {
            // Act
            await performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', 'Content', 'append_child', 'Test Section');
            // Assert
            expect(mockDocumentManager.insertSection).toHaveBeenCalledWith('/test-doc.md', 'features', 'append_child', undefined, 'Test Section', 'Content', { updateToc: true });
        });
    });
    describe('Slug Generation Integration', () => {
        test('should use titleToSlug for finding created section', async () => {
            // Arrange
            const { titleToSlug } = await import('../slug.js');
            const mockTitleToSlug = titleToSlug;
            mockDocumentManager.getDocument
                .mockResolvedValueOnce(sampleDocument) // Initial check
                .mockResolvedValueOnce({
                ...sampleDocument,
                headings: [
                    ...sampleDocument.headings,
                    { index: 8, depth: 2, title: 'Complex Title!', slug: 'complex-title', parentIndex: 0 }
                ]
            });
            mockTitleToSlug.mockReturnValue('complex-title');
            // Act
            await performSectionEdit(mockDocumentManager, '/test-doc.md', 'features', 'Content', 'insert_before', 'Complex Title!');
            // Assert
            expect(mockTitleToSlug).toHaveBeenCalledWith('Complex Title!');
        });
    });
});
//# sourceMappingURL=utilities.test.js.map