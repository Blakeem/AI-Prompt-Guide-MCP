/**
 * Move tool implementation
 *
 * Moves sections or tasks between documents or within the same document.
 * Data-safe approach: Creates in new location BEFORE deleting from old location.
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import { performSectionEdit } from '../../shared/utilities.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError,
  SectionNotFoundError,
  isTaskSection,
} from '../../shared/addressing-system.js';
import { isValidMovePosition, type MovePosition } from '../schemas/move-schemas.js';
import { titleToSlug } from '../../slug.js';

/**
 * Move a section or task to a new location
 *
 * Implementation follows data-safe pattern:
 * 1. Validate all inputs (source, destination, reference)
 * 2. Read source content and title
 * 3. Create in new location FIRST
 * 4. Delete from old location ONLY after successful creation
 *
 * @param args - Tool arguments with from, to, reference, position
 * @param _state - Session state (unused)
 * @param manager - Document manager instance
 * @returns Move result with source and destination info
 */
export async function move(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<unknown> {
  // Input validation and normalization
  const fromPath = ToolIntegration.validateStringParameter(args['from'], 'from');
  const toPath = ToolIntegration.validateStringParameter(args['to'], 'to');
  const reference = ToolIntegration.validateStringParameter(args['reference'], 'reference');
  const positionRaw = ToolIntegration.validateStringParameter(args['position'], 'position');

  // Validate position enum
  if (!isValidMovePosition(positionRaw)) {
    throw new AddressingError(
      `Invalid position: ${positionRaw}. Must be one of: before, after, child`,
      'INVALID_POSITION',
      { position: positionRaw }
    );
  }
  const position: MovePosition = positionRaw;

  // Parse source path - must include section slug
  if (!fromPath.includes('#')) {
    throw new AddressingError(
      'Source path must include section slug (e.g., "/docs/api/auth.md#section")',
      'INVALID_SOURCE_PATH',
      { from: fromPath }
    );
  }

  const [sourceDocPath, sourceSection] = fromPath.split('#');
  if (sourceDocPath == null || sourceSection == null || sourceSection === '') {
    throw new AddressingError(
      'Invalid source path format. Expected: "/document.md#section"',
      'INVALID_SOURCE_FORMAT',
      { from: fromPath }
    );
  }

  // Parse and validate source addresses
  const { addresses: sourceAddresses } = ToolIntegration.validateAndParse({
    document: sourceDocPath,
    section: sourceSection,
  });

  if (sourceAddresses.section == null) {
    throw new AddressingError('Failed to parse source section', 'SOURCE_PARSE_ERROR');
  }

  const sourceSectionAddress = sourceAddresses.section;

  // Get source document
  const sourceDoc = await manager.getDocument(sourceAddresses.document.path);
  if (sourceDoc == null) {
    throw new DocumentNotFoundError(sourceAddresses.document.path);
  }

  // Find source heading and validate existence
  const sourceHeading = sourceDoc.headings.find(
    (h) => h.slug === sourceSectionAddress.slug
  );
  if (sourceHeading == null) {
    throw new SectionNotFoundError(
      sourceSectionAddress.slug,
      sourceAddresses.document.path
    );
  }

  // Get source content (what we'll move)
  const sourceContent = await manager.getSectionContent(
    sourceAddresses.document.path,
    sourceSectionAddress.slug
  );

  if (sourceContent == null) {
    throw new AddressingError(
      'Failed to read source section content',
      'SOURCE_CONTENT_ERROR',
      {
        document: sourceAddresses.document.path,
        section: sourceSectionAddress.slug,
      }
    );
  }

  const sourceTitle = sourceHeading.title;

  // Detect if source is a task
  // Create compatible document structure for isTaskSection
  const isTask = await isTaskSection(sourceSectionAddress.slug, {
    headings: sourceDoc.headings.map(h => ({ slug: h.slug, title: h.title, depth: h.depth }))
  });

  // Parse and validate destination document
  const { addresses: destAddresses } = ToolIntegration.validateAndParse({
    document: toPath,
  });

  // Get destination document
  const destDoc = await manager.getDocument(destAddresses.document.path);
  if (destDoc == null) {
    throw new DocumentNotFoundError(destAddresses.document.path);
  }

  // Normalize reference section slug
  const normalizedReference = reference.startsWith('#') ? reference.slice(1) : reference;

  // Validate reference section exists in destination
  const refHeading = destDoc.headings.find((h) => h.slug === normalizedReference);
  if (refHeading == null) {
    throw new SectionNotFoundError(
      normalizedReference,
      destAddresses.document.path
    );
  }

  // Map position to InsertMode for performSectionEdit
  const insertMode =
    position === 'before'
      ? 'insert_before'
      : position === 'after'
        ? 'insert_after'
        : 'append_child';

  try {
    // STEP 1: Create section/task in new location FIRST (data safety)
    await performSectionEdit(
      manager,
      destAddresses.document.path,
      normalizedReference,
      sourceContent,
      insertMode,
      sourceTitle
    );

    // STEP 2: Delete from old location ONLY after successful creation
    await performSectionEdit(
      manager,
      sourceAddresses.document.path,
      sourceSectionAddress.slug,
      '', // Content doesn't matter for remove operation
      'remove'
    );

    // Get updated destination document to retrieve new slug
    const updatedDestDoc = await manager.getDocument(destAddresses.document.path);
    const newSlug = titleToSlug(sourceTitle);

    // Format comprehensive response
    return {
      action: 'moved',
      type: isTask ? 'task' : 'section',
      from: {
        document: sourceAddresses.document.path,
        section: sourceSectionAddress.slug,
      },
      to: {
        document: destAddresses.document.path,
        section: newSlug,
        reference: normalizedReference,
        position,
      },
      source_document_info: ToolIntegration.formatDocumentInfo(sourceAddresses.document, {
        title: sourceDoc.metadata.title,
      }),
      destination_document_info: ToolIntegration.formatDocumentInfo(destAddresses.document, {
        title: updatedDestDoc?.metadata.title ?? 'Untitled',
      }),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // If creation succeeded but deletion failed, we have duplicate content
    // This is safer than losing data
    if (error instanceof Error) {
      throw new AddressingError(
        `Move operation failed: ${error.message}. Note: If creation succeeded but deletion failed, content may be duplicated.`,
        'MOVE_OPERATION_FAILED',
        {
          from: fromPath,
          to: toPath,
          reference: normalizedReference,
          position,
          originalError: error.message,
        }
      );
    }
    throw error;
  }
}
