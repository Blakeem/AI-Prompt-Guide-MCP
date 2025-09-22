/**
 * Link parsing and resolution utilities for the Document Linking System
 */

import type {
  ParsedLink,
  LinkValidation,
  LinkResolution,
  LinkOptions,
  LinkContext
} from '../types/linking.js';
import type { DocumentManager } from '../document-manager.js';

/**
 * Parse a link reference into structured components
 *
 * Handles formats:
 * - Cross-document: @/path/doc.md#section
 * - Within-document: @#section
 * - External: https://example.com (no @ prefix)
 */
export function parseLink(linkText: string, currentDocPath?: string): ParsedLink {
  // Input validation
  if (typeof linkText !== 'string') {
    return {
      type: 'external',
      raw: linkText
    };
  }

  const trimmed = linkText.trim();
  if (trimmed === '') {
    return {
      type: 'external',
      raw: linkText
    };
  }

  // External links (no @ prefix)
  if (!trimmed.startsWith('@')) {
    return {
      type: 'external',
      raw: linkText
    };
  }

  // Remove @ prefix for processing
  const linkContent = trimmed.slice(1);

  // Within-document links (@#section)
  if (linkContent.startsWith('#')) {
    const section = linkContent.slice(1); // Remove # prefix
    const result: ParsedLink = {
      type: 'within-doc',
      raw: linkText
    };

    if (section !== '') {
      result.section = section;
    }

    if (currentDocPath != null) {
      result.document = currentDocPath;
    }

    return result;
  }

  // Cross-document links (@/path/doc.md or @/path/doc.md#section)
  const hashIndex = linkContent.indexOf('#');

  if (hashIndex === -1) {
    // No section specified (@/path/doc.md)
    const result: ParsedLink = {
      type: 'cross-doc',
      raw: linkText
    };

    if (linkContent !== '') {
      result.document = linkContent;
    }

    return result;
  }

  // Section specified (@/path/doc.md#section)
  const documentPath = linkContent.slice(0, hashIndex);
  const sectionPath = linkContent.slice(hashIndex + 1);

  const result: ParsedLink = {
    type: 'cross-doc',
    raw: linkText
  };

  if (documentPath !== '') {
    result.document = documentPath;
  }

  if (sectionPath !== '') {
    result.section = sectionPath;
  }

  return result;
}

/**
 * Resolve a parsed link to an absolute path
 *
 * Converts relative links to absolute paths and resolves within-doc references
 */
export function resolveLink(link: ParsedLink, currentDocPath: string): string {
  // Input validation
  if (typeof currentDocPath !== 'string' || currentDocPath.trim() === '') {
    throw new Error('Current document path is required for link resolution');
  }

  const normalizedCurrentPath = normalizePath(currentDocPath);

  // External links return as-is
  if (link.type === 'external') {
    return link.raw;
  }

  // Within-document links
  if (link.type === 'within-doc') {
    if (link.section != null && link.section !== '') {
      return `${normalizedCurrentPath}#${link.section}`;
    }
    return normalizedCurrentPath;
  }

  // Cross-document links
  if (link.type === 'cross-doc') {
    if (link.document == null || link.document === '') {
      throw new Error('Cross-document link missing document path');
    }

    const normalizedDocPath = normalizePath(link.document);

    if (link.section != null && link.section !== '') {
      return `${normalizedDocPath}#${link.section}`;
    }
    return normalizedDocPath;
  }

  throw new Error(`Unknown link type: ${link.type}`);
}

/**
 * Validate that a link target exists and is accessible
 */
