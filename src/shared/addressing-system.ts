/**
 * Central addressing system for consistent document/section/task addressing
 *
 * This module provides unified addressing patterns to prevent inconsistencies
 * across the codebase in how documents, sections, and tasks are referenced.
 *
 * Key Features:
 * - Type-safe addressing with validation
 * - Flexible input format support (#slug, slug, /doc.md#slug)
 * - Performance caching for repeated operations
 * - Comparison utilities for address equality
 * - Standard tool integration patterns
 * - Comprehensive error handling
 */

import { pathToNamespace, pathToSlug } from './path-utilities.js';
import { normalizeSlugPath } from './slug-utils.js';

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
export class AddressingError extends Error {
  constructor(message: string, public code: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'AddressingError';
  }
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
export class DocumentNotFoundError extends AddressingError {
  constructor(path: string) {
    super(`Document not found: ${path}`, 'DOCUMENT_NOT_FOUND', { path });
  }
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
export class SectionNotFoundError extends AddressingError {
  constructor(slug: string, documentPath: string) {
    super(`Section not found: ${slug} in ${documentPath}`, 'SECTION_NOT_FOUND', { slug, documentPath });
  }
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
export class InvalidAddressError extends AddressingError {
  constructor(address: string, reason: string) {
    super(`Invalid address: ${address} - ${reason}`, 'INVALID_ADDRESS', { address, reason });
  }
}

/**
 * Cache configuration constants
 */
const DEFAULT_ADDRESS_CACHE_SIZE = 1000; // Chosen for high-traffic MCP server operations with document/section reuse

/**
 * Cache configuration interface for different eviction strategies
 */
interface CacheConfig {
  readonly maxSize: number;
  readonly evictionStrategy?: 'lru';
}

/**
 * Cache factory for creating configurable address caches
 */
class CacheFactory {
  static createCache(config: CacheConfig = { maxSize: DEFAULT_ADDRESS_CACHE_SIZE }): AddressCache {
    return new AddressCache(config);
  }
}

/**
 * Address parsing cache for performance optimization with proper LRU implementation
 */
class AddressCache {
  private readonly documentCache = new Map<string, DocumentAddress>();
  private readonly sectionCache = new Map<string, SectionAddress>();
  private readonly maxSize: number;

  constructor(config: CacheConfig) {
    this.maxSize = config.maxSize;
  }

  getDocument(path: string): DocumentAddress | undefined {
    const address = this.documentCache.get(path);
    if (address != null) {
      // Touch for LRU: re-insert to maintain access order
      this.touch(this.documentCache, path, address);
    }
    return address;
  }

  setDocument(path: string, address: DocumentAddress): void {
    if (this.documentCache.size >= this.maxSize && !this.documentCache.has(path)) {
      // Proper LRU: remove least recently used (first in iteration order)
      const firstKey = this.documentCache.keys().next().value;
      if (firstKey != null) {
        this.documentCache.delete(firstKey);
      }
    }
    this.documentCache.set(path, address);
  }

  getSection(key: string): SectionAddress | undefined {
    const address = this.sectionCache.get(key);
    if (address != null) {
      // Touch for LRU: re-insert to maintain access order
      this.touch(this.sectionCache, key, address);
    }
    return address;
  }

  setSection(key: string, address: SectionAddress): void {
    if (this.sectionCache.size >= this.maxSize && !this.sectionCache.has(key)) {
      // Proper LRU: remove least recently used (first in iteration order)
      const firstKey = this.sectionCache.keys().next().value;
      if (firstKey != null) {
        this.sectionCache.delete(firstKey);
      }
    }
    this.sectionCache.set(key, address);
  }

  /**
   * Touch method to maintain true LRU order by re-inserting accessed items
   */
  private touch<T>(cache: Map<string, T>, key: string, value: T): void {
    cache.delete(key);
    cache.set(key, value);
  }

  clear(): void {
    this.documentCache.clear();
    this.sectionCache.clear();
  }

  /**
   * Invalidate all cached addresses for a specific document
   * This should be called when a document changes to ensure cache consistency
   */
  invalidateDocument(docPath: string): void {
    // Remove the document itself
    this.documentCache.delete(docPath);

    // Remove all sections that belong to this document
    // Section cache keys can be either hierarchical (docPath#section) or flat (section)
    // We need to remove entries that reference this document
    const keysToRemove: string[] = [];
    for (const [key, address] of this.sectionCache.entries()) {
      if (address.document.path === docPath) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.sectionCache.delete(key);
    }
  }

