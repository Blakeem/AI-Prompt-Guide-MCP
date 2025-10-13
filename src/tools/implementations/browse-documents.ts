/**
 * Implementation for the browse_documents tool
 * Unified browsing and searching with namespace awareness
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
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
  getSectionStructure,
  parseSectionPath,
  generateBreadcrumb,
  getParentPath,
  getFolderStructure,
  classifyRelationship,
  findRelatedByContent,
  type FolderInfo,
  type DocumentInfo,
  type SectionInfo,
  type RelatedDocuments,
  type ImplementationReadiness
} from '../browse/index.js';

interface BrowseResponse {
  path?: string;
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
 * Validates a numeric parameter with range constraints
 * @param value - The value to validate
 * @param paramName - Name of the parameter for error messages
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param defaultValue - Default value if parameter is null/undefined
 * @returns Validated integer value
 * @throws AddressingError if value is not a finite number or out of range
 */
function validateNumericParameter(
  value: unknown,
  paramName: string,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (value == null) return defaultValue;

  const num = Number(value);

  if (!Number.isFinite(num)) {
    throw new AddressingError(
      `${paramName} must be a finite number`,
      'INVALID_PARAMETER',
      { value, paramName }
    );
  }

  if (num < min || num > max) {
    throw new AddressingError(
      `${paramName} must be between ${min} and ${max}`,
      'INVALID_PARAMETER',
      { value: num, min, max, paramName }
    );
  }

  return Math.floor(num); // Ensure integer
}

/**
 * Browse documents implementation with dependency injection
 */
export async function browseDocuments(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<BrowseResponse> {
  try {
    const requestedPath = (args['path'] as string) ?? '/';
    const includeRelated = (args['include_related'] as boolean) ?? false;
    const linkDepth = validateNumericParameter(args['link_depth'], 'link_depth', 1, 6, 2);

    // Normalize path
    const normalizedPath = requestedPath.startsWith('/') ? requestedPath : `/${requestedPath}`;

    // Parse section path using existing helper (still needed for non-document paths)
    const { documentPath, sectionSlug } = parseSectionPath(normalizedPath);

    // Check if we're targeting a specific document with potential section
    const isDocumentPath = documentPath.endsWith('.md');

    if (isDocumentPath) {
      // Document/Section browse mode - use addressing system for validation
      try {
        const documentAddress = parseDocumentAddress(documentPath);

        // Optional section validation if provided
        let sectionAddress;
        if (sectionSlug != null && sectionSlug !== '') {
          sectionAddress = parseSectionAddress(sectionSlug, documentAddress.path);
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