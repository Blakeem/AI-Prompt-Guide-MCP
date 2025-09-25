/**
 * Section editing operations
 */

import type { DocumentManager } from '../document-manager.js';
import type { InsertMode } from '../types/index.js';
import { getSectionContentForRemoval, deleteSection } from '../sections.js';

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

    // Get the actual content that will be removed (excluding boundary markers)
    // This ensures the reported removed_content matches what deleteSection actually removes
    const { loadConfig } = await import('../config.js');
    const path = await import('node:path');
    const config = loadConfig();
    const absolutePath = path.join(config.docsBasePath, normalizedPath);
    const { readFileSnapshot, writeFileIfUnchanged } = await import('../fsio.js');

    const snapshot = await readFileSnapshot(absolutePath);

    // Get the content that will actually be removed (matches deleteSection behavior)
    const removedContent = getSectionContentForRemoval(snapshot.content, sectionSlug) ?? '';

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