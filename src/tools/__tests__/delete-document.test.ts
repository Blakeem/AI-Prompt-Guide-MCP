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
import type { SessionState } from '../../session/types.js';
import { AddressingError, DocumentNotFoundError } from '../../shared/addressing-system.js';

describe('delete_document', () => {
  let cache: DocumentCache;
  let manager: DocumentManager;
  let tempDir: string;
  let testDocsRoot: string;
  let sessionState: SessionState;
  let testCounter = 0;

  // Helper to create a unique test document
  async function createTestDoc(): Promise<{ docPath: string; absPath: string; slug: string }> {
    testCounter++;
    const timestamp = Date.now();
    const slug = `test-del-doc-${timestamp}-${testCounter}`;
    const docPath = `/docs/${slug}.md`;
    const absPath = path.join(testDocsRoot, `docs/${slug}.md`);
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
    testDocsRoot = tempDir; // Use tempDir as the docs root

    // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
    process.env['MCP_WORKSPACE_PATH'] = tempDir;

    await fs.mkdir(path.join(testDocsRoot, 'docs'), { recursive: true });
    cache = new DocumentCache(testDocsRoot);
    manager = new DocumentManager(testDocsRoot, cache);
    sessionState = {
      sessionId: 'test-session',
      createDocumentStage: 0,
    };
  });

  afterEach(async () => {
    // Clean up temporary directory and all its contents
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  afterEach(async () => {
    await cache.destroy();
  });

  describe('permanent deletion', () => {
    it('should permanently delete a document when archive is false', async () => {
      const { docPath, absPath } = await createTestDoc();

      const result = await deleteDocument(
        { document: docPath, archive: false },
        sessionState,
        manager
      );

      expect(result).toMatchObject({ action: 'deleted', document: docPath });
      expect(result).toHaveProperty('document_info');
      expect(result).toHaveProperty('timestamp');
      await expect(fs.access(absPath)).rejects.toThrow();
    });

    it('should permanently delete a document when archive is not provided', async () => {
      const { docPath, absPath } = await createTestDoc();

      const result = await deleteDocument(
        { document: docPath },
        sessionState,
        manager
      );

      expect(result).toMatchObject({ action: 'deleted', document: docPath });
      await expect(fs.access(absPath)).rejects.toThrow();
    });

    it('should include document info in result', async () => {
      const { docPath, slug } = await createTestDoc();

      const result = await deleteDocument(
        { document: docPath, archive: false },
        sessionState,
        manager
      ) as { document_info: { slug: string; title: string; namespace: string } };

      expect(result.document_info).toBeDefined();
      expect(result.document_info.slug).toBe(slug);
      expect(result.document_info.namespace).toBe('docs');
    });
  });

  describe('archive deletion', () => {
    it('should archive a document when archive is true', async () => {
      const { docPath, absPath, slug } = await createTestDoc();

      const result = await deleteDocument(
        { document: docPath, archive: true },
        sessionState,
        manager
      );

      expect(result).toMatchObject({ action: 'archived', document: docPath });
      expect(result).toHaveProperty('from');
      expect(result).toHaveProperty('to');
      expect(result).toHaveProperty('audit_file');
      expect(result).toHaveProperty('document_info');
      expect(result).toHaveProperty('timestamp');

      await expect(fs.access(absPath)).rejects.toThrow();

      const archivedPath = path.join(testDocsRoot, 'archived/docs', `${slug}.md`);
      await expect(fs.access(archivedPath)).resolves.not.toThrow();

      const auditPath = path.join(testDocsRoot, 'archived/docs', `${slug}.md.audit`);
      await expect(fs.access(auditPath)).resolves.not.toThrow();

      // Cleanup archived files
      await fs.unlink(archivedPath);
      await fs.unlink(auditPath);
    });

    it('should include correct paths in archive result', async () => {
      const { docPath, slug } = await createTestDoc();

      const result = await deleteDocument(
        { document: docPath, archive: true },
        sessionState,
        manager
      ) as { from: string; to: string; audit_file: string };

      expect(result.from).toBe(docPath);
      expect(result.to).toContain('archived');
      expect(result.audit_file).toContain('.audit');

      // Cleanup
      const archivedPath = path.join(testDocsRoot, 'archived/docs', `${slug}.md`);
      const auditPath = path.join(testDocsRoot, 'archived/docs', `${slug}.md.audit`);
      await fs.unlink(archivedPath);
      await fs.unlink(auditPath);
    });

    it('should include document info in archive result', async () => {
      const { docPath, slug } = await createTestDoc();

      const result = await deleteDocument(
        { document: docPath, archive: true },
        sessionState,
        manager
      ) as { document_info: { slug: string; title: string; namespace: string } };

      expect(result.document_info).toBeDefined();
      expect(result.document_info.slug).toBe(slug);
      expect(result.document_info.namespace).toBe('docs');

      // Cleanup
      const archivedPath = path.join(testDocsRoot, 'archived/docs', `${slug}.md`);
      const auditPath = path.join(testDocsRoot, 'archived/docs', `${slug}.md.audit`);
      await fs.unlink(archivedPath);
      await fs.unlink(auditPath);
    });
  });

  describe('error handling', () => {
    it('should throw DocumentNotFoundError when document does not exist', async () => {
      await expect(
        deleteDocument(
          { document: '/docs/nonexistent.md', archive: false },
          sessionState,
          manager
        )
      ).rejects.toThrow(DocumentNotFoundError);
    });

    it('should throw AddressingError when document parameter is missing', async () => {
      await expect(
        deleteDocument({}, sessionState, manager)
      ).rejects.toThrow(AddressingError);
    });

    it('should throw AddressingError when document parameter is invalid', async () => {
      await expect(
        deleteDocument({ document: '' }, sessionState, manager)
      ).rejects.toThrow(AddressingError);
    });

    it('should handle file system errors gracefully', async () => {
      const { docPath } = await createTestDoc();
      const originalUnlink = fs.unlink;
      vi.spyOn(fs, 'unlink').mockRejectedValueOnce(new Error('Permission denied'));

      await expect(
        deleteDocument({ document: docPath, archive: false }, sessionState, manager)
      ).rejects.toThrow(AddressingError);

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
      const archivedPath = path.join(testDocsRoot, 'archived/docs', `${slug}.md`);
      const auditPath = path.join(testDocsRoot, 'archived/docs', `${slug}.md.audit`);
      await fs.unlink(archivedPath);
      await fs.unlink(auditPath);
    });
  });

  describe('timestamp', () => {
    it('should include valid ISO timestamp', async () => {
      const { docPath } = await createTestDoc();

      const result = await deleteDocument(
        { document: docPath, archive: false },
        sessionState,
        manager
      ) as { timestamp: string };

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
