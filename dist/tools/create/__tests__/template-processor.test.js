/**
 * Unit tests for template-processor.ts
 * Tests template processing and document path construction
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DocumentManager } from '../../../document-manager.js';
import { DocumentCache } from '../../../document-cache.js';
import { processTemplate } from '../template-processor.js';
import { loadConfig } from '../../../config.js';
describe('processTemplate', () => {
    let manager;
    let tempDir;
    let cache;
    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'template-processor-test-'));
        // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
        process.env['MCP_WORKSPACE_PATH'] = tempDir;
        const config = loadConfig();
        cache = new DocumentCache(config.workspaceBasePath);
        manager = new DocumentManager(config.workspaceBasePath, cache);
    });
    afterEach(async () => {
        // Wait for any pending debounced operations
        await new Promise(resolve => setTimeout(resolve, 200));
        // Destroy cache before cleanup
        await cache.destroy();
        // Clean up temporary directory and all its contents
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch {
            // Ignore if directory doesn't exist
        }
    });
    describe('Document path construction', () => {
        it('should NOT include /docs/ prefix for simple namespace', async () => {
            const result = await processTemplate('api', 'Authentication Guide', 'Overview of authentication', manager);
            expect(result).not.toHaveProperty('error');
            if ('docPath' in result) {
                expect(result.docPath).toBe('/api/authentication-guide.md');
                expect(result.docPath).not.toContain('/docs/api');
            }
        });
        it('should NOT include /docs/ prefix for nested namespace', async () => {
            const result = await processTemplate('api/endpoints', 'User Endpoints', 'User API endpoints', manager);
            expect(result).not.toHaveProperty('error');
            if ('docPath' in result) {
                expect(result.docPath).toBe('/api/endpoints/user-endpoints.md');
                expect(result.docPath).not.toContain('/docs/');
            }
        });
        it('should NOT double-prefix when namespace already contains "docs"', async () => {
            const result = await processTemplate('docs/api', 'Security Guide', 'Security documentation', manager);
            expect(result).not.toHaveProperty('error');
            if ('docPath' in result) {
                expect(result.docPath).toBe('/docs/api/security-guide.md');
                expect(result.docPath).not.toContain('/docs/docs/');
            }
        });
        it('should handle context-optimization namespace without /docs/ prefix', async () => {
            const result = await processTemplate('context-optimization', 'Optimization Guide', 'Context optimization techniques', manager);
            expect(result).not.toHaveProperty('error');
            if ('docPath' in result) {
                expect(result.docPath).toBe('/context-optimization/optimization-guide.md');
                expect(result.docPath).not.toContain('/docs/');
            }
        });
        it('should maintain coordinator namespace handling', async () => {
            const result = await processTemplate('coordinator', 'Active Tasks', 'Coordinator task list', manager);
            expect(result).not.toHaveProperty('error');
            if ('docPath' in result) {
                expect(result.docPath).toBe('/coordinator/active-tasks.md');
            }
        });
        it('should handle coordinator/subpath namespace', async () => {
            const result = await processTemplate('coordinator/planning', 'Project Plan', 'Planning documents', manager);
            expect(result).not.toHaveProperty('error');
            if ('docPath' in result) {
                expect(result.docPath).toBe('/coordinator/project-plan.md');
            }
        });
    });
    describe('Template content generation', () => {
        it('should generate blank document with title and overview', async () => {
            const result = await processTemplate('test', 'Test Document', 'Test overview content', manager);
            expect(result).not.toHaveProperty('error');
            expect(result.content).toBe('# Test Document\n\nTest overview content');
            expect(result.slug).toBe('test-document');
        });
        it('should handle multi-line overview content', async () => {
            const overview = 'First line\n\nSecond paragraph\n\nThird paragraph';
            const result = await processTemplate('test', 'Multi-line Test', overview, manager);
            expect(result).not.toHaveProperty('error');
            expect(result.content).toContain(overview);
        });
        it('should generate consistent slugs from titles', async () => {
            const result = await processTemplate('test', 'My API Documentation', 'Overview', manager);
            expect(result).not.toHaveProperty('error');
            expect(result.slug).toBe('my-api-documentation');
        });
    });
    describe('Edge cases', () => {
        it('should handle namespace with leading slash', async () => {
            const result = await processTemplate('/api', 'Test', 'Overview', manager);
            expect(result).not.toHaveProperty('error');
            if ('docPath' in result) {
                expect(result.docPath).toBe('/api/test.md');
            }
        });
        it('should handle namespace with trailing slash', async () => {
            const result = await processTemplate('api/', 'Test', 'Overview', manager);
            expect(result).not.toHaveProperty('error');
            if ('docPath' in result) {
                expect(result.docPath).toBe('/api/test.md');
            }
        });
        it('should handle empty namespace', async () => {
            const result = await processTemplate('', 'Root Document', 'At root level', manager);
            expect(result).not.toHaveProperty('error');
            if ('docPath' in result) {
                expect(result.docPath).toBe('/root-document.md');
            }
        });
    });
});
//# sourceMappingURL=template-processor.test.js.map