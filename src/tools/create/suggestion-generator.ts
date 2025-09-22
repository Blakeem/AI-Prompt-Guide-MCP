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
  link_guidance: LinkGuidance;
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

/**
 * Link guidance structure
 */
export interface LinkGuidance {
  recommended_links: Array<{
    link_syntax: string;
    target_document: string;
    placement_suggestion: string;
    rationale: string;
  }>;
  syntax_guide: {
    cross_document: string;
    within_document: string;
    examples: string[];
  };
  placement_recommendations: {
    overview_section: string[];
    reference_sections: string[];
    implementation_notes: string[];
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

    // Generate link guidance based on suggestions
    const linkGuidance = generateLinkGuidance(suggestions, namespace);

    return {
      stage: 'smart_suggestions',
      suggestions,
      namespace_patterns: namespacePatterns,
      link_guidance: linkGuidance,
      next_step: "Review suggestions and link recommendations, then call again with 'create: true' to proceed with document creation",
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

/**
 * Generate specific link guidance based on document suggestions
 */
function generateLinkGuidance(
  suggestions: Awaited<ReturnType<typeof analyzeDocumentSuggestions>>,
  namespace: string
): LinkGuidance {
  const recommendedLinks: Array<{
    link_syntax: string;
    target_document: string;
    placement_suggestion: string;
    rationale: string;
  }> = [];

  // Process related documents for link recommendations
  for (const relatedDoc of suggestions.related_documents.slice(0, 3)) { // Top 3 related docs
    const linkSyntax = `@${relatedDoc.path}`;

    // Determine optimal placement based on relationship and namespace
    let placementSuggestion = '';
    let rationale = '';

    if (relatedDoc.namespace !== namespace) {
      // Cross-namespace linking
      if (namespace === 'api/specs' && relatedDoc.namespace.includes('guide')) {
        placementSuggestion = 'Add to "Implementation" or "Usage" section';
        rationale = 'Implementation guides provide practical examples for API usage';
      } else if (namespace === 'api/guides' && relatedDoc.namespace.includes('spec')) {
        placementSuggestion = 'Add to "Prerequisites" or reference in step descriptions';
        rationale = 'API specifications provide the foundation for implementation guides';
      } else if (namespace.includes('frontend') && relatedDoc.namespace.includes('api')) {
        placementSuggestion = 'Add to "API Integration" or "Data Fetching" sections';
        rationale = 'API documentation needed for frontend data integration';
      } else {
        placementSuggestion = 'Add to "Overview" or "Related Documentation" section';
        rationale = `Related ${relatedDoc.namespace} documentation provides additional context`;
      }
    } else {
      // Same-namespace linking
      placementSuggestion = 'Add to "Related" or "See Also" section';
      rationale = `Similar ${namespace} implementation with relevant patterns`;
    }

    recommendedLinks.push({
      link_syntax: linkSyntax,
      target_document: relatedDoc.title,
      placement_suggestion: placementSuggestion,
      rationale
    });
  }

  // Process similar implementations for internal references
  for (const similar of suggestions.similar_implementations.slice(0, 2)) { // Top 2 similar
    if (similar.reusable_patterns.length > 0) {
      const linkSyntax = `@${similar.path}`;
      recommendedLinks.push({
        link_syntax: linkSyntax,
        target_document: similar.title,
        placement_suggestion: 'Reference in implementation sections where patterns apply',
        rationale: `Shares proven patterns: ${similar.reusable_patterns.slice(0, 2).join(', ')}`
      });
    }
  }

  // Process missing pieces for forward-looking links
  for (const missing of suggestions.missing_pieces.slice(0, 2)) { // Top 2 missing pieces
    if (missing.priority === 'high' || missing.priority === 'medium') {
      const linkSyntax = `@${missing.suggested_path}`;
      recommendedLinks.push({
        link_syntax: linkSyntax,
        target_document: missing.title,
        placement_suggestion: 'Add as "TODO: Link to..." in relevant sections',
        rationale: `${missing.reason} - create this document to complete the ecosystem`
      });
    }
  }

  // Generate placement recommendations based on namespace
  const placementRecommendations = generatePlacementRecommendations(namespace);

  return {
    recommended_links: recommendedLinks,
    syntax_guide: {
      cross_document: '@/path/to/document.md - Links to entire document',
      within_document: '@#section-slug - Links to section within current document',
      examples: [
        '@/api/specs/user-api.md - Reference the User API specification',
        '@/api/guides/auth-setup.md#authentication - Link to auth section in setup guide',
        '@#implementation - Link to implementation section in current document',
        '@/frontend/components/button.md#props-interface - Link to specific component props'
      ]
    },
    placement_recommendations: placementRecommendations
  };
}

/**
 * Generate namespace-specific placement recommendations
 */
function generatePlacementRecommendations(namespace: string): {
  overview_section: string[];
  reference_sections: string[];
  implementation_notes: string[];
} {
  const baseRecommendations = {
    overview_section: [
      'Link to foundational concepts and prerequisites',
      'Reference related specifications or parent documents',
      'Connect to broader system architecture'
    ],
    reference_sections: [
      'Create "Related Documentation" section with relevant links',
      'Add "See Also" section for similar implementations',
      'Include "External Resources" for additional context'
    ],
    implementation_notes: [
      'Link to specific sections when referencing implementation details',
      'Use within-document links (@#section) for cross-references',
      'Add TODO links for planned documentation that doesn\'t exist yet'
    ]
  };

  // Namespace-specific enhancements
  switch (namespace) {
    case 'api/specs':
      return {
        ...baseRecommendations,
        overview_section: [
          ...baseRecommendations.overview_section,
          'Link to related API specifications in the same system',
          'Reference authentication and authorization documents'
        ],
        reference_sections: [
          ...baseRecommendations.reference_sections,
          'Link to implementation guides that will use this API',
          'Reference data models and schema definitions'
        ]
      };

    case 'api/guides':
      return {
        ...baseRecommendations,
        overview_section: [
          ...baseRecommendations.overview_section,
          'Link to API specifications being implemented',
          'Reference prerequisite setup and configuration guides'
        ],
        implementation_notes: [
          ...baseRecommendations.implementation_notes,
          'Link to specific API endpoints in code examples',
          'Reference troubleshooting guides for common issues'
        ]
      };

    case 'frontend/components':
      return {
        ...baseRecommendations,
        reference_sections: [
          ...baseRecommendations.reference_sections,
          'Link to design system and styling guides',
          'Reference API documentation for data-driven components'
        ],
        implementation_notes: [
          ...baseRecommendations.implementation_notes,
          'Link to usage examples in other components',
          'Reference accessibility and testing documentation'
        ]
      };

    case 'backend/services':
      return {
        ...baseRecommendations,
        overview_section: [
          ...baseRecommendations.overview_section,
          'Link to system architecture and service dependencies',
          'Reference data layer and database specifications'
        ],
        reference_sections: [
          ...baseRecommendations.reference_sections,
          'Link to API specifications this service implements',
          'Reference deployment and infrastructure documentation'
        ]
      };

    default:
      return baseRecommendations;
  }
}