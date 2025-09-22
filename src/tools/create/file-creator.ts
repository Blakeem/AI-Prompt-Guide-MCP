/**
 * File creator for create-document pipeline
 * Handles Stage 3 (Creation) file system operations and finalization
 */

import { getDocumentManager } from '../../shared/utilities.js';

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
  content: string,
  docPath: string,
  slug: string
): Promise<DocumentCreationResult | FileCreationError> {
  try {
    const manager = await getDocumentManager();

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
    await refreshDocumentCache(docPath);

    // Get created document info
    const document = await manager.getDocument(docPath);
    const headings = document?.headings ?? [];

    return {
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
        'Use edit_section to add detailed content to each section',
        'Use add_task to populate the tasks section with specific items',
        'Use insert_section to add additional sections as needed',
        'Use search_documents to research related content and add references'
      ]
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
async function refreshDocumentCache(docPath: string): Promise<void> {
  const cache = await import('../../document-cache.js');
  const globalCache = cache.getGlobalCache();
  globalCache.invalidateDocument(docPath);
}

/**
 * Validate document creation prerequisites
 */
export async function validateCreationPrerequisites(
  namespace: string,
  title: string,
  overview: string
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

  try {
    // Validate document manager is available
    await getDocumentManager();
    return null; // No validation errors
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Document manager unavailable: ${message}`;
  }
}

/**
 * Check if document already exists
 */
export async function checkDocumentExists(docPath: string): Promise<boolean> {
  try {
    const manager = await getDocumentManager();
    const document = await manager.getDocument(docPath);
    return document != null;
  } catch {
    return false; // Assume doesn't exist if we can't check
  }
}

/**
 * Generate creation metadata
 */
export function generateCreationMetadata(
  namespace: string,
  title: string,
  slug: string,
  docPath: string
): {
  path: string;
  slug: string;
  title: string;
  namespace: string;
  created: string;
} {
  return {
    path: docPath,
    slug,
    title,
    namespace,
    created: new Date().toISOString()
  };
}