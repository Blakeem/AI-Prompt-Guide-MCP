/**
 * Central addressing system for consistent document/section/task addressing
 *
 * This module provides unified addressing patterns to prevent inconsistencies
 * across the codebase in how documents, sections, and tasks are referenced.
 *
 * Key Features:
 * - Type-safe addressing with validation
 * - Flexible input format support (#slug, slug, /doc.md#slug)
 * - Relative path structure (user-facing paths are relative to base folders)
 * - Performance caching for repeated operations
 * - Comparison utilities for address equality
 * - Standard tool integration patterns
 * - Comprehensive error handling
 *
 * Path Structure:
 * - User-facing: /api/auth.md (relative to docs/ folder)
 * - Internal: May include namespace prefixes for file operations
 * - Archives: /archived/docs/... (explicit prefix per requirements)
 */
/**
 * Custom error types for addressing system
 *
 * These error classes provide consistent error handling throughout the addressing system
 * with standardized error codes and contextual information for debugging and recovery.
 */
/**
 * Base error class for all addressing system errors
 *
 * Provides structured error information with error codes and contextual data
 * for programmatic error handling and debugging.
 *
 * @param message - Human-readable error message
 * @param code - Machine-readable error code for programmatic handling
 * @param context - Additional context about the error for debugging
 *
 * @example Basic error handling
 * ```typescript
 * try {
 *   // Some addressing operation
 * } catch (error) {
 *   if (error instanceof AddressingError) {
 *     console.error('Error code:', error.code);
 *     console.error('Context:', error.context);
 *   }
 * }
 * ```
 *
 * @example Error code checking
 * ```typescript
 * try {
 *   parseDocumentAddress('/invalid/path');
 * } catch (error) {
 *   if (error instanceof AddressingError && error.code === 'DOCUMENT_NOT_FOUND') {
 *     // Handle missing document specifically
 *   }
 * }
 * ```
 */
export declare class AddressingError extends Error {
    code: string;
    context?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, context?: Record<string, unknown> | undefined);
}
/**
 * Error thrown when a document cannot be found at the specified path
 *
 * This error indicates that the document path is valid but the document
 * does not exist in the file system or document cache.
 *
 * @param path - The document path that was not found
 *
 * @example Handling missing documents
 * ```typescript
 * try {
 *   const doc = parseDocumentAddress('/missing/document.md');
 * } catch (error) {
 *   if (error instanceof DocumentNotFoundError) {
 *     console.error('Document not found:', error.context.path);
 *     // Suggest creating the document or checking the path
 *   }
 * }
 * ```
 *
 * @example Recovery strategy
 * ```typescript
 * try {
 *   return parseDocumentAddress(documentPath);
 * } catch (error) {
 *   if (error instanceof DocumentNotFoundError) {
 *     // Try alternative paths or suggest creation
 *     return suggestAlternativeDocuments(error.context.path);
 *   }
 *   throw error;
 * }
 * ```
 */
export declare class DocumentNotFoundError extends AddressingError {
    constructor(path: string);
}
/**
 * Error thrown when a section cannot be found within a document
 *
 * This error indicates that the document exists but the specified section
 * slug does not match any section in the document.
 *
 * @param slug - The section slug that was not found
 * @param documentPath - The document path where the section was searched
 *
 * @example Handling missing sections
 * ```typescript
 * try {
 *   const section = parseSectionAddress('missing-section', '/api/auth.md');
 * } catch (error) {
 *   if (error instanceof SectionNotFoundError) {
 *     console.error('Section not found:', error.context.slug);
 *     console.error('In document:', error.context.documentPath);
 *     // Suggest available sections or check section name
 *   }
 * }
 * ```
 *
 * @example Hierarchical section recovery
 * ```typescript
 * try {
 *   return parseSectionAddress(sectionSlug, documentPath);
 * } catch (error) {
 *   if (error instanceof SectionNotFoundError) {
 *     const slug = error.context.slug;
 *     if (slug.includes('/')) {
 *       // Try parent section for hierarchical addresses
 *       const parentSlug = slug.split('/').slice(0, -1).join('/');
 *       console.log(`Section not found. Try parent section: ${parentSlug}`);
 *     }
 *   }
 *   throw error;
 * }
 * ```
 */
