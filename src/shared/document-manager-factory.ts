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
import { FingerprintIndex } from '../fingerprint-index.js';
import { getGlobalLogger } from '../utils/logger.js';

const logger = getGlobalLogger();

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

  // Create and initialize fingerprint index for fast search filtering
  const fingerprintIndex = new FingerprintIndex(root);

  // Start async initialization (non-blocking)
  void fingerprintIndex.initialize().catch((error: unknown) => {
    logger.warn('Failed to initialize fingerprint index', { error });
  });

  // Integrate with cache's file watcher for auto-invalidation
  // The cache creates its watcher asynchronously, so we need to access it
  // after a short delay or via an event
  setTimeout(() => {
    // Access the watcher if it exists
    const watcher = (cache as unknown as { watcher?: unknown }).watcher;
    if (watcher != null) {
      fingerprintIndex.watchFiles(watcher as Parameters<typeof fingerprintIndex.watchFiles>[0]);
      logger.debug('FingerprintIndex integrated with cache file watcher');
    }
  }, 100);

  return new Manager(root, cache, fingerprintIndex);
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

