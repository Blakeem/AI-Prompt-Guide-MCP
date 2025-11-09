/**
 * Suggestion generator for create-document pipeline
 * Handles Stage 2.5 (Smart Suggestions) analysis and recommendations
 */
import { analyzeDocumentSuggestions, analyzeNamespacePatterns } from '../../shared/utilities.js';
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
export declare function processSuggestions(namespace: string, title: string, overview: string): Promise<SuggestionsResult>;
//# sourceMappingURL=suggestion-generator.d.ts.map