/**
 * Vitest test suite for markdown CRUD operations
 */

import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { readFileSnapshot, writeFileIfUnchanged, ensureDirectoryExists } from './fsio.js';
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

const DOCS_DIR = path.resolve(process.cwd(), '.spec-docs-mcp/docs');
const TEST_FILE = path.join(DOCS_DIR, 'final-result.md');
const WORKING_FILE = path.join(DOCS_DIR, 'working-test.md');

beforeAll(async () => {
  // Set up silent logger for tests
  setGlobalLogger(createSilentLogger());
  
  // Ensure test directory exists
  await ensureDirectoryExists(DOCS_DIR);
});

beforeEach(async () => {
  // Create fresh working copy for each test
  try {
    const original = await readFileSnapshot(TEST_FILE);
    await fs.writeFile(WORKING_FILE, original.content, 'utf8');
  } catch {
    // If TEST_FILE doesn't exist, create a sample document
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
    await fs.writeFile(TEST_FILE, sampleDoc, 'utf8');
    await fs.writeFile(WORKING_FILE, sampleDoc, 'utf8');
  }
});

afterAll(async () => {
  // Clean up working file
  try {
    await fs.unlink(WORKING_FILE);
  } catch {
    // Ignore if file doesn't exist
  }
});

describe('Markdown Parsing', () => {
  test('should parse and list headings with correct hierarchy', async () => {
    const snap = await readFileSnapshot(TEST_FILE);
    const headings = listHeadings(snap.content);
    
    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]?.title).toBe('API Documentation');
    expect(headings[0]?.depth).toBe(1);
    expect(headings[0]?.slug).toBe('api-documentation');
  });

  test('should build hierarchical table of contents', async () => {
    const snap = await readFileSnapshot(TEST_FILE);
    const toc = buildToc(snap.content);
    
    expect(toc.length).toBeGreaterThan(0);
    expect(toc[0]?.title).toBe('API Documentation');
    expect(toc[0]?.children.length).toBeGreaterThan(0);
  });

  test('should validate markdown structure', async () => {
    const snap = await readFileSnapshot(TEST_FILE);
    
    // Should not throw for well-formed document
    expect(() => validateMarkdownStructure(snap.content)).not.toThrow();
  });
});

describe('Section Reading', () => {
  test('should read sections by slug', async () => {
    const snap = await readFileSnapshot(TEST_FILE);
    
    const overviewSection = readSection(snap.content, 'overview');
    expect(overviewSection).not.toBeNull();
    expect(overviewSection).toContain('## Overview');
    expect(overviewSection).toContain('REST endpoints');
    
    const authSection = readSection(snap.content, 'authentication');
    expect(authSection).not.toBeNull();
    expect(authSection).toContain('### Authentication');
    expect(authSection).toContain('Bearer tokens');
  });

  test('should return null for non-existent sections', async () => {
    const snap = await readFileSnapshot(TEST_FILE);
    
    const nonExistent = readSection(snap.content, 'non-existent-section');
    expect(nonExistent).toBeNull();
  });
});

describe('Section Modification', () => {
  test('should replace section body', async () => {
    const snap = await readFileSnapshot(WORKING_FILE);
    const newContent = 'Updated authentication information.';
    
    const updated = replaceSectionBody(snap.content, 'authentication', newContent);
    expect(updated).toContain(newContent);
    expect(updated).toContain('### Authentication');
  });

  test('should insert sections relative to existing ones', async () => {
    const snap = await readFileSnapshot(WORKING_FILE);
    const body = 'This is a new feature.';
    
    const updated = insertRelative(snap.content, 'authentication', 'insert_after', 3, 'New Feature', body);
    expect(updated).toContain('### New Feature');
    
    const headings = listHeadings(updated);
    const authIndex = headings.findIndex(h => h.slug === 'authentication');
    const newIndex = headings.findIndex(h => h.slug === 'new-feature');
    
    expect(newIndex).toBeGreaterThan(authIndex);
  });

  test('should rename headings', async () => {
    const snap = await readFileSnapshot(WORKING_FILE);
    
    const updated = renameHeading(snap.content, 'authentication', 'Security');
    expect(updated).toContain('### Security');
    expect(updated).not.toContain('### Authentication');
  });

  test('should delete sections', async () => {
    const snap = await readFileSnapshot(WORKING_FILE);
    
    const updated = deleteSection(snap.content, 'authentication');
    expect(updated).not.toContain('### Authentication');
    expect(updated).not.toContain('Bearer tokens');
  });
});

describe('File Operations', () => {
  test('should handle file mtime preconditions', async () => {
    const content = 'Test content';
    await fs.writeFile(WORKING_FILE, content, 'utf8');
    
    const snap1 = await readFileSnapshot(WORKING_FILE);
    const snap2 = await readFileSnapshot(WORKING_FILE);
    
    // First write should succeed
    await writeFileIfUnchanged(WORKING_FILE, snap1.mtimeMs, 'Updated content');
    
    // Second write with stale mtime should fail
    await expect(
      writeFileIfUnchanged(WORKING_FILE, snap2.mtimeMs, 'Another update')
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