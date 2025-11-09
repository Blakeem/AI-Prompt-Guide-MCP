/**
 * Tests for shared task view utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { extractTaskMetadata, extractTaskField, extractTaskLink, extractLinkedDocument, extractTaskTitle, calculateWordCount, formatTaskResponse, calculateTaskSummary, enrichTaskWithReferences } from '../task-view-utilities.js';
describe('Task View Utilities', () => {
    let tempDir;
    describe('extractTaskField', () => {
        it('should extract field with dash format', () => {
            const content = '- Status: completed\n- Dependencies: #other-task';
            expect(extractTaskField(content, 'Status')).toBe('completed');
            expect(extractTaskField(content, 'Dependencies')).toBe('#other-task');
        });
        it('should extract field with star format', () => {
            const content = '* Status: pending\n* Link: https://example.com';
            expect(extractTaskField(content, 'Status')).toBe('pending');
            expect(extractTaskField(content, 'Link')).toBe('https://example.com');
        });
        it('should be case sensitive', () => {
            const content = '- status: in_progress\n- Status: completed';
            expect(extractTaskField(content, 'Status')).toBe('completed');
            expect(extractTaskField(content, 'status')).toBe('in_progress');
        });
        it('should return null for missing field', () => {
            const content = '- Status: completed';
            expect(extractTaskField(content, 'Missing')).toBeNull();
        });
        it('should trim whitespace', () => {
            const content = '- Status:   completed   ';
            expect(extractTaskField(content, 'Status')).toBe('completed');
        });
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
    describe('extractTaskLink', () => {
        it('should extract arrow link', () => {
            const content = 'Some content\n→ https://example.com\nMore content';
            expect(extractTaskLink(content)).toBe('https://example.com');
        });
        it('should return null if no link found', () => {
            const content = 'No link here';
            expect(extractTaskLink(content)).toBeNull();
        });
        it('should trim whitespace from link', () => {
            const content = '→   https://example.com   ';
            expect(extractTaskLink(content)).toBe('https://example.com');
        });
    });
    describe('extractLinkedDocument', () => {
        it('should extract @document reference', () => {
            const content = 'Some content\n→ @/path/to/doc.md\nMore content';
            expect(extractLinkedDocument(content)).toBe('/path/to/doc.md');
        });
        it('should return null if no linked document', () => {
            const content = '→ https://example.com';
            expect(extractLinkedDocument(content)).toBeNull();
        });
    });
    describe('extractTaskTitle', () => {
        it('should extract title from h3 heading', () => {
            const content = '### Setup Database\nContent here';
            expect(extractTaskTitle(content)).toBe('Setup Database');
        });
        it('should return default for missing heading', () => {
            const content = 'No heading here';
            expect(extractTaskTitle(content)).toBe('Unknown Task');
        });
        it('should trim whitespace from title', () => {
            const content = '###   Setup Database   ';
            expect(extractTaskTitle(content)).toBe('Setup Database');
        });
    });
    describe('calculateWordCount', () => {
        it('should count words correctly', () => {
            expect(calculateWordCount('hello world')).toBe(2);
            expect(calculateWordCount('one two three four')).toBe(4);
        });
        it('should handle empty content', () => {
            expect(calculateWordCount('')).toBe(0);
            expect(calculateWordCount('   ')).toBe(0);
        });
        it('should handle multiple whitespace', () => {
            expect(calculateWordCount('hello    world\n\ntest')).toBe(3);
        });
    });
    describe('extractTaskMetadata', () => {
        it('should extract all metadata fields', () => {
            const content = `
### Task Title
- Status: completed
→ https://example.com
→ @/path/to/doc.md
      `;
            const metadata = extractTaskMetadata(content);
            expect(metadata.status).toBe('completed');
            expect(metadata.link).toBe('https://example.com');
            expect(metadata.linkedDocument).toBe('/path/to/doc.md');
        });
        it('should use defaults for missing fields', () => {
            const content = 'Just some content';
            const metadata = extractTaskMetadata(content);
            expect(metadata.status).toBe('pending');
            expect(metadata.link).toBeUndefined();
            expect(metadata.linkedDocument).toBeUndefined();
        });
        it('should omit empty optional fields', () => {
            const content = '- Status: pending\n- Link: ';
            const metadata = extractTaskMetadata(content);
            expect(metadata.status).toBe('pending');
            expect(metadata.link).toBeUndefined();
        });
    });
    describe('formatTaskResponse', () => {
        const taskData = {
            slug: 'test-task',
            title: 'Test Task',
            content: 'Task content',
            status: 'pending',
            link: 'https://example.com',
            linkedDocument: '/doc.md',
            referencedDocuments: [
                {
                    path: '/ref.md',
                    title: 'Reference',
                    content: 'ref content',
                    children: [],
                    depth: 1,
                    namespace: 'test'
                }
            ],
            wordCount: 2,
            depth: 3,
            parent: 'parent-task',
            fullPath: '/doc.md#test-task'
        };
        it('should format basic response by default', () => {
            const response = formatTaskResponse(taskData);
            expect(response).toEqual({
                slug: 'test-task',
                title: 'Test Task',
                status: 'pending',
                link: 'https://example.com',
                linked_document: '/doc.md',
                referenced_documents: taskData.referencedDocuments
            });
        });
        it('should include content when requested', () => {
            const response = formatTaskResponse(taskData, { includeContent: true });
            expect(response['content']).toBe('Task content');
        });
        it('should include word count when requested', () => {
            const response = formatTaskResponse(taskData, { includeWordCount: true });
            expect(response['word_count']).toBe(2);
        });
        it('should include hierarchy when requested', () => {
            const response = formatTaskResponse(taskData, { includeHierarchy: true });
            expect(response['depth']).toBe(3);
            expect(response['parent']).toBe('parent-task');
            expect(response['full_path']).toBe('/doc.md#test-task');
        });
        it('should exclude references when requested', () => {
            const response = formatTaskResponse(taskData, { includeReferences: false });
            expect(response['referenced_documents']).toBeUndefined();
        });
        it('should omit undefined optional fields', () => {
            const minimalTask = {
                slug: 'minimal',
                title: 'Minimal Task',
                content: 'content',
                status: 'pending'
            };
            const response = formatTaskResponse(minimalTask);
            expect(response).toEqual({
                slug: 'minimal',
                title: 'Minimal Task',
                status: 'pending'
            });
        });
    });
    describe('calculateTaskSummary', () => {
        const tasks = [
            {
                slug: 'task1',
                title: 'Task 1',
                content: 'content',
                status: 'pending',
                link: 'https://example.com'
            },
            {
                slug: 'task2',
                title: 'Task 2',
                content: 'content',
                status: 'completed',
                referencedDocuments: [
                    {
                        path: '/ref.md',
                        title: 'Reference',
                        content: 'ref content',
                        children: [],
                        depth: 1,
                        namespace: 'test'
                    }
                ]
            },
            {
                slug: 'task3',
                title: 'Task 3',
                content: 'content',
                status: 'pending'
            }
        ];
        it('should calculate correct summary statistics', () => {
            const summary = calculateTaskSummary(tasks);
            expect(summary.total_tasks).toBe(3);
            expect(summary.by_status).toEqual({
                pending: 2,
                completed: 1
            });
            expect(summary.with_links).toBe(1);
            expect(summary.with_references).toBe(1);
        });
        it('should handle empty task list', () => {
            const summary = calculateTaskSummary([]);
            expect(summary.total_tasks).toBe(0);
            expect(summary.by_status).toEqual({});
            expect(summary.with_links).toBe(0);
            expect(summary.with_references).toBe(0);
        });
    });
    describe('enrichTaskWithReferences', () => {
        let mockManager;
        beforeEach(async () => {
            // Create temporary directory for test files
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-view-utilities-test-'));
            // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
            process.env['MCP_WORKSPACE_PATH'] = tempDir;
            mockManager = {
                getSectionContent: vi.fn()
            };
        });
        it('should enrich task with all available data', async () => {
            const heading = {
                slug: 'test-task',
                title: 'Test Task',
                depth: 3
            };
            const content = `
### Test Task
- Status: completed
→ https://example.com
      `;
            // Mock the config and reference loading
            vi.doMock('../../config.js', () => ({
                loadConfig: () => ({ referenceExtractionDepth: 1 })
            }));
            vi.doMock('../reference-extractor.js', () => ({
                ReferenceExtractor: class {
                    extractReferences() { return []; }
                    normalizeReferences() { return []; }
                }
            }));
            vi.doMock('../reference-loader.js', () => ({
                ReferenceLoader: class {
                    async loadReferences() { return []; }
                }
            }));
            const enriched = await enrichTaskWithReferences(mockManager, '/doc.md', 'test-task', content, heading);
            expect(enriched.slug).toBe('test-task');
            expect(enriched.title).toBe('Test Task');
            expect(enriched.content).toBe(content);
            expect(enriched.status).toBe('completed');
            expect(enriched.link).toBe('https://example.com');
            expect(enriched.depth).toBe(3);
            expect(enriched.wordCount).toBeGreaterThan(0);
        });
        it('should work without optional parameters', async () => {
            const content = 'Simple task content';
            // Mock the dependencies
            vi.doMock('../../config.js', () => ({
                loadConfig: () => ({ referenceExtractionDepth: 1 })
            }));
            vi.doMock('../reference-extractor.js', () => ({
                ReferenceExtractor: class {
                    extractReferences() { return []; }
                    normalizeReferences() { return []; }
                }
            }));
            vi.doMock('../reference-loader.js', () => ({
                ReferenceLoader: class {
                    async loadReferences() { return []; }
                }
            }));
            const enriched = await enrichTaskWithReferences(mockManager, '/doc.md', 'simple-task', content);
            expect(enriched.slug).toBe('simple-task');
            expect(enriched.title).toBe('Unknown Task'); // Default from extractTaskTitle
            expect(enriched.status).toBe('pending'); // Default
            expect(enriched.depth).toBeUndefined();
            expect(enriched.parent).toBeUndefined();
        });
    });
});
//# sourceMappingURL=task-view-utilities.test.js.map