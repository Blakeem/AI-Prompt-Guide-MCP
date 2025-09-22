/**
 * Folder navigation, breadcrumb generation, and file system operations
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { DocumentManager } from '../../document-manager.js';
import { pathToNamespace, pathToSlug, getParentSlug } from '../../shared/utilities.js';
import type { DocumentInfo } from './search-engine.js';

export interface FolderInfo {
  name: string;
  path: string;
  namespace: string;
  documentCount: number;
  hasSubfolders: boolean;
}

// DocumentInfo interface is defined in search-engine.ts and re-exported through index.ts

/**
 * Parse section path into document path and section slug
 */
export function parseSectionPath(fullPath: string): { documentPath: string; sectionSlug?: string } {
  const hashIndex = fullPath.indexOf('#');
  if (hashIndex === -1) {
    return { documentPath: fullPath };
  }

  const documentPath = fullPath.slice(0, hashIndex);
  const sectionSlug = fullPath.slice(hashIndex + 1);

  if (sectionSlug === '') {
    return { documentPath: documentPath || '/' };
  }

  return {
    documentPath: documentPath || '/',
    sectionSlug
  };
}

/**
 * Generate breadcrumb trail for a path (including section context)
 */
export function generateBreadcrumb(docPath: string): string[] {
  const { documentPath, sectionSlug } = parseSectionPath(docPath);
  const parts = documentPath.split('/').filter(part => part !== '' && part !== '.');
  const breadcrumb: string[] = [];

  // Add folder breadcrumbs
  for (let i = 0; i < parts.length; i++) {
    const pathUpToHere = `/${parts.slice(0, i + 1).join('/')}`;
    breadcrumb.push(pathUpToHere);
  }

  // Add section breadcrumb if applicable
  if (sectionSlug != null && sectionSlug !== '') {
    breadcrumb.push(`${documentPath}#${sectionSlug}`);
  }

  return breadcrumb;
}

/**
 * Get parent path for navigation (including section context)
 */
export function getParentPath(docPath: string): string | undefined {
  if (docPath === '/' || docPath === '') {
    return undefined;
  }

  const { documentPath, sectionSlug } = parseSectionPath(docPath);

  // If we're in a section, parent is the document
  if (sectionSlug != null && sectionSlug !== '') {
    return documentPath;
  }

  // Otherwise, parent is the folder above
  const parts = documentPath.split('/').filter(part => part !== '' && part !== '.');
  if (parts.length <= 1) {
    return '/';
  }

  return `/${parts.slice(0, -1).join('/')}`;
}

/**
 * Check if a directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get folder structure at specified path
 */
export async function getFolderStructure(
  manager: DocumentManager,
  basePath: string,
  targetPath: string
): Promise<{folders: FolderInfo[], documents: DocumentInfo[]}> {
  const folders: FolderInfo[] = [];
  const documents: DocumentInfo[] = [];

  // Construct absolute path for filesystem operations
  const absoluteTargetPath = path.join(basePath, targetPath.startsWith('/') ? targetPath.slice(1) : targetPath);

  // Check if target path exists
  if (!(await directoryExists(absoluteTargetPath))) {
    return { folders, documents };
  }

  try {
    const entries = await fs.readdir(absoluteTargetPath, { withFileTypes: true });

    // Process directories (folders)
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = targetPath === '/' ? `/${entry.name}` : `${targetPath}/${entry.name}`;
        const absoluteFolderPath = path.join(absoluteTargetPath, entry.name);

        // Count documents and check for subfolders
        let documentCount = 0;
        let hasSubfolders = false;

        try {
          const folderEntries = await fs.readdir(absoluteFolderPath, { withFileTypes: true });
          for (const folderEntry of folderEntries) {
            if (folderEntry.isDirectory()) {
              hasSubfolders = true;
            } else if (folderEntry.isFile() && folderEntry.name.endsWith('.md')) {
              documentCount++;
            }
          }
        } catch {
          // Ignore if we can't read the folder
        }

        folders.push({
          name: entry.name,
          path: folderPath,
          namespace: pathToNamespace(folderPath),
          documentCount,
          hasSubfolders
        });
      }
    }

    // Process markdown files (documents)
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const docPath = targetPath === '/' ? `/${entry.name}` : `${targetPath}/${entry.name}`;

        try {
          const document = await manager.getDocument(docPath);
          if (document != null) {
            // Convert headings to sections format with hierarchical slug support
            const sections = document.headings.map((heading) => {
              const hierarchicalSlug = heading.slug.includes('/') ? heading.slug : heading.slug;
              const parent = getParentSlug(hierarchicalSlug);

              return {
                slug: hierarchicalSlug,
                title: heading.title,
                depth: heading.depth,
                full_path: `${docPath}#${hierarchicalSlug}`,
                ...(parent != null && { parent }),
                hasContent: true // We'll assume sections have content
              };
            });

            // TODO: Extract task information if available
            // For now, we'll leave tasks undefined

            documents.push({
              path: docPath,
              slug: pathToSlug(docPath),
              title: document.metadata.title,
              namespace: pathToNamespace(docPath),
              sections,
              lastModified: document.metadata.lastModified.toISOString()
            });
          }
        } catch {
          // Skip documents that can't be loaded
        }
      }
    }

    // Sort folders and documents by name
    folders.sort((a, b) => a.name.localeCompare(b.name));
    documents.sort((a, b) => a.title.localeCompare(b.title));

  } catch {
    // Return empty structure if we can't read the directory
  }

  return { folders, documents };
}