/**
 * Document analysis and smart suggestions functionality
 *
 * @deprecated This file is maintained for backward compatibility only.
 * Import from 'shared/document-analysis/index.js' instead.
 *
 * The document analysis functionality has been refactored into focused modules:
 * - index.ts: Main orchestrator and exports
 * - related-docs.ts: Related document discovery
 * - reference-validation.ts: Broken reference detection
 * - keyword-utils.ts: Enhanced keyword extraction and relevance scoring
 * - types.ts: Shared interfaces and error classes
 */

// Re-export everything from the modular structure for backward compatibility
export {
  analyzeDocumentSuggestions,
  DocumentAnalysisError,
  type BrokenReference,
  type AnalysisResult
} from './document-analysis/index.js';
