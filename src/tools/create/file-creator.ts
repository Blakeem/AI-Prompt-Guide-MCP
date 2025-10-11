/**
 * File creator for create-document pipeline
 * Handles Stage 3 (Creation) file system operations and finalization
 */

import type { DocumentManager } from '../../document-manager.js';
import { analyzeDocumentSuggestions, analyzeNamespacePatterns } from '../../shared/utilities.js';
import { parseDocumentAddress, AddressingError } from '../../shared/addressing-system.js';
import type { SmartSuggestions, NamespacePatterns } from '../schemas/create-document-schemas.js';

/**
 * Document creation result
 */
export interface DocumentCreationResult {
  stage: 'creation';
  success: boolean;
  created: string;
  document: {
    path: string;
    slug: string;
    title: string;
    namespace: string;
    created: string;
  };
  sections: string[];
  suggestions?: SmartSuggestions;
  namespace_patterns?: NamespacePatterns;
  next_actions: string[];
}

/**
 * File creation error result
 */
export interface FileCreationError {
  error: string;
  details: string;
  provided_parameters: {
    namespace: string;
    title: string;
    overview: string;
  };
}

/**
 * Create document with structured content
 */
export async function createDocumentFile(
  namespace: string,
  title: string,
  overview: string,
  manager: DocumentManager,
  content: string,
  docPath: string,
  slug: string
): Promise<DocumentCreationResult | FileCreationError> {
  try {
    // Validate the document path using addressing system
    try {
      parseDocumentAddress(docPath);
    } catch (error) {
      if (error instanceof AddressingError) {
        return {
          error: 'Invalid document path for creation',
          details: error.message,
          provided_parameters: {
            namespace,
            title,
            overview
          }
        };
      }
      throw error; // Re-throw non-addressing errors
    }

    // Create the document with basic structure first
    await manager.createDocument(docPath, {
      title,
      template: 'blank', // We're providing our own structure
      features: {
        toc: true,
        anchors: true,
        codeHighlight: true,
        mermaid: true,
        searchIndex: true
      }
    });

    // Write the structured content to the file
    await writeDocumentContent(docPath, content);

    // Refresh the cache to get the updated document
    await refreshDocumentCache(manager, docPath);

    // Get created document info
    const document = await manager.getDocument(docPath);
    const headings = document?.headings ?? [];

    // Generate suggestions and namespace patterns for context
    let suggestions: SmartSuggestions | undefined;
    let namespacePatterns: NamespacePatterns | undefined;

    try {
      [suggestions, namespacePatterns] = await Promise.all([
        analyzeDocumentSuggestions(manager, namespace, title, overview, docPath),
        analyzeNamespacePatterns(manager, namespace)
      ]);
    } catch (error) {
      // If suggestions fail, just continue without them - not critical
      console.error('Failed to generate suggestions:', error);
    }

    // Build result with proper optional property handling
    const result: DocumentCreationResult = {
      stage: 'creation',
      success: true,
      created: docPath,
      document: {
        path: docPath,
        slug,
        title,
        namespace,
        created: new Date().toISOString()
      },
      sections: headings.map(h => `#${h.slug}`),
      next_actions: [
        'Use section tool with operation "edit" to add content to any section',
        'Use task tool to populate the tasks section with specific items',
        'Use section tool with operation "insert_after" to add new sections as needed',
        'Review suggestions above and use section tool to add @references to related documents'
      ]
    };

    // Only add suggestions if they exist (exactOptionalPropertyTypes compliance)
    if (suggestions != null) {
      result.suggestions = suggestions;
    }

    if (namespacePatterns != null) {
      result.namespace_patterns = namespacePatterns;
    }

    return result;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: 'Failed to create document',
      details: message,
      provided_parameters: {
        namespace,
        title,
        overview
      }
    };
  }
}

/**
 * Write content to document file
 */
async function writeDocumentContent(docPath: string, content: string): Promise<void> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const config = await import('../../config.js');

  const loadedConfig = config.loadConfig();
  const fullPath = path.join(loadedConfig.docsBasePath, docPath);

  await fs.writeFile(fullPath, content, 'utf8');
}

/**
 * Refresh document cache after creation
 */
async function refreshDocumentCache(manager: DocumentManager, docPath: string): Promise<void> {
  manager.cache.invalidateDocument(docPath);
}

/**
 * Validate document creation prerequisites
 */
export async function validateCreationPrerequisites(
  namespace: string,
  title: string,
  overview: string,
  _manager: DocumentManager
): Promise<string | null> {
  // Basic input validation
  if (namespace.trim() === '') {
    return 'Namespace cannot be empty';
  }

  if (title.trim() === '') {
    return 'Title cannot be empty';
  }

  if (overview.trim() === '') {
    return 'Overview cannot be empty';
  }

  // Manager is already validated at the pipeline level
  return null; // No validation errors
}

