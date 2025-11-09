/**
 * Comprehensive link validation utilities for the Document Linking System
 */
import type { DocumentManager } from '../document-manager.js';
/**
 * Result of validating a single link
 */
interface LinkValidationResult {
    link_text: string;
    is_valid: boolean;
    target_document?: string;
    target_section?: string;
    validation_error?: string;
    suggestions?: string[];
    link_type: 'cross-doc' | 'within-doc' | 'external' | 'malformed';
}
/**
 * Result of validating all links in a document
 */
interface DocumentLinkReport {
    document_path: string;
    document_title: string;
    namespace: string;
    total_links: number;
    valid_links: number;
    broken_links: number;
    external_links: number;
    links: LinkValidationResult[];
    sections_with_broken_links: string[];
    health_score: number;
    recommendations: string[];
}
/**
 * Result of validating links across multiple documents
 */
interface SystemLinkReport {
    total_documents: number;
    total_links: number;
    overall_health_score: number;
    documents_with_issues: number;
    most_broken_documents: Array<{
        path: string;
        title: string;
        broken_count: number;
    }>;
    common_issues: Array<{
        issue_type: string;
        count: number;
        examples: string[];
    }>;
    document_reports: DocumentLinkReport[];
}
/**
 * Validate a single link with detailed analysis
 */
export declare function validateSingleLink(linkText: string, currentDocumentPath: string, manager: DocumentManager): Promise<LinkValidationResult>;
/**
 * Validate all links in a document and generate a comprehensive report
 */
export declare function validateDocumentLinks(documentPath: string, manager: DocumentManager): Promise<DocumentLinkReport>;
/**
 * Validate links across multiple documents or entire system
 */
export declare function validateSystemLinks(manager: DocumentManager, pathFilter?: string): Promise<SystemLinkReport>;
/**
 * Find and fix common link issues automatically
 */
export declare function autoFixLinks(documentPath: string, manager: DocumentManager, dryRun?: boolean): Promise<{
    fixes_found: number;
    fixes_applied: number;
    suggested_fixes: Array<{
        original_link: string;
        suggested_fix: string;
        reason: string;
        section: string;
    }>;
}>;
export {};
//# sourceMappingURL=link-validation.d.ts.map