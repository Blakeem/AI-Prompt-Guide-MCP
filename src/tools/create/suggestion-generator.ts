/**
 * Suggestion generator for create-document pipeline
 * Handles Stage 2.5 (Smart Suggestions) analysis and recommendations
 */

import { getDocumentManager, analyzeDocumentSuggestions, analyzeNamespacePatterns } from '../../shared/utilities.js';

/**
 * Smart suggestions result for Stage 2.5
 */
export interface SmartSuggestionsResult {
  stage: 'smart_suggestions';
  suggestions: Awaited<ReturnType<typeof analyzeDocumentSuggestions>>;
  namespace_patterns: Awaited<ReturnType<typeof analyzeNamespacePatterns>>;
  next_step: string;
  example: {
    namespace: string;
    title: string;
    overview: string;
    create: boolean;
  };
}

/**
 * Error result for suggestions analysis
 */
export interface SuggestionsErrorResult {
  stage: 'error_fallback';
  error: string;
  details: string;
  provided_parameters: {
    namespace: string;
    title: string;
    overview: string;
  };
  help: string;
  recovery_steps: string[];
  example: {
    namespace: string;
    title: string;
    overview: string;
    create: boolean;
  };
}


export type SuggestionsResult = SmartSuggestionsResult | SuggestionsErrorResult;

/**
 * Process Stage 2.5: Smart Suggestions - Analyze and suggest related documents
 */
export async function processSuggestions(
  namespace: string,
  title: string,
  overview: string
): Promise<SuggestionsResult> {
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

  } catch (error) {
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

