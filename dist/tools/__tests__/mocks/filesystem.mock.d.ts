/**
 * Comprehensive filesystem mocking utilities for testing
 * Addresses Issue #37: Missing mocking for external dependencies
 */
export interface MockFileSystemOptions {
    initialFiles?: Record<string, string>;
    simulateErrors?: boolean;
    errorRate?: number;
}
export interface MockFileEntry {
    content: string;
    mtime: number;
    size: number;
}
/**
 * Mock filesystem that maintains in-memory file state
 */
export declare class MockFileSystem {
    private readonly files;
    private simulateErrors;
    private errorRate;
    constructor(options?: MockFileSystemOptions);
    /**
     * Mock fs.readFile implementation
     */
    readFile: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock fs.writeFile implementation
     */
    writeFile: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock fs.stat implementation
     */
    stat: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock fs.access implementation
     */
    access: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock fs.unlink implementation
     */
    unlink: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Mock fs.rm implementation (recursive directory removal)
     */
    rm: import("vitest").Mock<(...args: any[]) => any>;
    /**
     * Get current file content (for testing assertions)
     */
    getFileContent(path: string): string | undefined;
    /**
     * Check if file exists (for testing assertions)
     */
    hasFile(path: string): boolean;
    /**
     * Clear all files
     */
    clear(): void;
    /**
     * Set error simulation
     */
    setErrorSimulation(enabled: boolean, rate?: number): void;
    /**
     * Get all current file paths
     */
    getAllFiles(): string[];
}
/**
 * Create a mock filesystem with common test scenarios
 */
export declare function createMockFileSystem(options?: MockFileSystemOptions): MockFileSystem;
/**
 * Error scenarios for comprehensive testing
 * Note: Used internally by createFileSystemError()
 */
declare const ERROR_SCENARIOS: {
    readonly PERMISSION_DENIED: {
        readonly code: "EACCES";
        readonly message: "EACCES: permission denied";
    };
    readonly FILE_NOT_FOUND: {
        readonly code: "ENOENT";
        readonly message: "ENOENT: no such file or directory";
    };
    readonly DISK_FULL: {
        readonly code: "ENOSPC";
        readonly message: "ENOSPC: no space left on device";
    };
    readonly FILE_TOO_LARGE: {
        readonly code: "EFBIG";
        readonly message: "EFBIG: file too big";
    };
    readonly IO_ERROR: {
        readonly code: "EIO";
        readonly message: "EIO: i/o error";
    };
};
/**
 * Create an error with specific errno properties
 */
export declare function createFileSystemError(scenario: keyof typeof ERROR_SCENARIOS, path?: string): NodeJS.ErrnoException;
export {};
//# sourceMappingURL=filesystem.mock.d.ts.map