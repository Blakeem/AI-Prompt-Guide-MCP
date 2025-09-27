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

/**
 * Custom error types for addressing system
 */
export class AddressingError extends Error {
  constructor(message: string, public code: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'AddressingError';
  }
}

export class DocumentNotFoundError extends AddressingError {
  constructor(path: string) {
    super(`Document not found: ${path}`, 'DOCUMENT_NOT_FOUND', { path });
  }
}

export class SectionNotFoundError extends AddressingError {
  constructor(slug: string, documentPath: string) {
    super(`Section not found: ${slug} in ${documentPath}`, 'SECTION_NOT_FOUND', { slug, documentPath });
  }
}

export class InvalidAddressError extends AddressingError {
  constructor(address: string, reason: string) {
    super(`Invalid address: ${address} - ${reason}`, 'INVALID_ADDRESS', { address, reason });
  }
}

/**
 * Address parsing cache for performance optimization
 */
class AddressCache {
  private readonly documentCache = new Map<string, DocumentAddress>();
  private readonly sectionCache = new Map<string, SectionAddress>();
  private readonly maxSize = 1000;

  getDocument(path: string): DocumentAddress | undefined {
    return this.documentCache.get(path);
  }

  setDocument(path: string, address: DocumentAddress): void {
    if (this.documentCache.size >= this.maxSize) {
      // Simple LRU: remove oldest entry
      const firstKey = this.documentCache.keys().next().value;
      if (firstKey != null) {
        this.documentCache.delete(firstKey);
      }
    }
    this.documentCache.set(path, address);
  }

  getSection(key: string): SectionAddress | undefined {
    return this.sectionCache.get(key);
  }

  setSection(key: string, address: SectionAddress): void {
    if (this.sectionCache.size >= this.maxSize) {
      // Simple LRU: remove oldest entry
      const firstKey = this.sectionCache.keys().next().value;
      if (firstKey != null) {
        this.sectionCache.delete(firstKey);
      }
    }
    this.sectionCache.set(key, address);
  }

  clear(): void {
    this.documentCache.clear();
    this.sectionCache.clear();
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

const cache = new AddressCache();

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
async function normalizeHierarchicalSlug(slug: string): Promise<string> {
  // Remove # prefix if present
  let normalized = slug.startsWith('#') ? slug.substring(1) : slug;

  // Normalize hierarchical path components
  if (normalized.includes('/')) {
    const { normalizeSlugPath } = await import('./slug-utils.js');
    normalized = normalizeSlugPath(normalized);
  }

  return normalized;
}

/**
 * Parse and normalize a section reference with caching
 * Supports formats: "section", "#section", "/doc.md#section"
 */
export async function parseSectionAddress(sectionRef: string, contextDoc?: string): Promise<SectionAddress> {
  if (typeof sectionRef !== 'string') {
    throw new InvalidAddressError(String(sectionRef), 'Section reference must be a string');
  }

  // Create cache key
  const cacheKey = `${sectionRef}|${contextDoc ?? ''}`;
  const cached = cache.getSection(cacheKey);
  if (cached != null) {
    return cached;
  }

  let documentPath: string;
  let sectionSlug: string;

  if (sectionRef.includes('#')) {
    // Format: "/doc.md#section" or "#section"
    const [docPart, ...slugParts] = sectionRef.split('#');
    sectionSlug = slugParts.join('#'); // Handle edge case of multiple # in slug

    if (docPart === '' || docPart == null) {
      // Format: "#section" - use context document
      if (contextDoc == null || contextDoc === '') {
        throw new InvalidAddressError(sectionRef, 'Section reference "#section" requires context document');
      }
      documentPath = contextDoc;
    } else {
      // Format: "/doc.md#section"
      documentPath = docPart;
    }
  } else {
    // Format: "section" - use context document
    if (contextDoc == null || contextDoc === '') {
      throw new InvalidAddressError(sectionRef, 'Section reference requires context document or full path');
    }
    documentPath = contextDoc;
    sectionSlug = sectionRef;
  }

  // Enhanced slug normalization for hierarchical paths
  const normalizedSlug = await normalizeHierarchicalSlug(sectionSlug);

  if (normalizedSlug === '') {
    throw new InvalidAddressError(sectionRef, 'Section slug cannot be empty');
  }

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
 * Parse and normalize a task reference with caching
 * Tasks are special sections that live under a "Tasks" parent section
 */
export async function parseTaskAddress(taskRef: string, contextDoc?: string): Promise<TaskAddress> {
  // Parse as a section first
  const sectionAddr = await parseSectionAddress(taskRef, contextDoc);

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
async function standardizeToolParams(params: {
  document: string;
  section?: string;
  task?: string;
}): Promise<StandardizedParams> {
  const document = parseDocumentAddress(params.document);

  const result: StandardizedParams = { document };

  if (params.section != null && params.section !== '') {
    result.section = await parseSectionAddress(params.section, document.path);
  }

  if (params.task != null && params.task !== '') {
    result.task = await parseTaskAddress(params.task, document.path);
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
 */
export class ToolIntegration {
  /**
   * Standard parameter validation and parsing for document-based tools
   */
  static async validateAndParse<T extends Record<string, unknown>>(
    params: T & { document: string; section?: string; task?: string }
  ): Promise<{ addresses: StandardizedParams; params: T }> {
    try {
      const addresses = await standardizeToolParams({
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
   */
  static formatSectionPath(section: SectionAddress): string {
    const path = section.fullPath;
    return section.slug.includes('/') ? `${path} (hierarchical)` : path;
  }

  /**
   * Standard task path formatting for responses
   */
  static formatTaskPath(task: TaskAddress): string {
    return `${task.fullPath} (task)`;
  }

  /**
   * Format hierarchical context for section addresses
   * Returns null for flat sections, detailed context for hierarchical
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

    // Add hierarchical-aware suggestions
    if (error instanceof SectionNotFoundError && error.context != null) {
      const slug = error.context['slug'] as string;
      if (typeof slug === 'string' && slug.includes('/')) {
        const parentPath = slug.split('/').slice(0, -1).join('/');
        result.suggestion = suggestion ?? `Section not found. Try checking parent section: ${parentPath}`;
      } else if (suggestion != null) {
        result.suggestion = suggestion;
      }
    } else if (suggestion != null) {
      result.suggestion = suggestion;
    }

    return result;
  }
}

