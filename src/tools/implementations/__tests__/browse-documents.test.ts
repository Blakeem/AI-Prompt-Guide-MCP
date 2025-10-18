/**
 * Unit tests for browse_documents tool
 *
 * Tests the browse_documents tool which provides unified browsing and searching
 * with namespace awareness and verbose mode control.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { browseDocuments } from '../browse-documents.js';
import { createDocumentManager } from '../../../shared/utilities.js';
import type { DocumentManager } from '../../../document-manager.js';
import type { SessionState } from '../../../session/types.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('browse_documents tool', () => {
  let manager: DocumentManager;
  let sessionState: SessionState;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'browse-documents-test-'));

    // Configure MCP_WORKSPACE_PATH for fsio PathHandler to use temp directory
    process.env['MCP_WORKSPACE_PATH'] = tempDir;

    manager = createDocumentManager();
    sessionState = {
      sessionId: `test-${Date.now()}-${Math.random()}`,
      createDocumentStage: 0
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

  describe('Verbose Parameter - Default Behavior', () => {
    beforeEach(async () => {
      // Create test documents with multiple sections
      const doc1Content = `# Test Document 1

Overview content for test 1.

## Section One

Content for section one.

## Section Two

Content for section two.
`;

      const doc2Content = `# Test Document 2

Overview content for test 2.
`;

      await fs.writeFile(path.join(tempDir, 'test1.md'), doc1Content);
      await fs.writeFile(path.join(tempDir, 'test2.md'), doc2Content);
    });

    it('should default to compact overview mode (verbose=false)', async () => {
      const result = await browseDocuments({}, sessionState, manager);

      expect(result.structure.documents).toBeDefined();
      expect(result.structure.documents.length).toBeGreaterThan(0);

      // Check first document
      const doc = result.structure.documents[0];
      expect(doc).toBeDefined();

      if (doc != null) {
        // Should NOT include sections array by default
        expect(doc.sections).toBeUndefined();

        // SHOULD include section_count and word_count
        expect(doc.section_count).toBeDefined();
        expect(doc.word_count).toBeDefined();
        expect(typeof doc.section_count).toBe('number');
        expect(typeof doc.word_count).toBe('number');
      }
    });

    it('should include path, title, slug, namespace in compact mode', async () => {
      const result = await browseDocuments({}, sessionState, manager);

      const doc = result.structure.documents[0];
      expect(doc).toBeDefined();

      if (doc != null) {
        expect(doc.path).toBeDefined();
        expect(doc.title).toBeDefined();
        expect(doc.slug).toBeDefined();
        expect(doc.namespace).toBeDefined();
        expect(doc.lastModified).toBeDefined();
      }
    });
  });

  describe('Verbose Parameter - Explicit False', () => {
    beforeEach(async () => {
      const docContent = `# Test Document

Overview content.

## Section One

Content.
`;
      await fs.writeFile(path.join(tempDir, 'test.md'), docContent);
    });

    it('should exclude sections array when verbose=false explicitly', async () => {
      const result = await browseDocuments({ verbose: false }, sessionState, manager);

      const doc = result.structure.documents[0];
      expect(doc).toBeDefined();

      if (doc != null) {
        expect(doc.sections).toBeUndefined();
        expect(doc.section_count).toBeDefined();
        expect(doc.word_count).toBeDefined();
      }
    });
  });

  describe('Verbose Parameter - True', () => {
    beforeEach(async () => {
      const docContent = `# Test Document

Overview content.

## Section One

Content for section one.

## Section Two

Content for section two.
`;
      await fs.writeFile(path.join(tempDir, 'test.md'), docContent);
    });

    it('should include full sections array when verbose=true', async () => {
      const result = await browseDocuments({ verbose: true }, sessionState, manager);

      const doc = result.structure.documents[0];
      expect(doc).toBeDefined();

      if (doc != null) {
        // SHOULD include sections array in verbose mode
        expect(doc.sections).toBeDefined();
        expect(Array.isArray(doc.sections)).toBe(true);

        // SHOULD still include section_count and word_count
        expect(doc.section_count).toBeDefined();
        expect(doc.word_count).toBeDefined();

        // Verify sections array has expected structure
        if (doc.sections != null && doc.sections.length > 0) {
          const section = doc.sections[0];
          expect(section).toBeDefined();

          if (section != null) {
            expect(section.slug).toBeDefined();
            expect(section.title).toBeDefined();
            expect(section.depth).toBeDefined();
            expect(section.hasContent).toBeDefined();
          }
        }
      }
    });

    it('should have section_count matching sections array length', async () => {
      const result = await browseDocuments({ verbose: true }, sessionState, manager);

      const doc = result.structure.documents[0];
      expect(doc).toBeDefined();

      if (doc?.sections != null) {
        expect(doc.section_count).toBe(doc.sections.length);
      }
    });
  });

  describe('Multiple Documents - Compact Mode Efficiency', () => {
    beforeEach(async () => {
      // Create multiple documents with many sections
      for (let i = 1; i <= 5; i++) {
        const docContent = `# Document ${i}

Overview for doc ${i}.

## Section 1

Content for section 1.

## Section 2

Content for section 2.

## Section 3

Content for section 3.
`;
        await fs.writeFile(path.join(tempDir, `doc${i}.md`), docContent);
      }
    });

    it('should return compact overview for multiple documents by default', async () => {
      const result = await browseDocuments({}, sessionState, manager);

      expect(result.structure.documents.length).toBeGreaterThanOrEqual(5);

      // Verify ALL documents are in compact mode
      for (const doc of result.structure.documents) {
        expect(doc.sections).toBeUndefined();
        expect(doc.section_count).toBeDefined();
        expect(doc.word_count).toBeDefined();
      }
    });

    it('should return full detail for multiple documents when verbose=true', async () => {
      const result = await browseDocuments({ verbose: true }, sessionState, manager);

      expect(result.structure.documents.length).toBeGreaterThanOrEqual(5);

      // Verify ALL documents have full sections
      for (const doc of result.structure.documents) {
        expect(doc.sections).toBeDefined();
        expect(Array.isArray(doc.sections)).toBe(true);
        expect(doc.section_count).toBeDefined();
        expect(doc.word_count).toBeDefined();

        // Verify section_count matches
        if (doc.sections != null) {
          expect(doc.section_count).toBe(doc.sections.length);
        }
      }
    });
  });

  describe('Namespace Browsing with Verbose Mode', () => {
    beforeEach(async () => {
      // Create namespace structure
      await fs.mkdir(path.join(tempDir, 'api'), { recursive: true });
      const authContent = `# Authentication API

Auth overview.

## Endpoints

Auth endpoints.
`;
      await fs.writeFile(path.join(tempDir, 'api', 'auth.md'), authContent);
    });

    it('should support verbose mode in namespace browsing', async () => {
      const result = await browseDocuments({ path: '/api', verbose: false }, sessionState, manager);

      const doc = result.structure.documents.find(d => d.path === '/api/auth.md');
      expect(doc).toBeDefined();

      if (doc != null) {
        expect(doc.sections).toBeUndefined();
        expect(doc.section_count).toBeDefined();
      }
    });

    it('should support verbose=true in namespace browsing', async () => {
      const result = await browseDocuments({ path: '/api', verbose: true }, sessionState, manager);

      const doc = result.structure.documents.find(d => d.path === '/api/auth.md');
      expect(doc).toBeDefined();

      if (doc != null) {
        expect(doc.sections).toBeDefined();
        expect(doc.section_count).toBeDefined();
      }
    });
  });

  describe('Parameter Validation', () => {
    it('should handle link_depth parameter with verbose mode', async () => {
      const docContent = `# Test

Overview.
`;
      await fs.writeFile(path.join(tempDir, 'test.md'), docContent);

      const result = await browseDocuments({
        verbose: false,
        link_depth: 3
      }, sessionState, manager);

      expect(result).toBeDefined();
    });

    it('should handle include_related parameter with verbose mode', async () => {
      const docContent = `# Test

Overview.
`;
      await fs.writeFile(path.join(tempDir, 'test.md'), docContent);

      const result = await browseDocuments({
        verbose: true,
        include_related: false
      }, sessionState, manager);

      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty directory with verbose=false', async () => {
      const result = await browseDocuments({ verbose: false }, sessionState, manager);

      expect(result.structure.documents).toBeDefined();
      expect(Array.isArray(result.structure.documents)).toBe(true);
    });

    it('should handle empty directory with verbose=true', async () => {
      const result = await browseDocuments({ verbose: true }, sessionState, manager);

      expect(result.structure.documents).toBeDefined();
      expect(Array.isArray(result.structure.documents)).toBe(true);
    });

    it('should handle document with no sections in compact mode', async () => {
      const emptyContent = `# Empty Doc

Just overview.
`;
      await fs.writeFile(path.join(tempDir, 'empty.md'), emptyContent);

      const result = await browseDocuments({ verbose: false }, sessionState, manager);

      const doc = result.structure.documents.find(d => d.path === '/empty.md');
      expect(doc).toBeDefined();

      if (doc != null) {
        expect(doc.sections).toBeUndefined();
        expect(doc.section_count).toBe(1); // Overview section
        expect(doc.word_count).toBeGreaterThan(0);
      }
    });

    it('should handle document with no sections in verbose mode', async () => {
      const emptyContent = `# Empty Doc

Just overview.
`;
      await fs.writeFile(path.join(tempDir, 'empty.md'), emptyContent);

      const result = await browseDocuments({ verbose: true }, sessionState, manager);

      const doc = result.structure.documents.find(d => d.path === '/empty.md');
      expect(doc).toBeDefined();

      if (doc != null) {
        expect(doc.sections).toBeDefined();
        expect(doc.section_count).toBe(1); // Overview section
        expect(doc.word_count).toBeGreaterThan(0);

        if (doc.sections != null) {
          expect(doc.sections.length).toBe(doc.section_count);
        }
      }
    });
  });
});
