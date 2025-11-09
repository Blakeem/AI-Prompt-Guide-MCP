/**
 * Browse modules - re-exports for clean imports
 */
// Dependency analyzer exports - only export what browse-documents.ts actually uses
export { analyzeDocumentLinks } from './dependency-analyzer.js';
// Content analyzer exports - only export what browse-documents.ts actually uses
export { findRelatedByContent, analyzeSectionContent } from './content-analyzer.js';
// Search engine exports
export { getSectionStructure } from './search-engine.js';
// Folder navigator exports - only export what browse-documents.ts actually uses
export { parseSectionPath, getFolderStructure } from './folder-navigator.js';
// Relationship classifier exports
export { classifyRelationship } from './relationship-classifier.js';
//# sourceMappingURL=index.js.map