  getDocumentCacheSize(): number {
    return this.documentCache.size;
  }

  getSectionCacheSize(): number {
    return this.sectionCache.size;
  }

  getMaxSize(): number {
    return this.maxSize;
  }
}

const cache = CacheFactory.createCache();

/**
 * Invalidate addressing cache entries for a specific document
 * This should be called when a document changes to maintain cache consistency
 */
export function invalidateAddressCache(docPath: string): void {
  cache.invalidateDocument(docPath);
}

/**
 * Core addressing interfaces
 */
export interface DocumentAddress {
  /** Full document path starting with / */
  readonly path: string;
  /** Document slug (filename without extension) */
  readonly slug: string;
  /** Document namespace (folder path or 'root') */
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
 */
export function parseDocumentAddress(docPath: string): DocumentAddress {
  if (typeof docPath !== 'string') {
    throw new InvalidAddressError(String(docPath), 'Document path must be a string');
  }

  // Check cache first
  const cached = cache.getDocument(docPath);
  if (cached != null) {
    return cached;
  }

  // Validate input
  if (docPath.trim() === '') {
    throw new InvalidAddressError(docPath, 'Document path cannot be empty');
  }

  // Normalize path - ensure it starts with /
  const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;

  // Validate normalized path
  if (!normalizedPath.endsWith('.md')) {
    throw new InvalidAddressError(normalizedPath, 'Document path must end with .md');
  }

  // Create address
  const address: DocumentAddress = {
    path: normalizedPath,
    slug: pathToSlug(normalizedPath),
    namespace: pathToNamespace(normalizedPath),
    normalizedPath,
    cacheKey: normalizedPath
  };

  // Cache and return
  cache.setDocument(docPath, address);
  return address;
}

/**
 * Normalize a hierarchical slug by removing # prefix and normalizing path components
 *
 * @param slug - Raw slug that may contain hierarchical paths
 * @returns Normalized hierarchical slug
 */
function normalizeHierarchicalSlug(slug: string): string {
  // Remove # prefix if present
  let normalized = slug.startsWith('#') ? slug.substring(1) : slug;

  // Normalize hierarchical path components
  if (normalized.includes('/')) {
    normalized = normalizeSlugPath(normalized);
  }

  return normalized;
}

/**
 * Parse and normalize a section reference with caching
 * Supports formats: "section", "#section", "/doc.md#section"
 */
export function parseSectionAddress(sectionRef: string, contextDoc?: string): SectionAddress {
  // Input validation - early return for invalid type
  if (typeof sectionRef !== 'string') {
    throw new InvalidAddressError(String(sectionRef), 'Section reference must be a string');
  }

  // Check cache first - early return if cached
  const cacheKey = `${sectionRef}|${contextDoc ?? ''}`;
  const cached = cache.getSection(cacheKey);
  if (cached != null) {
    return cached;
  }

  // Parse section reference into document path and section slug
  const { documentPath, sectionSlug } = parseSectionReference(sectionRef, contextDoc);

  // Normalize slug - early validation for empty slug
  const normalizedSlug = normalizeHierarchicalSlug(sectionSlug);
  if (normalizedSlug === '') {
    throw new InvalidAddressError(sectionRef, 'Section slug cannot be empty');
  }

  // Build and cache section address
  const document = parseDocumentAddress(documentPath);
  const address: SectionAddress = {
    document,
    slug: normalizedSlug,
    fullPath: `${document.path}#${normalizedSlug}`,
    cacheKey
  };

  cache.setSection(cacheKey, address);
  return address;
}

/**
 * Parse section reference string into document path and section slug
 * Handles three formats: "section", "#section", "/doc.md#section"
 */
function parseSectionReference(
  sectionRef: string,
  contextDoc?: string
): { documentPath: string; sectionSlug: string } {
  // Format detection: does reference include # separator?
  if (!sectionRef.includes('#')) {
    // Format: "section" - requires context document
    if (contextDoc == null || contextDoc === '') {
      throw new InvalidAddressError(sectionRef, 'Section reference requires context document or full path');
    }
    return {
      documentPath: contextDoc,
      sectionSlug: sectionRef
    };
  }

  // Format: "/doc.md#section" or "#section"
  const [docPart, ...slugParts] = sectionRef.split('#');
  const sectionSlug = slugParts.join('#'); // Handle edge case of multiple # in slug

  // Check if document part is empty (indicates #section format)
  if (docPart === '' || docPart == null) {
    // Format: "#section" - requires context document
    if (contextDoc == null || contextDoc === '') {
      throw new InvalidAddressError(sectionRef, 'Section reference "#section" requires context document');
    }
    return {
      documentPath: contextDoc,
      sectionSlug
    };
  }

  // Format: "/doc.md#section" - document path provided
  return {
    documentPath: docPart,
    sectionSlug
  };
}

/**
 * Parse and normalize a task reference with caching
 * Tasks are special sections that live under a "Tasks" parent section
 */
export function parseTaskAddress(taskRef: string, contextDoc?: string): TaskAddress {
  // Parse as a section first
  const sectionAddr = parseSectionAddress(taskRef, contextDoc);

  const address: TaskAddress = {
    document: sectionAddr.document,
    slug: sectionAddr.slug,
    fullPath: sectionAddr.fullPath,
    isTask: true,
    cacheKey: `task:${sectionAddr.cacheKey}`
  };

  return address;
}

/**
 * Check if a section is a task by looking at document structure
 */
export async function isTaskSection(
  sectionSlug: string,
  document: { headings: Array<{ slug: string; title: string; depth: number }> }
): Promise<boolean> {
  // Find Tasks section
  const tasksSection = document.headings.find(h =>
    h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
  );

  if (tasksSection == null) return false;

  // Check if this section is a child of Tasks section
  const tasksIndex = document.headings.findIndex(h => h.slug === tasksSection.slug);
  const sectionIndex = document.headings.findIndex(h => h.slug === sectionSlug);

  if (tasksIndex === -1 || sectionIndex === -1 || sectionIndex <= tasksIndex) {
    return false;
  }

  // Check depth - should be immediate child of Tasks
  const section = document.headings[sectionIndex];
  return section != null && section.depth === tasksSection.depth + 1;
}

/**
 * Standardize addressing parameters for tool operations
 */
export interface StandardizedParams {
  document: DocumentAddress;
  section?: SectionAddress;
  task?: TaskAddress;
}

/**
 * Parse common tool parameters into standardized addresses
 */
function standardizeToolParams(params: {
  document: string;
  section?: string;
  task?: string;
}): StandardizedParams {
  const document = parseDocumentAddress(params.document);

  const result: StandardizedParams = { document };

  if (params.section != null && params.section !== '') {
    result.section = parseSectionAddress(params.section, document.path);
  }

  if (params.task != null && params.task !== '') {
    result.task = parseTaskAddress(params.task, document.path);
  }

  return result;
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
export class ToolIntegration {
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
   * @example Basic document validation
   * ```typescript
   * const { addresses } = ToolIntegration.validateAndParse({
   *   document: '/api/auth.md'
   * });
   * // Returns: { addresses: { document: DocumentAddress }, params: {...} }
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
  static validateAndParse<T extends Record<string, unknown>>(
    params: T & { document: string; section?: string; task?: string }
  ): { addresses: StandardizedParams; params: T } {
    try {
      const addresses = standardizeToolParams({
        document: params.document,
        ...(params.section != null && { section: params.section }),
        ...(params.task != null && { task: params.task })
      });

      return { addresses, params };
    } catch (error) {
      if (error instanceof AddressingError) {
        throw error;
      }
      throw new AddressingError(
        `Parameter validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'PARAMETER_VALIDATION_ERROR',
        { params }
      );
    }
  }

