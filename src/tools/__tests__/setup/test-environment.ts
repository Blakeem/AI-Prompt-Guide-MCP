/**
 * Test environment setup and cleanup utilities
 * Addresses Issue #36: Test cleanup and organization
 */

import { vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createSilentLogger, setGlobalLogger } from '../../../utils/logger.js';
import { createMockFileSystem } from '../mocks/filesystem.mock.js';
import { createMockDocumentManager } from '../mocks/document-manager.mock.js';
import type { MockFileSystem } from '../mocks/filesystem.mock.js';

export interface TestEnvironmentOptions {
  useRealFileSystem?: boolean;
  tempDir?: string;
  enableLogging?: boolean;
  mockFileSystemOptions?: {
    initialFiles?: Record<string, string>;
    simulateErrors?: boolean;
  };
}

/**
 * Comprehensive test environment manager
 * Note: Used internally by setupTestSuite() - exported for type inference
 */
export class TestEnvironment {
  private readonly tempDir: string;
  private readonly useRealFileSystem: boolean;
  private readonly mockFileSystem?: MockFileSystem;
  private readonly mockDocumentManager?: ReturnType<typeof createMockDocumentManager>;
  private readonly createdFiles: Set<string> = new Set();
  private readonly createdDirectories: Set<string> = new Set();

