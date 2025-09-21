/**
 * Shared utility functions for tool implementations
 */

import type { DocumentManager } from '../document-manager.js';
import { initializeGlobalCache } from '../document-cache.js';

/**
 * Helper function to perform a single section edit operation
 */
export async function performSectionEdit(
  manager: DocumentManager,
  normalizedPath: string,
  sectionSlug: string,
  content: string,
  operation: string
): Promise<void> {
  // Check if document exists
  const document = await manager.getDocument(normalizedPath);
  if (!document) {
    throw new Error(`Document not found: ${normalizedPath}`);
  }

  // For replace operations, check if section exists
  // For append/prepend, we can create the section if it doesn't exist
  if (operation === 'replace') {
    const section = document.headings.find(h => h.slug === sectionSlug);
    if (!section) {
      throw new Error(`Section not found: ${sectionSlug}. Available sections: ${document.headings.map(h => h.slug).join(', ')}`);
    }
  }

  if (operation === 'replace') {
    await manager.updateSection(normalizedPath, sectionSlug, content, {
      updateToc: true,
      validateLinks: true
    });
  } else {
    // For append/prepend, get current content and modify it
    const currentContent = await manager.getSectionContent(normalizedPath, sectionSlug) ?? '';

    let newContent: string;
    if (operation === 'append') {
      newContent = currentContent.trim() !== '' ? `${currentContent}\n\n${content}` : content;
    } else if (operation === 'prepend') {
      newContent = currentContent.trim() !== '' ? `${content}\n\n${currentContent}` : content;
    } else {
      throw new Error(`Invalid operation: ${operation}. Must be 'replace', 'append', or 'prepend'`);
    }

    await manager.updateSection(normalizedPath, sectionSlug, newContent, {
      updateToc: true,
      validateLinks: true
    });
  }
}

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