/**
 * Tests for view_document simplification fix
 *
 * Issue #2: view_document returns too much section detail, should be overview only
 * Fix: Remove full_path, hasContent, links, parent from section data structure
 * Keep only: slug, title, depth
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DocumentManager } from '../../../document-manager.js';
import { DocumentCache } from '../../../document-cache.js';
import { viewDocument } from '../view-document.js';
import type { SessionState } from '../../../session/types.js';

describe('view_document Simplification', () => {
  const testDocsRoot = path.resolve(process.cwd(), '.ai-prompt-guide/docs');
  const testDocPath = '/view-test.md';
  const testDocAbsolutePath = path.join(testDocsRoot, 'view-test.md');

  let cache: DocumentCache;
  let manager: DocumentManager;
  let sessionState: SessionState;

  beforeEach(async () => {
    // Initialize cache and manager
    cache = new DocumentCache(testDocsRoot);
    manager = new DocumentManager(testDocsRoot, cache);

    sessionState = {
      sessionId: 'test-session',
      createDocumentStage: 0
    };

    // Ensure test directory exists
    await fs.mkdir(path.dirname(testDocAbsolutePath), { recursive: true });

    // Create test document with sections and links
    const testContent = `# View Test Document

## Overview
This is the overview section with a link to @/other-doc.md#section.

## Features
Features section content.

### Feature A
Feature A details with @/another-doc.md reference.

### Feature B
Feature B details.

## Implementation
Implementation section.
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

  it('should return simple section overview with only slug, title, and depth', async () => {
    const result = await viewDocument(
      { document: testDocPath },
      sessionState,
      manager
    );

    expect(result.documents).toHaveLength(1);
    const doc = result.documents[0];

    expect(doc).toBeDefined();
    expect(doc?.sections).toBeDefined();
    expect(Array.isArray(doc?.sections)).toBe(true);
    expect(doc?.sections.length).toBeGreaterThan(0);

    // Check each section has ONLY the required fields
    for (const section of doc?.sections ?? []) {
      // Required fields
      expect(section).toHaveProperty('slug');
      expect(section).toHaveProperty('title');
      expect(section).toHaveProperty('depth');

      // Should NOT have these fields (this is what we're fixing)
      expect(section).not.toHaveProperty('full_path');
      expect(section).not.toHaveProperty('hasContent');
      expect(section).not.toHaveProperty('links');
      expect(section).not.toHaveProperty('parent');

      // Type checks
      expect(typeof section.slug).toBe('string');
      expect(typeof section.title).toBe('string');
      expect(typeof section.depth).toBe('number');
      expect(section.depth).toBeGreaterThanOrEqual(1);
      expect(section.depth).toBeLessThanOrEqual(6);
    }
  });

  it('should maintain correct section hierarchy information via depth field only', async () => {
    const result = await viewDocument(
      { document: testDocPath },
      sessionState,
      manager
    );

    const doc = result.documents[0];
    const sections = doc?.sections ?? [];

    // Find sections at different levels
    const overview = sections.find(s => s.slug === 'overview');
    const features = sections.find(s => s.slug === 'features');
    const featureA = sections.find(s => s.slug === 'feature-a');

    expect(overview?.depth).toBe(2);
    expect(features?.depth).toBe(2);
    expect(featureA?.depth).toBe(3); // Child of features
  });

  it('should not include link information in section data', async () => {
    const result = await viewDocument(
      { document: testDocPath },
      sessionState,
      manager
    );

    const doc = result.documents[0];
    const sections = doc?.sections ?? [];

    // Overview section has links in content, but they should NOT appear in section data
    const overview = sections.find(s => s.slug === 'overview');
    expect(overview).toBeDefined();
    expect(overview).not.toHaveProperty('links');
  });

  it('should not include parent slug in section data', async () => {
    const result = await viewDocument(
      { document: testDocPath },
      sessionState,
      manager
    );

    const doc = result.documents[0];
    const sections = doc?.sections ?? [];

    // Feature A is a child section, but parent should NOT be included
    const featureA = sections.find(s => s.slug === 'feature-a');
    expect(featureA).toBeDefined();
    expect(featureA).not.toHaveProperty('parent');
  });

  it('should not include hasContent flag in section data', async () => {
    const result = await viewDocument(
      { document: testDocPath },
      sessionState,
      manager
    );

    const doc = result.documents[0];
    const sections = doc?.sections ?? [];

    // No section should have hasContent flag
    for (const section of sections) {
      expect(section).not.toHaveProperty('hasContent');
    }
  });

  it('should not include full_path in section data', async () => {
    const result = await viewDocument(
      { document: testDocPath },
      sessionState,
      manager
    );

    const doc = result.documents[0];
    const sections = doc?.sections ?? [];

    // No section should have full_path
    for (const section of sections) {
      expect(section).not.toHaveProperty('full_path');
    }
  });

  it('should still provide comprehensive document-level metadata', async () => {
    const result = await viewDocument(
      { document: testDocPath },
      sessionState,
      manager
    );

    const doc = result.documents[0];

    // Document-level metadata should still be comprehensive
    expect(doc).toHaveProperty('path');
    expect(doc).toHaveProperty('slug');
    expect(doc).toHaveProperty('title');
    expect(doc).toHaveProperty('namespace');
    expect(doc).toHaveProperty('documentLinks');
    expect(doc).toHaveProperty('lastModified');
    expect(doc).toHaveProperty('wordCount');
    expect(doc).toHaveProperty('headingCount');

    // Document links should still be analyzed
    expect(doc?.documentLinks).toBeDefined();
    expect(doc?.documentLinks).toHaveProperty('total');
    expect(doc?.documentLinks).toHaveProperty('internal');
    expect(doc?.documentLinks).toHaveProperty('external');
  });
});
