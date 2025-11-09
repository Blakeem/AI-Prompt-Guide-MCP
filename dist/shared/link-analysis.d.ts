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
/**
 * Standard link syntax examples for consistent documentation
 * Shared across link analysis and section operations
 */
export declare const LINK_SYNTAX_EXAMPLES: readonly ["@/api/specs/user-api.md - Link to entire document", "@/api/guides/setup.md#configuration - Link to specific section", "@#implementation - Link to section in current document"];
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
 * Main link analysis service
 */
declare class LinkAnalysisService {
    private readonly manager;
    constructor(manager: DocumentManager);
    /**
     * Perform comprehensive link analysis on content
     */
    analyzeLinks(content: string, documentPath: string): Promise<LinkAnalysisResult>;
    /**
     * Extract links from content and validate them using unified ReferenceExtractor
     */
    private extractAndValidateLinks;
    /**
     * Analyze content patterns and detect common mistakes
     */
    private analyzePatterns;
    /**
     * Generate content-based link suggestions
     */
    private generateLinkSuggestions;
    /**
     * Generate placement hint based on content context
     */
    private generatePlacementHint;
    /**
     * Extract meaningful keywords from content for link suggestions
     */
    private extractContentKeywords;
    /**
     * Check if word is a stop word
     */
    private isStopWord;
}
/**
 * Convenience function to create link analysis service
 * Note: Used via dynamic import in section.ts for performance optimization
 */
export declare function createLinkAnalysisService(manager: DocumentManager): LinkAnalysisService;
export {};
//# sourceMappingURL=link-analysis.d.ts.map