/**
 * Document manager factory with dependency injection support
 *
 * This factory provides clean dependency injection while maintaining
 * backward compatibility with the old singleton pattern.
 */

import type { DocumentManager } from '../document-manager.js';
import { DocumentManager as Manager } from '../document-manager.js';
import { loadConfig } from '../config.js';
import { createDocumentCache } from '../document-cache.js';
import type { DocumentCache } from '../document-cache.js';

/**
 * Create a new DocumentManager instance with proper dependency injection
 *
 * @param docsRoot - Optional custom docs root path (for testing)
 * @returns A new DocumentManager instance
 *
 * @example
 * // Production usage
 * const manager = createDocumentManager();
 *
 * @example
 * // Testing with custom path
 * const manager = createDocumentManager('/tmp/test-docs');
 */
export function createDocumentManager(docsRoot?: string): DocumentManager {
  const config = loadConfig();
  const root = docsRoot ?? config.docsBasePath;

  // Create cache instance with dependency injection using factory function
  const cache: DocumentCache = createDocumentCache(root, {
    maxCacheSize: 100,
    enableWatching: true,
    watchIgnorePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    evictionPolicy: 'lru'
  });

  return new Manager(root, cache);
}

/**
 * Lazy singleton for backward compatibility
 * @deprecated Use createDocumentManager() with dependency injection instead
 */
let _defaultManager: DocumentManager | null = null;

/**
 * Get or create the default DocumentManager instance (singleton pattern)
 *
 * @deprecated Use createDocumentManager() and dependency injection instead
 * This function maintains backward compatibility but should not be used in new code.
 *
 * @returns The singleton DocumentManager instance
 */
export async function getDocumentManager(): Promise<DocumentManager> {
  _defaultManager ??= createDocumentManager();
  return _defaultManager;
}

