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
import { parseDocumentAddress } from './addressing-system.js';
/**
 * Standard link syntax examples for consistent documentation
 * Shared across link analysis and section operations
 */
export const LINK_SYNTAX_EXAMPLES = [
    '@/api/specs/user-api.md - Link to entire document',
    '@/api/guides/setup.md#configuration - Link to specific section',
    '@#implementation - Link to section in current document'
];
/**
 * Main link analysis service
 */
class LinkAnalysisService {
    manager;
    constructor(manager) {
        this.manager = manager;
    }
    /**
     * Perform comprehensive link analysis on content
     */
    async analyzeLinks(content, documentPath) {
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
     * Extract links from content and validate them using unified ReferenceExtractor
     */
    async extractAndValidateLinks(content, documentPath) {
        const { resolveLinkWithContext } = await import('./link-utils.js');
        const { ReferenceExtractor } = await import('./reference-extractor.js');
        const extractor = new ReferenceExtractor();
        const linksFound = [];
        // Extract references using unified system
        const refs = extractor.extractReferences(content);
        const normalized = extractor.normalizeReferences(refs, documentPath);
        // Validate each found link using existing validation logic
        for (const normalizedRef of normalized) {
            try {
                const resolved = await resolveLinkWithContext(normalizedRef.originalRef, documentPath, this.manager);
                const linkInfo = {
                    link_text: normalizedRef.originalRef,
                    is_valid: resolved.validation.valid
                };
                if (resolved.validation.valid && resolved.resolvedPath) {
                    const hashIndex = resolved.resolvedPath.indexOf('#');
                    if (hashIndex === -1) {
                        linkInfo.target_document = resolved.resolvedPath;
                    }
                    else {
                        linkInfo.target_document = resolved.resolvedPath.slice(0, hashIndex);
                        linkInfo.target_section = resolved.resolvedPath.slice(hashIndex + 1);
                    }
                }
                else {
                    linkInfo.validation_error = resolved.validation.error ?? 'Unknown validation error';
                }
                linksFound.push(linkInfo);
            }
            catch (error) {
                linksFound.push({
                    link_text: normalizedRef.originalRef,
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
    analyzePatterns(content, linksFound) {
        const detectedPatterns = [];
        const commonMistakes = [];
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
            correct_examples: [...LINK_SYNTAX_EXAMPLES],
            common_mistakes: commonMistakes
        };
    }
    /**
     * Generate content-based link suggestions
     */
    async generateLinkSuggestions(content, documentPath) {
        const linkSuggestions = [];
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
                        }
                        catch {
                            // Skip suggestions if address parsing fails
                        }
                    }
                }
            }
            catch {
                // Silently continue if search fails
            }
        }
        return linkSuggestions;
    }
    /**
     * Generate placement hint based on content context
     */
    generatePlacementHint(content) {
        if (content.includes('overview') || content.includes('introduction')) {
            return 'Consider adding to overview section for context';
        }
        else if (content.includes('implementation') || content.includes('example')) {
            return 'Reference in implementation details';
        }
        else if (content.includes('see also') || content.includes('related')) {
            return 'Perfect for "See Also" or "Related" sections';
        }
        return 'Add to relevant paragraph or list';
    }
    /**
     * Extract meaningful keywords from content for link suggestions
     */
    extractContentKeywords(content) {
        // Simple keyword extraction - remove markdown, get meaningful words
        const cleanContent = content
            .replace(/[#*`_[\]()]/g, ' ')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const words = cleanContent.split(' ').filter(word => word.length > 3 &&
            !this.isStopWord(word) &&
            !word.match(/^\d+$/));
        // Return unique words, limited to top 10
        return [...new Set(words)].slice(0, 10);
    }
    /**
     * Check if word is a stop word
     */
    isStopWord(word) {
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
 * Note: Used via dynamic import in section.ts for performance optimization
 */
export function createLinkAnalysisService(manager) {
    return new LinkAnalysisService(manager);
}
//# sourceMappingURL=link-analysis.js.map