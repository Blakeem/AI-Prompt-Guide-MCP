/**
 * Central schema repository for create_document tool progressive discovery
 */
import type { BrokenReference } from '../../shared/document-analysis.js';
export interface RelatedDocumentSuggestion {
    path: string;
    title: string;
    namespace: string;
    reason: string;
    relevance: number;
    sections_to_reference?: string[] | undefined;
    implementation_gap?: string | undefined;
}
export interface SmartSuggestions {
    related_documents: RelatedDocumentSuggestion[];
    broken_references: BrokenReference[];
}
export interface NamespacePatterns {
    common_sections: string[];
    frequent_links: string[];
    typical_tasks: string[];
}
interface CreateDocumentSchemaStage {
    stage: number;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
        additionalProperties: boolean;
    };
    responseExample?: Record<string, unknown>;
}
/**
 * Get schema for a specific stage
 */
export declare function getCreateDocumentSchema(stage: number): CreateDocumentSchemaStage;
/**
 * Determine current stage based on provided arguments
 */
export declare function determineCreateDocumentStage(args: Record<string, unknown>): number;
/**
 * Get next stage number for progression
 */
export declare function getNextCreateDocumentStage(currentStage: number): number;
/**
 * Get all document namespaces as array
 */
export declare function getDocumentNamespaces(): Array<{
    name: string;
    description: string;
}>;
/**
 * Get namespace configuration by ID
 */
export declare function getNamespaceConfig(namespaceId: string): {
    name: string;
    description: string;
} | null;
export {};
//# sourceMappingURL=create-document-schemas.d.ts.map