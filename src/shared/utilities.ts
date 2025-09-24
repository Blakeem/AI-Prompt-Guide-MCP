/**
 * Shared utility functions for tool implementations
 *
 * This module now serves as a re-export hub for the modular utility functions.
 * The utilities have been split into focused modules for better maintainability.
 */

// Re-export section operations
export { performSectionEdit } from './section-operations.js';

// Re-export document manager factory
export { getDocumentManager } from './document-manager-factory.js';

// Re-export path utilities
export { pathToNamespace, pathToSlug } from './path-utilities.js';

// Re-export hierarchical slug utilities for convenience
export {
  splitSlugPath,
  getParentSlug,
  validateSlugPath
} from './slug-utils.js';

// Re-export link utilities for convenience
export {
  parseLink
} from './link-utils.js';

// Note: Link validation utilities removed as they are not currently used

// Re-export link context functionality
export { loadLinkedDocumentContext } from './link-context.js';

// Re-export document analysis functionality
export { analyzeDocumentSuggestions } from './document-analysis.js';

// Re-export namespace analysis functionality
export { analyzeNamespacePatterns } from './namespace-analysis.js';