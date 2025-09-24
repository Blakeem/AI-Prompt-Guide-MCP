/**
 * Implementation for the section tool
 */

import type { SessionState } from '../../session/types.js';
import {
  getDocumentManager,
  performSectionEdit,
  pathToNamespace,
  pathToSlug,
  getParentSlug,
  validateSlugPath
} from '../../shared/utilities.js';

/**
 * Normalize section slug by removing # prefix to allow both "section" and "#section" formats
 */
function normalizeSectionSlug(sectionSlug: string): string {
  return sectionSlug.startsWith('#') ? sectionSlug.substring(1) : sectionSlug;
}

export async function section(
  args: Record<string, unknown> | Array<Record<string, unknown>>,
  _state: SessionState
): Promise<unknown> {
  try {
    const manager = await getDocumentManager();

    // Detect if this is a batch operation (array input) or single operation
    const isBatch = Array.isArray(args);

    if (isBatch) {
      // Handle batch operations
      const operations = args as Array<{
        document: string;
        section: string;
        content: string;
        operation?: string;
        title?: string;
      }>;

      if (operations.length === 0) {
        throw new Error('Batch operations array cannot be empty');
      }

      const batchResults: Array<{success: boolean; section: string; action?: 'edited' | 'created' | 'removed'; depth?: number; error?: string; removed_content?: string}> = [];
      let sectionsModified = 0;
      const documentsModified = new Set<string>();

      // Process each operation sequentially
      for (const op of operations) {
        try {
          const docPath = op.document ?? '';
          const sectionSlug = op.section ?? '';
          const content = op.content ?? '';
          const operation = op.operation ?? 'replace';
          const title = op.title;

          if (!docPath || !sectionSlug) {
            throw new Error('Missing required parameters: document and section');
          }

          // Content is not required for remove operations
          if (operation !== 'remove' && !content) {
            throw new Error('Content is required for all operations except remove');
          }

          const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;
          documentsModified.add(normalizedPath);

          // Normalize and validate hierarchical slug path if provided
          const normalizedSlug = normalizeSectionSlug(sectionSlug);
          const slugValidation = validateSlugPath(normalizedSlug);
          if (slugValidation.success === false) {
            throw new Error(`Invalid hierarchical slug "${sectionSlug}": ${slugValidation.error}`);
          }

          // Perform the enhanced operation with hierarchical slug support
          const result = await performSectionEdit(manager, normalizedPath, sectionSlug, content, operation, title);

          batchResults.push({
            success: true,
            section: result.section,
            action: result.action,
            ...(result.depth != null && { depth: result.depth }),
            ...(result.removedContent !== undefined && { removed_content: result.removedContent })
          });
          sectionsModified++;

        } catch (opError) {
          const message = opError instanceof Error ? opError.message : String(opError);
          batchResults.push({
            success: false,
            section: op.section ?? 'unknown',
            error: message
          });
        }
      }

      // Get document info for single document batches
      let documentInfo;
      if (Array.from(documentsModified).length === 1) {
        const singleDocPath = Array.from(documentsModified)[0] as string;
        const doc = await manager.getDocument(singleDocPath);
        if (doc != null) {
          documentInfo = {
            path: singleDocPath,
            slug: pathToSlug(singleDocPath),
            title: doc.metadata.title,
            namespace: pathToNamespace(singleDocPath)
          };
        }
      }

      return {
        batch_results: batchResults,
        document: Array.from(documentsModified).length === 1 ? Array.from(documentsModified)[0] : undefined,
        sections_modified: sectionsModified,
        total_operations: operations.length,
        timestamp: new Date().toISOString(),
        ...(documentInfo && {
          document_info: {
            slug: documentInfo.slug,
            title: documentInfo.title,
            namespace: documentInfo.namespace
          }
        })
      };

    } else {
      // Handle single operation
      const singleOp = args as {
        document: string;
        section: string;
        content: string;
        operation?: string;
        title?: string;
      };

      const docPath = singleOp.document ?? '';
      const sectionSlug = singleOp.section ?? '';
      const content = singleOp.content ?? '';
      const operation = singleOp.operation ?? 'replace';
      const title = singleOp.title;

      if (!docPath || !sectionSlug) {
        throw new Error('Missing required parameters: document and section');
      }

      // Content is not required for remove operations
      if (operation !== 'remove' && !content) {
        throw new Error('Content is required for all operations except remove');
      }

      const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;

      // Normalize and validate hierarchical slug path if provided
      const normalizedSlug = normalizeSectionSlug(sectionSlug);
      const slugValidation = validateSlugPath(normalizedSlug);
      if (slugValidation.success === false) {
        throw new Error(`Invalid hierarchical slug "${sectionSlug}": ${slugValidation.error}`);
      }

      // Perform the enhanced operation with hierarchical slug support
      const result = await performSectionEdit(manager, normalizedPath, sectionSlug, content, operation, title);

      // Get document information for response
      const document = await manager.getDocument(normalizedPath);
      const documentInfo = document != null ? {
        path: normalizedPath,
        slug: pathToSlug(normalizedPath),
        title: document.metadata.title,
        namespace: pathToNamespace(normalizedPath)
      } : undefined;

      // Return different response based on action
      if (result.action === 'created') {
        // Add hierarchical slug information for created sections
        const hierarchicalInfo = {
          slug_depth: result.depth ?? 1,  // Use actual markdown heading depth, not slug path depth
          parent_slug: getParentSlug(result.section)
        };

        // Analyze links in the created content
        const linkAssistance = await analyzeSectionLinks(content, normalizedPath, result.section, manager);

        return {
          created: true,
          document: normalizedPath,
          new_section: result.section,
          ...(result.depth !== undefined && { depth: result.depth }),
          operation,
          timestamp: new Date().toISOString(),
          hierarchical_info: hierarchicalInfo,
          link_assistance: linkAssistance,
          ...(documentInfo && {
            document_info: {
              slug: documentInfo.slug,
              title: documentInfo.title,
              namespace: documentInfo.namespace
            }
          })
        };
      } else if (result.action === 'removed') {
        return {
          removed: true,
          document: normalizedPath,
          section: result.section,
          removed_content: result.removedContent,
          operation,
          timestamp: new Date().toISOString(),
          ...(documentInfo && {
            document_info: {
              slug: documentInfo.slug,
              title: documentInfo.title,
              namespace: documentInfo.namespace
            }
          })
        };
      } else {
        // Add hierarchical slug information for updated sections
        // For edit operations, get the actual depth from the document
        const updatedDocument = await manager.getDocument(normalizedPath);
        const sectionHeading = updatedDocument?.headings.find(h => h.slug === result.section);
        const actualDepth = sectionHeading?.depth ?? 1;

        const hierarchicalInfo = {
          slug_depth: actualDepth,  // Use actual markdown heading depth
          parent_slug: getParentSlug(result.section)
        };

        // Analyze links in the updated content
        const linkAssistance = await analyzeSectionLinks(content, normalizedPath, result.section, manager);

        return {
          updated: true,
          document: normalizedPath,
          section: result.section,
          operation,
          timestamp: new Date().toISOString(),
          hierarchical_info: hierarchicalInfo,
          link_assistance: linkAssistance,
          ...(documentInfo && {
            document_info: {
              slug: documentInfo.slug,
              title: documentInfo.title,
              namespace: documentInfo.namespace
            }
          })
        };
      }
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      JSON.stringify({
        code: -32603,
        message: 'Failed to edit section',
        data: {
          reason: 'EDIT_ERROR',
          details: message,
          args,
        },
      })
    );
  }
}