  /**
   * Standard document info response format
   *
   * Provides consistent document information structure across all tools.
   *
   * @param document - Document address object
   * @param metadata - Optional metadata containing document title
   * @returns Standardized document info object
   *
   * @example Basic document info
   * ```typescript
   * const docInfo = ToolIntegration.formatDocumentInfo(document);
   * // Returns: { slug: 'auth', title: 'auth', namespace: 'api' }
   * ```
   *
   * @example With metadata title
   * ```typescript
   * const docInfo = ToolIntegration.formatDocumentInfo(document, { title: 'Authentication Guide' });
   * // Returns: { slug: 'auth', title: 'Authentication Guide', namespace: 'api' }
   * ```
   */
  static formatDocumentInfo(document: DocumentAddress, metadata?: { title: string }): {
    slug: string;
    title: string;
    namespace: string;
  } {
    return {
      slug: document.slug,
      title: metadata?.title ?? document.slug,
      namespace: document.namespace
    };
  }

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
  static formatSectionPath(section: SectionAddress): string {
    const path = section.fullPath;
    return section.slug.includes('/') ? `${path} (hierarchical)` : path;
  }

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
  static formatTaskPath(task: TaskAddress): string {
    return `${task.fullPath} (task)`;
  }

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
  static formatHierarchicalContext(section: SectionAddress): HierarchicalContext | null {
    if (!section.slug.includes('/')) {
      return null;
    }

    const parts = section.slug.split('/');
    return {
      full_path: section.slug,
      parent_path: parts.slice(0, -1).join('/'),
      section_name: parts[parts.length - 1] ?? '',
      depth: parts.length
    };
  }

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
  static formatHierarchicalError(
    error: AddressingError,
    suggestion?: string
  ): { error: string; context?: unknown; suggestion?: string } {
    const result: { error: string; context?: unknown; suggestion?: string } = {
      error: error.message
    };

    if (error.context != null) {
      result.context = error.context;
    }

    // Add hierarchical-aware suggestions with proper type safety
    if (error instanceof SectionNotFoundError && error.context != null) {
      if (ToolIntegration.hasSectionContext(error.context)) {
        const slug = error.context.slug;
        if (slug.includes('/')) {
          const parentPath = slug.split('/').slice(0, -1).join('/');
          result.suggestion = suggestion ?? `Section not found. Try checking parent section: ${parentPath}`;
        } else if (suggestion != null) {
          result.suggestion = suggestion;
        }
      } else if (suggestion != null) {
        result.suggestion = suggestion;
      }
    } else if (suggestion != null) {
      result.suggestion = suggestion;
    }

    return result;
  }

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
  static hasSectionContext(context: unknown): context is { slug: string; documentPath: string } {
    return (
      context != null &&
      typeof context === 'object' &&
      'slug' in context &&
      'documentPath' in context &&
      typeof context.slug === 'string' &&
      typeof context.documentPath === 'string'
    );
  }

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
  static validateDocumentParameter(document: unknown): string {
    if (typeof document !== 'string' || document === '') {
      throw new AddressingError('document parameter is required and must be a non-empty string', 'INVALID_PARAMETER');
    }
    return document;
  }

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
  static validateCountLimit(items: unknown[], maxCount: number, itemType: string): void {
    if (items.length > maxCount) {
      throw new AddressingError(
        `Too many ${itemType}. Maximum ${maxCount} ${itemType} allowed, got ${items.length}`,
        `TOO_MANY_${itemType.toUpperCase()}`
      );
    }
  }

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
  static validateArrayParameter(param: unknown, paramName: string): string[] {
    if (param == null || (typeof param !== 'string' && !Array.isArray(param))) {
      throw new AddressingError(
        `${paramName} parameter is required and must be a string or array of strings`,
        'INVALID_PARAMETER'
      );
    }
    return Array.isArray(param) ? param as string[] : [param as string];
  }

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
  static validateStringParameter(param: unknown, paramName: string): string {
    if (typeof param !== 'string' || param.trim() === '') {
      throw new AddressingError(
        `${paramName} parameter is required and must be a non-empty string`,
        'INVALID_PARAMETER'
      );
    }
    return param.trim();
  }

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
  static validateOptionalStringParameter(param: unknown, paramName: string): string | undefined {
    if (param == null || param === '') {
      return undefined;
    }
    if (typeof param !== 'string') {
      throw new AddressingError(
        `${paramName} parameter must be a string when provided`,
        'INVALID_PARAMETER'
      );
    }
    return param.trim();
  }

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
  static validateOperation(operation: unknown, allowedOperations: readonly string[], toolName: string): string {
    if (typeof operation !== 'string' || !allowedOperations.includes(operation)) {
      throw new AddressingError(
        `Invalid operation: ${String(operation)}. Must be one of: ${allowedOperations.join(', ')}`,
        'INVALID_OPERATION',
        { operation, allowedOperations, toolName }
      );
    }
    return operation;
  }