export async function validateLink(
  linkPath: string,
  manager: DocumentManager
): Promise<LinkValidation> {
  // Input validation
  if (typeof linkPath !== 'string' || linkPath.trim() === '') {
    return {
      valid: false,
      error: 'Link path cannot be empty',
      suggestion: 'Provide a valid document path'
    };
  }

  const trimmed = linkPath.trim();

  // External links are considered valid (we don't validate external URLs)
  if (isExternalLink(trimmed)) {
    return {
      valid: true
    };
  }

  // Parse the link to separate document and section
  const hashIndex = trimmed.indexOf('#');
  const documentPath = hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex);
  const sectionSlug = hashIndex === -1 ? undefined : trimmed.slice(hashIndex + 1);

  // Validate document existence
  let documentExists = false;
  let document = null;

  try {
    document = await manager.getDocument(documentPath);
    documentExists = document != null;
  } catch (error) {
    return {
      valid: false,
      documentExists: false,
      error: `Failed to check document: ${error instanceof Error ? error.message : String(error)}`,
      suggestion: `Verify the document path: ${documentPath}`
    };
  }

  // If document doesn't exist, link is invalid
  if (!documentExists) {
    return {
      valid: false,
      documentExists: false,
      error: `Document not found: ${documentPath}`,
      suggestion: `Check the document path and ensure the file exists`
    };
  }

  // If no section specified, link is valid (document exists)
  if (sectionSlug == null || sectionSlug === '') {
    return {
      valid: true,
      documentExists: true
    };
  }

  // Validate section existence
  let sectionExists = false;

  try {
    if (document != null) {
      sectionExists = document.headings.some(heading => heading.slug === sectionSlug);
    }
  } catch (error) {
    return {
      valid: false,
      documentExists: true,
      sectionExists: false,
      error: `Failed to check section: ${error instanceof Error ? error.message : String(error)}`,
      suggestion: `Verify the section slug: ${sectionSlug}`
    };
  }

  if (!sectionExists) {
    // Provide helpful suggestions for section names
    const availableSections = document?.headings.map(h => h.slug) ?? [];
    const suggestion = availableSections.length > 0
      ? `Available sections: ${availableSections.slice(0, 5).join(', ')}`
      : 'No sections found in document';

    return {
      valid: false,
      documentExists: true,
      sectionExists: false,
      error: `Section not found: ${sectionSlug}`,
      suggestion
    };
  }

  return {
    valid: true,
    documentExists: true,
    sectionExists: true
  };
}

/**
 * Simple boolean check for link validity (convenience wrapper)
 */
export async function linkExists(
  linkPath: string,
  manager: DocumentManager
): Promise<boolean> {
  try {
    const validation = await validateLink(linkPath, manager);
    return validation.valid;
  } catch {
    return false;
  }
}

/**
 * Resolve a link with full validation and context loading
 */
export async function resolveLinkWithContext(
  linkText: string,
  currentDocPath: string,
  manager: DocumentManager,
  options: LinkOptions = {}
): Promise<LinkResolution> {
  // Parse the link
  const parsed = parseLink(linkText, currentDocPath);

  // Resolve to absolute path
  let resolvedPath: string;
  try {
    resolvedPath = resolveLink(parsed, currentDocPath);
  } catch (error) {
    const validation: LinkValidation = {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };

    return {
      parsed,
      validation,
      resolvedPath: linkText
    };
  }

  // Validate the link
  const validation = await validateLink(resolvedPath, manager);

  // Load context if requested and validation passed
  let context: LinkContext | undefined;
  if (options.includeSuggestions === true && validation.valid) {
    try {
      context = await loadLinkContext(
        resolvedPath,
        currentDocPath,
        manager,
        options
      );
    } catch (error) {
      // Context loading failure doesn't invalidate the link
      console.warn('Failed to load link context:', error);
    }
  }

  const result: LinkResolution = {
    parsed,
    validation,
    resolvedPath
  };

  if (context != null) {
    result.context = context;
  }

  return result;
}

/**
 * Load context information for a resolved link
 */
async function loadLinkContext(
  _resolvedPath: string,
  _currentDocPath: string,
  _manager: DocumentManager,
  _options: LinkOptions
): Promise<LinkContext> {
  // Implementation placeholder for Phase 4
  // This would load linked document content, suggestions, etc.
  return {
    primaryDocument: _currentDocPath,
    linkedDocuments: [],
    suggestions: []
  };
}

/**
 * Check if a link is external (doesn't start with @ or /)
 */
function isExternalLink(linkPath: string): boolean {
  return !linkPath.startsWith('@') &&
         !linkPath.startsWith('/') &&
         (linkPath.includes('://') || linkPath.includes('www.'));
}

/**
 * Normalize a path by ensuring it starts with / and removing redundant slashes
 */
function normalizePath(path: string): string {
  if (typeof path !== 'string') {
    return '/';
  }

  let normalized = path.trim();

  // Ensure path starts with /
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // Remove duplicate slashes
  normalized = normalized.replace(/\/+/g, '/');

  // Remove trailing slash unless it's the root
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}