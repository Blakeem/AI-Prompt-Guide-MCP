/**
 * Document manager mocking utilities for testing
 * Addresses Issue #37: Missing mocking for external dependencies
 */
import type { MockFileSystem } from './filesystem.mock.js';
export interface MockDocumentManagerOptions {
    mockFileSystem?: MockFileSystem;
    initialDocuments?: Record<string, string>;
    simulateErrors?: boolean;
}
/**
 * Mock document manager for testing
 * Note: Not exported directly - use createMockDocumentManager() factory function
 */
declare class MockDocumentManager {
    private readonly mockFileSystem;
    private simulateErrors;
    private readonly documentCache;
    constructor(options?: MockDocumentManagerOptions);
    /**
     * Mock getDocument implementation
     */
    getDocument: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock getSectionContent implementation
     */
    getSectionContent: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock updateDocument implementation
     */
    updateDocument: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock updateSection implementation (required by section tool)
     */
    updateSection: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock insertSection implementation (required by section tool for creation operations)
     */
    insertSection: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock archiveDocument implementation
     */
    archiveDocument: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Simple heading parser for mock purposes with duplicate handling
     */
    private parseHeadings;
    /**
     * Simple slug generation
     */
    private titleToSlug;
    /**
     * Find parent heading index for hierarchical structure
     */
    private findParentIndex;
    /**
     * Extract section content (simplified for testing)
     * Returns content WITHOUT the heading to maintain consistency with editSection
     */
    private extractSection;
    /**
     * Create mock metadata
     */
    private createMockMetadata;
    /**
     * Extract mock keywords for testing
     */
    private extractMockKeywords;
    /**
     * Extract title from content
     */
    private extractTitle;
    /**
     * Get the underlying mock filesystem
     */
    getFileSystem(): MockFileSystem;
    /**
     * Insert section content directly in document string
     */
    private insertSectionContent;
    /**
     * Find the end of a section (before next heading at same or higher level)
     */
    private findSectionEnd;
    /**
     * Replace section content directly in document string
     */
    private replaceSectionContent;
    /**
     * Set error simulation
     */
    setErrorSimulation(enabled: boolean): void;
}
/**
 * Create a mock document manager for testing
 */
export declare function createMockDocumentManager(options?: MockDocumentManagerOptions): MockDocumentManager;
export {};
//# sourceMappingURL=document-manager.mock.d.ts.map