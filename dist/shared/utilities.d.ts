/**
 * Shared utility functions for tool implementations
 *
 * This module now serves as a re-export hub for the modular utility functions.
 * The utilities have been split into focused modules for better maintainability.
 */
export { performSectionEdit } from './section-operations.js';
export { getDocumentManager, createDocumentManager } from './document-manager-factory.js';
export { pathToNamespace, pathToSlug } from './path-utilities.js';
export { getParentSlug } from './slug-utils.js';
export { loadLinkedDocumentContext } from './link-context.js';
export { analyzeDocumentSuggestions } from './document-analysis.js';
export { analyzeNamespacePatterns } from './namespace-analysis.js';
//# sourceMappingURL=utilities.d.ts.map