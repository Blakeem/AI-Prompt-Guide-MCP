/**
 * Suggestion generator for create-document pipeline
 * Handles Stage 2.5 (Smart Suggestions) analysis and recommendations
 */
import { getDocumentManager, analyzeDocumentSuggestions, analyzeNamespacePatterns } from '../../shared/utilities.js';
/**
 * Process Stage 2.5: Smart Suggestions - Analyze and suggest related documents
 */
export async function processSuggestions(namespace, title, overview) {
    try {
        const manager = await getDocumentManager();
        // Analyze suggestions in parallel with namespace patterns
        const [suggestions, namespacePatterns] = await Promise.all([
            analyzeDocumentSuggestions(manager, namespace, title, overview),
            analyzeNamespacePatterns(manager, namespace)
        ]);
        return {
            stage: 'smart_suggestions',
            suggestions,
            namespace_patterns: namespacePatterns,
            next_step: "Review suggestions, then call again with 'create: true' to proceed with document creation",
            example: {
                namespace,
                title,
                overview,
                create: true
            }
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            stage: 'error_fallback',
            error: 'Failed to analyze suggestions',
            details: message,
            provided_parameters: {
                namespace,
                title,
                overview
            },
            help: 'Suggestion analysis failed. You can still proceed with document creation.',
            recovery_steps: [
                "Call again with 'create: true' to skip suggestions and create the document",
                'Check that the namespace, title, and overview are valid',
                'Try with a simpler title or overview if the analysis is having issues'
            ],
            example: { namespace, title, overview, create: true }
        };
    }
}
//# sourceMappingURL=suggestion-generator.js.map