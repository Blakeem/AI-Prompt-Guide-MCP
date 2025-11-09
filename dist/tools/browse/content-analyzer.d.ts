/**
 * Content analysis and similarity detection for document relationships
 */
import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';
import type { RelatedDocument, CycleDetectionContext } from './dependency-analyzer.js';
/**
 * Find related documents by content similarity
 */
export declare function findRelatedByContent(manager: DocumentManager, docPath: string, currentDoc: CachedDocument, context: CycleDetectionContext): Promise<RelatedDocument[]>;
/**
 * Extract keywords from text for content similarity analysis
 */
export declare function extractKeywords(text: string): string[];
/**
 * Check if a word is a stop word (common words to ignore)
 */
export declare function isStopWord(word: string): boolean;
/**
 * Analyze section content for metadata
 */
export declare function analyzeSectionContent(content: string): {
    has_code_blocks: boolean;
    has_links: boolean;
    content_preview: string;
};
//# sourceMappingURL=content-analyzer.d.ts.map