  /**
   * Standard error response formatter for tool consistency
   *
   * Creates consistent error response objects across all tools. Standardizes on returning
   * error objects rather than throwing exceptions for better MCP client experience.
   *
   * @param error - Error to format (AddressingError or generic Error)
   * @param toolName - Name of the tool that encountered the error
   * @param suggestion - Optional suggestion for error recovery
   * @returns Standardized error response object
   *
   * @example AddressingError formatting
   * ```typescript
   * try {
   *   // Some operation that throws AddressingError
   * } catch (error) {
   *   if (error instanceof AddressingError) {
   *     return ToolIntegration.formatErrorResponse(error, 'section', 'Check document exists');
   *   }
   *   throw error;
   * }
   * // Returns: {
   * //   error: "Section not found: overview",
   * //   error_code: "SECTION_NOT_FOUND",
   * //   tool: "section",
   * //   context: { slug: "overview", documentPath: "/api/auth.md" },
   * //   suggestion: "Check document exists"
   * // }
   * ```
   */
  static formatErrorResponse(
    error: AddressingError | Error,
    toolName: string,
    suggestion?: string
  ): {
    error: string;
    error_code: string;
    tool: string;
    context?: Record<string, unknown>;
    suggestion?: string;
  } {
    const response: {
      error: string;
      error_code: string;
      tool: string;
      context?: Record<string, unknown>;
      suggestion?: string;
    } = {
      error: error.message,
      error_code: error instanceof AddressingError ? error.code : 'TOOL_ERROR',
      tool: toolName
    };

    // Add context for AddressingError instances
    if (error instanceof AddressingError && error.context != null) {
      response.context = error.context;
    }

    // Add suggestion
    if (suggestion != null) {
      response.suggestion = suggestion;
    }

    return response;
  }

