/**
 * Schema definitions for section tool
 *
 * This module defines the comprehensive input validation schema for the section
 * MCP tool, supporting unified section operations including editing existing
 * sections, creating new sections, and deleting sections.
 */
/**
 * Input schema interface for section tool
 *
 * Defines the structure and validation rules for section tool parameters.
 * Supports comprehensive section management operations with automatic
 * hierarchical addressing and flexible content manipulation.
 *
 * @example Single section edit (uses operations array)
 * ```typescript
 * const editInput = {
 *   document: '/docs/api/authentication.md',
 *   operations: [{
 *     section: 'jwt-tokens',
 *     content: 'Updated JWT token documentation...',
 *     operation: 'replace'
 *   }]
 * };
 * ```
 *
 * @example Creating new section (uses operations array)
 * ```typescript
 * const createInput = {
 *   document: '/docs/api/endpoints.md',
 *   operations: [{
 *     section: 'users',  // Reference section for placement
 *     content: 'New OAuth section content...',
 *     operation: 'insert_after',
 *     title: 'OAuth Integration'
 *   }]
 * };
 * ```
 *
 * @example Multiple operations in one call
 * ```typescript
 * const multiInput = {
 *   document: '/docs/api/specs.md',
 *   operations: [
 *     {
 *       section: 'overview',
 *       content: 'Updated overview...',
 *       operation: 'replace'
 *     },
 *     {
 *       section: 'overview',
 *       content: 'New migration guide...',
 *       operation: 'insert_after',
 *       title: 'Migration Guide'
 *     },
 *     {
 *       section: 'deprecated',
 *       content: '',
 *       operation: 'remove'
 *     }
 *   ]
 * };
 * ```
 */
export interface SectionInputSchema {
    /** Schema type, always 'object' for MCP tools */
    type: 'object';
    /** Parameter definitions with detailed validation and examples */
    properties: {
        /**
         * Target document path for section operations
         *
         * ALWAYS required - provides default context for all operations.
         * Individual section fields can override with full path "/other.md#slug" for multi-document operations.
         *
         * Must be absolute path from document root including .md extension.
         * Document must exist before performing section operations.
         *
         * @example Standard document paths
         * "/docs/specs/authentication.md"
         * "/docs/api/endpoints/users.md"
         * "/docs/guides/setup-guide.md"
         *
         * @example Namespace organization
         * "/docs/api/specs/oauth-flows.md"
         * "/docs/user-guides/admin-panel.md"
         */
        document: {
            type: 'string';
            description: 'Document path (e.g., "/docs/specs/search-api.md"). ALWAYS required - provides default context for all operations. Individual section fields can override with full path "/other.md#slug" for multi-document operations.';
        };
        /**
         * Array of section operations to perform
         *
         * Each operation contains section slug, operation type, content, and optional title.
         * Always provide as an array, even for single operations.
         */
        operations: {
            type: 'array';
            description: 'Array of section operations to perform. Always pass operations as an array, even for single edits.';
            items: {
                type: 'object';
                properties: {
                    section: {
                        type: 'string';
                        description: 'Section slug or full path with override support. THREE FORMATS: 1) "slug" - uses document parameter as context, 2) "#slug" - uses document parameter as context (with # prefix), 3) "/other.md#slug" - overrides document parameter for this operation. Example multi-document: document="/docs/api/auth.md" with section="/docs/api/security.md#authentication" edits security.md instead.';
                    };
                    operation: {
                        type: 'string';
                        enum: ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'];
                        description: 'Operation type';
                    };
                    content: {
                        type: 'string';
                        description: 'Content for the operation (empty string for remove)';
                    };
                    title: {
                        type: 'string';
                        description: 'Title for new sections (required for insert_before, insert_after, append_child)';
                    };
                };
                required: ['section', 'operation', 'content'];
            };
        };
    };
    /** Required parameters - document and operations array are mandatory */
    required: ['document', 'operations'];
    /** Prevent additional properties for strict validation */
    additionalProperties: false;
}
/**
 * Schema constants for section tool
 */
