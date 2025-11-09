/**
 * Error scenario testing for section tool (bulk operations)
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { section } from '../implementations/section.js';
import { createMockDocumentManager } from './mocks/document-manager.mock.js';
describe('Error Scenario Testing (Bulk Operations)', () => {
    let tempDir;
    let mockDocumentManager;
    const mockSessionState = {
        sessionId: 'error-test-session',
        createDocumentStage: 0
    };
    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'error-scenarios-test-'));
        // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
        process.env['MCP_WORKSPACE_PATH'] = tempDir;
        mockDocumentManager = createMockDocumentManager({
            initialDocuments: {
                '/docs/test-document.md': `# Test Document

## Overview
This is a test document for error scenario testing.

## Configuration
Configuration section content.
`
            }
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
    describe('Missing Operations Array', () => {
        test('should reject missing operations', async () => {
            const args = {
                document: '/docs/test-document.md'
            };
            await expect(section(args, mockSessionState, mockDocumentManager))
                .rejects
                .toThrow('operations array is required');
        });
        test('should reject empty operations array', async () => {
            const args = {
                document: '/docs/test-document.md',
                operations: []
            };
            await expect(section(args, mockSessionState, mockDocumentManager))
                .rejects
                .toThrow('operations array cannot be empty');
        });
    });
    describe('Batch Error Handling', () => {
        test('should handle partial failures gracefully', async () => {
            const args = {
                document: '/docs/test-document.md',
                operations: [
                    { section: 'overview', content: 'Valid', operation: 'replace' },
                    { section: 'nonexistent', content: 'Invalid', operation: 'replace' },
                    { section: 'configuration', content: 'Valid', operation: 'replace' }
                ]
            };
            const result = await section(args, mockSessionState, mockDocumentManager);
            expect(result).toMatchObject({
                operations_completed: 2,
                results: [
                    expect.objectContaining({ status: 'updated' }),
                    expect.objectContaining({ status: 'error' }),
                    expect.objectContaining({ status: 'updated' })
                ]
            });
        });
    });
    describe('Concurrency', () => {
        test('should handle multiple concurrent operations', async () => {
            const concurrentOps = Array.from({ length: 10 }, (_, i) => {
                const args = {
                    document: '/docs/test-document.md',
                    operations: [{
                            section: 'overview',
                            content: `Update ${i}`,
                            operation: 'replace'
                        }]
                };
                return section(args, mockSessionState, mockDocumentManager);
            });
            const results = await Promise.allSettled(concurrentOps);
            expect(results).toHaveLength(10);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            expect(successful).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=error-scenarios.test.js.map