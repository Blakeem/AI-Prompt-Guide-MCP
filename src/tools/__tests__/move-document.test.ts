/**
 * Unit tests for move_document tool
 *
 * Tests document relocation functionality including:
 * - Successful moves to new locations
 * - Directory creation for destination paths
 * - Error handling for non-existent source documents
 * - Error handling for existing destination documents
 * - Cache invalidation after moves
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DocumentManager } from '../../document-manager.js';
import { DocumentCache } from '../../document-cache.js';
import { moveDocument } from '../implementations/move-document.js';
import type { SessionState } from '../../session/types.js';

describe('move_document Tool', () => {
  const testDocsRoot = path.resolve(process.cwd(), '.ai-prompt-guide');
  const testSourcePath = '/docs/api/test-move-source.md';
  const testDestPath = '/docs/api/test-move-destination.md';
  const testNestedDestPath = '/docs/api/nested/deep/test-move-nested.md';
  const testSourceAbsolutePath = path.join(testDocsRoot, 'docs/api/test-move-source.md');
  const testDestAbsolutePath = path.join(testDocsRoot, 'docs/api/test-move-destination.md');
  const testNestedDestAbsolutePath = path.join(testDocsRoot, 'docs/api/nested/deep/test-move-nested.md');

  let cache: DocumentCache;
  let manager: DocumentManager;
  let sessionState: SessionState;

  beforeEach(async () => {
    // Initialize cache and manager
    cache = new DocumentCache(testDocsRoot);
    manager = new DocumentManager(testDocsRoot, cache);
    sessionState = {
      sessionId: 'test-session',
      createDocumentStage: 0,
    };

    // Ensure test directory exists
    await fs.mkdir(path.dirname(testSourceAbsolutePath), { recursive: true });

    // Create test source document
    const testContent = `# Test Move Document

## Overview
This document will be moved to test the move_document tool.

## Section One
Content for section one.

## Section Two
Content for section two.
`;

    await fs.writeFile(testSourceAbsolutePath, testContent, 'utf8');
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await fs.unlink(testSourceAbsolutePath);
    } catch {
      // File might have been moved or deleted
    }
    try {
      await fs.unlink(testDestAbsolutePath);
    } catch {
      // File might not exist
    }
    try {
      await fs.unlink(testNestedDestAbsolutePath);
    } catch {
      // File might not exist
    }
    try {
      await fs.rm(path.join(testDocsRoot, 'docs/api'), { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }

    // Cleanup cache
    await cache.destroy();
  });

  it('should successfully move a document to a new location', async () => {
    // Execute move
    const result = await moveDocument(
      {
        from: testSourcePath,
        to: testDestPath,
      },
      sessionState,
      manager
    ) as Record<string, unknown>;

    // Verify result structure
    expect(result['action']).toBe('moved');
    expect(result['from']).toBe(testSourcePath);
    expect(result['to']).toBe(testDestPath);
    expect(result['timestamp']).toBeDefined();

    // Verify document_info structure
    const documentInfo = result['document_info'] as Record<string, unknown>;
    expect(documentInfo['slug']).toBe('test-move-destination');
    expect(documentInfo['namespace']).toBe('docs/api');

    // Verify source file no longer exists
    await expect(fs.access(testSourceAbsolutePath)).rejects.toThrow();

    // Verify destination file exists
    await expect(fs.access(testDestAbsolutePath)).resolves.toBeUndefined();

    // Verify content is preserved
    const content = await fs.readFile(testDestAbsolutePath, 'utf8');
    expect(content).toContain('# Test Move Document');
    expect(content).toContain('## Overview');
  });

  it('should create destination directories if they do not exist', async () => {
    // Execute move to nested path
    const result = await moveDocument(
      {
        from: testSourcePath,
        to: testNestedDestPath,
      },
      sessionState,
      manager
    ) as Record<string, unknown>;

    // Verify result
    expect(result['action']).toBe('moved');
    expect(result['to']).toBe(testNestedDestPath);

    // Verify nested directory was created
    const nestedDir = path.dirname(testNestedDestAbsolutePath);
    await expect(fs.access(nestedDir)).resolves.toBeUndefined();

    // Verify destination file exists in nested directory
    await expect(fs.access(testNestedDestAbsolutePath)).resolves.toBeUndefined();
  });

  it('should throw error when source document does not exist', async () => {
    // Attempt to move non-existent document
    await expect(
      moveDocument(
        {
          from: '/docs/api/non-existent.md',
          to: testDestPath,
        },
        sessionState,
        manager
      )
    ).rejects.toThrow();
  });

  it('should throw error when destination document already exists', async () => {
    // Create destination file first
    await fs.writeFile(testDestAbsolutePath, '# Existing Document\n', 'utf8');

    // Attempt to move to existing destination
    await expect(
      moveDocument(
        {
          from: testSourcePath,
          to: testDestPath,
        },
        sessionState,
        manager
      )
    ).rejects.toThrow(/already exists/i);

    // Verify source file still exists (move should have been aborted)
    await expect(fs.access(testSourceAbsolutePath)).resolves.toBeUndefined();
  });

  it('should normalize destination path with leading slash and .md extension', async () => {
    // Test without leading slash and without .md extension
    const result = await moveDocument(
      {
        from: testSourcePath,
        to: 'docs/api/test-move-destination',
      },
      sessionState,
      manager
    ) as Record<string, unknown>;

    // Verify path was normalized
    expect(result['to']).toBe('/docs/api/test-move-destination.md');

    // Verify file exists at correct location
    await expect(fs.access(testDestAbsolutePath)).resolves.toBeUndefined();
  });

  it('should invalidate cache for both source and destination paths', async () => {
    // Load document into cache first
    const docBefore = await manager.getDocument(testSourcePath);
    expect(docBefore).not.toBeNull();

    // Execute move
    await moveDocument(
      {
        from: testSourcePath,
        to: testDestPath,
      },
      sessionState,
      manager
    );

    // Verify source path returns null (document no longer exists there)
    const sourceAfter = await manager.getDocument(testSourcePath);
    expect(sourceAfter).toBeNull();

    // Verify destination path returns the document
    const destAfter = await manager.getDocument(testDestPath);
    expect(destAfter).not.toBeNull();
    expect(destAfter?.metadata.title).toBe('Test Move Document');
  });

  it('should handle paths with and without .md extension consistently', async () => {
    // Test with explicit .md extension
    const result1 = await moveDocument(
      {
        from: testSourcePath,
        to: testDestPath,
      },
      sessionState,
      manager
    ) as Record<string, unknown>;

    expect(result1['to']).toBe(testDestPath);
    await expect(fs.access(testDestAbsolutePath)).resolves.toBeUndefined();

    // Cleanup and recreate source
    await fs.unlink(testDestAbsolutePath);
    cache.invalidateDocument(testDestPath);
    await fs.writeFile(testSourceAbsolutePath, '# Test Document\n', 'utf8');

    // Test without .md extension
    const result2 = await moveDocument(
      {
        from: testSourcePath,
        to: '/docs/api/test-move-destination',
      },
      sessionState,
      manager
    ) as Record<string, unknown>;

    expect(result2['to']).toBe('/docs/api/test-move-destination.md');
    await expect(fs.access(testDestAbsolutePath)).resolves.toBeUndefined();
  });

  it('should throw error with missing required parameters', async () => {
    // Test missing 'from' parameter
    await expect(
      moveDocument(
        {
          to: testDestPath,
        },
        sessionState,
        manager
      )
    ).rejects.toThrow();

    // Test missing 'to' parameter
    await expect(
      moveDocument(
        {
          from: testSourcePath,
        },
        sessionState,
        manager
      )
    ).rejects.toThrow();
  });
});
