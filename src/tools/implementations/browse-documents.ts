/**
 * Implementation for the browse_documents tool
 * Unified browsing and searching with namespace awareness
 */

import type { SessionState } from '../../session/types.js';
import { getDocumentManager } from '../../shared/utilities.js';
import {
  AddressingError,
  DocumentNotFoundError,
  parseDocumentAddress,
  parseSectionAddress
} from '../../shared/addressing-system.js';
import {
  analyzeDocumentLinks,
  assessImplementationReadiness,
  analyzeSectionContent,
  performSearch,
  getSectionStructure,
  parseSectionPath,
  generateBreadcrumb,
  getParentPath,
  getFolderStructure,
  classifyRelationship,
  findRelatedByContent,
  type FolderInfo,
  type DocumentInfo,
  type SearchMatch,
  type SectionInfo,
  type RelatedDocuments,
  type ImplementationReadiness
} from '../browse/index.js';

interface BrowseResponse {
  path?: string;
  query?: string;
  structure: {
    folders: FolderInfo[];
    documents: DocumentInfo[];
  };
  document_context?: {
    path: string;
    title: string;
    namespace: string;
    slug: string;
    current_section?: string; // The section being browsed (#endpoints)
  };
  sections?: SectionInfo[];
  matches?: SearchMatch[];
  relatedTasks?: Array<{
    taskId: string;
    title: string;
    status: string;
  }>;
  related_documents?: RelatedDocuments;
  implementation_readiness?: ImplementationReadiness;
  breadcrumb?: string[];
  parentPath?: string;
  totalItems: number;
}

/**
 * Browse documents implementation
 */
export async function browseDocuments(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<BrowseResponse> {
  try {
    const manager = await getDocumentManager();
    const requestedPath = (args['path'] as string) ?? '/';
    const query = args['query'] as string | undefined;
    const includeRelated = (args['include_related'] as boolean) ?? false;
    const linkDepth = Math.max(1, Math.min(6, Number(args['link_depth']) || 2));
    const limit = Math.max(1, Math.min(50, Number(args['limit']) || 10));

    // Normalize path
    const normalizedPath = requestedPath.startsWith('/') ? requestedPath : `/${requestedPath}`;

    // Parse section path using existing helper (still needed for non-document paths)
    const { documentPath, sectionSlug } = parseSectionPath(normalizedPath);

    // Check if we're targeting a specific document with potential section
    const isDocumentPath = documentPath.endsWith('.md');

    // Check if we're in search mode or browse mode
    const isSearchMode = (query != null && query !== '') && query.trim() !== '';

    if (isSearchMode) {
      // Search mode
      const pathFilter = normalizedPath !== '/' ? normalizedPath : undefined;
      const { documents, matches } = await performSearch(manager, query, pathFilter);

      // Limit results
      const limitedDocuments = documents.slice(0, limit);
      const limitedMatches = matches.slice(0, limit);

      const result: BrowseResponse = {
        query,
        structure: {
          folders: [], // No folder structure in search mode
          documents: limitedDocuments
        },
        matches: limitedMatches,
        totalItems: documents.length
      };

      if (pathFilter != null && pathFilter !== '') {
        result.path = pathFilter;
        result.breadcrumb = generateBreadcrumb(pathFilter);
        const parent = getParentPath(pathFilter);
        if (parent != null) {
          result.parentPath = parent;
        }
      }

      return result;

    } else if (isDocumentPath) {
      // Document/Section browse mode - use addressing system for validation
      try {
        const documentAddress = parseDocumentAddress(documentPath);

        // Optional section validation if provided
        let sectionAddress;
        if (sectionSlug != null && sectionSlug !== '') {
          sectionAddress = await parseSectionAddress(sectionSlug, documentAddress.path);
        }

        const { sections, document_context } = await getSectionStructure(
          manager,
          documentAddress.path,
          analyzeSectionContent,
          sectionAddress?.slug
        );

      const result: BrowseResponse = {
        path: normalizedPath,
        structure: {
          folders: [],
          documents: []
        },
        ...(document_context != null && { document_context }),
        sections,
        totalItems: sections.length
      };

        // Add related documents analysis if requested
        if (includeRelated && document_context != null) {
          const relatedDocuments = await analyzeDocumentLinks(
            manager,
            documentAddress.path,
            linkDepth,
            classifyRelationship,
            findRelatedByContent
          );
          if (relatedDocuments != null) {
            result.related_documents = relatedDocuments;

            // Generate implementation readiness assessment
            const allRelated = [
              ...relatedDocuments.forward_links,
              ...relatedDocuments.backward_links,
              ...relatedDocuments.related_by_content
            ];
            result.implementation_readiness = assessImplementationReadiness(allRelated);
          }
        }

        if (normalizedPath !== '/') {
          result.breadcrumb = generateBreadcrumb(normalizedPath);
        }

        const parent = getParentPath(normalizedPath);
        if (parent != null) {
          result.parentPath = parent;
        }

        return result;

      } catch (error) {
        // Handle addressing errors with proper error types
        if (error instanceof AddressingError) {
          throw error;
        }
        throw new DocumentNotFoundError(documentPath);
      }

    } else {
      // Folder browse mode
      const { loadConfig } = await import('../../config.js');
      const config = loadConfig();
      const { folders, documents } = await getFolderStructure(manager, config.docsBasePath, normalizedPath);

      const result: BrowseResponse = {
        path: normalizedPath,
        structure: {
          folders,
          documents
        },
        totalItems: folders.length + documents.length
      };

      if (normalizedPath !== '/') {
        result.breadcrumb = generateBreadcrumb(normalizedPath);
      }

      const parent = getParentPath(normalizedPath);
      if (parent != null) {
        result.parentPath = parent;
      }

      return result;
    }

  } catch (error) {
    // Handle addressing errors properly
    if (error instanceof AddressingError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    // Return error response with helpful guidance for other errors
    return {
      path: args['path'] as string ?? '/',
      structure: {
        folders: [],
        documents: []
      },
      totalItems: 0,
      // Include error information in a way that's helpful
      breadcrumb: [`Error: ${message}`]
    };
  }
}