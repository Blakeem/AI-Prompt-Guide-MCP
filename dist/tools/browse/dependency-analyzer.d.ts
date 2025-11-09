/**
 * Dependency analysis and cycle detection for document linking
 */
import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';
export interface CycleDetectionContext {
    visited: Set<string>;
    currentPath: string[];
    depth: number;
    maxDepth: number;
}
export interface RelatedDocument {
    path: string;
    title: string;
    namespace: string;
    relationship: RelationshipType;
    relevance?: number;
    sections_linked?: string[];
    sections_linking?: string[];
    tasks_linked?: number;
    completion_status?: string;
    shared_concepts?: string[];
}
export type RelationshipType = 'implements_spec' | 'implementation_guide' | 'consumes_api' | 'depends_on' | 'references' | 'similar_content';
export interface DependencyNode {
    sequence: number;
    path: string;
    title: string;
    status: 'completed' | 'in_progress' | 'pending';
    blocks?: string[];
    depends_on?: string[];
}
export interface RelatedDocuments {
    forward_links: RelatedDocument[];
    backward_links: RelatedDocument[];
    related_by_content: RelatedDocument[];
    dependency_chain: DependencyNode[];
}
/**
 * Detect cycles in document traversal to prevent infinite loops
 */
export declare function detectCycles(context: CycleDetectionContext, targetPath: string): boolean;
/**
 * Find forward links - documents that this document references
 */
export declare function findForwardLinks(manager: DocumentManager, docPath: string, document: CachedDocument, context: CycleDetectionContext, classifyRelationship: (fromDocPath: string, toDocPath: string, linkText: string, toDocTitle: string) => RelationshipType): Promise<RelatedDocument[]>;
/**
 * Find backward links - documents that reference this document
 */
export declare function findBackwardLinks(manager: DocumentManager, docPath: string, context: CycleDetectionContext, classifyRelationship: (fromDocPath: string, toDocPath: string, linkText: string, toDocTitle: string) => RelationshipType): Promise<RelatedDocument[]>;
/**
 * Build dependency chain from related documents
 */
export declare function buildDependencyChain(relatedDocs: RelatedDocument[]): DependencyNode[];
/**
 * Determine completion status of a document based on available information
 */
export declare function determineCompletionStatus(doc: RelatedDocument): 'completed' | 'in_progress' | 'pending';
/**
 * Main function to analyze document links and relationships
 */
export declare function analyzeDocumentLinks(manager: DocumentManager, docPath: string, linkDepth: number, classifyRelationship: (fromDocPath: string, toDocPath: string, linkText: string, toDocTitle: string) => RelationshipType, findRelatedByContent: (manager: DocumentManager, docPath: string, currentDoc: CachedDocument, context: CycleDetectionContext) => Promise<RelatedDocument[]>): Promise<RelatedDocuments | null>;
//# sourceMappingURL=dependency-analyzer.d.ts.map