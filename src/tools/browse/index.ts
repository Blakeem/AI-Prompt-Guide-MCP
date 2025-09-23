/**
 * Browse modules - re-exports for clean imports
 */

// Dependency analyzer exports - only export what browse-documents.ts actually uses
export {
  analyzeDocumentLinks,
  type RelatedDocuments
} from './dependency-analyzer.js';

// ts-unused-exports:disable-next-line
export type { RelatedDocument, RelationshipType } from './dependency-analyzer.js';

// Content analyzer exports - only export what browse-documents.ts actually uses
export {
  findRelatedByContent,
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

// Folder navigator exports - only export what browse-documents.ts actually uses
export {
  parseSectionPath,
  generateBreadcrumb,
  getParentPath,
  getFolderStructure,
  type FolderInfo
} from './folder-navigator.js';

// Relationship classifier exports
export {
  classifyRelationship
} from './relationship-classifier.js';