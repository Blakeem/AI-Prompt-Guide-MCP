/**
 * Document manager factory with singleton pattern
 */

import type { DocumentManager } from '../document-manager.js';
import { initializeGlobalCache } from '../document-cache.js';

/**
 * Get document manager instance (lazy initialization)
 */
let documentManager: DocumentManager | null = null;

export async function getDocumentManager(): Promise<DocumentManager> {
  if (documentManager == null) {
    // Import dynamically to avoid circular dependencies
    const { DocumentManager } = await import('../document-manager.js');
    const { loadConfig } = await import('../config.js');

    const config = loadConfig();

    // Initialize global cache if not already done
    try {
      initializeGlobalCache(config.docsBasePath, {
        maxCacheSize: 100,
        enableWatching: true,
        watchIgnorePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        evictionPolicy: 'lru'
      });
    } catch {
      // Cache already initialized, ignore
    }

    documentManager = new DocumentManager(config.docsBasePath);
  }
  return documentManager;
}