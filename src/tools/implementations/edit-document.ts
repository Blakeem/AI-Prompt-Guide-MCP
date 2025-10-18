/**
 * Implementation of edit_document tool
 * Allows editing a document's title (first H1) and/or overview (content before first H2)
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError,
} from '../../shared/addressing-system.js';

export async function editDocument(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<unknown> {
  try {
    // Input validation
    const documentPath = ToolIntegration.validateStringParameter(args['document'], 'document');
    const newTitle = ToolIntegration.validateOptionalStringParameter(args['title'], 'title');
    const newOverview = ToolIntegration.validateOptionalStringParameter(args['overview'], 'overview');

    // At least one field must be provided
    if (newTitle == null && newOverview == null) {
      throw new AddressingError(
        'At least one of title or overview must be provided',
        'MISSING_PARAMETERS',
        { document: documentPath }
      );
    }

    // Parse and validate document
    const { addresses } = ToolIntegration.validateAndParse({
      document: documentPath,
    });

    // Validate document exists
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    // Import required modules
    const path = await import('node:path');
    const { loadConfig } = await import('../../config.js');
    const { readFileSnapshot, writeFileIfUnchanged } = await import('../../fsio.js');
    const { renameHeading } = await import('../../sections.js');

    // Processing - prepare file operations
    const config = loadConfig();
    const absolutePath = path.join(config.workspaceBasePath, addresses.document.path);

    // Read current file content
    const snapshot = await readFileSnapshot(absolutePath, { bypassValidation: true });
    let content = snapshot.content;

    // Track changes made
    const changes: string[] = [];
    const oldValues: { title?: string; overview?: string } = {};

    // Update title if provided
    if (newTitle != null && newTitle !== '') {
      // Find first H1 heading
      const titleHeading = document.headings.find((h) => h.depth === 1);
      if (titleHeading != null) {
        oldValues.title = titleHeading.title;

        // Use renameHeading to update the title
        content = renameHeading(content, titleHeading.slug, newTitle);
        changes.push('title');
      } else {
        throw new AddressingError(
          'Document has no title (H1 heading) to update',
          'NO_TITLE_FOUND',
          { document: addresses.document.path }
        );
      }
    }

    // Update overview if provided
    if (newOverview != null && newOverview !== '') {
      // Overview is content between title (first H1) and first H2
      const lines = content.split('\n');
      let titleLineIndex = -1;
      let firstH2Index = -1;

      // Find title line (first H1)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line?.startsWith('# ') === true) {
          titleLineIndex = i;
          break;
        }
      }

      // Find first H2
      for (let i = titleLineIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line?.startsWith('## ') === true) {
          firstH2Index = i;
          break;
        }
      }

      if (titleLineIndex === -1) {
        throw new AddressingError(
          'Document has no title (H1 heading)',
          'NO_TITLE_FOUND',
          { document: addresses.document.path }
        );
      }

      // Extract old overview for tracking
      if (firstH2Index !== -1) {
        oldValues.overview = lines.slice(titleLineIndex + 1, firstH2Index).join('\n').trim();
      } else {
        oldValues.overview = lines.slice(titleLineIndex + 1).join('\n').trim();
      }

      // Build new content
      const beforeTitle = lines.slice(0, titleLineIndex + 1);
      const afterOverview = firstH2Index !== -1 ? lines.slice(firstH2Index) : [];

      // Ensure proper spacing: title, blank line, overview, blank line, sections
      const newLines = [...beforeTitle, '', newOverview.trim(), '', ...afterOverview];

      content = newLines.join('\n');
      changes.push('overview');
    }

    // Write updated content
    await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, content, { bypassValidation: true });

    // Invalidate cache
    manager.cache.invalidateDocument(addresses.document.path);

    // Output - get updated document title
    const updatedDocument = await manager.getDocument(addresses.document.path);

    return {
      success: true,
      updated: changes,
      title: updatedDocument?.metadata.title ?? 'Untitled',
    };
  } catch (error) {
    if (error instanceof AddressingError) {
      throw error;
    }
    throw new AddressingError(
      `Failed to edit document: ${error instanceof Error ? error.message : String(error)}`,
      'EDIT_DOCUMENT_FAILED',
      { document: args['document'] }
    );
  }
}
