/**
 * Related document discovery using two-stage fingerprint-based filtering
 *
 * Provides efficient discovery of related documents using fingerprint-based
 * initial filtering followed by full content analysis for high-signal candidates.
 */
import type { DocumentManager } from '../../document-manager.js';
import type { RelatedDocumentSuggestion } from '../../tools/schemas/create-document-schemas.js';
/**
 * Find related documents using two-stage fingerprint-based filtering
 *
 * Uses efficient fingerprint-based initial filtering followed by full content
 * analysis only for high-signal candidates. This significantly improves performance
 * for large document sets while maintaining result quality.
 *
 * @param manager - Document manager for accessing documents
 * @param _namespace - Target namespace (kept for compatibility, not used)
 * @param title - Document title for keyword extraction
 * @param overview - Document overview for keyword extraction
 * @param excludePath - Optional document path to exclude from results (e.g., the document being created)
 *
 * @returns Promise resolving to array of related document suggestions
 *
 * @throws {DocumentAnalysisError} When document listing fails or critical operations fail
 */
export declare function findRelatedDocuments(manager: DocumentManager, _namespace: string, title: string, overview: string, excludePath?: string): Promise<RelatedDocumentSuggestion[]>;
//# sourceMappingURL=related-docs.d.ts.map