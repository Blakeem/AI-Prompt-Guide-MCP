/**
 * Link analysis service for content analysis and link suggestions
 *
 * Provides comprehensive link analysis functionality including:
 * - Link extraction and validation
 * - Content-based link suggestions
 * - Pattern detection and syntax help
 *
 * Note: Exports are used via dynamic import for performance optimization.
 * Dead code detection may flag as unused but they are legitimately used
 * in src/tools/implementations/section.ts via:
 * const { createLinkAnalysisService } = await import('../../shared/link-analysis.js');
 */

import type { DocumentManager } from '../document-manager.js';
import { parseDocumentAddress } from './addressing-system.js';

/**
 * Result of link analysis operation
 */
export interface LinkAnalysisResult {
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
}

/**
 * Link information after validation
 */
interface LinkInfo {
  link_text: string;
  is_valid: boolean;
  target_document?: string;
  target_section?: string;
  validation_error?: string;
}

/**
 * Main link analysis service
 */
class LinkAnalysisService {
  constructor(private readonly manager: DocumentManager) {}

  /**
   * Perform comprehensive link analysis on content
   */
  async analyzeLinks(
    content: string,
    documentPath: string,
    _sectionSlug: string
  ): Promise<LinkAnalysisResult> {
    // Extract and validate links
    const linksFound = await this.extractAndValidateLinks(content, documentPath);

    // Analyze patterns and detect mistakes
    const syntaxHelp = this.analyzePatterns(content, linksFound);

    // Generate content-based suggestions
    const linkSuggestions = await this.generateLinkSuggestions(content, documentPath);

    return {
      links_found: linksFound,
      link_suggestions: linkSuggestions,
      syntax_help: syntaxHelp
    };
  }

  /**
   * Extract links from content and validate them
   */
  private async extractAndValidateLinks(
    content: string,
    documentPath: string
  ): Promise<LinkInfo[]> {
    const { resolveLinkWithContext } = await import('./link-utils.js');
    const linksFound: LinkInfo[] = [];

    // Extract potential links from content
    const linkPattern = /@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g;
    const matches = content.match(linkPattern) ?? [];

    // Validate each found link
    for (const linkText of matches) {
      try {
        const resolved = await resolveLinkWithContext(linkText, documentPath, this.manager);

        const linkInfo: LinkInfo = {
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

    return linksFound;
  }

  /**
   * Analyze content patterns and detect common mistakes
   */
  private analyzePatterns(content: string, linksFound: LinkInfo[]): LinkAnalysisResult['syntax_help'] {
    const detectedPatterns: string[] = [];
    const commonMistakes: string[] = [];

    // Check for @ symbols without valid links
    if (content.includes('@') && linksFound.length === 0) {
      detectedPatterns.push('@ symbol found but no valid link pattern detected');
      commonMistakes.push('Use @/path/doc.md or @#section format for links');
    }

    // Check for standard markdown links to .md files
    if (content.match(/\[.*\]\(\/.*\.md.*\)/)) {
      detectedPatterns.push('Standard markdown links to .md files detected');
      commonMistakes.push('Consider using @ syntax instead: @/path/doc.md');
    }

    return {
      detected_patterns: detectedPatterns,
      correct_examples: [
        '@/api/specs/user-api.md - Link to entire document',
        '@/api/guides/setup.md#configuration - Link to specific section',
        '@#implementation - Link to section in current document'
      ],
      common_mistakes: commonMistakes
    };
  }

  /**
   * Generate content-based link suggestions
   */
  private async generateLinkSuggestions(
    content: string,
    documentPath: string
  ): Promise<LinkAnalysisResult['link_suggestions']> {
    const linkSuggestions: LinkAnalysisResult['link_suggestions'] = [];

    // Extract keywords from content
    const keywords = this.extractContentKeywords(content);

    if (keywords.length > 0) {
      try {
        // Search for related documents based on content
        const searchResults = await this.manager.searchDocuments(keywords.slice(0, 3).join(' '), {
          searchIn: ['title', 'content'],
          fuzzy: true,
          groupByDocument: true
        });

        // Filter out current document and suggest top matches
        const relevantResults = searchResults
          .filter(result => result.documentPath !== documentPath)
          .slice(0, 3);

        for (const result of relevantResults) {
          const document = await this.manager.getDocument(result.documentPath);
          if (document) {
            try {
              const docAddress = parseDocumentAddress(result.documentPath);
              const targetNamespace = docAddress.namespace;

              // Determine placement hint based on content and namespace
              const placementHint = this.generatePlacementHint(content);

              linkSuggestions.push({
                suggested_link: `@${result.documentPath}`,
                target_document: result.documentTitle,
                rationale: `Related ${targetNamespace} document with shared concepts: ${keywords.slice(0, 2).join(', ')}`,
                placement_hint: placementHint
              });
            } catch {
              // Skip suggestions if address parsing fails
            }
          }
        }
      } catch {
        // Silently continue if search fails
      }
    }

    return linkSuggestions;
  }

  /**
   * Generate placement hint based on content context
   */
  private generatePlacementHint(content: string): string {
    if (content.includes('overview') || content.includes('introduction')) {
      return 'Consider adding to overview section for context';
    } else if (content.includes('implementation') || content.includes('example')) {
      return 'Reference in implementation details';
    } else if (content.includes('see also') || content.includes('related')) {
      return 'Perfect for "See Also" or "Related" sections';
    }
    return 'Add to relevant paragraph or list';
  }

  /**
   * Extract meaningful keywords from content for link suggestions
   */
  private extractContentKeywords(content: string): string[] {
    // Simple keyword extraction - remove markdown, get meaningful words
    const cleanContent = content
      .replace(/[#*`_[\]()]/g, ' ')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleanContent.split(' ').filter(word =>
      word.length > 3 &&
      !this.isStopWord(word) &&
      !word.match(/^\d+$/)
    );

    // Return unique words, limited to top 10
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'this', 'that', 'these', 'those', 'with', 'from', 'they', 'them', 'their',
      'have', 'been', 'were', 'will', 'would', 'could', 'should', 'might',
      'here', 'there', 'when', 'where', 'what', 'which', 'very', 'more',
      'most', 'some', 'such', 'only', 'just', 'like', 'into', 'over',
      'also', 'well', 'even', 'make', 'made', 'take', 'used', 'using'
    ]);

    return stopWords.has(word);
  }
}

/**
 * Convenience function to create link analysis service
 */
export function createLinkAnalysisService(manager: DocumentManager): LinkAnalysisService {
  return new LinkAnalysisService(manager);
}