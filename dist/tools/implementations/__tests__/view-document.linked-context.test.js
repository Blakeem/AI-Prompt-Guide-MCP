/**
 * Tests for view_document include_linked feature
 *
 * Issue: Setting include_linked=true doesn't add linked_context field to response
 * Root Cause: normalizePath in link-utils.ts doesn't add .md extension, causing document lookup failures
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { DocumentManager } from '../../../document-manager.js';
import { DocumentCache } from '../../../document-cache.js';
import { viewDocument } from '../view-document.js';
describe('view_document include_linked feature', () => {
    let testDir;
    let docsDir;
    let cache;
    let manager;
    let sessionState;
    beforeEach(async () => {
        // Set MCP_WORKSPACE_PATH for config loading
        process.env["MCP_WORKSPACE_PATH"] = process.env["MCP_WORKSPACE_PATH"] ?? "/tmp/test-workspace";
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        testDir = await mkdtemp(path.resolve(tmpdir(), `view-doc-linked-test-${uniqueId}-`));
        // Configure MCP_WORKSPACE_PATH for config loading
        process.env["MCP_WORKSPACE_PATH"] = testDir;
        docsDir = path.resolve(testDir, 'docs');
        // Initialize cache and manager with docsDir root
        cache = new DocumentCache(docsDir);
        manager = new DocumentManager(docsDir, cache);
        sessionState = {
            sessionId: 'test-session',
            createDocumentStage: 0
        };
        // Create test directory structure
        await mkdir(path.join(docsDir, 'docs', 'tasks'), { recursive: true });
        await mkdir(path.join(docsDir, 'docs', 'specs'), { recursive: true });
        // Create main test document with @references
        const mainDocPath = path.join(docsDir, 'main-doc.md');
        const mainDocContent = `# Main Document

## Overview
This document references other documents:
- @/docs/tasks/tool-testing-results.md for testing information
- @/docs/specs/test-doc.md#setup for setup details

## Details
More content here.
`;
        await writeFile(mainDocPath, mainDocContent, 'utf8');
        // Create referenced document 1 (with .md extension in filename)
        const refDoc1Path = path.join(docsDir, 'docs', 'tasks', 'tool-testing-results.md');
        const refDoc1Content = `# Tool Testing Results

## Summary
Testing results go here.

## Details
Detailed testing information.
`;
        await writeFile(refDoc1Path, refDoc1Content, 'utf8');
        // Create referenced document 2 (with section reference)
        const refDoc2Path = path.join(docsDir, 'docs', 'specs', 'test-doc.md');
        const refDoc2Content = `# Test Documentation

## Setup
Setup instructions here.

## Configuration
Configuration details.
`;
        await writeFile(refDoc2Path, refDoc2Content, 'utf8');
    });
    afterEach(async () => {
        await cache.destroy();
        if (testDir != null) {
            await rm(testDir, { recursive: true, force: true });
        }
    });
    it('should include linked_context when include_linked=true and document has @references', async () => {
        const result = await viewDocument({
            document: '/main-doc.md',
            include_linked: true,
            link_depth: 2
        }, sessionState, manager);
        // Should have documents array
        expect(result.documents).toBeDefined();
        expect(result.documents).toHaveLength(1);
        // CRITICAL: Should have linked_context field when include_linked=true
        expect(result.linked_context).toBeDefined();
        expect(Array.isArray(result.linked_context)).toBe(true);
        if (result.linked_context != null) {
            expect(result.linked_context.length).toBeGreaterThan(0);
        }
    });
    it('should NOT include linked_context when include_linked=false', async () => {
        const result = await viewDocument({
            document: '/main-doc.md',
            include_linked: false
        }, sessionState, manager);
        // Should NOT have linked_context field
        expect(result.linked_context).toBeUndefined();
    });
    it('should NOT include linked_context when include_linked is not provided (default behavior)', async () => {
        const result = await viewDocument({
            document: '/main-doc.md'
        }, sessionState, manager);
        // Should NOT have linked_context field (default is false)
        expect(result.linked_context).toBeUndefined();
    });
    it('should load content from documents referenced with @/path/doc.md format', async () => {
        const result = await viewDocument({
            document: '/main-doc.md',
            include_linked: true,
            link_depth: 2
        }, sessionState, manager);
        expect(result.linked_context).toBeDefined();
        if (result.linked_context != null) {
            // Should find the referenced document
            const toolTestingRef = result.linked_context.find(ctx => ctx.document_path === '/docs/tasks/tool-testing-results.md');
            expect(toolTestingRef).toBeDefined();
            if (toolTestingRef != null) {
                expect(toolTestingRef.content).toContain('Testing results go here');
                expect(toolTestingRef.title).toBe('Tool Testing Results');
                expect(toolTestingRef.namespace).toBe('docs/tasks');
            }
        }
    });
    it('should load specific section when reference includes #section', async () => {
        const result = await viewDocument({
            document: '/main-doc.md',
            include_linked: true,
            link_depth: 2
        }, sessionState, manager);
        expect(result.linked_context).toBeDefined();
        if (result.linked_context != null) {
            // Should find the section-specific reference
            const testDocRef = result.linked_context.find(ctx => ctx.document_path === '/docs/specs/test-doc.md' && ctx.section_slug === 'setup');
            expect(testDocRef).toBeDefined();
            if (testDocRef != null) {
                expect(testDocRef.content).toContain('Setup instructions here');
                expect(testDocRef.section_slug).toBe('setup');
                expect(testDocRef.title).toBe('Setup'); // Section title, not document title
            }
        }
    });
    it('should respect link_depth parameter', async () => {
        const result1 = await viewDocument({
            document: '/main-doc.md',
            include_linked: true,
            link_depth: 1
        }, sessionState, manager);
        const result2 = await viewDocument({
            document: '/main-doc.md',
            include_linked: true,
            link_depth: 2
        }, sessionState, manager);
        // Both should have linked_context
        expect(result1.linked_context).toBeDefined();
        expect(result2.linked_context).toBeDefined();
        // depth=1 should only get direct references
        // depth=2 can get nested references (but in this test, there are none)
        // So they should be equal in this case
        if (result1.linked_context != null && result2.linked_context != null) {
            expect(result1.linked_context.length).toBeLessThanOrEqual(result2.linked_context.length);
        }
    });
    it('should handle documents with no @references gracefully', async () => {
        // Create a document with no references
        const noRefDocPath = path.join(docsDir, 'no-refs.md');
        const noRefDocContent = `# No References

## Content
This document has no @references.
`;
        await writeFile(noRefDocPath, noRefDocContent, 'utf8');
        const result = await viewDocument({
            document: '/no-refs.md',
            include_linked: true,
            link_depth: 2
        }, sessionState, manager);
        // Should NOT have linked_context if no references found
        // (empty array gets filtered out by the conditional in view-document.ts line 177)
        expect(result.linked_context).toBeUndefined();
    });
    it('should set relevance field correctly for direct references', async () => {
        const result = await viewDocument({
            document: '/main-doc.md',
            include_linked: true,
            link_depth: 2
        }, sessionState, manager);
        expect(result.linked_context).toBeDefined();
        if (result.linked_context != null) {
            // All direct references should have 'primary' relevance
            for (const ctx of result.linked_context) {
                expect(ctx.relevance).toBe('primary');
            }
        }
    });
    it('should include source_link field with @ prefix', async () => {
        const result = await viewDocument({
            document: '/main-doc.md',
            include_linked: true,
            link_depth: 2
        }, sessionState, manager);
        expect(result.linked_context).toBeDefined();
        if (result.linked_context != null) {
            // All linked context should have source_link with @ prefix
            for (const ctx of result.linked_context) {
                expect(ctx.source_link).toMatch(/^@\//);
            }
        }
    });
    it('should only load linked context for first document when viewing multiple documents', async () => {
        // Create second main document
        const secondDocPath = path.join(docsDir, 'second-doc.md');
        const secondDocContent = `# Second Document

## Overview
Another document.
`;
        await writeFile(secondDocPath, secondDocContent, 'utf8');
        const result = await viewDocument({
            document: ['/main-doc.md', '/second-doc.md'],
            include_linked: true,
            link_depth: 2
        }, sessionState, manager);
        expect(result.documents).toHaveLength(2);
        // Should still have linked_context (from first document only)
        expect(result.linked_context).toBeDefined();
        // Linked context should only be from first document's references
        // (as per implementation at view-document.ts line 147)
    });
});
//# sourceMappingURL=view-document.linked-context.test.js.map