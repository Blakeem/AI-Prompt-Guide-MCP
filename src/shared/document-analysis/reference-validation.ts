/**
 * Reference validation and broken reference detection
 *
 * Provides tools for detecting broken @references in document content
 * using the shared reference extraction and validation pipeline.
 */

import type { DocumentManager } from '../../document-manager.js';
import { getGlobalLogger } from '../../utils/logger.js';
import { ReferenceExtractor } from '../reference-extractor.js';
import type { BrokenReference } from './types.js';
import { DocumentAnalysisError } from './types.js';

const logger = getGlobalLogger();

/**
 * Detect broken @references in document content
 *
 * Analyzes the provided content (title and overview) to find @reference patterns
 * and checks if the referenced documents actually exist in the system.
 * Uses the shared ReferenceExtractor and ReferenceLoader pipeline for consistent
 * reference handling across the system.
 *
 * @param manager - Document manager for checking document existence
 * @param _namespace - Target namespace (not used in current implementation)
 * @param title - Document title to scan for references
 * @param overview - Document overview to scan for references
 *
 * @returns Promise resolving to array of structured broken reference information
 *
 * @throws {DocumentAnalysisError} When critical operations fail
 */
export async function detectBrokenReferences(
  manager: DocumentManager,
  _namespace: string,
  title: string,
  overview: string
): Promise<BrokenReference[]> {
  // Input validation
  if (manager == null) {
    throw new DocumentAnalysisError(
      'Document manager is required',
      'detectBrokenReferences',
      [],
      ['Ensure document manager is properly initialized']
    );
  }

  const brokenReferences: BrokenReference[] = [];
  const contentToScan = `${title ?? ''} ${overview ?? ''}`;

  try {
    // Use shared reference extraction pipeline
    const extractor = new ReferenceExtractor();

    // Extract references using the shared extractor (handles @/path and @#section)
    const standardRefs = extractor.extractReferences(contentToScan);

    // For broken reference detection, we also need to catch relative references
    // that the standard extractor doesn't handle (like @missing-doc)
    const relativeRefRegex = /@([a-zA-Z][^@\s/]*(?:\.md)?(?:#[^\s]*)?)/g;
    const relativeMatches = contentToScan.matchAll(relativeRefRegex);
    const relativeRefs = Array.from(relativeMatches, match => match[0]);

    // Combine both sets of references and deduplicate
    const allRefs = [...new Set([...standardRefs, ...relativeRefs])];

    if (allRefs.length === 0) {
      return [];
    }

    // Process standard references using the shared normalization pipeline
    try {
      const normalizedStandardRefs = extractor.normalizeReferences(standardRefs, '/');

      // Validate standard references using the shared system
      for (const ref of normalizedStandardRefs) {
        try {
          // Check if the document exists
          const document = await manager.getDocument(ref.documentPath);
          if (document == null) {
            // Document doesn't exist - this is a broken reference
            brokenReferences.push({
              reference: ref.originalRef,
              type: 'missing_document',
              documentPath: ref.documentPath,
              sectionSlug: ref.sectionSlug,
              reason: `Document not found: ${ref.documentPath}`
            });
            continue;
          }

          // If reference includes a section, check section existence using slugIndex
          if (ref.sectionSlug != null) {
            const sectionExists = document.slugIndex.has(ref.sectionSlug);
            if (!sectionExists) {
              // Section doesn't exist - this is a broken reference
              brokenReferences.push({
                reference: ref.originalRef,
                type: 'missing_section',
                documentPath: ref.documentPath,
                sectionSlug: ref.sectionSlug,
                reason: `Section '${ref.sectionSlug}' not found in document ${ref.documentPath}`
              });
            }
          }

          // Document exists (and section exists if specified) - reference is valid
        } catch (error) {
          // If we can't check the document, consider it broken
          logger.warn(`Failed to validate reference "${ref.originalRef}":`, { error: error instanceof Error ? error.message : String(error) });
          brokenReferences.push({
            reference: ref.originalRef,
            type: 'missing_document',
            documentPath: ref.documentPath,
            sectionSlug: ref.sectionSlug,
            reason: `Failed to validate document: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
    } catch (error) {
      // If normalization fails, treat standard references as malformed
      for (const ref of standardRefs) {
        brokenReferences.push({
          reference: ref,
          type: 'malformed',
          reason: `Failed to parse reference: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    // Process relative references (not handled by shared extractor)
    const relativeOnlyRefs = relativeRefs.filter(ref => !standardRefs.includes(ref));
    for (const relativeRef of relativeOnlyRefs) {
      try {
        // Parse relative reference manually (similar to original implementation)
        const refContent = relativeRef.slice(1); // Remove @
        let documentPath = refContent;
        let sectionSlug: string | undefined;

        // Handle section references
        if (refContent.includes('#')) {
          const parts = refContent.split('#');
          documentPath = parts[0] ?? refContent;
          sectionSlug = parts[1];
        }

        // Ensure it's a markdown file
        if (!documentPath.endsWith('.md')) {
          documentPath = `${documentPath}.md`;
        }

        // Ensure it starts with /
        if (!documentPath.startsWith('/')) {
          documentPath = `/${documentPath}`;
        }

        // Check if the document exists
        const document = await manager.getDocument(documentPath);
        if (document == null) {
          brokenReferences.push({
            reference: relativeRef,
            type: 'missing_document',
            documentPath,
            sectionSlug,
            reason: `Document not found: ${documentPath}`
          });
        }
        // Note: For relative refs, we don't check sections as they're not well-defined
      } catch (error) {
        // If we can't parse the reference, consider it malformed
        logger.warn(`Failed to validate relative reference "${relativeRef}":`, { error: error instanceof Error ? error.message : String(error) });
        brokenReferences.push({
          reference: relativeRef,
          type: 'malformed',
          reason: `Failed to parse relative reference: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    // Deduplicate based on reference text (since we might have same ref detected multiple ways)
    const seenRefs = new Set<string>();
    const dedupedReferences: BrokenReference[] = [];

    for (const ref of brokenReferences) {
      if (!seenRefs.has(ref.reference)) {
        seenRefs.add(ref.reference);
        dedupedReferences.push(ref);
      }
    }

    return dedupedReferences;

  } catch (error) {
    throw new DocumentAnalysisError(
      `Broken reference detection failed: ${error}`,
      'detectBrokenReferences',
      [],
      [
        'Check document manager connectivity',
        'Verify content format',
        'Try with simpler content',
        'Ensure ReferenceExtractor is working properly'
      ]
    );
  }
}
