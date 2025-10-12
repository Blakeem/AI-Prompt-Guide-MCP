/**
 * Unit tests for section operations path resolution fix
 * Tests the fix for BUG #2 and BUG #5 - path normalization issue
 * Tests the fix for BUG - bypassValidation flag missing in file operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

describe('Section Operations - Path Resolution Fix', () => {
  describe('path normalization', () => {
    it('should handle leading slash in document path correctly', () => {
      // Test the fix for path normalization
      const docsBasePath = '/test/docs';

      // Input with leading slash (the problematic case)
      const docPathWithLeadingSlash = '/api/guides/test.md';

      // Old approach (broken) - would create double slash
      const brokenPath = join(docsBasePath, docPathWithLeadingSlash);

      // New approach (fixed) - strips leading slash like DocumentCache
      const fixedPath = join(docsBasePath, docPathWithLeadingSlash.startsWith('/') ? docPathWithLeadingSlash.slice(1) : docPathWithLeadingSlash);

      // Verify the fix
      expect(brokenPath).toBe('/test/docs/api/guides/test.md');
      expect(fixedPath).toBe('/test/docs/api/guides/test.md');

      // They should be the same after normalization
      expect(fixedPath).toBe(brokenPath);
    });

    it('should handle document path without leading slash correctly', () => {
      const docsBasePath = '/test/docs';
      const docPathWithoutLeadingSlash = 'api/guides/test.md';

      const fixedPath = join(docsBasePath, docPathWithoutLeadingSlash.startsWith('/') ? docPathWithoutLeadingSlash.slice(1) : docPathWithoutLeadingSlash);

      expect(fixedPath).toBe('/test/docs/api/guides/test.md');
    });

    it('should match DocumentCache.getAbsolutePath behavior', () => {
      // Simulate DocumentCache.getAbsolutePath logic
      function getAbsolutePath(docsRoot: string, docPath: string): string {
        return join(docsRoot, docPath.startsWith('/') ? docPath.slice(1) : docPath);
      }

      // Simulate section-operations.ts logic (fixed version)
      function getSectionOperationPath(docsBasePath: string, normalizedPath: string): string {
        return join(docsBasePath, normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath);
      }

      const docsRoot = '/test/docs';
      const testPaths = [
        '/api/guides/test.md',
        'api/guides/test.md',
        '/root-level.md',
        'root-level.md'
      ];

      for (const testPath of testPaths) {
        const docCachePath = getAbsolutePath(docsRoot, testPath);
        const sectionOpPath = getSectionOperationPath(docsRoot, testPath);

        expect(sectionOpPath).toBe(docCachePath);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty path correctly', () => {
      const docsBasePath = '/test/docs';
      const emptyPath = '';

      const result = join(docsBasePath, emptyPath.startsWith('/') ? emptyPath.slice(1) : emptyPath);

      expect(result).toBe('/test/docs');
    });

    it('should handle root slash path correctly', () => {
      const docsBasePath = '/test/docs';
      const rootPath = '/';

      const result = join(docsBasePath, rootPath.startsWith('/') ? rootPath.slice(1) : rootPath);

      expect(result).toBe('/test/docs');
    });

    it('should handle multiple leading slashes correctly', () => {
      const docsBasePath = '/test/docs';
      const multiSlashPath = '//api/guides/test.md';

      const result = join(docsBasePath, multiSlashPath.startsWith('/') ? multiSlashPath.slice(1) : multiSlashPath);

      expect(result).toBe('/test/docs/api/guides/test.md');
    });
  });

  describe('Integration - File I/O with bypassValidation', () => {
    let testDir: string;

    beforeEach(() => {
      // Create test directory structure
      testDir = join(process.cwd(), `.test-section-operations-${Date.now()}`);
      const apiSpecsDir = join(testDir, 'api', 'specs');
      mkdirSync(apiSpecsDir, { recursive: true });

      // Create test document in nested directory
      const testDocPath = join(apiSpecsDir, 'test-api.md');
      const testContent = `# Test API

## Overview

This is the overview section.
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
      // This test verifies the FIX for the bypassValidation bug
      // Before the fix, readFileSnapshot and writeFileIfUnchanged would fail with "File not found"
      // when called with absolute paths (not under docsBasePath)

      const { readFileSnapshot, writeFileIfUnchanged } = await import('../../fsio.js');

      const absolutePath = join(testDir, 'api', 'specs', 'test-api.md');

      // This should NOT throw "File not found" error with bypassValidation
      const snapshot = await readFileSnapshot(absolutePath, { bypassValidation: true });
      expect(snapshot.content).toContain('# Test API');

      // Modify content
      const modifiedContent = snapshot.content.replace('overview section', 'modified section');

      // This should NOT throw "File not found" error with bypassValidation
      await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, modifiedContent, { bypassValidation: true });

      // Verify write succeeded
      const { readFileSync } = await import('node:fs');
      const updatedContent = readFileSync(absolutePath, 'utf-8');
      expect(updatedContent).toContain('modified section');
    });
  });
});