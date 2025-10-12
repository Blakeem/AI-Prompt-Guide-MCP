/**
 * Implementation for the section tool
 *
 * Migrated to use central addressing system for consistent document/section addressing
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import { performSectionEdit } from '../../shared/utilities.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';

/**
 * Maximum number of operations allowed in a single batch request
 * Prevents performance issues and potential DoS attacks
 */
const MAX_BATCH_SIZE = 100;

/**
 * Parse operation target with document override support
 * Supports three formats:
 * 1. Slug only: "section-slug" (uses default document)
 * 2. Full path: "/doc.md#section-slug" (overrides document)
 * 3. Error: Document path without slug
 */
function parseOperationTarget(
  operation: { section: string },
  defaultDocument: string
): { document: string; slug: string } {
  const fieldValue = operation.section;

  // Check for full path (contains #)
  if (fieldValue.includes('#')) {
    const parts = fieldValue.split('#');
    const docPath = parts[0];
    const slug = parts[1];

    if (docPath == null || docPath === '') {
      throw new AddressingError(
        'Full path must include document path before #',
        'MISSING_DOCUMENT_PATH'
      );
    }

    if (slug == null || slug === '') {
      throw new AddressingError(
        'Full path must include section slug after #',
        'MISSING_SLUG'
      );
    }

    // Override: use embedded document path
    return { document: docPath, slug };
  }

  // Check for path without slug (error case)
  if (fieldValue.startsWith('/')) {
    throw new AddressingError(
      'Document path must include section slug after # (e.g., "/doc.md#slug")',
      'PATH_WITHOUT_SLUG'
    );
  }

  // Slug only: use default document
  return { document: defaultDocument, slug: fieldValue };
}

/**
 * Interface for individual section operation
 */
interface SectionOperation {
  document: string;
  section: string;
  content: string;
  operation?: string;
  title?: string;
  analyze_links?: boolean;
}

/**
 * Result of a section operation
 */
interface SectionOperationResult {
  success: boolean;
  section: string;
  action?: 'edited' | 'created' | 'removed';
  depth?: number;
  error?: string;
  removed_content?: string;
}


/**
 * Process a single section operation with addressing system
 */
async function processSectionOperation(
  manager: DocumentManager,
  operation: SectionOperation,
  defaultDocument: string
): Promise<SectionOperationResult> {
  try {
    // Parse with potential document override
    const { document: targetDoc, slug: sectionSlug } = parseOperationTarget(
      { section: operation.section },
      defaultDocument
    );

    // Validate target document and section
    const { addresses } = ToolIntegration.validateAndParse({
      document: targetDoc,
      section: sectionSlug
    });

    const { document: docAddress, section: sectionAddress } = addresses;

    // Validate that section address exists (not undefined)
    if (sectionAddress == null) {
      throw new AddressingError('Section address is required for section operations', 'MISSING_SECTION', {
        document: targetDoc,
        section: sectionSlug
      });
    }

    // Verify target document exists
    const targetDocument = await manager.getDocument(docAddress.path);
    if (targetDocument == null) {
      throw new DocumentNotFoundError(docAddress.path);
    }

    // Validate operation using standardized utilities
    const operationType = ToolIntegration.validateOperation(
      operation.operation ?? 'replace',
      ['replace', 'prepend', 'insert_before', 'insert_after', 'append_child', 'append', 'remove'] as const,
      'section'
    );

    const content = ToolIntegration.validateOptionalStringParameter(operation.content, 'content');
    if (operationType !== 'remove' && content == null) {
      throw new AddressingError('Content is required for all operations except remove', 'MISSING_CONTENT', {
        operation: operationType
      });
    }

    // Perform the section operation using existing logic but with validated addresses
    const result = await performSectionEdit(
      manager,
      docAddress.path,
      sectionAddress.slug,
      content ?? '',
      operationType,
      ToolIntegration.validateOptionalStringParameter(operation.title, 'title')
    );

    return {
      success: true,
      section: result.section,
      action: result.action,
      ...(result.depth != null && { depth: result.depth }),
      ...(result.removedContent !== undefined && { removed_content: result.removedContent })
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      section: operation.section,
      error: message
    };
  }
}

/**
 * MCP tool for comprehensive section management with support for all CRUD operations
 *
 * Supports bulk operations only - always pass operations as an array, even for single edits.
 * Uses the central addressing system for consistent hierarchical and flat addressing patterns.
 *
 * @param args - Object with document path and operations array
 * @param _state - MCP session state (unused in current implementation)
 * @returns Operation results with document info, affected sections, and status details
 *
 * @example
 * // Single section edit (uses operations array)
 * const result = await section({
 *   document: "/api/auth.md",
 *   operations: [{
 *     section: "overview",
 *     content: "Updated content",
 *     operation: "replace"
 *   }]
 * });
 *
 * // Multiple operations
 * const result = await section({
 *   document: "/api/auth.md",
 *   operations: [
 *     { section: "overview", content: "New content", operation: "replace" },
 *     { section: "examples", content: "Example content", operation: "append_child", title: "Examples" }
 *   ]
 * });
 *
 * @throws {AddressingError} When document or section addresses are invalid or not found
 * @throws {Error} When section operations fail due to content constraints or filesystem errors
 */
