/**
 * Test environment setup and cleanup utilities
 * Addresses Issue #36: Test cleanup and organization
 */
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
export declare class TestEnvironment {
    private readonly tempDir;
    private readonly useRealFileSystem;
    private readonly mockFileSystem?;
    private readonly mockDocumentManager?;
    private readonly createdFiles;
    private readonly createdDirectories;
    constructor(options?: TestEnvironmentOptions);
    /**
     * Set up the test environment
     */
    setup(): Promise<void>;
    /**
     * Clean up the test environment
     */
    cleanup(): Promise<void>;
    /**
     * Set up real filesystem for integration tests
     */
    private setupRealFileSystem;
    /**
     * Set up mock filesystem
     */
    private setupMockFileSystem;
    /**
     * Clean up real filesystem
     */
    private cleanupRealFileSystem;
    /**
     * Clean up mock filesystem
     */
    private cleanupMockFileSystem;
    /**
     * Create a test file (real filesystem only)
     */
    createTestFile(relativePath: string, content: string): Promise<string>;
    /**
     * Add a mock file (mock filesystem only)
     */
    addMockFile(path: string, content: string): void;
    /**
     * Get mock filesystem (mock filesystem only)
     */
    getMockFileSystem(): MockFileSystem;
    /**
     * Get mock document manager (mock filesystem only)
     */
    getMockDocumentManager(): ReturnType<typeof createMockDocumentManager>;
    /**
     * Get temp directory path
     */
    getTempDir(): string;
    /**
     * Enable error simulation (mock filesystem only)
     */
    enableErrorSimulation(enabled?: boolean): void;
}
/**
 * Set up test environment with proper isolation
 * Note: Used internally by setupTestSuite()
 */
export declare function setupTestEnvironment(options?: TestEnvironmentOptions): TestEnvironment;
/**
 * Get the current test environment
 * Note: Used internally by setupTestSuite()
 */
export declare function getTestEnvironment(): TestEnvironment;
/**
 * Clean up test environment
 * Note: Used internally by setupTestSuite()
 */
export declare function cleanupTestEnvironment(): Promise<void>;
/**
 * Test suite setup helper for consistent test organization
 */
export declare function setupTestSuite(_suiteName: string, options?: TestEnvironmentOptions): {
    beforeAll: () => Promise<void>;
    afterAll: () => Promise<void>;
    beforeEach: () => Promise<void>;
    afterEach: () => Promise<void>;
    getEnvironment: () => TestEnvironment;
};
/**
 * Standard test data for consistent testing
 */
export declare const STANDARD_TEST_DOCUMENTS: {
    readonly SIMPLE_DOC: "# Simple Document\n\n## Overview\nThis is a simple test document.\n\n## Features\nBasic features section.\n";
    readonly COMPLEX_DOC: "# Complex Document\n\n## Overview\nThis is a more complex document for testing.\n\n### Purpose\nDetailed purpose section.\n\n### Scope\nScope of the document.\n\n## Architecture\n\n### Components\nSystem components.\n\n#### Database\nDatabase component details.\n\n#### API\nAPI component details.\n\n### Infrastructure\nInfrastructure details.\n\n## Configuration\n\n### Environment Variables\nEnvironment configuration.\n\n### Deployment\nDeployment instructions.\n";
    readonly MINIMAL_DOC: "# Minimal\n\nSimple minimal document.\n";
    readonly HIERARCHICAL_DOC: "# Hierarchical Document\n\n## Level 1A\n\n### Level 2A\n\n#### Level 3A\n\n##### Level 4A\n\n###### Level 5A\n\n### Level 2B\n\n## Level 1B\n\n### Level 2C\n\n#### Level 3B\n";
};
//# sourceMappingURL=test-environment.d.ts.map