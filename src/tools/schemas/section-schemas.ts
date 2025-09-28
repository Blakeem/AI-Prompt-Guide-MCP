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
 * @example Basic section editing
 * ```typescript
 * const editInput = {
 *   document: '/api/authentication.md',
 *   section: 'jwt-tokens',
 *   content: 'Updated JWT token documentation...',
 *   operation: 'replace'
 * };
 * ```
 *
 * @example Creating new sections
 * ```typescript
 * const createInput = {
 *   document: '/api/endpoints.md',
 *   section: 'users',  // Reference section for placement
 *   content: 'New OAuth section content...',
 *   operation: 'insert_after',
 *   title: 'OAuth Integration'
 * };
 * ```
 *
 * @example Hierarchical section creation
 * ```typescript
 * const hierarchicalInput = {
 *   document: '/specs/api-design.md',
 *   section: 'authentication',  // Parent section
 *   content: 'OAuth 2.0 flow documentation...',
 *   operation: 'append_child',  // Creates child section with auto-depth
 *   title: 'OAuth Flows'
 * };
 * ```
 *
 * @example Section deletion
 * ```typescript
 * const deleteInput = {
 *   document: '/deprecated/old-api.md',
 *   section: 'legacy-endpoints',
 *   operation: 'remove'
 * };
 * ```
 *
 * @example Batch operations
 * ```typescript
 * const batchInput = {
 *   document: '/api/specs.md',
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
     * Must be absolute path from document root including .md extension.
     * Document must exist before performing section operations.
     *
     * @example Standard document paths
     * "/specs/authentication.md"
     * "/api/endpoints/users.md"
     * "/guides/setup-guide.md"
     *
     * @example Namespace organization
     * "/api/specs/oauth-flows.md"
     * "/docs/user-guides/admin-panel.md"
     */
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/search-api.md")';
    };

    /**
     * Section slug for operation target or reference
     *
     * For edit/delete operations: identifies the target section.
     * For create operations: identifies the reference section for placement.
     * Supports both flat slugs and hierarchical addressing.
     *
     * @example Flat section slugs
     * "authentication", "endpoints", "configuration"
     *
     * @example Hierarchical section paths
     * "api/auth/oauth", "guides/setup/database"
     *
     * @example With hash prefix (normalized automatically)
     * "#jwt-tokens", "#api-endpoints"
     */
    section: {
      type: 'string';
      description: 'Section slug to edit or reference section for new section placement (e.g., "#endpoints", "#authentication", "api/auth/flows")';
    };

    /**
     * Content for the section operation
     *
     * For edit operations: new or additional content for the section.
     * For create operations: content for the new section.
     * Not required for delete operations.
     *
     * @example Markdown content
     * "## Authentication\n\nThis section covers..."
     *
     * @example Rich content with links
     * "See @/api/auth.md#tokens for token details.\n\n### Overview\n..."
     *
     * @example Code examples
     * "```javascript\nconst token = generateJWT(payload);\n```"
     */
    content: {
      type: 'string';
      description: 'Content for the section (markdown format, supports @ link syntax)';
    };

    /**
     * Operation type to perform on the section
     *
     * Supports three categories of operations:
     * - Edit: modify existing sections (replace, append, prepend)
     * - Create: add new sections (insert_before, insert_after, append_child)
     * - Delete: remove sections (remove)
     *
     * @example Edit operations
     * - "replace": Completely replace section content
     * - "append": Add content to end of section
     * - "prepend": Add content to beginning of section
     *
     * @example Create operations
     * - "insert_before": Create new section before reference section
     * - "insert_after": Create new section after reference section
     * - "append_child": Create new subsection under reference section
     *
     * @example Delete operations
     * - "remove": Delete section and all its subsections
     *
     * @default "replace"
     */
    operation: {
      type: 'string';
      enum: ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'];
      default: 'replace';
      description: 'Edit: replace/append/prepend. Create: insert_before/insert_after/append_child (auto-depth). Delete: remove';
    };

    /**
     * Title for new section creation
     *
     * Required for create operations (insert_before, insert_after, append_child).
     * Will be used as the heading text and to generate the section slug.
     * Not used for edit or delete operations.
     *
     * @example Simple titles
     * "Authentication", "API Endpoints", "Configuration"
     *
     * @example Descriptive titles
     * "OAuth 2.0 Integration", "Database Setup Guide", "Error Handling Patterns"
     *
     * @example Hierarchical context
     * "JWT Token Validation" (under Authentication section)
     * "User Management APIs" (under API Endpoints section)
     */
    title: {
      type: 'string';
      description: 'Title for new section (required for create operations: insert_before, insert_after, append_child)';
    };
  };

  /** Required parameters - document, section, and content are mandatory for most operations */
  required: ['document', 'section', 'content'];

  /** Prevent additional properties for strict validation */
  additionalProperties: false;
}

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
  EDIT_OPERATIONS: ['replace', 'append', 'prepend'] as const,
  CREATE_OPERATIONS: ['insert_before', 'insert_after', 'append_child'] as const,
  DELETE_OPERATIONS: ['remove'] as const,
  DEFAULT_OPERATION: 'replace',
} as const;

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
export type SectionOperation =
  | 'replace'
  | 'append'
  | 'prepend'
  | 'insert_before'
  | 'insert_after'
  | 'append_child'
  | 'remove';

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
export function isEditOperation(operation: string): operation is EditOperation {
  return SECTION_CONSTANTS.EDIT_OPERATIONS.includes(operation as EditOperation);
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
export function isCreateOperation(operation: string): operation is CreateOperation {
  return SECTION_CONSTANTS.CREATE_OPERATIONS.includes(operation as CreateOperation);
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
export function isDeleteOperation(operation: string): operation is DeleteOperation {
  return SECTION_CONSTANTS.DELETE_OPERATIONS.includes(operation as DeleteOperation);
}

/**
 * Get the input schema for section tool
 */
export function getSectionSchema(): SectionInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/search-api.md")',
      },
      section: {
        type: 'string',
        description: 'Section slug to edit or reference section for new section placement (e.g., "#endpoints", "#authentication", "api/auth/flows")',
      },
      content: {
        type: 'string',
        description: 'Content for the section (markdown format, supports @ link syntax)',
      },
      operation: {
        type: 'string',
        enum: ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'],
        default: SECTION_CONSTANTS.DEFAULT_OPERATION,
        description: 'Edit: replace/append/prepend. Create: insert_before/insert_after/append_child (auto-depth). Delete: remove',
      },
      title: {
        type: 'string',
        description: 'Title for new section (required for create operations: insert_before, insert_after, append_child)',
      },
    },
    required: ['document', 'section', 'content'],
    additionalProperties: false,
  };
}