/**
 * Analyze content for links and provide assistance
 */
async function analyzeSectionLinks(
  content: string,
  documentPath: string,
  _sectionSlug: string,
  manager: Awaited<ReturnType<typeof getDocumentManager>>
): Promise<{
  links_found: Array<{
    link_text: string;
    is_valid: boolean;
    target_document?: string;
    target_section?: string;
    validation_error?: string;
  }>;
  link_suggestions: Array<{
    suggested_link: string;
    target_document: string;
    rationale: string;
    placement_hint: string;
  }>;
  syntax_help: {
    detected_patterns: string[];
    correct_examples: string[];
    common_mistakes: string[];
  };
}> {
  // Import link utilities
  const { resolveLinkWithContext } = await import('../../shared/link-utils.js');

  const linksFound: Array<{
    link_text: string;
    is_valid: boolean;
    target_document?: string;
    target_section?: string;
    validation_error?: string;
  }> = [];

  const linkSuggestions: Array<{
    suggested_link: string;
    target_document: string;
    rationale: string;
    placement_hint: string;
  }> = [];

  const detectedPatterns: string[] = [];
  const commonMistakes: string[] = [];

  // Extract potential links from content
  const linkPattern = /@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g;
  const matches = content.match(linkPattern) ?? [];

  // Analyze each found link
  for (const linkText of matches) {
    try {
      const resolved = await resolveLinkWithContext(linkText, documentPath, manager);

      const linkInfo: {
        link_text: string;
        is_valid: boolean;
        target_document?: string;
        target_section?: string;
        validation_error?: string;
      } = {
        link_text: linkText,
        is_valid: resolved.validation.valid
      };

      if (resolved.validation.valid && resolved.resolvedPath) {
        const hashIndex = resolved.resolvedPath.indexOf('#');
        if (hashIndex === -1) {
          linkInfo.target_document = resolved.resolvedPath;
        } else {
          linkInfo.target_document = resolved.resolvedPath.slice(0, hashIndex);
          linkInfo.target_section = resolved.resolvedPath.slice(hashIndex + 1);
        }
      } else {
        linkInfo.validation_error = resolved.validation.error ?? 'Unknown validation error';
      }

      linksFound.push(linkInfo);
    } catch (error) {
      linksFound.push({
        link_text: linkText,
        is_valid: false,
        validation_error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Detect patterns and potential mistakes
  if (content.includes('@') && matches.length === 0) {
    detectedPatterns.push('@ symbol found but no valid link pattern detected');
    commonMistakes.push('Use @/path/doc.md or @#section format for links');
  }

  if (content.match(/\[.*\]\(\/.*\.md.*\)/)) {
    detectedPatterns.push('Standard markdown links to .md files detected');
    commonMistakes.push('Consider using @ syntax instead: @/path/doc.md');
  }

  // Generate content-based link suggestions
  const keywords = extractContentKeywords(content);

  if (keywords.length > 0) {
    try {
      // Search for related documents based on content
      const searchResults = await manager.searchDocuments(keywords.slice(0, 3).join(' '), {
        searchIn: ['title', 'content'],
        fuzzy: true,
        groupByDocument: true
      });

      // Filter out current document and suggest top matches
      const relevantResults = searchResults
        .filter(result => result.documentPath !== documentPath)
        .slice(0, 3);

      for (const result of relevantResults) {
        const document = await manager.getDocument(result.documentPath);
        if (document) {
          const targetNamespace = pathToNamespace(result.documentPath);

          // Determine placement hint based on content and namespace
          let placementHint = 'Add to relevant paragraph or list';
          if (content.includes('overview') || content.includes('introduction')) {
            placementHint = 'Consider adding to overview section for context';
          } else if (content.includes('implementation') || content.includes('example')) {
            placementHint = 'Reference in implementation details';
          } else if (content.includes('see also') || content.includes('related')) {
            placementHint = 'Perfect for "See Also" or "Related" sections';
          }

          linkSuggestions.push({
            suggested_link: `@${result.documentPath}`,
            target_document: result.documentTitle,
            rationale: `Related ${targetNamespace} document with shared concepts: ${keywords.slice(0, 2).join(', ')}`,
            placement_hint: placementHint
          });
        }
      }
    } catch {
      // Silently continue if search fails
    }
  }

  return {
    links_found: linksFound,
    link_suggestions: linkSuggestions,
    syntax_help: {
      detected_patterns: detectedPatterns,
      correct_examples: [
        '@/api/specs/user-api.md - Link to entire document',
        '@/api/guides/setup.md#configuration - Link to specific section',
        '@#implementation - Link to section in current document'
      ],
      common_mistakes: commonMistakes
    }
  };
}

/**
 * Extract keywords from content for link suggestions
 */
function extractContentKeywords(content: string): string[] {
  // Simple keyword extraction - remove markdown, get meaningful words
  const cleanContent = content
    .replace(/[#*`_[\]()]/g, ' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanContent.split(' ').filter(word =>
    word.length > 3 &&
    !isStopWord(word) &&
    !word.match(/^\d+$/)
  );

  // Return unique words, limited to top 10
  return [...new Set(words)].slice(0, 10);
}

/**
 * Check if word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'this', 'that', 'these', 'those', 'with', 'from', 'they', 'them', 'their',
    'have', 'been', 'were', 'will', 'would', 'could', 'should', 'might',
    'here', 'there', 'when', 'where', 'what', 'which', 'very', 'more',
    'most', 'some', 'such', 'only', 'just', 'like', 'into', 'over',
    'also', 'well', 'even', 'make', 'made', 'take', 'used', 'using'
  ]);

  return stopWords.has(word);
}