/**
 * Tests for append operation enhancement
 *
 * Bonus: Add 'append' operation that inserts sections before tasks section
 * Implementation: Find tasks section and insert before it, or append at end if no tasks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DocumentManager } from '../../document-manager.js';
import { DocumentCache } from '../../document-cache.js';
import { performSectionEdit } from '../section-operations.js';

describe('Section Operations - Append Operation', () => {
  const testDocsRoot = path.resolve(process.cwd(), '.ai-prompt-guide/docs');
  const testDocPath = '/append-test.md';
  const testDocAbsolutePath = path.join(testDocsRoot, 'append-test.md');

  let cache: DocumentCache;
  let manager: DocumentManager;

  beforeEach(async () => {
    // Initialize cache and manager
    cache = new DocumentCache(testDocsRoot);
    manager = new DocumentManager(testDocsRoot, cache);

    // Ensure test directory exists
    await fs.mkdir(path.dirname(testDocAbsolutePath), { recursive: true });
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

  it('should insert section before tasks section when tasks exist', async () => {
    // Create document with tasks section
    const testContent = `# Append Test

## Overview
Overview content

## Features
Features content

## Tasks
- [ ] Task 1
- [ ] Task 2
`;

    await fs.writeFile(testDocAbsolutePath, testContent, 'utf8');

    // Use append operation to add new section
    const result = await performSectionEdit(
      manager,
      testDocPath,
      'tasks', // Reference section (will insert before this)
      'New section content',
      'append',
      'New Section'
    );

    expect(result.action).toBe('created');
    expect(result.section).toBe('new-section');

    // Verify section was inserted before tasks
    cache.invalidateDocument(testDocPath);
    const document = await manager.getDocument(testDocPath);
    const headings = document?.headings ?? [];

    const newSectionIndex = headings.findIndex(h => h.slug === 'new-section');
    const tasksIndex = headings.findIndex(h => h.slug === 'tasks');

    expect(newSectionIndex).toBeGreaterThan(-1);
    expect(tasksIndex).toBeGreaterThan(-1);
    expect(newSectionIndex).toBeLessThan(tasksIndex); // New section comes before tasks
  });

  it('should append at end when no tasks section exists', async () => {
    // Create document WITHOUT tasks section
    const testContent = `# Append Test

## Overview
Overview content

## Features
Features content
`;

    await fs.writeFile(testDocAbsolutePath, testContent, 'utf8');

    // Use append operation - should add at end since no tasks section
    const result = await performSectionEdit(
      manager,
      testDocPath,
      'features', // Will use as reference point
      'New section content',
      'append',
      'New Section'
    );

    expect(result.action).toBe('created');
    expect(result.section).toBe('new-section');

    // Verify section was appended at end
    cache.invalidateDocument(testDocPath);
    const document = await manager.getDocument(testDocPath);
    const headings = document?.headings ?? [];

    const newSectionIndex = headings.findIndex(h => h.slug === 'new-section');
    expect(newSectionIndex).toBe(headings.length - 1); // Last section
  });

  it('should require title parameter for append operation', async () => {
    const testContent = `# Append Test

## Overview
Overview content

## Tasks
- [ ] Task 1
`;

    await fs.writeFile(testDocAbsolutePath, testContent, 'utf8');

    // Attempt append without title should fail
    await expect(
      performSectionEdit(
        manager,
        testDocPath,
        'tasks',
        'Content',
        'append',
        undefined // No title provided
      )
    ).rejects.toThrow();
  });

  it('should work with multiple append operations in sequence', async () => {
    const testContent = `# Append Test

## Overview
Overview content

## Tasks
- [ ] Task 1
`;

    await fs.writeFile(testDocAbsolutePath, testContent, 'utf8');

    // First append
    await performSectionEdit(
      manager,
      testDocPath,
      'tasks',
      'Section A content',
      'append',
      'Section A'
    );

    // Second append (should also go before tasks)
    await performSectionEdit(
      manager,
      testDocPath,
      'tasks',
      'Section B content',
      'append',
      'Section B'
    );

    // Verify both sections are before tasks
    cache.invalidateDocument(testDocPath);
    const document = await manager.getDocument(testDocPath);
    const headings = document?.headings ?? [];

    const sectionAIndex = headings.findIndex(h => h.slug === 'section-a');
    const sectionBIndex = headings.findIndex(h => h.slug === 'section-b');
    const tasksIndex = headings.findIndex(h => h.slug === 'tasks');

    expect(sectionAIndex).toBeGreaterThan(-1);
    expect(sectionBIndex).toBeGreaterThan(-1);
    expect(tasksIndex).toBeGreaterThan(-1);
    expect(sectionAIndex).toBeLessThan(tasksIndex);
    expect(sectionBIndex).toBeLessThan(tasksIndex);
  });

  it('should set correct depth for appended sections', async () => {
    const testContent = `# Append Test

## Overview
Overview content

## Tasks
- [ ] Task 1
`;

    await fs.writeFile(testDocAbsolutePath, testContent, 'utf8');

    // Append section
    const result = await performSectionEdit(
      manager,
      testDocPath,
      'tasks',
      'New content',
      'append',
      'New Section'
    );

    expect(result.depth).toBe(2); // Same level as other H2 sections

    // Verify in document
    cache.invalidateDocument(testDocPath);
    const document = await manager.getDocument(testDocPath);
    const newSection = document?.headings.find(h => h.slug === 'new-section');

    expect(newSection?.depth).toBe(2);
  });
});
