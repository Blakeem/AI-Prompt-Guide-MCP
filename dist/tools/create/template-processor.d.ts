/**
 * Template processor for create-document pipeline
 * Handles template processing and content generation
 */
import type { DocumentManager } from '../../document-manager.js';
/**
 * Template processing result
 */
export interface TemplateProcessingResult {
    content: string;
    slug: string;
    docPath: string;
}
/**
 * Template processing error
 */
export interface TemplateProcessingError {
    error: string;
    details: string;
    provided_namespace: string;
}
/**
 * Process template content with variable substitution
 * Generates a blank document with title and overview
 */
export declare function processTemplate(namespace: string, title: string, overview: string, _manager: DocumentManager): Promise<TemplateProcessingResult | TemplateProcessingError>;
//# sourceMappingURL=template-processor.d.ts.map