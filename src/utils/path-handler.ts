/**
 * Centralized path handling utilities for MCP server
 */

import { join, resolve, dirname, extname, basename } from 'path';
import { promises as fs } from 'node:fs';
import { FOLDER_NAMES } from '../shared/namespace-constants.js';

/**
 * Path validation and normalization utilities
 */
export class PathHandler {
  private readonly workspaceBasePath: string;
  private readonly archivedBasePath: string | undefined;

  constructor(workspaceBasePath: string, archivedBasePath?: string) {
    this.workspaceBasePath = resolve(workspaceBasePath);
    this.archivedBasePath = archivedBasePath != null ? resolve(archivedBasePath) : undefined;
  }

  /**
   * Normalize and validate a user-provided path
   */
  normalizePath(userPath: string): string {
    // Remove leading/trailing whitespace
    let cleanPath = userPath.trim();

    // Remove leading slash if present
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.slice(1);
    }

    // If path ends with '/', treat as folder
    const isFolder = cleanPath.endsWith('/');
    
    if (isFolder) {
      // Remove trailing slash for consistency
      cleanPath = cleanPath.slice(0, -1);
      return `/${cleanPath}`;
    }

    // Handle file paths - add .md if no extension provided
    const extension = extname(cleanPath);
    if (extension === '') {
      cleanPath = `${cleanPath}.md`;
    } else if (extension !== '.md') {
      throw new Error(`Only .md files are supported. Got: ${extension}`);
    }

    return `/${cleanPath}`;
  }

  /**
   * Validate that a path is within the allowed docs directory
   */
  validatePath(normalizedPath: string): void {
    const absolutePath = this.getAbsolutePath(normalizedPath);
    const resolvedPath = resolve(absolutePath);

    // Ensure path is within docs directory (prevent directory traversal)
    if (!resolvedPath.startsWith(this.workspaceBasePath)) {
      throw new Error(`Path outside allowed directory: ${normalizedPath}`);
    }
  }

  /**
   * Get absolute filesystem path from normalized path
   */
  getAbsolutePath(normalizedPath: string): string {
    const relativePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
    return join(this.workspaceBasePath, relativePath);
  }

  /**
   * Check if a path represents a folder (ends with / or has no extension)
   */
  isFolder(normalizedPath: string): boolean {
    return normalizedPath.endsWith('/') || extname(normalizedPath) === '';
  }

  /**
   * Get the parent directory path
   */
  getParentPath(normalizedPath: string): string {
    const parentDir = dirname(normalizedPath);
    return parentDir === '/' ? '/' : parentDir;
  }

  /**
   * Generate unique archive path to handle duplicates
   */
  async generateUniqueArchivePath(normalizedPath: string): Promise<string> {
    // Use archivedBasePath if provided, otherwise fall back to workspace/archived
    const archiveBase = this.archivedBasePath ?? join(this.workspaceBasePath, FOLDER_NAMES.ARCHIVED);
    const relativePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;

    let archivePath = join(archiveBase, relativePath);
    let counter = 1;

    // Keep trying until we find a unique path
    // Use fs.access directly since archivePath is already an absolute path
    // and doesn't need fsio validation
    while (await this.checkFileExists(archivePath)) {
      const dir = dirname(archivePath);
      const ext = extname(archivePath);
      const name = basename(archivePath, ext);

      archivePath = join(dir, `${name}_${counter}${ext}`);
      counter++;
    }

    return archivePath;
  }

  /**
   * Check if file exists using direct fs.access (for internal use with absolute paths)
   */
  private async checkFileExists(absolutePath: string): Promise<boolean> {
    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize and validate path in one call
   */
  processUserPath(userPath: string): string {
    const normalized = this.normalizePath(userPath);
    this.validatePath(normalized);
    return normalized;
  }

  /**
   * Get workspace base path
   */
  getWorkspaceBasePath(): string {
    return this.workspaceBasePath;
  }

  /**
   * Get archived base path (if configured)
   */
  getArchivedBasePath(): string | undefined {
    return this.archivedBasePath;
  }
}