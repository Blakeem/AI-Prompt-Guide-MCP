/**
 * Shared utility functions for tool implementations
 */

import type { DocumentManager } from '../document-manager.js';
import type { InsertMode } from '../types/index.js';
import { initializeGlobalCache } from '../document-cache.js';

/**
 * Helper function to perform a single section edit operation
 */
export async function performSectionEdit(
  manager: DocumentManager,
  normalizedPath: string,
  sectionSlug: string,
  content: string,
  operation: string,
  title?: string
): Promise<{ action: 'edited' | 'created' | 'removed'; section: string; depth?: number; removedContent?: string }> {
  // Check if document exists
  const document = await manager.getDocument(normalizedPath);
  if (!document) {
    throw new Error(`Document not found: ${normalizedPath}`);
  }

  const creationOperations = ['insert_before', 'insert_after', 'append_child'];
  const editOperations = ['replace', 'append', 'prepend'];
  const removeOperations = ['remove'];

  if (removeOperations.includes(operation)) {
    // Remove operations - delete section
    const section = document.headings.find(h => h.slug === sectionSlug);
    if (!section) {
      throw new Error(`Section not found: ${sectionSlug}. Available sections: ${document.headings.map(h => h.slug).join(', ')}`);
    }

    // Get current content for recovery
    const removedContent = await manager.getSectionContent(normalizedPath, sectionSlug) ?? '';

    // Remove the section using the sections utility
    const { deleteSection } = await import('../sections.js');
    const { loadConfig } = await import('../config.js');
    const path = await import('node:path');
    const config = loadConfig();
    const absolutePath = path.join(config.docsBasePath, normalizedPath);
    const { readFileSnapshot, writeFileIfUnchanged } = await import('../fsio.js');

    const snapshot = await readFileSnapshot(absolutePath);
    const updatedContent = deleteSection(snapshot.content, sectionSlug);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updatedContent);

    return {
      action: 'removed',
      section: sectionSlug,
      removedContent
    };

  } else if (creationOperations.includes(operation)) {
    // Creation operations - create new section
    if (title == null || title === '') {
      throw new Error(`Title is required for creation operation: ${operation}`);
    }

    // Map operation to InsertMode
    const insertMode = operation === 'insert_before' ? 'insert_before'
      : operation === 'insert_after' ? 'insert_after'
      : 'append_child';


    // Insert the section with automatic depth calculation
    await manager.insertSection(
      normalizedPath,
      sectionSlug,
      insertMode as InsertMode,
      undefined, // Let it auto-calculate depth
      title,
      content,
      { updateToc: true }
    );

    // Get the created section's slug and depth
    const updatedDocument = await manager.getDocument(normalizedPath);
    if (!updatedDocument) {
      throw new Error('Failed to retrieve updated document');
    }

    // Find the newly created section
    const { titleToSlug } = await import('../slug.js');
    const newSlug = titleToSlug(title);
    const newSection = updatedDocument.headings.find(h => h.slug === newSlug);

    return {
      action: 'created',
      section: newSlug,
      ...(newSection?.depth !== undefined && { depth: newSection.depth })
    };

  } else if (editOperations.includes(operation)) {
    // Edit operations - modify existing section
    if (operation === 'replace') {
      const section = document.headings.find(h => h.slug === sectionSlug);
      if (!section) {
        throw new Error(`Section not found: ${sectionSlug}. Available sections: ${document.headings.map(h => h.slug).join(', ')}`);
      }

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

    return {
      action: 'edited',
      section: sectionSlug
    };

  } else {
    throw new Error(`Invalid operation: ${operation}. Must be one of: ${[...editOperations, ...creationOperations, ...removeOperations].join(', ')}`);
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