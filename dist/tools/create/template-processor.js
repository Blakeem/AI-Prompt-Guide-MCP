/**
 * Template processor for create-document pipeline
 * Handles template processing and content generation
 */
import { parseDocumentAddress, AddressingError } from '../../shared/addressing-system.js';
/**
 * Blank document template with title and overview only
 */
const BLANK_TEMPLATE = `# {{title}}

{{overview}}`;
/**
 * Process template content with variable substitution
 * Generates a blank document with title and overview
 */
export async function processTemplate(namespace, title, overview, _manager) {
    try {
        // Import slug utilities
        const { titleToSlug } = await import('../../slug.js');
        const { PATH_PREFIXES } = await import('../../shared/namespace-constants.js');
        const { normalizeNamespace } = await import('./validation-processor.js');
        // Generate path from title and namespace
        const slug = titleToSlug(title);
        // Normalize namespace (strip leading slashes)
        const cleanNamespace = normalizeNamespace(namespace);
        // MCP paths are relative to base folders - no prefix in logical path
        // Coordinator handling will be updated in separate task to make it symmetric
        let docPath;
        if (cleanNamespace.startsWith('coordinator')) {
            // Keep coordinator explicit for now (will be updated to relative path later)
            docPath = `/${PATH_PREFIXES.COORDINATOR.slice(1, -1)}/${slug}.md`;
        }
        else if (cleanNamespace === '') {
            // Empty namespace - root level document
            docPath = `/${slug}.md`;
        }
        else {
            // Regular namespace - direct path without /docs/ prefix
            docPath = `/${cleanNamespace}/${slug}.md`;
        }
        // Validate the generated document path using addressing system
        try {
            parseDocumentAddress(docPath);
        }
        catch (error) {
            if (error instanceof AddressingError) {
                return {
                    error: 'Generated document path is invalid',
                    details: error.message,
                    provided_namespace: namespace
                };
            }
            throw error; // Re-throw non-addressing errors
        }
        // Generate blank document with title and overview
        const content = BLANK_TEMPLATE
            .replace(/\{\{title\}\}/g, title)
            .replace(/\{\{overview\}\}/g, overview);
        return {
            content,
            slug,
            docPath
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            error: 'Template processing failed',
            details: message,
            provided_namespace: namespace
        };
    }
}
//# sourceMappingURL=template-processor.js.map