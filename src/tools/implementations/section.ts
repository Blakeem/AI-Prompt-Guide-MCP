/**
 * Implementation for the section tool
 *
 * Migrated to use central addressing system for consistent document/section addressing
 */

import type { SessionState } from '../../session/types.js';
import {
  getDocumentManager,
  performSectionEdit
} from '../../shared/utilities.js';
import {
  ToolIntegration,
  AddressingError,
  parseDocumentAddress
} from '../../shared/addressing-system.js';

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
  manager: Awaited<ReturnType<typeof getDocumentManager>>,
  operation: SectionOperation
): Promise<SectionOperationResult> {
  try {
    // Use addressing system for validation and parsing
    const { addresses } = ToolIntegration.validateAndParse({
      document: operation.document,
      section: operation.section
    });

    const { document: docAddress, section: sectionAddress } = addresses;

    // Validate that section address exists (not undefined)
    if (sectionAddress == null) {
      throw new AddressingError('Section address is required for section operations', 'MISSING_SECTION', {
        document: operation.document,
        section: operation.section
      });
    }

    // Validate operation using standardized utilities
    const operationType = ToolIntegration.validateOperation(
      operation.operation ?? 'replace',
      ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'] as const,
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
 * Supports both single and batch operations for section editing, creation, and deletion.
 * Uses the central addressing system for consistent hierarchical and flat addressing patterns.
 *
 * @param args - Single operation object or array of operations for batch processing
 * @param _state - MCP session state (unused in current implementation)
 * @returns Operation results with document info, affected sections, and status details
 *
 * @example
 * // Single section edit
 * const result = await section({
 *   document: "api/auth.md",
 *   section: "overview",
 *   content: "Updated content",
 *   operation: "replace"
 * });
 *
 * // Batch operations
 * const result = await section([
 *   { document: "api/auth.md", section: "overview", content: "New content", operation: "replace" },
 *   { document: "api/auth.md", section: "examples", content: "Example content", operation: "append_child" }
 * ]);
 *
 * @throws {AddressingError} When document or section addresses are invalid or not found
 * @throws {Error} When section operations fail due to content constraints or filesystem errors
 */
export async function section(
  args: Record<string, unknown> | Array<Record<string, unknown>>,
  _state: SessionState
): Promise<unknown> {
  try {
    const manager = await getDocumentManager();
    const isBatch = Array.isArray(args);

    if (isBatch) {
      return await handleBatchOperations(args as unknown as SectionOperation[], manager);
    } else {
      return await handleSingleOperation(args as unknown as SectionOperation, manager);
    }
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
  manager: Awaited<ReturnType<typeof getDocumentManager>>
): Promise<unknown> {
  if (operations.length === 0) {
    throw new AddressingError('Batch operations array cannot be empty', 'EMPTY_BATCH');
  }

  const batchResults: SectionOperationResult[] = [];
  let sectionsModified = 0;
  const documentsModified = new Set<string>();

  // Process each operation sequentially with addressing validation
  for (const op of operations) {
    try {
      // Parse and validate each operation's addresses
      const { addresses } = ToolIntegration.validateAndParse({
        document: op.document ?? '',
        section: op.section ?? ''
      });

      documentsModified.add(addresses.document.path);

      const result = await processSectionOperation(manager, op);
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

  return formatBatchResponse(batchResults, documentsModified, sectionsModified, operations.length, manager);
}

/**
 * Handle single section operation with addressing system validation
 */
async function handleSingleOperation(
  singleOp: SectionOperation,
  manager: Awaited<ReturnType<typeof getDocumentManager>>
): Promise<unknown> {
  // Validate and parse addresses
  const { addresses } = ToolIntegration.validateAndParse({
    document: singleOp.document ?? '',
    section: singleOp.section ?? ''
  });

  const { document: docAddress, section: sectionAddress } = addresses;

  // Validate section address exists
  if (sectionAddress == null) {
    throw new AddressingError('Section address is required for section operations', 'MISSING_SECTION', {
      document: singleOp.document,
      section: singleOp.section
    });
  }

  const content = ToolIntegration.validateOptionalStringParameter(singleOp.content, 'content') ?? '';
  const operation = ToolIntegration.validateOperation(
    singleOp.operation ?? 'replace',
    ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'] as const,
    'section'
  );
  const title = ToolIntegration.validateOptionalStringParameter(singleOp.title, 'title');

  // Content validation for non-remove operations
  if (operation !== 'remove' && !content) {
    throw new AddressingError('Content is required for all operations except remove', 'MISSING_CONTENT', {
      operation
    });
  }

  // Perform the section operation using existing logic but with validated addresses
  const result = await performSectionEdit(
    manager,
    docAddress.path,
    sectionAddress.slug,
    content,
    operation,
    title
  );

  return formatSingleResponse(result, docAddress, sectionAddress, content, operation, manager, singleOp.analyze_links ?? false);
}

/**
 * Format batch operation response with document info when applicable
 */
async function formatBatchResponse(
  batchResults: SectionOperationResult[],
  documentsModified: Set<string>,
  sectionsModified: number,
  totalOperations: number,
  manager: Awaited<ReturnType<typeof getDocumentManager>>
): Promise<unknown> {
  // Get document info for single document batches using addressing system
  let documentInfo;
  if (Array.from(documentsModified).length === 1) {
    const singleDocPath = Array.from(documentsModified)[0] as string;
    try {
      const docAddress = parseDocumentAddress(singleDocPath);
      const doc = await manager.getDocument(singleDocPath);
      if (doc != null) {
        documentInfo = ToolIntegration.formatDocumentInfo(docAddress, { title: doc.metadata.title });
      }
    } catch {
      // Skip document info if parsing fails
    }
  }

  return {
    batch_results: batchResults,
    document: Array.from(documentsModified).length === 1 ? Array.from(documentsModified)[0] : undefined,
    sections_modified: sectionsModified,
    total_operations: totalOperations,
    timestamp: new Date().toISOString(),
    ...(documentInfo != null && { document_info: documentInfo })
  };
}

/**
 * Format single operation response based on action type
 */
async function formatSingleResponse(
  result: { action: 'edited' | 'created' | 'removed'; section: string; depth?: number; removedContent?: string },
  docAddress: ReturnType<typeof parseDocumentAddress>,
  sectionAddress: NonNullable<ReturnType<typeof ToolIntegration.validateAndParse>['addresses']['section']>,
  content: string,
  operation: string,
  manager: Awaited<ReturnType<typeof getDocumentManager>>,
  analyzeLinks: boolean = false
): Promise<unknown> {
  // Get document information for response using addressing system
  const document = await manager.getDocument(docAddress.path);
  const documentInfo = document != null
    ? ToolIntegration.formatDocumentInfo(docAddress, { title: document.metadata.title })
    : undefined;

  if (result.action === 'created') {
    return formatCreatedResponse(result, docAddress, sectionAddress, content, operation, documentInfo, manager, analyzeLinks);
  } else if (result.action === 'removed') {
    return formatRemovedResponse(result, docAddress, operation, documentInfo);
  } else {
    return formatUpdatedResponse(result, docAddress, sectionAddress, content, operation, documentInfo, manager, analyzeLinks);
  }
}

/**
 * Format response for created section operation
 */
async function formatCreatedResponse(
  result: { section: string; depth?: number },
  docAddress: ReturnType<typeof parseDocumentAddress>,
  sectionAddress: NonNullable<ReturnType<typeof ToolIntegration.validateAndParse>['addresses']['section']>,
  content: string,
  operation: string,
  documentInfo: unknown,
  manager: Awaited<ReturnType<typeof getDocumentManager>>,
  analyzeLinks: boolean = false
): Promise<unknown> {
  // Backward compatibility: include both old and new hierarchical formats
  const hierarchicalInfo = {
    slug_depth: result.depth ?? 1,
    parent_slug: result.section.includes('/')
      ? result.section.split('/').slice(0, -1).join('/')
      : null
  };

  // Standardized hierarchical context (future direction)
  const hierarchicalContext = ToolIntegration.formatHierarchicalContext(sectionAddress);

  // Analyze links in the created content (optional for performance)
  const linkAssistance = await analyzeLinksIfRequested(content, docAddress.path, result.section, manager, analyzeLinks);

  return {
    created: true,
    document: docAddress.path,
    new_section: result.section,
    ...(result.depth !== undefined && { depth: result.depth }),
    operation,
    timestamp: new Date().toISOString(),
    hierarchical_info: hierarchicalInfo,
    ...(hierarchicalContext != null && { hierarchical_context: hierarchicalContext }),
    link_assistance: linkAssistance,
    ...(documentInfo != null && { document_info: documentInfo })
  };
}

/**
 * Format response for removed section operation
 */
function formatRemovedResponse(
  result: { section: string; removedContent?: string },
  docAddress: ReturnType<typeof parseDocumentAddress>,
  operation: string,
  documentInfo: unknown
): unknown {
  return {
    removed: true,
    document: docAddress.path,
    section: result.section,
    removed_content: result.removedContent,
    operation,
    timestamp: new Date().toISOString(),
    ...(documentInfo != null && { document_info: documentInfo })
  };
}

/**
 * Format response for updated section operation
 */
async function formatUpdatedResponse(
  result: { section: string },
  docAddress: ReturnType<typeof parseDocumentAddress>,
  sectionAddress: NonNullable<ReturnType<typeof ToolIntegration.validateAndParse>['addresses']['section']>,
  content: string,
  operation: string,
  documentInfo: unknown,
  manager: Awaited<ReturnType<typeof getDocumentManager>>,
  analyzeLinks: boolean = false
): Promise<unknown> {
  // Backward compatibility: include both old and new hierarchical formats
  const updatedDocument = await manager.getDocument(docAddress.path);
  const sectionHeading = updatedDocument?.headings.find(h => h.slug === result.section);
  const actualDepth = sectionHeading?.depth ?? 1;

  const hierarchicalInfo = {
    slug_depth: actualDepth,
    parent_slug: result.section.includes('/')
      ? result.section.split('/').slice(0, -1).join('/')
      : null
  };

  // Standardized hierarchical context (future direction)
  const hierarchicalContext = ToolIntegration.formatHierarchicalContext(sectionAddress);

  // Analyze links in the updated content (optional for performance)
  const linkAssistance = await analyzeLinksIfRequested(content, docAddress.path, result.section, manager, analyzeLinks);

  return {
    updated: true,
    document: docAddress.path,
    section: result.section,
    operation,
    timestamp: new Date().toISOString(),
    hierarchical_info: hierarchicalInfo,
    ...(hierarchicalContext != null && { hierarchical_context: hierarchicalContext }),
    link_assistance: linkAssistance,
    ...(documentInfo != null && { document_info: documentInfo })
  };
}

/**
 * Conditionally analyze links based on configuration to improve performance
 */
async function analyzeLinksIfRequested(
  content: string,
  documentPath: string,
  sectionSlug: string,
  manager: Awaited<ReturnType<typeof getDocumentManager>>,
  shouldAnalyze: boolean = false
): Promise<{
  links_found: Array<{
    link_text: string;
    is_valid: boolean;
    target_document?: string;
    target_section?: string;
    validation_error?: string;
  }>;
  link_suggestions: Array<{
    suggested_link: string;
    target_document: string;
    rationale: string;
    placement_hint: string;
  }>;
  syntax_help: {
    detected_patterns: string[];
    correct_examples: string[];
    common_mistakes: string[];
  };
}> {
  if (!shouldAnalyze) {
    // Return minimal response when analysis is disabled for performance
    return {
      links_found: [],
      link_suggestions: [],
      syntax_help: {
        detected_patterns: [],
        correct_examples: [
          '@/api/specs/user-api.md - Link to entire document',
          '@/api/guides/setup.md#configuration - Link to specific section',
          '@#implementation - Link to section in current document'
        ],
        common_mistakes: []
      }
    };
  }

  // Perform full link analysis when requested
  const { createLinkAnalysisService } = await import('../../shared/link-analysis.js');
  const linkAnalysis = createLinkAnalysisService(manager);
  return await linkAnalysis.analyzeLinks(content, documentPath, sectionSlug);
}

