import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { DocumentManager } from '../../document-manager.js';
import { DocumentCache } from '../../document-cache.js';
import { viewSection } from '../implementations/view-section.js';
import type { SessionState } from '../../session/types.js';

describe('view_section boundary handling', () => {
  const testDocsRoot = join(process.cwd(), '.ai-prompt-guide-test-boundary');
  const docsDir = join(testDocsRoot, 'docs');
  let manager: DocumentManager;
  let cache: DocumentCache;
  const mockState: SessionState = {
    sessionId: 'test-session',
    createDocumentStage: 0
  };

  beforeAll(async () => {
    // Create test directory structure
    mkdirSync(docsDir, { recursive: true });

    // Create test document with clear section boundaries
    const testContent = `# Test Document

## Overview

This is the overview section content.
It has multiple lines.

## Authentication

This is the authentication section content.
Should not appear in overview.

## Endpoints

This is the endpoints section content.
Should not appear in authentication.
`;

    writeFileSync(join(docsDir, 'test-api.md'), testContent);

    // Initialize cache and manager (docsDir already includes /docs)
    cache = new DocumentCache(docsDir);
    manager = new DocumentManager(docsDir, cache);
  });

  afterAll(async () => {
    // Cleanup
    await cache.destroy();
    rmSync(testDocsRoot, { recursive: true, force: true });
  });

  it('should not include next section heading in returned content', async () => {
    const result = await viewSection({
      document: '/test-api.md#overview'
    }, mockState, manager);

    // Extract content from result
    const sections = (result as { sections: Array<{ content?: string }> }).sections;
    expect(sections).toHaveLength(1);

    const firstSection = sections[0];
    expect(firstSection).toBeDefined();
    if (firstSection == null) {
      throw new Error('First section should be defined');
    }

    const content = firstSection.content ?? '';

    // Should include the section's own heading and content
    expect(content).toContain('## Overview');
    expect(content).toContain('This is the overview section content.');
    expect(content).toContain('It has multiple lines.');

    // Should NOT include the next section's heading
    expect(content).not.toContain('## Authentication');
  });

  it('should not include next section heading for middle sections', async () => {
    const result = await viewSection({
      document: '/test-api.md#authentication'
    }, mockState, manager);

    const sections = (result as { sections: Array<{ content?: string }> }).sections;
    expect(sections).toHaveLength(1);

    const firstSection = sections[0];
    expect(firstSection).toBeDefined();
    if (firstSection == null) {
      throw new Error('First section should be defined');
    }

    const content = firstSection.content ?? '';

    // Should include authentication section content
    expect(content).toContain('## Authentication');
    expect(content).toContain('This is the authentication section content.');

    // Should NOT include the next section's heading
    expect(content).not.toContain('## Endpoints');
  });

  it('should handle last section correctly (no next heading to exclude)', async () => {
    const result = await viewSection({
      document: '/test-api.md#endpoints'
    }, mockState, manager);

    const sections = (result as { sections: Array<{ content?: string }> }).sections;
    expect(sections).toHaveLength(1);

    const firstSection = sections[0];
    expect(firstSection).toBeDefined();
    if (firstSection == null) {
      throw new Error('First section should be defined');
    }

    const content = firstSection.content ?? '';

    // Should include endpoints section content
    expect(content).toContain('## Endpoints');
    expect(content).toContain('This is the endpoints section content.');

    // Last section has no next heading, so content should end cleanly
    expect(content.trim().endsWith('Should not appear in authentication.')).toBe(true);
  });

  it('should handle section with # prefix correctly', async () => {
    const result = await viewSection({
      document: '/test-api.md#overview'
    }, mockState, manager);

    const sections = (result as { sections: Array<{ content?: string }> }).sections;
    const firstSection = sections[0];
    expect(firstSection).toBeDefined();
    if (firstSection == null) {
      throw new Error('First section should be defined');
    }

    const content = firstSection.content ?? '';

    // Should NOT include next section heading
    expect(content).not.toContain('## Authentication');
  });

  it('should handle full path format correctly', async () => {
    const result = await viewSection({
      document: '/test-api.md#overview'
    }, mockState, manager);

    const sections = (result as { sections: Array<{ content?: string }> }).sections;
    const firstSection = sections[0];
    expect(firstSection).toBeDefined();
    if (firstSection == null) {
      throw new Error('First section should be defined');
    }

    const content = firstSection.content ?? '';

    // Should NOT include next section heading
    expect(content).not.toContain('## Authentication');
  });
});