export declare class SectionNotFoundError extends AddressingError {
    constructor(slug: string, documentPath: string);
}
/**
 * Error thrown when an address format is invalid or malformed
 *
 * This error indicates that the provided address string does not conform
 * to expected patterns or contains invalid characters or structure.
 *
 * @param address - The invalid address that was provided
 * @param reason - Specific reason why the address is invalid
 *
 * @example Handling invalid addresses
 * ```typescript
 * try {
 *   const doc = parseDocumentAddress('invalid-path');
 * } catch (error) {
 *   if (error instanceof InvalidAddressError) {
 *     console.error('Invalid address:', error.context.address);
 *     console.error('Reason:', error.context.reason);
 *     // Provide guidance on correct address format
 *   }
 * }
 * ```
 *
 * @example Address format validation
 * ```typescript
 * function validateAndParseAddress(address: string) {
 *   try {
 *     return parseDocumentAddress(address);
 *   } catch (error) {
 *     if (error instanceof InvalidAddressError) {
 *       switch (error.context.reason) {
 *         case 'Document path must end with .md':
 *           return parseDocumentAddress(address + '.md');
 *         case 'Document path cannot be empty':
 *           throw new Error('Please provide a document path');
 *         default:
 *           throw error;
 *       }
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
export declare class InvalidAddressError extends AddressingError {
    constructor(address: string, reason: string);
}
/**
 * Batch cache statistics for debugging and monitoring
 */
export interface BatchCacheStats {
    readonly size: number;
    readonly keys: string[];
}
/**
 * Address parsing cache optimized for batch operations
 *
 * This cache uses a simple Map for batch-scoped caching instead of persistent LRU caching.
 * Cache entries are only valid for the current batch operation and are cleared after each batch.
 *
 * Benefits of batch-scoped caching:
 * - Simpler implementation (no LRU logic needed)
 * - Lower memory footprint (no persistent 1000-entry cache)
 * - Same performance for batch operations (addresses cached within batch)
 * - Clearer memory model (cache lifecycle tied to batch lifecycle)
 */
declare class AddressCache {
    private readonly batchCache;
    private batchStartTime;
    private readonly BATCH_TIMEOUT_MS;
    /**
     * Check if batch cache has timed out and clear if needed
     */
    private checkBatchTimeout;
    /**
     * Get document address from batch cache
     */
    getDocument(path: string): DocumentAddress | undefined;
    /**
     * Set document address in batch cache
     */
    setDocument(path: string, address: DocumentAddress): void;
    /**
     * Get section address from batch cache
     */
    getSection(key: string): SectionAddress | undefined;
    /**
     * Set section address in batch cache
     */
    setSection(key: string, address: SectionAddress): void;
    /**
     * Clear all batch cache entries
     *
     * This should be called after completing a batch operation to free memory
     * and ensure fresh parsing for the next batch.
     */
    clearBatch(): void;
    /**
     * Get batch cache statistics for debugging
     *
     * Returns the current size and all cache keys for monitoring and debugging
     * batch caching behavior.
     */
    getBatchStats(): BatchCacheStats;
    /**
     * Invalidate all cached addresses for a specific document
     *
     * This clears the batch cache entries for a document and its sections.
     * Called when a document changes to ensure cache consistency.
     */
    invalidateDocument(docPath: string): void;
}
/**
 * Get global address cache instance for testing and batch management
 *
 * This allows external code to clear the batch cache and access statistics.
 * Primarily used for:
 * - Testing batch cache behavior
 * - Clearing cache after batch operations
 * - Monitoring cache statistics
 */
export declare function getGlobalAddressCache(): AddressCache;
/**
 * Invalidate addressing cache entries for a specific document
 *
 * This should be called when a document changes to maintain cache consistency.
 * Clears both the document entry and all section entries for that document.
 */
export declare function invalidateAddressCache(docPath: string): void;
/**
 * Core addressing interfaces
 */
