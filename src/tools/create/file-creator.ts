/**
 * File creator for create-document pipeline
 * Handles Stage 1 (Creation) file system operations and finalization
 */

import type { DocumentManager } from '../../document-manager.js';
import { parseDocumentAddress, AddressingError } from '../../shared/addressing-system.js';

/**
 * Document creation result - simplified response
 */
export interface DocumentCreationResult {
  success: boolean;
  document: string;  // Full path to created document
  slug: string;      // Document slug (from title)
  next_step: string; // Guidance for adding first section
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
        toc: false,  // No TOC - user can add manually if needed
        anchors: true,
        codeHighlight: true,
        mermaid: true,
        searchIndex: true
      }
    });

    // Write the structured content to the file
    await writeDocumentContent(manager, docPath, content);

    // Refresh the cache to get the updated document
    await refreshDocumentCache(manager, docPath);

    // Return simplified response with minimal next-step guidance
    return {
      success: true,
      document: docPath,
      slug,
      next_step: 'Use section tool with append_child on the slug to add first section'
    };

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
async function writeDocumentContent(manager: DocumentManager, docPath: string, content: string): Promise<void> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  // Get the docs root from the manager (supports testing with custom paths)
  const docsRoot = (manager as unknown as { docsRoot: string }).docsRoot;
  const fullPath = path.join(docsRoot, docPath);

  // Ensure parent directory exists
  const parentDir = path.dirname(fullPath);
  await fs.mkdir(parentDir, { recursive: true });

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

