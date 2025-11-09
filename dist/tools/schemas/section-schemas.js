/**
 * Schema definitions for section tool
 *
 * This module defines the comprehensive input validation schema for the section
 * MCP tool, supporting unified section operations including editing existing
 * sections, creating new sections, and deleting sections.
 */
/**
 * Schema constants for section tool
 */
export const SECTION_CONSTANTS = {
    OPERATIONS: {
        // Edit existing sections
        REPLACE: 'replace',
        APPEND: 'append',
        PREPEND: 'prepend',
        // Create new sections
        INSERT_BEFORE: 'insert_before',
        INSERT_AFTER: 'insert_after',
        APPEND_CHILD: 'append_child',
        // Delete sections
        REMOVE: 'remove',
    },
    EDIT_OPERATIONS: ['replace', 'append', 'prepend'],
    CREATE_OPERATIONS: ['insert_before', 'insert_after', 'append_child'],
    DELETE_OPERATIONS: ['remove'],
    DEFAULT_OPERATION: 'replace',
};
/**
 * Helper functions for operation validation and categorization
 *
 * These type guard functions provide runtime validation and categorization
 * of section operations, enabling operation-specific logic and validation.
 */
/**
 * Type guard to check if operation is an edit operation
 *
 * Validates that the operation modifies existing section content without
 * creating new sections or changing document structure.
 *
 * @param operation - Operation string to validate
 * @returns True if operation is replace, append, or prepend
 *
 * @example Operation-specific validation
 * ```typescript
 * function validateEditParameters(operation: string, content: string): void {
 *   if (isEditOperation(operation)) {
 *     if (!content || content.trim() === '') {
 *       throw new Error('Content is required for edit operations');
 *     }
 *     // Edit operations don't require title
 *   }
 * }
 * ```
 *
 * @example Conditional logic
 * ```typescript
 * if (isEditOperation(operation)) {
 *   // Handle existing section modification
 *   return await editExistingSection(document, section, content, operation);
 * }
 * ```
 */
export function isEditOperation(operation) {
    return SECTION_CONSTANTS.EDIT_OPERATIONS.includes(operation);
}
/**
 * Type guard to check if operation is a create operation
 *
 * Validates that the operation creates new sections in the document
 * with proper positioning relative to existing sections.
 *
 * @param operation - Operation string to validate
 * @returns True if operation is insert_before, insert_after, or append_child
 *
 * @example Create operation validation
 * ```typescript
 * function validateCreateParameters(
 *   operation: string,
 *   content: string,
 *   title?: string
 * ): void {
 *   if (isCreateOperation(operation)) {
 *     if (!content || content.trim() === '') {
 *       throw new Error('Content is required for create operations');
 *     }
 *     if (!title || title.trim() === '') {
 *       throw new Error('Title is required for create operations');
 *     }
 *   }
 * }
 * ```
 *
 * @example Depth calculation for child sections
 * ```typescript
 * if (isCreateOperation(operation) && operation === 'append_child') {
 *   const parentDepth = findSectionDepth(document, referenceSection);
 *   const newDepth = parentDepth + 1;
 *   return createSectionWithDepth(title, content, newDepth);
 * }
 * ```
 */
export function isCreateOperation(operation) {
    return SECTION_CONSTANTS.CREATE_OPERATIONS.includes(operation);
}
/**
 * Type guard to check if operation is a delete operation
 *
 * Validates that the operation removes sections from the document,
 * including all subsections and related content.
 *
 * @param operation - Operation string to validate
 * @returns True if operation is remove
 *
 * @example Delete operation handling
 * ```typescript
 * function validateDeleteOperation(operation: string): void {
 *   if (isDeleteOperation(operation)) {
 *     // Delete operations don't require content or title
 *     console.warn('Delete operation will remove section and all subsections');
 *   }
 * }
 * ```
 *
 * @example Confirmation workflow
 * ```typescript
 * if (isDeleteOperation(operation)) {
 *   const subsections = findSubsections(document, targetSection);
 *   if (subsections.length > 0) {
 *     console.log(`Warning: Will also delete ${subsections.length} subsections`);
 *   }
 *   return await deleteSection(document, targetSection);
 * }
 * ```
 */
export function isDeleteOperation(operation) {
    return SECTION_CONSTANTS.DELETE_OPERATIONS.includes(operation);
}
/**
 * Get the input schema for section tool (bulk operations only)
 */
export function getSectionSchema() {
    return {
        type: 'object',
        properties: {
            document: {
                type: 'string',
                description: 'Document path (e.g., "/docs/specs/search-api.md"). ALWAYS required - provides default context for all operations. Individual section fields can override with full path "/other.md#slug" for multi-document operations.',
            },
            operations: {
                type: 'array',
                description: 'Array of section operations to perform. Always pass operations as an array, even for single edits.',
                items: {
                    type: 'object',
                    properties: {
                        section: {
                            type: 'string',
                            description: 'Section slug or full path with override support. THREE FORMATS: 1) "slug" - uses document parameter as context, 2) "#slug" - uses document parameter as context (with # prefix), 3) "/other.md#slug" - overrides document parameter for this operation. Example multi-document: document="/docs/api/auth.md" with section="/docs/api/security.md#authentication" edits security.md instead.',
                        },
                        operation: {
                            type: 'string',
                            enum: ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'],
                            description: 'Operation type',
                        },
                        content: {
                            type: 'string',
                            description: 'Content for the operation (empty string for remove)',
                        },
                        title: {
                            type: 'string',
                            description: 'Title for new sections (required for insert_before, insert_after, append_child)',
                        },
                    },
                    required: ['section', 'operation', 'content'],
                },
            },
        },
        required: ['document', 'operations'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=section-schemas.js.map