export interface DocumentAddress {
    /**
     * Full document path starting with /
     * User-facing paths are relative to base folders:
     * - /api/auth.md (relative to docs/)
     * - /active.md (relative to coordinator/)
     * - /archived/docs/api/auth.md (explicit archive prefix)
     */
    readonly path: string;
    /** Document slug (filename without extension) */
    readonly slug: string;
    /**
     * Document namespace (folder path or 'root')
     * Extracted from the path structure:
     * - /api/auth.md → 'api'
     * - /api/specs/auth.md → 'api/specs'
     * - /active.md → 'root'
     */
    readonly namespace: string;
    /** Normalized path for internal use */
    readonly normalizedPath: string;
    /** Cache key for this address */
    readonly cacheKey: string;
}
export interface SectionAddress {
    /** Parent document address */
    readonly document: DocumentAddress;
    /** Section slug (normalized, no # prefix) */
    readonly slug: string;
    /** Full section path for referencing (document#section) */
    readonly fullPath: string;
    /** Cache key for this address */
    readonly cacheKey: string;
}
export interface TaskAddress {
    /** Parent document address */
    readonly document: DocumentAddress;
    /** Task slug (normalized, no # prefix) */
    readonly slug: string;
    /** Full task path for referencing */
    readonly fullPath: string;
    /** Flag indicating this is a task (always true) */
    readonly isTask: true;
    /** Cache key for this address */
    readonly cacheKey: string;
}
/**
 * Parse and normalize a document path with caching
 *
 * Accepts user-facing relative paths:
 * - /api/auth.md (relative to docs/)
 * - /active.md (relative to coordinator/)
 * - /archived/docs/api/auth.md (explicit archive prefix)
 *
 * The system does NOT require or validate namespace prefixes like /docs/ or /coordinator/.
 * Paths are relative to their base folders for cleaner user experience.
 *
 * @param docPath - Document path (relative to base folder)
 * @returns Parsed and cached document address
 * @throws {InvalidAddressError} When path format is invalid
 *
 * @example Regular document
 * ```typescript
 * const addr = parseDocumentAddress('/api/auth.md');
 * // { path: '/api/auth.md', namespace: 'api', slug: 'auth' }
 * ```
 *
 * @example Coordinator document
 * ```typescript
 * const addr = parseDocumentAddress('/active.md');
 * // { path: '/active.md', namespace: 'root', slug: 'active' }
 * ```
 *
 * @example Archived document
 * ```typescript
 * const addr = parseDocumentAddress('/archived/docs/api/auth.md');
 * // { path: '/archived/docs/api/auth.md', namespace: 'archived/docs/api', slug: 'auth' }
 * ```
 */
export declare function parseDocumentAddress(docPath: string): DocumentAddress;
/**
 * Parse and normalize a section reference with caching
 * Supports formats: "section", "#section", "/doc.md#section"
 */
export declare function parseSectionAddress(sectionRef: string, contextDoc?: string): SectionAddress;
/**
 * Parse and normalize a task reference with caching
 * Tasks are special sections that live under a "Tasks" parent section
 */
export declare function parseTaskAddress(taskRef: string, contextDoc?: string): TaskAddress;
/**
 * Check if a section is a task by looking at document structure
 */
export declare function isTaskSection(sectionSlug: string, document: {
    headings: ReadonlyArray<{
        slug: string;
        title: string;
        depth: number;
    }>;
}): Promise<boolean>;
/**
 * Standardize addressing parameters for tool operations
 */
export interface StandardizedParams {
    document: DocumentAddress;
    section?: SectionAddress;
    task?: TaskAddress;
}
/**
 * Hierarchical context information for section addresses
 */
export interface HierarchicalContext {
    full_path: string;
    parent_path: string;
    section_name: string;
    depth: number;
}
/**
 * Tool integration helpers - standard patterns for adopting the addressing system
 *
 * This class provides standardized methods for tools to consistently handle addressing,
 * validation, formatting, and error handling across the MCP server.
 */