  /**
   * Standard success response wrapper for tool consistency
   *
   * Creates consistent success response structure across all tools. Provides standardized
   * metadata and ensures consistent field naming conventions.
   *
   * @param data - Tool-specific response data
   * @param toolName - Name of the tool generating the response
   * @param metadata - Optional metadata (timing, counts, etc.)
   * @returns Standardized success response object
   *
   * @example Standard success response
   * ```typescript
   * const result = await someOperation();
   * return ToolIntegration.formatSuccessResponse(
   *   { sections: result.sections, content: result.content },
   *   'section',
   *   { operation_count: 1, processing_time_ms: 45 }
   * );
   * // Returns: {
   * //   success: true,
   * //   tool: "section",
   * //   data: { sections: [...], content: "..." },
   * //   metadata: { operation_count: 1, processing_time_ms: 45, timestamp: "2025-09-27T..." }
   * // }
   * ```
   */
  static formatSuccessResponse<T extends Record<string, unknown>>(
    data: T,
    toolName: string,
    metadata?: Record<string, unknown>
  ): {
    success: true;
    tool: string;
    data: T;
    metadata: Record<string, unknown>;
  } {
    return {
      success: true,
      tool: toolName,
      data,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Batch error handler for consistent multi-operation error reporting
   *
   * Handles errors from batch operations consistently across tools. Returns partial
   * success information when some operations succeed and others fail.
   *
   * @param errors - Array of errors encountered during batch operations
   * @param successes - Number of successful operations
   * @param toolName - Name of the tool handling the batch
   * @returns Standardized batch error response
   *
   * @example Batch error handling
   * ```typescript
   * const errors = [
   *   { index: 1, error: new SectionNotFoundError('missing', '/doc.md') },
   *   { index: 3, error: new AddressingError('Invalid content', 'INVALID_CONTENT') }
   * ];
   * return ToolIntegration.formatBatchErrorResponse(errors, 2, 'section');
   * // Returns: {
   * //   success: false,
   * //   tool: "section",
   * //   partial_success: { successful_operations: 2, failed_operations: 2 },
   * //   errors: [ ... ],
   * //   suggestion: "Review failed operations and retry individually"
   * // }
   * ```
   */
  static formatBatchErrorResponse(
    errors: Array<{ index: number; error: AddressingError | Error }>,
    successes: number,
    toolName: string
  ): {
    success: false;
    tool: string;
    partial_success: { successful_operations: number; failed_operations: number };
    errors: Array<{ index: number; error: string; error_code: string; context?: Record<string, unknown> }>;
    suggestion: string;
  } {
    return {
      success: false,
      tool: toolName,
      partial_success: {
        successful_operations: successes,
        failed_operations: errors.length
      },
      errors: errors.map(({ index, error }) => ({
        index,
        error: error.message,
        error_code: error instanceof AddressingError ? error.code : 'TOOL_ERROR',
        ...(error instanceof AddressingError && error.context && { context: error.context })
      })),
      suggestion: 'Review failed operations and retry individually'
    };
  }
}