export declare const SECTION_CONSTANTS: {
    readonly OPERATIONS: {
        readonly REPLACE: "replace";
        readonly APPEND: "append";
        readonly PREPEND: "prepend";
        readonly INSERT_BEFORE: "insert_before";
        readonly INSERT_AFTER: "insert_after";
        readonly APPEND_CHILD: "append_child";
        readonly REMOVE: "remove";
    };
    readonly EDIT_OPERATIONS: readonly ["replace", "append", "prepend"];
    readonly CREATE_OPERATIONS: readonly ["insert_before", "insert_after", "append_child"];
    readonly DELETE_OPERATIONS: readonly ["remove"];
    readonly DEFAULT_OPERATION: "replace";
};
/**
 * Type definitions for section operations
 *
 * These types provide compile-time safety and categorization for section
 * operations, enabling proper validation and operation-specific logic.
 */
/**
 * Union type of all supported section operations
 *
 * Provides type safety for operation parameter validation and ensures
 * only valid operations are accepted by the section tool.
 *
 * @example Operation validation
 * ```typescript
 * function validateOperation(op: string): op is SectionOperation {
 *   const validOps: SectionOperation[] = [
 *     'replace', 'append', 'prepend',
 *     'insert_before', 'insert_after', 'append_child',
 *     'remove'
 *   ];
 *   return validOps.includes(op as SectionOperation);
 * }
 * ```
 *
 * @see {@link EditOperation} Edit-specific operations
 * @see {@link CreateOperation} Creation-specific operations
 * @see {@link DeleteOperation} Deletion-specific operations
 */
export type SectionOperation = 'replace' | 'append' | 'prepend' | 'insert_before' | 'insert_after' | 'append_child' | 'remove';
/**
 * Operations for editing existing sections
 *
 * These operations modify the content of existing sections without
 * changing document structure or creating new sections.
 *
 * @example Edit operation usage
 * ```typescript
 * function performEdit(
 *   section: Section,
 *   content: string,
 *   operation: EditOperation
 * ): Section {
 *   switch (operation) {
 *     case 'replace':
 *       return { ...section, content };
 *     case 'append':
 *       return { ...section, content: section.content + '\n\n' + content };
 *     case 'prepend':
 *       return { ...section, content: content + '\n\n' + section.content };
 *   }
 * }
 * ```
 */
export type EditOperation = 'replace' | 'append' | 'prepend';
/**
 * Operations for creating new sections
 *
 * These operations create new sections in the document with automatic
 * positioning and depth calculation based on the reference section.
 *
 * @example Create operation usage
 * ```typescript
 * function performCreate(
 *   document: Document,
 *   referenceSection: Section,
 *   newContent: string,
 *   title: string,
 *   operation: CreateOperation
 * ): Document {
 *   switch (operation) {
 *     case 'insert_before':
 *       return insertSectionBefore(document, referenceSection, { title, content: newContent });
 *     case 'insert_after':
 *       return insertSectionAfter(document, referenceSection, { title, content: newContent });
 *     case 'append_child':
 *       const childDepth = referenceSection.depth + 1;
 *       return appendChildSection(document, referenceSection, { title, content: newContent, depth: childDepth });
 *   }
 * }
 * ```
 */
export type CreateOperation = 'insert_before' | 'insert_after' | 'append_child';
/**
 * Operations for deleting sections
 *
 * Currently supports only complete section removal. Future versions
 * may include partial deletion or archiving operations.
 *
 * @example Delete operation usage
 * ```typescript
 * function performDelete(
 *   document: Document,
 *   targetSection: Section,
 *   operation: DeleteOperation
 * ): Document {
 *   switch (operation) {
 *     case 'remove':
 *       // Remove section and all its subsections
 *       return removeSectionAndChildren(document, targetSection);
 *   }
 * }
 * ```
 */
export type DeleteOperation = 'remove';
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
export declare function isEditOperation(operation: string): operation is EditOperation;
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
export declare function isCreateOperation(operation: string): operation is CreateOperation;
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
export declare function isDeleteOperation(operation: string): operation is DeleteOperation;
/**
 * Get the input schema for section tool (bulk operations only)
 */
export declare function getSectionSchema(): SectionInputSchema;
//# sourceMappingURL=section-schemas.d.ts.map