  constructor(options: TestEnvironmentOptions = {}) {
    this.useRealFileSystem = options.useRealFileSystem ?? false;
    this.tempDir = options.tempDir ?? path.join(process.cwd(), '.test-temp', `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    // Set up logging
    if (options.enableLogging !== true) {
      setGlobalLogger(createSilentLogger());
    }

    // Initialize mock filesystem if not using real filesystem
    if (!this.useRealFileSystem) {
      this.mockFileSystem = createMockFileSystem(options.mockFileSystemOptions);
      this.mockDocumentManager = createMockDocumentManager({
        mockFileSystem: this.mockFileSystem,
        ...(options.mockFileSystemOptions?.initialFiles && {
          initialDocuments: options.mockFileSystemOptions.initialFiles
        })
      });
    }
  }

  /**
   * Set up the test environment
   */
  async setup(): Promise<void> {
    if (this.useRealFileSystem) {
      await this.setupRealFileSystem();
    } else {
      await this.setupMockFileSystem();
    }
  }

  /**
   * Clean up the test environment
   */
  async cleanup(): Promise<void> {
    if (this.useRealFileSystem) {
      await this.cleanupRealFileSystem();
    } else {
      await this.cleanupMockFileSystem();
    }

    // Clear all vitest mocks
    vi.clearAllMocks();
  }

  /**
   * Set up real filesystem for integration tests
   */
  private async setupRealFileSystem(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.createdDirectories.add(this.tempDir);
    } catch (error) {
      console.warn(`Failed to create temp directory: ${this.tempDir}`, error);
    }
  }

  /**
   * Set up mock filesystem
   */
  private async setupMockFileSystem(): Promise<void> {
    if (!this.mockFileSystem) {
      throw new Error('Mock filesystem not initialized');
    }

    // Note: Mocking is now handled at the test level using vi.mock()
    // This method is kept for consistency but no longer sets up vi.doMock()
  }

  /**
   * Clean up real filesystem
   */
  private async cleanupRealFileSystem(): Promise<void> {
    // Clean up created files
    for (const filePath of this.createdFiles) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore errors - file might not exist
        console.warn(`Failed to cleanup file: ${filePath}`, error);
      }
    }

    // Clean up created directories
    for (const dirPath of this.createdDirectories) {
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
      } catch (error) {
        // Ignore errors - directory might not exist
        console.warn(`Failed to cleanup directory: ${dirPath}`, error);
      }
    }

    this.createdFiles.clear();
    this.createdDirectories.clear();
  }

  /**
   * Clean up mock filesystem
   */
  private async cleanupMockFileSystem(): Promise<void> {
    this.mockFileSystem?.clear();
  }


  /**
   * Create a test file (real filesystem only)
   */
  async createTestFile(relativePath: string, content: string): Promise<string> {
    if (!this.useRealFileSystem) {
      throw new Error('createTestFile only available with real filesystem');
    }

    const fullPath = path.join(this.tempDir, relativePath);
    const dirPath = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    this.createdDirectories.add(dirPath);

    // Write file
    await fs.writeFile(fullPath, content, 'utf8');
    this.createdFiles.add(fullPath);

    return fullPath;
  }

  /**
   * Add a mock file (mock filesystem only)
   */
  addMockFile(path: string, content: string): void {
    if (this.useRealFileSystem) {
      throw new Error('addMockFile only available with mock filesystem');
    }

    this.mockFileSystem?.writeFile(path, content);
  }

  /**
   * Get mock filesystem (mock filesystem only)
   */
  getMockFileSystem(): MockFileSystem {
    if (this.useRealFileSystem || !this.mockFileSystem) {
      throw new Error('Mock filesystem not available');
    }
    return this.mockFileSystem;
  }

  /**
   * Get mock document manager (mock filesystem only)
   */
  getMockDocumentManager(): ReturnType<typeof createMockDocumentManager> {
    if (this.useRealFileSystem || !this.mockDocumentManager) {
      throw new Error('Mock document manager not available');
    }
    return this.mockDocumentManager;
  }

  /**
   * Get temp directory path
   */
  getTempDir(): string {
    return this.tempDir;
  }

  /**
   * Enable error simulation (mock filesystem only)
   */
  enableErrorSimulation(enabled: boolean = true): void {
    if (this.useRealFileSystem) {
      throw new Error('Error simulation only available with mock filesystem');
    }
    this.mockDocumentManager?.setErrorSimulation(enabled);
  }
}

/**
 * Global test environment instance
 */
let globalTestEnvironment: TestEnvironment | null = null;

/**
 * Set up test environment with proper isolation
 * Note: Used internally by setupTestSuite()
 */
export function setupTestEnvironment(options: TestEnvironmentOptions = {}): TestEnvironment {
  if (globalTestEnvironment) {
    throw new Error('Test environment already set up. Call cleanupTestEnvironment first.');
  }

  globalTestEnvironment = new TestEnvironment(options);
  return globalTestEnvironment;
}

/**
 * Get the current test environment
 * Note: Used internally by setupTestSuite()
 */
export function getTestEnvironment(): TestEnvironment {
  if (!globalTestEnvironment) {
    throw new Error('Test environment not set up. Call setupTestEnvironment first.');
  }
  return globalTestEnvironment;
}

/**
 * Clean up test environment
 * Note: Used internally by setupTestSuite()
 */
export async function cleanupTestEnvironment(): Promise<void> {
  if (globalTestEnvironment) {
    await globalTestEnvironment.cleanup();
    globalTestEnvironment = null;
  }
}

/**
 * Test suite setup helper for consistent test organization
 */
export function setupTestSuite(
  _suiteName: string,
  options: TestEnvironmentOptions = {}
): {
  beforeAll: () => Promise<void>;
  afterAll: () => Promise<void>;
  beforeEach: () => Promise<void>;
  afterEach: () => Promise<void>;
  getEnvironment: () => TestEnvironment;
} {
  let testEnvironment: TestEnvironment;

  return {
    beforeAll: async (): Promise<void> => {
      // Setting up test suite - logging disabled for testing
      testEnvironment = setupTestEnvironment(options);
      await testEnvironment.setup();
    },

    afterAll: async (): Promise<void> => {
      // Cleaning up test suite - logging disabled for testing
      await testEnvironment.cleanup();
      await cleanupTestEnvironment();
    },

    beforeEach: async (): Promise<void> => {
      // Reset any per-test state
      if (options.useRealFileSystem !== true) {
        testEnvironment.getMockFileSystem().clear();
        // Re-add initial files if specified
        if (options.mockFileSystemOptions?.initialFiles) {
          for (const [path, content] of Object.entries(options.mockFileSystemOptions.initialFiles)) {
            testEnvironment.addMockFile(path, content);
          }
        }
      }
      vi.clearAllMocks();
    },

    afterEach: async (): Promise<void> => {
      // Clean up any per-test state
      if (options.useRealFileSystem === true) {
        // Real filesystem cleanup is handled in the main cleanup
      }
    },

    getEnvironment: (): TestEnvironment => testEnvironment
  };
}

/**
 * Standard test data for consistent testing
 */
export const STANDARD_TEST_DOCUMENTS = {
  SIMPLE_DOC: `# Simple Document

## Overview
This is a simple test document.

## Features
Basic features section.
`,

  COMPLEX_DOC: `# Complex Document

## Overview
This is a more complex document for testing.

### Purpose
Detailed purpose section.

### Scope
Scope of the document.

## Architecture

### Components
System components.

#### Database
Database component details.

#### API
API component details.

### Infrastructure
Infrastructure details.

## Configuration

### Environment Variables
Environment configuration.

### Deployment
Deployment instructions.
`,

  MINIMAL_DOC: `# Minimal

Simple minimal document.
`,

  HIERARCHICAL_DOC: `# Hierarchical Document

## Level 1A

### Level 2A

#### Level 3A

##### Level 4A

###### Level 5A

### Level 2B

## Level 1B

### Level 2C

#### Level 3B
`
} as const;