export declare class ToolIntegration {
    /**
     * Standard parameter validation and parsing for document-based tools
     *
     * Validates and parses document/section/task addresses into standardized format.
     * Throws AddressingError for validation failures with appropriate error codes.
     *
     * @param params - Parameters containing document and optional section/task references
     * @returns Object with validated addresses and original params
     * @throws {DocumentNotFoundError} When document path is invalid
     * @throws {SectionNotFoundError} When section reference is invalid
     * @throws {InvalidAddressError} When address format is malformed
     * @throws {AddressingError} For general parameter validation failures
     *
     * @example Basic document validation (relative path)
     * ```typescript
     * const { addresses } = ToolIntegration.validateAndParse({
     *   document: '/api/auth.md'  // Relative to docs/
     * });
     * // Returns: { addresses: { document: DocumentAddress }, params: {...} }
     * ```
     *
     * @example Coordinator document
     * ```typescript
     * const { addresses } = ToolIntegration.validateAndParse({
     *   document: '/active.md'  // Relative to coordinator/
     * });
     * ```
     *
     * @example Document with section
     * ```typescript
     * const { addresses } = ToolIntegration.validateAndParse({
     *   document: '/api/auth.md',
     *   section: 'jwt-tokens'
     * });
     * // Returns: { addresses: { document: DocumentAddress, section: SectionAddress }, params: {...} }
     * ```
     *
     * @example Hierarchical section addressing
     * ```typescript
     * const { addresses } = ToolIntegration.validateAndParse({
     *   document: '/api/auth.md',
     *   section: 'authentication/jwt-tokens'
     * });
     * // Handles hierarchical paths automatically
     * ```
     */
    static validateAndParse<T extends Record<string, unknown>>(params: T & {
        document: string;
        section?: string;
        task?: string;
    }): {
        addresses: StandardizedParams;
        params: T;
    };
    /**
     * Standard document info response format
     *
     * Provides consistent document information structure across all tools.
     * Returns only the human-readable title, as slug and namespace can be
     * derived from the document path in the response.
     *
     * @param document - Document address object
     * @param metadata - Optional metadata containing document title
     * @returns Standardized document info object with title only
     *
     * @example Basic document info
     * ```typescript
     * const docInfo = ToolIntegration.formatDocumentInfo(document);
     * // Returns: { title: 'auth' }
     * ```
     *
     * @example With metadata title
     * ```typescript
     * const docInfo = ToolIntegration.formatDocumentInfo(document, { title: 'Authentication Guide' });
     * // Returns: { title: 'Authentication Guide' }
     * ```
     */
    static formatDocumentInfo(document: DocumentAddress, metadata?: {
        title: string;
    }): {
        title: string;
    };
    /**
     * Standard section path formatting for responses with hierarchical indicator
     *
     * Formats section paths consistently with hierarchical indicators when applicable.
     * Adds "(hierarchical)" suffix for sections containing forward slashes.
     *
     * @param section - Section address object
     * @returns Formatted section path with hierarchical indicator if applicable
     *
     * @example Flat section
     * ```typescript
     * const path = ToolIntegration.formatSectionPath(flatSection);
     * // Returns: '/api/auth.md#overview'
     * ```
     *
     * @example Hierarchical section
     * ```typescript
     * const path = ToolIntegration.formatSectionPath(hierarchicalSection);
     * // Returns: '/api/auth.md#authentication/jwt-tokens (hierarchical)'
     * ```
     */
    static formatSectionPath(section: SectionAddress): string;
    /**
     * Standard task path formatting for responses
     *
     * Formats task paths with consistent "(task)" indicator.
     *
     * @param task - Task address object
     * @returns Formatted task path with task indicator
     *
     * @example Task path formatting
     * ```typescript
     * const path = ToolIntegration.formatTaskPath(taskAddress);
     * // Returns: '/project/setup.md#initialize-project (task)'
     * ```
     */
    static formatTaskPath(task: TaskAddress): string;
    /**
     * Format hierarchical context for section addresses
     *
     * Provides detailed hierarchical information for sections with forward slashes.
     * Returns null for flat sections to indicate no hierarchical structure.
     *
     * @param section - Section address object
     * @returns Hierarchical context object or null for flat sections
     *
     * @example Flat section (returns null)
     * ```typescript
     * const context = ToolIntegration.formatHierarchicalContext(flatSection);
     * // Returns: null
     * ```
     *
     * @example Hierarchical section
     * ```typescript
     * const context = ToolIntegration.formatHierarchicalContext(hierarchicalSection);
     * // Returns: {
     * //   full_path: 'authentication/jwt-tokens',
     * //   parent_path: 'authentication',
     * //   section_name: 'jwt-tokens',
     * //   depth: 2
     * // }
     * ```
     */
    static formatHierarchicalContext(section: SectionAddress): HierarchicalContext | null;
    /**
     * Enhanced error formatting with hierarchical context
     *
     * Provides standardized error formatting with hierarchical-aware suggestions.
     * Automatically adds helpful suggestions for hierarchical section errors.
     *
     * @param error - AddressingError to format
     * @param suggestion - Optional custom suggestion to override defaults
     * @returns Formatted error object with context and suggestions
     *
     * @example Basic error formatting
     * ```typescript
     * try {
     *   parseDocumentAddress('/invalid/path');
     * } catch (error) {
     *   const formatted = ToolIntegration.formatHierarchicalError(error);
     *   // Returns: { error: 'Document not found: /invalid/path', context: { path: '/invalid/path' } }
     * }
     * ```
     *
     * @example Hierarchical section error with auto-suggestion
     * ```typescript
     * try {
     *   parseSectionAddress('auth/missing-section', '/api/guide.md');
     * } catch (error) {
     *   const formatted = ToolIntegration.formatHierarchicalError(error);
     *   // Returns: {
     *   //   error: 'Section not found: auth/missing-section',
     *   //   context: { slug: 'auth/missing-section', documentPath: '/api/guide.md' },
     *   //   suggestion: 'Section not found. Try checking parent section: auth'
     *   // }
     * }
     * ```
     *
     * @example Custom suggestion
     * ```typescript
     * const formatted = ToolIntegration.formatHierarchicalError(error, 'Check the document exists first');
     * // Uses provided suggestion instead of auto-generated one
     * ```
     */
    static formatHierarchicalError(error: AddressingError, suggestion?: string): {
        error: string;
        context?: unknown;
        suggestion?: string;
    };
    /**
     * Type guard to safely check if error context has section-specific properties
     *
     * Provides type-safe validation for error context structure before accessing properties.
     * Used internally by formatHierarchicalError for safe property access.
     *
     * @param context - Unknown context object to validate
     * @returns True if context has required section properties
     *
     * @example Type guard usage
     * ```typescript
     * if (ToolIntegration.hasSectionContext(error.context)) {
     *   // TypeScript now knows context has slug and documentPath properties
     *   const slug = error.context.slug;
     *   const docPath = error.context.documentPath;
     * }
     * ```
     */
    static hasSectionContext(context: unknown): context is {
        slug: string;
        documentPath: string;
    };
    /**
     * Clear batch cache after batch operations
     *
     * This helper provides a standardized way for tools to clear the batch cache
     * after completing multi-item operations. Clearing the cache frees memory
     * and ensures fresh parsing for the next batch.
     *
     * @example Clearing cache after batch section operations
     * ```typescript
     * // Process multiple section operations
     * for (const op of operations) {
     *   const { addresses } = ToolIntegration.validateAndParse({
     *     document: op.document,
     *     section: op.section
     *   });
     *   // ... process operation
     * }
     *
     * // Clear batch cache after all operations complete
     * ToolIntegration.clearBatchCache();
     * ```
     */
    static clearBatchCache(): void;
    /**
     * Common validation utilities to eliminate copy-paste patterns
     */
    /**
     * Validate document parameter - standard pattern used across tools
     *
     * Ensures document parameter is a non-empty string with consistent error messaging.
     *
     * @param document - Document parameter to validate
     * @returns Validated document string
     * @throws {AddressingError} When document is not a non-empty string
     *
     * @example Valid document
     * ```typescript
     * const doc = ToolIntegration.validateDocumentParameter('/api/auth.md');
     * // Returns: '/api/auth.md'
     * ```
     *
     * @example Invalid document
     * ```typescript
     * try {
     *   ToolIntegration.validateDocumentParameter('');
     * } catch (error) {
     *   // Throws: AddressingError with code 'INVALID_PARAMETER'
     * }
     * ```
     */
    static validateDocumentParameter(document: unknown): string;
    /**
     * Validate count limits with consistent error messages
     *
     * Validates that arrays don't exceed specified limits with standardized error messages.
     *
     * @param items - Array to validate count for
     * @param maxCount - Maximum allowed count
     * @param itemType - Type name for error messages
     * @throws {AddressingError} When count exceeds limit
     *
     * @example Valid count
     * ```typescript
     * ToolIntegration.validateCountLimit(['a', 'b'], 5, 'documents');
     * // Passes validation
     * ```
     *
     * @example Count limit exceeded
     * ```typescript
     * try {
     *   ToolIntegration.validateCountLimit(['a', 'b', 'c'], 2, 'documents');
     * } catch (error) {
     *   // Throws: AddressingError 'Too many documents. Maximum 2 documents allowed, got 3'
     * }
     * ```
     */
    static validateCountLimit(items: unknown[], maxCount: number, itemType: string): void;
    /**
     * Validate array parameter with type checking
     *
     * Validates and normalizes array parameters that can be strings or arrays.
     * Converts single strings to single-element arrays for consistent handling.
     *
     * @param param - Parameter to validate (string or array of strings)
     * @param paramName - Parameter name for error messages
     * @returns Normalized array of strings
     * @throws {AddressingError} When parameter is not string or array
     *
     * @example String parameter
     * ```typescript
     * const result = ToolIntegration.validateArrayParameter('single', 'documents');
     * // Returns: ['single']
     * ```
     *
     * @example Array parameter
     * ```typescript
     * const result = ToolIntegration.validateArrayParameter(['a', 'b'], 'documents');
     * // Returns: ['a', 'b']
     * ```
     *
     * @example Invalid parameter
     * ```typescript
     * try {
     *   ToolIntegration.validateArrayParameter(null, 'documents');
     * } catch (error) {
     *   // Throws: AddressingError 'documents parameter is required and must be a string or array of strings'
     * }
     * ```
     */
    static validateArrayParameter(param: unknown, paramName: string): string[];
    /**
     * Validate string parameter with consistent error handling
     *
     * Ensures parameter is a non-empty string with standardized error messages.
     * Prevents common validation inconsistencies across tools.
     *
     * @param param - Parameter to validate
     * @param paramName - Parameter name for error messages
     * @returns Validated string parameter
     * @throws {AddressingError} When parameter is not a non-empty string
     *
     * @example Valid string parameter
     * ```typescript
     * const operation = ToolIntegration.validateStringParameter('edit', 'operation');
     * // Returns: 'edit'
     * ```
     *
     * @example Invalid string parameter
     * ```typescript
     * try {
     *   ToolIntegration.validateStringParameter('', 'operation');
     * } catch (error) {
     *   // Throws: AddressingError with code 'INVALID_PARAMETER'
     * }
     * ```
     */
    static validateStringParameter(param: unknown, paramName: string): string;
    /**
     * Validate optional string parameter with consistent error handling
     *
     * Validates optional string parameters, returning undefined for null/undefined inputs.
     * Ensures non-empty strings when provided.
     *
     * @param param - Optional parameter to validate
     * @param paramName - Parameter name for error messages
     * @returns Validated string or undefined
     * @throws {AddressingError} When parameter is empty string or invalid type
     *
     * @example Valid optional parameter
     * ```typescript
     * const content = ToolIntegration.validateOptionalStringParameter('hello', 'content');
     * // Returns: 'hello'
     *
     * const content2 = ToolIntegration.validateOptionalStringParameter(undefined, 'content');
     * // Returns: undefined
     * ```
     */
    static validateOptionalStringParameter(param: unknown, paramName: string): string | undefined;
    /**
     * Validate operation parameter against allowed values
     *
     * Ensures operation parameter is one of the allowed values with consistent error messaging.
     * Prevents duplicate validation logic across tools.
     *
     * @param operation - Operation to validate
     * @param allowedOperations - Array of allowed operation values
     * @param toolName - Tool name for error context
     * @returns Validated operation string
     * @throws {AddressingError} When operation is not in allowed list
     *
     * @example Valid operation
     * ```typescript
     * const op = ToolIntegration.validateOperation('edit', ['list', 'create', 'edit'], 'task');
     * // Returns: 'edit'
     * ```
     *
     * @example Invalid operation
     * ```typescript
     * try {
     *   ToolIntegration.validateOperation('invalid', ['list', 'create'], 'task');
     * } catch (error) {
     *   // Throws: AddressingError 'Invalid operation: invalid. Must be one of: list, create'
     * }
     * ```
     */
    static validateOperation(operation: unknown, allowedOperations: readonly string[], toolName: string): string;
}
export {};
//# sourceMappingURL=addressing-system.d.ts.map