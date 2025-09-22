/**
 * Browse modules - re-exports for clean imports
 */

// Dependency analyzer exports
export {
  detectCycles,
  findForwardLinks,
  findBackwardLinks,
  buildDependencyChain,
  determineCompletionStatus,
  analyzeDocumentLinks,
  type CycleDetectionContext,
  type RelatedDocument,
  type RelationshipType,
  type DependencyNode,
  type RelatedDocuments
} from './dependency-analyzer.js';

// Content analyzer exports
export {
  findRelatedByContent,
  extractKeywords,
  isStopWord,
  analyzeSectionContent,
  assessImplementationReadiness,
  type ImplementationReadiness
} from './content-analyzer.js';

// Search engine exports
export {
  performSearch,
  getSectionStructure,
  type SearchMatch,
  type DocumentInfo,
  type SectionInfo
} from './search-engine.js';

// Folder navigator exports
export {
  parseSectionPath,
  generateBreadcrumb,
  getParentPath,
  directoryExists,
  getFolderStructure,
  type FolderInfo
} from './folder-navigator.js';

// Relationship classifier exports
export {
  classifyRelationship
} from './relationship-classifier.js';