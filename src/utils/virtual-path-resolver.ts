/**
 * VirtualPathResolver - Centralized path resolution for virtual document paths
 *
 * Handles routing of virtual paths (e.g., "/api/auth.md", "/coordinator/active.md")
 * to absolute filesystem paths with automatic docs/coordinator namespace detection.
 *
 * Design Principles:
 * - Pure deterministic logic (no state, no cache)
 * - Single Responsibility: virtual→absolute path resolution only
 * - Thread-safe and performant (just string operations)
 * - Easy to test in isolation
 */

import { join, resolve } from 'node:path';

/**
 * Virtual path resolver for document routing
 *
 * @example
 * const resolver = new VirtualPathResolver(
 *   '/workspace/docs',
 *   '/workspace/coordinator',
 *   '/workspace/archived'
 * );
 *
 * resolver.resolve('/api/auth.md')           // → /workspace/docs/api/auth.md
 * resolver.resolve('/coordinator/active.md') // → /workspace/coordinator/active.md
 * resolver.getArchivePath('/api/auth.md')    // → /workspace/archived/docs/api/auth.md
 */
export class VirtualPathResolver {
  private readonly docsRoot: string;
  private readonly coordinatorRoot: string;
  private readonly archivedRoot: string;

  /**
   * Create a new VirtualPathResolver
   *
   * @param docsRoot - Absolute path to docs directory
   * @param coordinatorRoot - Absolute path to coordinator directory
   * @param archivedRoot - Absolute path to archived directory
   */
  constructor(docsRoot: string, coordinatorRoot: string, archivedRoot: string) {
    // Resolve all paths once at construction for consistency
    this.docsRoot = resolve(docsRoot);
    this.coordinatorRoot = resolve(coordinatorRoot);
    this.archivedRoot = resolve(archivedRoot);
  }

  /**
   * Resolve virtual path to absolute filesystem path
   *
   * Automatically routes to appropriate base directory:
   * - Paths starting with "coordinator/" → coordinatorRoot
   * - All other paths → docsRoot
   *
   * @param virtualPath - Virtual path (e.g., "/api/auth.md", "coordinator/active.md")
   * @returns Absolute filesystem path
   *
   * @example
   * resolve('/api/auth.md')           // → /workspace/docs/api/auth.md
   * resolve('/coordinator/active.md') // → /workspace/coordinator/active.md
   * resolve('api/auth.md')            // → /workspace/docs/api/auth.md (leading / optional)
   */
  resolve(virtualPath: string): string {
    const relativePath = virtualPath.startsWith('/') ? virtualPath.slice(1) : virtualPath;

    // Check if this is a coordinator path
    if (relativePath.startsWith('coordinator/') || relativePath === 'coordinator') {
      // Use coordinator root and remove the 'coordinator/' prefix
      const coordPath = relativePath === 'coordinator'
        ? ''
        : relativePath.slice('coordinator/'.length);
      return join(this.coordinatorRoot, coordPath);
    }

    // Default to docs root
    return join(this.docsRoot, relativePath);
  }

  /**
   * Check if virtual path targets coordinator namespace
   *
   * @param virtualPath - Virtual path to check
   * @returns true if path is in coordinator namespace
   *
   * @example
   * isCoordinatorPath('/coordinator/active.md')  // → true
   * isCoordinatorPath('/api/auth.md')            // → false
   */
  isCoordinatorPath(virtualPath: string): boolean {
    const relativePath = virtualPath.startsWith('/') ? virtualPath.slice(1) : virtualPath;
    return relativePath.startsWith('coordinator/') || relativePath === 'coordinator';
  }

  /**
   * Get base root directory for virtual path
   *
   * @param virtualPath - Virtual path
   * @returns Absolute path to base root (docs or coordinator)
   *
   * @example
   * getBaseRoot('/api/auth.md')           // → /workspace/docs
   * getBaseRoot('/coordinator/active.md') // → /workspace/coordinator
   */
  getBaseRoot(virtualPath: string): string {
    return this.isCoordinatorPath(virtualPath) ? this.coordinatorRoot : this.docsRoot;
  }

  /**
   * Generate archive path for virtual path
   *
   * Preserves namespace structure in archive:
   * - /api/auth.md → /archived/docs/api/auth.md
   * - /coordinator/active.md → /archived/coordinator/active.md
   *
   * @param virtualPath - Virtual path to archive
   * @returns Absolute archive path
   *
   * @example
   * getArchivePath('/api/auth.md')           // → /workspace/archived/docs/api/auth.md
   * getArchivePath('/coordinator/active.md') // → /workspace/archived/coordinator/active.md
   */
  getArchivePath(virtualPath: string): string {
    const relativePath = virtualPath.startsWith('/') ? virtualPath.slice(1) : virtualPath;

    if (this.isCoordinatorPath(virtualPath)) {
      // Archive coordinator files under archived/coordinator/
      return join(this.archivedRoot, relativePath);
    }

    // Archive docs files under archived/docs/
    return join(this.archivedRoot, 'docs', relativePath);
  }

  /**
   * Get relative path component (removes leading slash)
   *
   * @param virtualPath - Virtual path
   * @returns Relative path without leading slash
   */
  getRelativePath(virtualPath: string): string {
    return virtualPath.startsWith('/') ? virtualPath.slice(1) : virtualPath;
  }

  /**
   * Get path without namespace prefix
   *
   * For coordinator paths, removes "coordinator/" prefix
   * For docs paths, returns as-is
   *
   * @param virtualPath - Virtual path
   * @returns Path without namespace prefix
   *
   * @example
   * getPathWithoutPrefix('/coordinator/active.md') // → active.md
   * getPathWithoutPrefix('/api/auth.md')           // → api/auth.md
   */
  getPathWithoutPrefix(virtualPath: string): string {
    const relativePath = this.getRelativePath(virtualPath);

    if (relativePath.startsWith('coordinator/')) {
      return relativePath.slice('coordinator/'.length);
    }

    return relativePath;
  }

  /**
   * Get configured docs root
   */
  getDocsRoot(): string {
    return this.docsRoot;
  }

  /**
   * Get configured coordinator root
   */
  getCoordinatorRoot(): string {
    return this.coordinatorRoot;
  }

  /**
   * Get configured archived root
   */
  getArchivedRoot(): string {
    return this.archivedRoot;
  }
}
