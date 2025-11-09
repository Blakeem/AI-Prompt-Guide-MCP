/**
 * Comprehensive filesystem mocking utilities for testing
 * Addresses Issue #37: Missing mocking for external dependencies
 */
import { vi } from 'vitest';
/**
 * Mock filesystem that maintains in-memory file state
 */
export class MockFileSystem {
    files = new Map();
    simulateErrors;
    errorRate;
    constructor(options = {}) {
        this.simulateErrors = options.simulateErrors ?? false;
        this.errorRate = options.errorRate ?? 0.1;
        // Initialize with provided files
        if (options.initialFiles) {
            for (const [path, content] of Object.entries(options.initialFiles)) {
                this.files.set(path, {
                    content,
                    mtime: Date.now(),
                    size: content.length
                });
            }
        }
    }
    /**
     * Mock fs.readFile implementation
     */
    readFile = vi.fn().mockImplementation(async (path) => {
        if (this.simulateErrors && Math.random() < this.errorRate) {
            throw new Error('ENOENT: no such file or directory');
        }
        const file = this.files.get(path);
        if (!file) {
            const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
            error.code = 'ENOENT';
            error.errno = -2;
            error.syscall = 'open';
            error.path = path;
            throw error;
        }
        return Buffer.from(file.content, 'utf8');
    });
    /**
     * Mock fs.writeFile implementation
     */
    writeFile = vi.fn().mockImplementation(async (path, content) => {
        if (this.simulateErrors && Math.random() < this.errorRate) {
            throw new Error('EACCES: permission denied');
        }
        this.files.set(path, {
            content,
            mtime: Date.now(),
            size: content.length
        });
    });
    /**
     * Mock fs.stat implementation
     */
    stat = vi.fn().mockImplementation(async (path) => {
        if (this.simulateErrors && Math.random() < this.errorRate) {
            throw new Error('ENOENT: no such file or directory');
        }
        const file = this.files.get(path);
        if (!file) {
            const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
            error.code = 'ENOENT';
            error.errno = -2;
            error.syscall = 'stat';
            error.path = path;
            throw error;
        }
        return {
            isFile: () => true,
            isDirectory: () => false,
            size: file.size,
            mtime: new Date(file.mtime),
            mtimeMs: file.mtime,
            // Add other required Stats properties with defaults
            dev: 0,
            ino: 0,
            mode: 0o644,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: 0,
            blksize: 4096,
            blocks: Math.ceil(file.size / 512),
            atime: new Date(file.mtime),
            ctime: new Date(file.mtime),
            birthtime: new Date(file.mtime),
            atimeMs: file.mtime,
            ctimeMs: file.mtime,
            birthtimeMs: file.mtime,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false
        };
    });
    /**
     * Mock fs.access implementation
     */
    access = vi.fn().mockImplementation(async (path) => {
        if (this.simulateErrors && Math.random() < this.errorRate) {
            throw new Error('EACCES: permission denied');
        }
        const file = this.files.get(path);
        if (!file) {
            const error = new Error(`ENOENT: no such file or directory, access '${path}'`);
            error.code = 'ENOENT';
            error.errno = -2;
            error.syscall = 'access';
            error.path = path;
            throw error;
        }
    });
    /**
     * Mock fs.unlink implementation
     */
    unlink = vi.fn().mockImplementation(async (path) => {
        if (this.simulateErrors && Math.random() < this.errorRate) {
            throw new Error('EACCES: permission denied');
        }
        const existed = this.files.delete(path);
        if (!existed) {
            const error = new Error(`ENOENT: no such file or directory, unlink '${path}'`);
            error.code = 'ENOENT';
            error.errno = -2;
            error.syscall = 'unlink';
            error.path = path;
            throw error;
        }
    });
    /**
     * Mock fs.rm implementation (recursive directory removal)
     */
    rm = vi.fn().mockImplementation(async (path, options) => {
        if (this.simulateErrors && Math.random() < this.errorRate) {
            throw new Error('EACCES: permission denied');
        }
        if (options?.recursive === true) {
            // Remove all files starting with the path
            const toDelete = [];
            for (const filePath of this.files.keys()) {
                if (filePath.startsWith(path)) {
                    toDelete.push(filePath);
                }
            }
            for (const filePath of toDelete) {
                this.files.delete(filePath);
            }
        }
        else {
            const existed = this.files.delete(path);
            if (!existed && options?.force !== true) {
                const error = new Error(`ENOENT: no such file or directory, rm '${path}'`);
                error.code = 'ENOENT';
                error.errno = -2;
                error.syscall = 'rm';
                error.path = path;
                throw error;
            }
        }
    });
    /**
     * Get current file content (for testing assertions)
     */
    getFileContent(path) {
        return this.files.get(path)?.content;
    }
    /**
     * Check if file exists (for testing assertions)
     */
    hasFile(path) {
        return this.files.has(path);
    }
    /**
     * Clear all files
     */
    clear() {
        this.files.clear();
    }
    /**
     * Set error simulation
     */
    setErrorSimulation(enabled, rate = 0.1) {
        this.simulateErrors = enabled;
        this.errorRate = rate;
    }
    /**
     * Get all current file paths
     */
    getAllFiles() {
        return Array.from(this.files.keys());
    }
}
/**
 * Create a mock filesystem with common test scenarios
 */
export function createMockFileSystem(options = {}) {
    return new MockFileSystem(options);
}
/**
 * Error scenarios for comprehensive testing
 * Note: Used internally by createFileSystemError()
 */
const ERROR_SCENARIOS = {
    PERMISSION_DENIED: {
        code: 'EACCES',
        message: 'EACCES: permission denied'
    },
    FILE_NOT_FOUND: {
        code: 'ENOENT',
        message: 'ENOENT: no such file or directory'
    },
    DISK_FULL: {
        code: 'ENOSPC',
        message: 'ENOSPC: no space left on device'
    },
    FILE_TOO_LARGE: {
        code: 'EFBIG',
        message: 'EFBIG: file too big'
    },
    IO_ERROR: {
        code: 'EIO',
        message: 'EIO: i/o error'
    }
};
/**
 * Create an error with specific errno properties
 */
export function createFileSystemError(scenario, path) {
    const errorInfo = ERROR_SCENARIOS[scenario];
    const message = path != null && path !== '' ? `${errorInfo.message}, '${path}'` : errorInfo.message;
    const error = new Error(message);
    error.code = errorInfo.code;
    error.errno = -1;
    error.syscall = 'open';
    if (path != null && path !== '') {
        error.path = path;
    }
    return error;
}
//# sourceMappingURL=filesystem.mock.js.map