export async function section(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<unknown> {
  try {
    // Validate operations array exists and is valid
    const operations = args['operations'] as unknown;

    if (!Array.isArray(operations)) {
      throw new AddressingError(
        'operations array is required and must be an array',
        'MISSING_OPERATIONS',
        { provided: operations, type: typeof operations }
      );
    }

    if (operations.length === 0) {
      throw new AddressingError(
        'operations array cannot be empty - must contain at least one operation',
        'EMPTY_OPERATIONS'
      );
    }

    // Extract document path and validate
    const document = ToolIntegration.validateOptionalStringParameter(args['document'], 'document');
    if (document == null || document === '') {
      throw new AddressingError(
        'document path is required',
        'MISSING_DOCUMENT'
      );
    }

    // Convert operations to proper format
    const sectionOps: SectionOperation[] = operations.map((op: unknown) => ({
      document,
      section: (op as Record<string, unknown>)['section'] as string,
      content: (op as Record<string, unknown>)['content'] as string,
      operation: (op as Record<string, unknown>)['operation'] as string,
      title: (op as Record<string, unknown>)['title'] as string,
      analyze_links: (op as Record<string, unknown>)['analyze_links'] as boolean
    }));

    return await handleBatchOperations(sectionOps, manager);
  } catch (error) {
    // Handle addressing errors with standardized hierarchical formatting
    if (error instanceof AddressingError) {
      const errorResponse = ToolIntegration.formatHierarchicalError(error, 'Check section path and ensure parent document exists');
      throw new AddressingError(errorResponse.error, error.code, errorResponse.context as Record<string, unknown> | undefined);
    }

    // Handle other errors - wrap in AddressingError for proper MCP handling
    const message = error instanceof Error ? error.message : String(error);
    throw new AddressingError(
      `Failed to edit section: ${message}`,
      'SECTION_EDIT_ERROR',
      { args, originalError: message }
    );
  }
}

/**
 * Handle batch section operations with addressing system validation
 */
async function handleBatchOperations(
  operations: SectionOperation[],
  manager: DocumentManager
): Promise<unknown> {
  // Comprehensive array validation
  if (!Array.isArray(operations)) {
    throw new AddressingError(
      'Operations parameter must be an array',
      'INVALID_BATCH',
      { receivedType: typeof operations }
    );
  }

  if (operations.length === 0) {
    throw new AddressingError(
      'Batch operations array cannot be empty',
      'EMPTY_BATCH'
    );
  }

  if (operations.length > MAX_BATCH_SIZE) {
    throw new AddressingError(
      `Batch size ${operations.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
      'BATCH_TOO_LARGE',
      { batchSize: operations.length, maxSize: MAX_BATCH_SIZE }
    );
  }

  // Validate array contents
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    if (op == null || typeof op !== 'object' || Array.isArray(op)) {
      throw new AddressingError(
        `Invalid operation at index ${i}: must be a non-null object`,
        'INVALID_BATCH_ITEM',
        { index: i, value: op, type: typeof op }
      );
    }
  }

  const batchResults: SectionOperationResult[] = [];
  let sectionsModified = 0;
  const documentsModified = new Set<string>();

  // Process each operation sequentially with addressing validation
  for (const op of operations) {
    try {
      // Parse with potential document override
      const defaultDoc = op.document ?? '';
      const { document: targetDoc } = parseOperationTarget(
        { section: op.section ?? '' },
        defaultDoc
      );

      // Track which documents were modified (may be different from default)
      documentsModified.add(targetDoc);

      const result = await processSectionOperation(manager, op, defaultDoc);
      batchResults.push(result);

      if (result.success) {
        sectionsModified++;
      }

    } catch (opError) {
      const message = opError instanceof Error ? opError.message : String(opError);
      batchResults.push({
        success: false,
        section: op.section ?? 'unknown',
        error: message
      });
    }
  }

  return formatBatchResponse(batchResults, documentsModified, sectionsModified);
}


/**
 * Format batch operation response with standardized structure
 */
async function formatBatchResponse(
  batchResults: SectionOperationResult[],
  documentsModified: Set<string>,
  sectionsModified: number
): Promise<unknown> {
  // Convert batch results to new format with status field
  const results = batchResults.map(result => {
    if (result.success) {
      return {
        section: result.section,
        operation: result.action,
        status: result.action === 'created' ? 'created' : result.action === 'removed' ? 'removed' : 'updated',
        ...(result.depth != null && { depth: result.depth }),
        ...(result.removed_content != null && { removed_content: result.removed_content })
      };
    } else {
      return {
        section: result.section,
        status: 'error',
        error: result.error
      };
    }
  });

  // Get single document path if all operations on same document
  const docPaths = Array.from(documentsModified);
  const singleDocPath = docPaths.length === 1 ? docPaths[0] : undefined;

  return {
    success: true,
    document: singleDocPath,
    operations_completed: sectionsModified,
    results,
    timestamp: new Date().toISOString()
  };
}

