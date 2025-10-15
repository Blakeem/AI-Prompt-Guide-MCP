/**
 * Section editing operations
 */

import type { DocumentManager } from '../document-manager.js';
import type { InsertMode } from '../types/index.js';
import { getSectionContentForRemoval, deleteSection } from '../sections.js';
import { DocumentNotFoundError, AddressingError } from './addressing-system.js';

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
  if (document == null) {
    throw new DocumentNotFoundError(normalizedPath);
  }

  const creationOperations = ['insert_before', 'insert_after', 'append_child'];
  const editOperations = ['replace', 'append', 'prepend'];
  const removeOperations = ['remove'];

  if (removeOperations.includes(operation)) {
    // Remove operations - delete section
    const section = document.headings.find(h => h.slug === sectionSlug);
    if (section == null) {
      throw new AddressingError(
        `Section not found: ${sectionSlug}`,
        'SECTION_NOT_FOUND',
        {
          slug: sectionSlug,
          documentPath: normalizedPath,
          availableSections: document.headings.map(h => h.slug)
        }
      );
    }

    // Get the actual content that will be removed (excluding boundary markers)
    // This ensures the reported removed_content matches what deleteSection actually removes
    const { loadConfig } = await import('../config.js');
    const path = await import('node:path');
    const config = loadConfig();
    const absolutePath = path.join(config.workspaceBasePath, normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath);
    const { readFileSnapshot, writeFileIfUnchanged } = await import('../fsio.js');

    const snapshot = await readFileSnapshot(absolutePath, { bypassValidation: true });

    // Get the content that will actually be removed (matches deleteSection behavior)
    const removedContent = getSectionContentForRemoval(snapshot.content, sectionSlug) ?? '';

    const updatedContent = deleteSection(snapshot.content, sectionSlug);
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updatedContent, { bypassValidation: true });

    return {
      action: 'removed',
      section: sectionSlug,
      removedContent
    };

  } else if (creationOperations.includes(operation)) {
    // Creation operations - create new section
    if (title == null || title === '') {
      throw new AddressingError(
        `Title is required for creation operation: ${operation}`,
        'MISSING_PARAMETER',
        { operation, requiredParameter: 'title' }
      );
    }

    // Map operation to InsertMode
    const insertMode: InsertMode = operation === 'insert_before' ? 'insert_before'
      : operation === 'insert_after' ? 'insert_after'
      : 'append_child';
    const targetSlug = sectionSlug;

    // Insert the section with automatic depth calculation
    await manager.insertSection(
      normalizedPath,
      targetSlug,
      insertMode,
      undefined, // Let it auto-calculate depth
      title,
      content,
      { updateToc: true }
    );

    // Get the created section's slug and depth
    const updatedDocument = await manager.getDocument(normalizedPath);
    if (updatedDocument == null) {
      throw new DocumentNotFoundError(normalizedPath);
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
      if (section == null) {
        throw new AddressingError(
          `Section not found: ${sectionSlug}`,
          'SECTION_NOT_FOUND',
          {
            slug: sectionSlug,
            documentPath: normalizedPath,
            availableSections: document.headings.map(h => h.slug)
          }
        );
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
        throw new AddressingError(
          `Invalid operation: ${operation}`,
          'INVALID_OPERATION',
          { operation, validOperations: ['replace', 'append', 'prepend'] }
        );
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
    const validOperations = [...editOperations, ...creationOperations, ...removeOperations];
    throw new AddressingError(
      `Invalid operation: ${operation}`,
      'INVALID_OPERATION',
      { operation, validOperations }
    );
  }
}