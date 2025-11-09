/**
 * Centralized path handling utilities for MCP server
 */
/**
 * Path validation and normalization utilities
 */
export declare class PathHandler {
    private readonly workspaceBasePath;
    private readonly archivedBasePath;
    constructor(workspaceBasePath: string, archivedBasePath?: string);
    /**
     * Normalize and validate a user-provided path
     */
    normalizePath(userPath: string): string;
    /**
     * Validate that a path is within the allowed docs directory
     */
    validatePath(normalizedPath: string): void;
    /**
     * Get absolute filesystem path from normalized path
     */
    getAbsolutePath(normalizedPath: string): string;
    /**
     * Check if a path represents a folder (ends with / or has no extension)
     */
    isFolder(normalizedPath: string): boolean;
    /**
     * Get the parent directory path
     */
    getParentPath(normalizedPath: string): string;
    /**
     * Generate unique archive path to handle duplicates
     */
    generateUniqueArchivePath(normalizedPath: string): Promise<string>;
    /**
     * Check if file exists using direct fs.access (for internal use with absolute paths)
     */
    private checkFileExists;
    /**
     * Normalize and validate path in one call
     */
    processUserPath(userPath: string): string;
    /**
     * Get workspace base path
     */
    getWorkspaceBasePath(): string;
    /**
     * Get archived base path (if configured)
     */
    getArchivedBasePath(): string | undefined;
}
//# sourceMappingURL=path-handler.d.ts.map