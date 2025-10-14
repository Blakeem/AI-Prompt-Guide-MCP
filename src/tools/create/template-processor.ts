/**
 * Template processor for create-document pipeline
 * Handles template processing and content generation
 */

import type { DocumentManager } from '../../document-manager.js';
import { parseDocumentAddress, AddressingError } from '../../shared/addressing-system.js';

/**
 * Template processing result
 */
export interface TemplateProcessingResult {
  content: string;
  slug: string;
  docPath: string;
}

/**
 * Template processing error
 */
export interface TemplateProcessingError {
  error: string;
  details: string;
  provided_namespace: string;
}

/**
 * Blank document template with title, overview, and TOC placeholder
 */
const BLANK_TEMPLATE = `# {{title}}

{{overview}}

## Table of Contents
[TOC will be auto-generated]`;

/**
 * Process template content with variable substitution
 * Generates a blank document with title, overview, and TOC placeholder
 */
export async function processTemplate(
  namespace: string,
  title: string,
  overview: string,
  _manager: DocumentManager
): Promise<TemplateProcessingResult | TemplateProcessingError> {
  try {
    // Import slug utilities
    const { titleToSlug } = await import('../../slug.js');
    const { PATH_PREFIXES } = await import('../../shared/namespace-constants.js');

    // Generate path from title and namespace
    const slug = titleToSlug(title);

    // Prepend /docs/ prefix if not already present (coordinator namespace is explicit)
    const normalizedNamespace = namespace.startsWith('coordinator')
      ? PATH_PREFIXES.COORDINATOR.slice(1, -1) // Remove leading and trailing slashes
      : `${PATH_PREFIXES.DOCS.slice(1)}${namespace}`; // /docs/ + namespace

    const docPath = `/${normalizedNamespace}/${slug}.md`;

    // Validate the generated document path using addressing system
    try {
      parseDocumentAddress(docPath);
    } catch (error) {
      if (error instanceof AddressingError) {
        return {
          error: 'Generated document path is invalid',
          details: error.message,
          provided_namespace: namespace
        };
      }
      throw error; // Re-throw non-addressing errors
    }

    // Generate blank document with title and overview
    const content = BLANK_TEMPLATE
      .replace(/\{\{title\}\}/g, title)
      .replace(/\{\{overview\}\}/g, overview);

    return {
      content,
      slug,
      docPath
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: 'Template processing failed',
      details: message,
      provided_namespace: namespace
    };
  }
}

