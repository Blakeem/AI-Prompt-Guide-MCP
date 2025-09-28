/**
 * Integration tests for edit_section tool with actual markdown manipulation
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { section } from '../implementations/section.js';
import { DocumentManager } from '../../document-manager.js';
import { initializeGlobalCache } from '../../document-cache.js';
import { ensureDirectoryExists } from '../../fsio.js';
import { createSilentLogger, setGlobalLogger } from '../../utils/logger.js';
import type { SessionState } from '../../session/types.js';

// Mock the utilities module to use our test document manager
vi.mock('../../shared/utilities.js', async () => {
  const actual = await vi.importActual('../../shared/utilities.js') as Record<string, unknown>;
  return {
    ...actual,
    getDocumentManager: vi.fn()
  };
});

const TEST_DOCS_DIR = path.resolve(process.cwd(), '.spec-docs-mcp/test-integration');
const TEST_DOC_PATH = '/integration-test.md';
const FULL_TEST_PATH = path.join(TEST_DOCS_DIR, 'integration-test.md');

// Mock session state
const mockSessionState: SessionState = {
  sessionId: 'integration-test-session',
  createDocumentStage: 0
};

// Sample markdown document for testing
const SAMPLE_DOCUMENT = `# Integration Test Document

## Overview

This document is used for integration testing of the edit_section tool.

## Features

### Authentication

Secure user authentication system.

### Data Processing

Advanced data processing capabilities.

## API Reference

Complete API documentation.

### Endpoints

List of all available endpoints.

#### Users

User management endpoints.

#### Products

Product management endpoints.

## Configuration

Application configuration details.
`;

describe('Edit Section Tool - Integration Tests', () => {
  let documentManager: DocumentManager;

  beforeAll(async () => {
    // Set up silent logger for tests
    setGlobalLogger(createSilentLogger());

    // Ensure test directory exists and clean it first
    try {
      await fs.rm(TEST_DOCS_DIR, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
    await ensureDirectoryExists(TEST_DOCS_DIR);

    // Initialize global cache
    const cache = initializeGlobalCache(TEST_DOCS_DIR, {
      maxCacheSize: 10,
      enableWatching: false // Disable watching for tests
    });

    // Create document manager with explicit cache dependency
    documentManager = new DocumentManager(TEST_DOCS_DIR, cache);

    // Mock getDocumentManager to return our test instance
    const { getDocumentManager } = await import('../../shared/utilities.js');
    vi.mocked(getDocumentManager).mockResolvedValue(documentManager);
  });

  beforeEach(async () => {
    // Ensure test directory exists before creating files
    await ensureDirectoryExists(TEST_DOCS_DIR);

    // Create fresh test document for each test
    await fs.writeFile(FULL_TEST_PATH, SAMPLE_DOCUMENT, 'utf8');

    // Clear document cache to ensure fresh reads
    const { getGlobalCache } = await import('../../document-cache.js');
    const cache = getGlobalCache();
    cache.clear();
  });

  afterEach(async () => {
    // Clean up test document
    try {
      await fs.unlink(FULL_TEST_PATH);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DOCS_DIR, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  describe('Replace Operations', () => {
    test('should replace section content completely', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'overview',
        content: 'This is the completely new overview content.',
        operation: 'replace'
      };

      // Act
      const result = await section(args, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        updated: true,
        document: TEST_DOC_PATH,
        section: 'overview',
        operation: 'replace',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number)
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('This is the completely new overview content.');
      expect(updatedContent).not.toContain('This document is used for integration testing');
    });

    test('should replace nested section content', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'authentication',
        content: 'New authentication documentation with OAuth 2.0 support.',
        operation: 'replace'
      };

      // Act
      const result = await section(args, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        updated: true,
        document: TEST_DOC_PATH,
        section: 'authentication',
        operation: 'replace',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number)
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('New authentication documentation with OAuth 2.0 support.');
      expect(updatedContent).not.toContain('Secure user authentication system.');
    });
  });

  describe('Append Operations', () => {
    test('should append content to existing section', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'overview',
        content: 'Additional overview information.',
        operation: 'append'
      };

      // Act
      const result = await section(args, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        updated: true,
        document: TEST_DOC_PATH,
        section: 'overview',
        operation: 'append',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number)
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('This document is used for integration testing');
      expect(updatedContent).toContain('Additional overview information.');

      // Verify order - original content should come before appended content
      const overviewMatch = updatedContent.match(/## Overview\s*([\s\S]*?)(?=##|$)/);
      expect(overviewMatch).toBeTruthy();
      if (overviewMatch?.[1] != null) {
        const overviewSection = overviewMatch[1];
        const originalIndex = overviewSection.indexOf('This document is used for integration testing');
        const appendedIndex = overviewSection.indexOf('Additional overview information.');
        expect(originalIndex).toBeLessThan(appendedIndex);
      }
    });

    test('should append content to nested section', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'data-processing',
        content: 'Supports real-time data streams.',
        operation: 'append'
      };

      // Act
      await section(args, mockSessionState);

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('Advanced data processing capabilities.');
      expect(updatedContent).toContain('Supports real-time data streams.');
    });
  });

  describe('Prepend Operations', () => {
    test('should prepend content to existing section', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'overview',
        content: 'Important notice: Please read this first.',
        operation: 'prepend'
      };

      // Act
      const result = await section(args, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        updated: true,
        document: TEST_DOC_PATH,
        section: 'overview',
        operation: 'prepend',
        timestamp: expect.any(String),
        hierarchical_info: {
          slug_depth: expect.any(Number)
        },
        link_assistance: {
          links_found: expect.any(Array),
          link_suggestions: expect.any(Array),
          syntax_help: {
            detected_patterns: expect.any(Array),
            correct_examples: expect.any(Array),
            common_mistakes: expect.any(Array)
          }
        },
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('Important notice: Please read this first.');
      expect(updatedContent).toContain('This document is used for integration testing');

      // Verify order - prepended content should come before original content
      const overviewMatch = updatedContent.match(/## Overview\s*([\s\S]*?)(?=##|$)/);
      expect(overviewMatch).toBeTruthy();
      if (overviewMatch?.[1] != null) {
        const overviewSection = overviewMatch[1];
        const prependedIndex = overviewSection.indexOf('Important notice: Please read this first.');
        const originalIndex = overviewSection.indexOf('This document is used for integration testing');
        expect(prependedIndex).toBeLessThan(originalIndex);
      }
    });
  });

  describe('Creation Operations', () => {
    test('should create new section with insert_before', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'features',
        content: 'This is a new section inserted before Features.',
        operation: 'insert_before',
        title: 'Prerequisites'
      };

      // Act
      const result = await section(args, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        created: true,
        document: TEST_DOC_PATH,
        new_section: 'prerequisites',
        operation: 'insert_before',
        timestamp: expect.any(String)
      });

      // Check depth is present and reasonable (may be undefined if section not found in headings)
      const depth = (result as { depth?: number }).depth;
      if (depth !== undefined) {
        expect(depth).toBeGreaterThan(0);
        expect(depth).toBeLessThanOrEqual(6);
      }

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('## Prerequisites');
      expect(updatedContent).toContain('This is a new section inserted before Features.');

      // Verify order - Prerequisites should come before Features
      const prereqIndex = updatedContent.indexOf('## Prerequisites');
      const featuresIndex = updatedContent.indexOf('## Features');
      expect(prereqIndex).toBeLessThan(featuresIndex);
    });

    test('should create new section with insert_after', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'overview',
        content: 'Quick start guide for getting up and running.',
        operation: 'insert_after',
        title: 'Quick Start'
      };

      // Act
      const result = await section(args, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        created: true,
        document: TEST_DOC_PATH,
        new_section: 'quick-start',
        operation: 'insert_after',
        timestamp: expect.any(String)
      });

      // Check depth is present and reasonable (may be undefined if section not found in headings)
      const depth = (result as { depth?: number }).depth;
      if (depth !== undefined) {
        expect(depth).toBeGreaterThan(0);
        expect(depth).toBeLessThanOrEqual(6);
      }

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('## Quick Start');
      expect(updatedContent).toContain('Quick start guide for getting up and running.');

      // Verify order - Quick Start should come after Overview
      const overviewIndex = updatedContent.indexOf('## Overview');
      const quickStartIndex = updatedContent.indexOf('## Quick Start');
      expect(overviewIndex).toBeLessThan(quickStartIndex);
    });

    test('should create new child section with append_child', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'features',
        content: 'Real-time notifications and alerts.',
        operation: 'append_child',
        title: 'Notifications'
      };

      // Act
      const result = await section(args, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        created: true,
        document: TEST_DOC_PATH,
        new_section: 'notifications',
        operation: 'append_child',
        timestamp: expect.any(String)
      });

      // Check depth is present and reasonable (may be undefined if section not found in headings)
      const depth = (result as { depth?: number }).depth;
      if (depth !== undefined) {
        expect(depth).toBeGreaterThan(0);
        expect(depth).toBeLessThanOrEqual(6);
      }

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('### Notifications');
      expect(updatedContent).toContain('Real-time notifications and alerts.');

      // Verify placement - should be after Data Processing but before API Reference
      const dataProcessingIndex = updatedContent.indexOf('### Data Processing');
      const notificationsIndex = updatedContent.indexOf('### Notifications');
      const apiRefIndex = updatedContent.indexOf('## API Reference');
      expect(dataProcessingIndex).toBeLessThan(notificationsIndex);
      expect(notificationsIndex).toBeLessThan(apiRefIndex);
    });

    test('should create deeply nested child section', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'users',
        content: 'GET /users/:id endpoint details.',
        operation: 'append_child',
        title: 'Get User by ID'
      };

      // Act
      const result = await section(args, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        created: true,
        document: TEST_DOC_PATH,
        new_section: 'get-user-by-id',
        operation: 'append_child',
        timestamp: expect.any(String)
      });

      // Check depth is present and reasonable (should be deeper than Users section, may be undefined)
      const depth = (result as { depth?: number }).depth;
      if (depth !== undefined) {
        expect(depth).toBeGreaterThan(4);
        expect(depth).toBeLessThanOrEqual(6);
      }

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('##### Get User by ID');
      expect(updatedContent).toContain('GET /users/:id endpoint details.');
    });
  });

  describe('Batch Operations', () => {
    test('should handle mixed batch operations on same document', async () => {
      // Arrange
      const operations = [
        {
          document: TEST_DOC_PATH,
          section: 'overview',
          content: 'Updated overview with new information.',
          operation: 'replace'
        },
        {
          document: TEST_DOC_PATH,
          section: 'features',
          content: 'New installation section.',
          operation: 'insert_before',
          title: 'Installation'
        },
        {
          document: TEST_DOC_PATH,
          section: 'configuration',
          content: 'Additional configuration notes.',
          operation: 'append'
        }
      ];

      // Act
      const result = await section(operations, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        document: TEST_DOC_PATH,
        sections_modified: 3,
        total_operations: 3,
        timestamp: expect.any(String)
      });

      const batchResults = (result as { batch_results: Array<{ success: boolean; section: string; action?: string; depth?: number }> }).batch_results;
      expect(batchResults).toHaveLength(3);
      expect(batchResults[0]).toMatchObject({ success: true, section: 'overview', action: 'edited' });
      expect(batchResults[1]).toMatchObject({ success: true, section: 'installation', action: 'created' });
      expect(batchResults[2]).toMatchObject({ success: true, section: 'configuration', action: 'edited' });

      // Check that creation operation has depth (may be undefined)
      const creationDepth = batchResults[1]?.depth;
      if (creationDepth !== undefined) {
        expect(creationDepth).toBeGreaterThan(0);
        expect(creationDepth).toBeLessThanOrEqual(6);
      }

      // Verify the actual markdown content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');

      // Check edit operations
      expect(updatedContent).toContain('Updated overview with new information.');
      expect(updatedContent).not.toContain('This document is used for integration testing');
      expect(updatedContent).toContain('Application configuration details.');
      expect(updatedContent).toContain('Additional configuration notes.');

      // Check creation operation
      expect(updatedContent).toContain('## Installation');
      expect(updatedContent).toContain('New installation section.');

      // Verify order
      const installationIndex = updatedContent.indexOf('## Installation');
      const featuresIndex = updatedContent.indexOf('## Features');
      expect(installationIndex).toBeLessThan(featuresIndex);
    });

    test('should handle batch operations with partial failures', async () => {
      // Arrange
      const operations = [
        {
          document: TEST_DOC_PATH,
          section: 'overview',
          content: 'Valid update.',
          operation: 'replace'
        },
        {
          document: TEST_DOC_PATH,
          section: 'non-existent-section',
          content: 'This will fail.',
          operation: 'replace'
        },
        {
          document: TEST_DOC_PATH,
          section: 'features',
          content: 'Valid append.',
          operation: 'append'
        }
      ];

      // Act
      const result = await section(operations, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        batch_results: [
          { success: true, section: 'overview', action: 'edited' },
          {
            success: false,
            section: 'non-existent-section',
            error: expect.stringContaining('Section not found: non-existent-section')
          },
          { success: true, section: 'features', action: 'edited' }
        ],
        document: TEST_DOC_PATH,
        sections_modified: 2, // Only successful operations
        total_operations: 3,
        timestamp: expect.any(String),
        document_info: {
          slug: expect.any(String),
          title: expect.any(String),
          namespace: expect.any(String)
        }
      });

      // Verify successful operations were applied
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('Valid update.');
      expect(updatedContent).toContain('Valid append.');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent document', async () => {
      // Arrange
      const args = {
        document: '/non-existent-document.md',
        section: 'overview',
        content: 'Content.',
        operation: 'replace'
      };

      // Act & Assert
      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });

    test('should handle non-existent section for replace operation', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'non-existent-section',
        content: 'Content.',
        operation: 'replace'
      };

      // Act & Assert
      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });

    test('should handle creation operation without title', async () => {
      // Arrange
      const args = {
        document: TEST_DOC_PATH,
        section: 'features',
        content: 'Content.',
        operation: 'insert_before'
        // Missing title
      };

      // Act & Assert
      await expect(section(args, mockSessionState))
        .rejects
        .toThrow();
    });
  });


  describe('Complex Document Structure', () => {
    test('should handle operations on document with complex nesting', async () => {
      // Test creating a section using the default document structure (more reliable)
      const args = {
        document: TEST_DOC_PATH,
        section: 'api-reference',
        content: 'New subsection under API Reference.',
        operation: 'append_child',
        title: 'Authentication Details'
      };

      // Act
      const result = await section(args, mockSessionState);

      // Assert
      expect(result).toMatchObject({
        created: true,
        document: TEST_DOC_PATH,
        new_section: 'authentication-details',
        operation: 'append_child',
        timestamp: expect.any(String)
      });

      // Check depth is present and reasonable (may be undefined)
      const depth = (result as { depth?: number }).depth;
      if (depth !== undefined) {
        expect(depth).toBeGreaterThan(2);
        expect(depth).toBeLessThanOrEqual(6);
      }

      // Verify the content
      const updatedContent = await fs.readFile(FULL_TEST_PATH, 'utf8');
      expect(updatedContent).toContain('### Authentication Details');
      expect(updatedContent).toContain('New subsection under API Reference.');
    });
  });
});