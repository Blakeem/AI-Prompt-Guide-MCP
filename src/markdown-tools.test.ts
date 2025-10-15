/**
 * Vitest test suite for markdown CRUD operations
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import { readFileSnapshot, writeFileIfUnchanged } from './fsio.js';
import { listHeadings, buildToc, validateMarkdownStructure } from './parse.js';
import {
  readSection,
  replaceSectionBody,
  insertRelative,
  renameHeading,
  deleteSection
} from './sections.js';
import { titleToSlug } from './slug.js';
import { createSilentLogger, setGlobalLogger } from './utils/logger.js';

let tempDir: string;
let TEST_FILE: string;
let WORKING_FILE: string;
let REL_WORKING_FILE: string;

beforeAll(() => {
  // Set up silent logger for tests
  setGlobalLogger(createSilentLogger());
});

beforeEach(async () => {
  // Create temporary directory for test files
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-tools-test-'));

  // Configure docs base path for fsio PathHandler to use temp directory
  process.env['MCP_WORKSPACE_PATH'] = tempDir;

  // Set up test file paths
  TEST_FILE = path.join(tempDir, 'final-result.md');
  WORKING_FILE = path.join(tempDir, 'working-test.md');
  REL_WORKING_FILE = 'working-test.md';

  // Create sample document for tests
  const sampleDoc = `# API Documentation

## Overview

The API provides REST endpoints for managing resources.

### Authentication

Use Bearer tokens in the Authorization header.

## Endpoints

### Users

#### GET /users

Returns a list of all users.

#### POST /users

Creates a new user account.

### Products

#### GET /products

Returns a list of products.

#### POST /products

Creates a new product.
`;

  // Ensure both test files exist with consistent content
  await fs.writeFile(TEST_FILE, sampleDoc, 'utf8');
  await fs.writeFile(WORKING_FILE, sampleDoc, 'utf8');
});

afterEach(async () => {
  // Clean up temporary directory and all its contents
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore if directory doesn't exist
  }
});

describe('Markdown Parsing', () => {
  test('should parse and list headings with correct hierarchy', async () => {
    const content = await fs.readFile(TEST_FILE, 'utf8');
    const headings = listHeadings(content);

    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]?.title).toBe('API Documentation');
    expect(headings[0]?.depth).toBe(1);
    expect(headings[0]?.slug).toBe('api-documentation');
  });

  test('should build hierarchical table of contents', async () => {
    const content = await fs.readFile(TEST_FILE, 'utf8');
    const toc = buildToc(content);

    expect(toc.length).toBeGreaterThan(0);
    expect(toc[0]?.title).toBe('API Documentation');
    expect(toc[0]?.children.length).toBeGreaterThan(0);
  });

  test('should validate markdown structure', async () => {
    const content = await fs.readFile(TEST_FILE, 'utf8');

    // Should not throw for well-formed document
    expect(() => validateMarkdownStructure(content)).not.toThrow();
  });
});

describe('Section Reading', () => {
  test('should read sections by slug', async () => {
    const content = await fs.readFile(TEST_FILE, 'utf8');

    const overviewSection = readSection(content, 'overview');
    expect(overviewSection).not.toBeNull();
    expect(overviewSection).toContain('## Overview');
    expect(overviewSection).toContain('REST endpoints');

    const authSection = readSection(content, 'authentication');
    expect(authSection).not.toBeNull();
    expect(authSection).toContain('### Authentication');
    expect(authSection).toContain('Bearer tokens');
  });

  test('should return null for non-existent sections', async () => {
    const content = await fs.readFile(TEST_FILE, 'utf8');

    const nonExistent = readSection(content, 'non-existent-section');
    expect(nonExistent).toBeNull();
  });
});

describe('Section Modification', () => {
  test('should replace section body', async () => {
    const content = await fs.readFile(WORKING_FILE, 'utf8');
    const newContent = 'Updated authentication information.';

    const updated = replaceSectionBody(content, 'authentication', newContent);
    expect(updated).toContain(newContent);
    expect(updated).toContain('### Authentication');
  });

  test('should insert sections relative to existing ones', async () => {
    const content = await fs.readFile(WORKING_FILE, 'utf8');
    const body = 'This is a new feature.';

    const updated = insertRelative(content, 'authentication', 'insert_after', 3, 'New Feature', body);
    expect(updated).toContain('### New Feature');

    const headings = listHeadings(updated);
    const authIndex = headings.findIndex(h => h.slug === 'authentication');
    const newIndex = headings.findIndex(h => h.slug === 'new-feature');

    expect(newIndex).toBeGreaterThan(authIndex);
  });

  test('should rename headings', async () => {
    const content = await fs.readFile(WORKING_FILE, 'utf8');

    const updated = renameHeading(content, 'authentication', 'Security');
    expect(updated).toContain('### Security');
    expect(updated).not.toContain('### Authentication');
  });

  test('should delete sections', async () => {
    const content = await fs.readFile(WORKING_FILE, 'utf8');

    const updated = deleteSection(content, 'authentication');
    expect(updated).not.toContain('### Authentication');
    expect(updated).not.toContain('Bearer tokens');
  });

  test('should delete sections without affecting adjacent sibling sections', () => {
    const testDoc = `# Document Title

## Overview
This is the overview section.

## Component Details
This section has subsections.

### Implementation
This is the implementation details that we want to delete.

Some implementation content here.

### Usage
This is the usage section that should remain intact.

Important usage information that must not be deleted.

## Styling
This is another top-level section.
`;

    const result = deleteSection(testDoc, 'implementation');

    // Implementation section should be gone
    expect(result).not.toContain('### Implementation');
    expect(result).not.toContain('This is the implementation details');
    expect(result).not.toContain('Some implementation content here');

    // Usage section should be preserved (this was the bug)
    expect(result).toContain('### Usage');
    expect(result).toContain('This is the usage section that should remain intact');
    expect(result).toContain('Important usage information that must not be deleted');

    // Other sections should be intact
    expect(result).toContain('## Overview');
    expect(result).toContain('## Component Details');
    expect(result).toContain('## Styling');
  });
});

describe('File Operations', () => {
  test('should handle file mtime preconditions', async () => {
    // Use the working file path that already exists from beforeEach
    const snap1 = await readFileSnapshot(REL_WORKING_FILE);

    // First write should succeed
    await writeFileIfUnchanged(REL_WORKING_FILE, snap1.mtimeMs, 'Updated content');

    // Second write with stale mtime should fail
    await expect(
      writeFileIfUnchanged(REL_WORKING_FILE, snap1.mtimeMs, 'Another update')
    ).rejects.toThrow('File has been modified by another process');
  });
});

describe('Slug Generation', () => {
  test('should generate correct slugs', () => {
    expect(titleToSlug('Hello World')).toBe('hello-world');
    expect(titleToSlug('API & Documentation')).toBe('api--documentation');
    expect(titleToSlug('Search & Filtering')).toBe('search--filtering');
  });
});