/**
 * Integration tests for write operations
 *
 * Tests that write operations (section, task, delete_document) work correctly
 * on documents that can be read successfully.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DocumentManager } from '../../document-manager.js';
import { DocumentCache } from '../../document-cache.js';

describe('Write Operations Integration', () => {
  let testDir: string;
  let docsDir: string;
  const testDocPath = '/api/specs/test-api.md';

  let cache: DocumentCache;
  let manager: DocumentManager;

  beforeEach(async () => {
    // Set MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = process.env["MCP_WORKSPACE_PATH"] ?? "/tmp/test-workspace";

    // Create unique temporary directory
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testDir = await mkdtemp(path.resolve(tmpdir(), `write-ops-test-${uniqueId}-`));

    // Configure MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = testDir;
    docsDir = path.resolve(testDir, 'docs');

    // Initialize cache and manager with docsDir as the base path
    cache = new DocumentCache(docsDir);
    manager = new DocumentManager(docsDir, cache);

    // Create test directory structure
    const testDocAbsolutePath = path.join(docsDir, 'api/specs/test-api.md');
    await fs.mkdir(path.dirname(testDocAbsolutePath), { recursive: true });

    // Create test document
    const testContent = `# Test API

## Overview
Testing document creation

## Authentication
Authentication method and requirements.

## Base URL
\`\`\`
https://api.example.com/v1
\`\`\`

## Endpoints

### GET /example
Description of the endpoint.

**Request:**
\`\`\`http
GET /example HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`

## Error Handling
Standard error response format and common error codes.

## Rate Limits
Rate limiting policies and headers.

## Tasks
- [ ] Implement endpoint validation
- [ ] Add comprehensive error handling
- [ ] Set up rate limiting
`;

    await fs.writeFile(testDocAbsolutePath, testContent, 'utf8');
  });

  afterEach(async () => {
    // Cleanup
    await manager.destroy();
    if (testDir != null) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should successfully read a document that exists', async () => {
    // This test demonstrates that reads work
    const document = await manager.getDocument(testDocPath);

    expect(document).not.toBeNull();
    expect(document?.metadata.title).toBe('Test API');
    expect(document?.headings.length).toBeGreaterThan(0);
  });

  it('should successfully edit a section in an existing document', async () => {
    // This test should FAIL initially, proving the bug exists
    // After the fix, it should PASS

    // First, verify we can read the document
    const documentBefore = await manager.getDocument(testDocPath);
    expect(documentBefore).not.toBeNull();

    // Now attempt to update a section
    const newContent = 'Updated overview content with test data.';

    // This should work but currently fails with "File not found: test-api.md"
    await expect(
      manager.updateSection(testDocPath, 'overview', newContent, { updateToc: false })
    ).resolves.not.toThrow();

    // Verify the update worked
    const sectionContent = await manager.getSectionContent(testDocPath, 'overview');

    expect(sectionContent).toContain(newContent);
  });

  it('should successfully insert a new section in an existing document', async () => {
    // First, verify we can read the document
    const documentBefore = await manager.getDocument(testDocPath);
    expect(documentBefore).not.toBeNull();

    // Now attempt to insert a new section
    await expect(
      manager.insertSection(
        testDocPath,
        'authentication',
        'insert_after',
        2,
        'New Section',
        'This is new content',
        { updateToc: false }
      )
    ).resolves.not.toThrow();

    // Invalidate cache and verify the insertion worked
    cache.invalidateDocument(testDocPath);
    const documentAfter = await manager.getDocument(testDocPath);
    const hasSectionWithSlug = documentAfter?.headings.some(h => h.slug === 'new-section');

    expect(hasSectionWithSlug).toBe(true);
  });

  it('should successfully delete a section from an existing document', async () => {
    // First, verify we can read the document and the section exists
    const documentBefore = await manager.getDocument(testDocPath);
    expect(documentBefore).not.toBeNull();
    expect(documentBefore?.headings.some(h => h.slug === 'rate-limits')).toBe(true);

    // Now attempt to delete the section
    await expect(
      manager.deleteSection(testDocPath, 'rate-limits', { updateToc: false })
    ).resolves.not.toThrow();

    // Verify the deletion worked
    cache.invalidateDocument(testDocPath); // Force reload
    const documentAfter = await manager.getDocument(testDocPath);
    const hasSectionWithSlug = documentAfter?.headings.some(h => h.slug === 'rate-limits');

    expect(hasSectionWithSlug).toBe(false);
  });
});
