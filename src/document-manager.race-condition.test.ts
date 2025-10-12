/**
 * Tests for section batch operations race condition fix
 *
 * Issue #1: Sequential operations fail because cache isn't invalidated after writes
 * Root cause: Write operations don't invalidate cache, causing stale data on subsequent reads
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DocumentManager } from './document-manager.js';
import { DocumentCache } from './document-cache.js';

describe('Section Batch Operations Race Condition', () => {
  const testDocsRoot = path.resolve(process.cwd(), '.ai-prompt-guide/docs');
  const testDocPath = '/race-condition-test.md';
  const testDocAbsolutePath = path.join(testDocsRoot, 'race-condition-test.md');

  let cache: DocumentCache;
  let manager: DocumentManager;

  beforeEach(async () => {
    // Initialize cache and manager
    cache = new DocumentCache(testDocsRoot);
    manager = new DocumentManager(testDocsRoot, cache);

    // Ensure test directory exists
    await fs.mkdir(path.dirname(testDocAbsolutePath), { recursive: true });

    // Create minimal test document
    const testContent = `# Race Condition Test

## Section A
Initial content A

## Section B
Initial content B
`;

    await fs.writeFile(testDocAbsolutePath, testContent, 'utf8');
  });

  afterEach(async () => {
    // Cleanup
    await cache.destroy();
    try {
      await fs.unlink(testDocAbsolutePath);
    } catch {
      // Ignore errors if file doesn't exist
    }
  });

  it('should handle sequential insertSection operations without race condition', async () => {
    // Operation 1: Insert section C after A
    await manager.insertSection(
      testDocPath,
      'section-a',
      'insert_after',
      2,
      'Section C',
      'Content C',
      { updateToc: false }
    );

    // Operation 2: Insert section D after C (depends on C existing)
    // This should succeed if cache is invalidated after first insert
    await expect(
      manager.insertSection(
        testDocPath,
        'section-c',
        'insert_after',
        2,
        'Section D',
        'Content D',
        { updateToc: false }
      )
    ).resolves.not.toThrow();

    // Operation 3: Insert section E after D (depends on D existing)
    await expect(
      manager.insertSection(
        testDocPath,
        'section-d',
        'insert_after',
        2,
        'Section E',
        'Content E',
        { updateToc: false }
      )
    ).resolves.not.toThrow();

    // Verify all sections exist
    cache.invalidateDocument(testDocPath);
    const document = await manager.getDocument(testDocPath);
    expect(document).not.toBeNull();

    const slugs = document?.headings.map(h => h.slug) ?? [];
    expect(slugs).toContain('section-c');
    expect(slugs).toContain('section-d');
    expect(slugs).toContain('section-e');
  });

  it('should handle sequential updateSection operations without race condition', async () => {
    // Operation 1: Update section A
    await manager.updateSection(
      testDocPath,
      'section-a',
      'Updated content A',
      { updateToc: false }
    );

    // Operation 2: Update section B (should see updated document state)
    await expect(
      manager.updateSection(
        testDocPath,
        'section-b',
        'Updated content B',
        { updateToc: false }
      )
    ).resolves.not.toThrow();

    // Verify both updates succeeded
    cache.invalidateDocument(testDocPath);
    const contentA = await manager.getSectionContent(testDocPath, 'section-a');
    const contentB = await manager.getSectionContent(testDocPath, 'section-b');

    expect(contentA).toContain('Updated content A');
    expect(contentB).toContain('Updated content B');
  });

  it('should handle sequential renameSection operations without race condition', async () => {
    // Operation 1: Rename section A
    await manager.renameSection(
      testDocPath,
      'section-a',
      'Renamed Section A',
      { updateToc: false }
    );

    // Operation 2: Rename section B (should see updated document state)
    await expect(
      manager.renameSection(
        testDocPath,
        'section-b',
        'Renamed Section B',
        { updateToc: false }
      )
    ).resolves.not.toThrow();

    // Verify both renames succeeded (check by title since slug may change)
    cache.invalidateDocument(testDocPath);
    const document = await manager.getDocument(testDocPath);
    const headings = document?.headings ?? [];
    const titles = headings.map(h => h.title);

    expect(titles).toContain('Renamed Section A');
    expect(titles).toContain('Renamed Section B');
  });

  it('should handle sequential deleteSection operations without race condition', async () => {
    // Add more sections first
    await manager.insertSection(
      testDocPath,
      'section-b',
      'insert_after',
      2,
      'Section C',
      'Content C',
      { updateToc: false }
    );

    cache.invalidateDocument(testDocPath);

    // Operation 1: Delete section A
    await manager.deleteSection(testDocPath, 'section-a', { updateToc: false });

    // Operation 2: Delete section B (should see updated document state)
    await expect(
      manager.deleteSection(testDocPath, 'section-b', { updateToc: false })
    ).resolves.not.toThrow();

    // Verify both deletions succeeded
    cache.invalidateDocument(testDocPath);
    const document = await manager.getDocument(testDocPath);
    const slugs = document?.headings.map(h => h.slug) ?? [];

    expect(slugs).not.toContain('section-a');
    expect(slugs).not.toContain('section-b');
    expect(slugs).toContain('section-c'); // This should still exist
  });

  it('should handle mixed batch operations (insert, update, delete) without race condition', async () => {
    // Operation 1: Insert section C
    await manager.insertSection(
      testDocPath,
      'section-b',
      'insert_after',
      2,
      'Section C',
      'Content C',
      { updateToc: false }
    );

    // Operation 2: Update section A (depends on fresh document state)
    await manager.updateSection(
      testDocPath,
      'section-a',
      'Updated A',
      { updateToc: false }
    );

    // Operation 3: Insert section D after C (depends on C existing)
    await expect(
      manager.insertSection(
        testDocPath,
        'section-c',
        'insert_after',
        2,
        'Section D',
        'Content D',
        { updateToc: false }
      )
    ).resolves.not.toThrow();

    // Operation 4: Delete section B
    await expect(
      manager.deleteSection(testDocPath, 'section-b', { updateToc: false })
    ).resolves.not.toThrow();

    // Verify final state
    cache.invalidateDocument(testDocPath);
    const document = await manager.getDocument(testDocPath);
    const slugs = document?.headings.map(h => h.slug) ?? [];

    expect(slugs).toContain('section-a');
    expect(slugs).not.toContain('section-b'); // Deleted
    expect(slugs).toContain('section-c');
    expect(slugs).toContain('section-d');

    const contentA = await manager.getSectionContent(testDocPath, 'section-a');
    expect(contentA).toContain('Updated A');
  });
});
