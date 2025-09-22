/**
 * Document analysis and smart suggestions functionality
 */

import type { DocumentManager } from '../document-manager.js';
import type {
  SmartSuggestions,
  RelatedDocumentSuggestion,
  SimilarImplementationSuggestion,
  MissingPieceSuggestion,
  ImplementationStep
} from '../tools/schemas/create-document-schemas.js';
import { pathToNamespace } from './path-utilities.js';

/**
 * Main orchestration function for document suggestions analysis
 */
export async function analyzeDocumentSuggestions(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string
): Promise<SmartSuggestions> {
  // Collect all analysis in parallel for performance
  const [relatedDocs, similarImplementations] = await Promise.all([
    findRelatedDocuments(manager, namespace, title, overview),
    findSimilarImplementations(manager, namespace, title, overview)
  ]);

  // Identify missing pieces based on related documents and patterns
  const missingPieces = await identifyMissingPieces(manager, namespace, title, overview, relatedDocs);

  // Generate implementation sequence based on all analysis
  const implementationSequence = generateImplementationSequence(relatedDocs, missingPieces, namespace, title);

  return {
    related_documents: relatedDocs,
    similar_implementations: similarImplementations,
    missing_pieces: missingPieces,
    implementation_sequence: implementationSequence
  };
}

/**
 * Find related documents across namespaces that should be referenced or implemented
 */
async function findRelatedDocuments(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string
): Promise<RelatedDocumentSuggestion[]> {
  // Content fingerprinting - extract keywords and concepts
  const keywords = extractKeywords(title, overview);
  const suggestions: RelatedDocumentSuggestion[] = [];

  try {
    // Get all documents across namespaces
    const allDocuments = await manager.listDocuments();

    for (const docInfo of allDocuments) {
      // Skip documents in the same namespace for related docs analysis
      const docNamespace = pathToNamespace(docInfo.path);
      if (docNamespace === namespace) {
        continue;
      }

      const document = await manager.getDocument(docInfo.path);
      if (document == null) continue;

      // For content analysis, we need to read the actual content
      const content = await manager.getSectionContent(docInfo.path, '') ?? '';

      // Calculate relevance based on title and content overlap
      const relevance = calculateContentRelevance(keywords, document.metadata.title, content);

      if (relevance > 0.3) { // Only include moderately relevant or higher
        // Determine relationship type and implementation gap
        const relationship = analyzeDocumentRelationship(namespace, docNamespace, title, document.metadata.title);

        const suggestion: RelatedDocumentSuggestion = {
          path: docInfo.path,
          title: document.metadata.title,
          namespace: docNamespace,
          reason: relationship.reason,
          relevance: Math.round(relevance * 100) / 100
        };

        if (relationship.sectionsToReference != null) {
          suggestion.sections_to_reference = relationship.sectionsToReference;
        }

        if (relationship.implementationGap != null) {
          suggestion.implementation_gap = relationship.implementationGap;
        }

        suggestions.push(suggestion);
      }
    }

    // Sort by relevance and return top 5
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);

  } catch (error) {
    // Return empty array on error instead of throwing
    console.warn('Error finding related documents:', error);
    return [];
  }
}

/**
 * Find similar implementations within the same namespace
 */
async function findSimilarImplementations(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string
): Promise<SimilarImplementationSuggestion[]> {
  const keywords = extractKeywords(title, overview);
  const suggestions: SimilarImplementationSuggestion[] = [];

  try {
    // Get documents in the same namespace
    const allDocuments = await manager.listDocuments();
    const namespaceDocuments = allDocuments.filter(docInfo => pathToNamespace(docInfo.path) === namespace);

    for (const docInfo of namespaceDocuments) {
      const document = await manager.getDocument(docInfo.path);
      if (document == null) continue;

      // For content analysis, we need to read the actual content
      const content = await manager.getSectionContent(docInfo.path, '') ?? '';

      // Calculate similarity based on content patterns
      const relevance = calculateContentRelevance(keywords, document.metadata.title, content);

      if (relevance > 0.2) { // Lower threshold for same namespace
        const patterns = extractReusablePatterns(content, namespace);

        suggestions.push({
          path: docInfo.path,
          title: document.metadata.title,
          namespace,
          reason: generateSimilarityReason(namespace, title, document.metadata.title, patterns),
          relevance: Math.round(relevance * 100) / 100,
          reusable_patterns: patterns
        });
      }
    }

    // Sort by relevance and return top 3
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);

  } catch (error) {
    console.warn('Error finding similar implementations:', error);
    return [];
  }
}

/**
 * Identify missing pieces in the documentation ecosystem
 */
async function identifyMissingPieces(
  manager: DocumentManager,
  namespace: string,
  title: string,
  overview: string,
  relatedDocs: RelatedDocumentSuggestion[]
): Promise<MissingPieceSuggestion[]> {
  const missingPieces: MissingPieceSuggestion[] = [];

  try {
    // Cross-namespace gap analysis
    const gapAnalysis = await performGapAnalysis(manager, namespace, title, overview, relatedDocs);
    missingPieces.push(...gapAnalysis);

    // Namespace-specific missing pieces
    const namespacePieces = identifyNamespaceMissingPieces(namespace, title, relatedDocs);
    missingPieces.push(...namespacePieces);

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return missingPieces
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 4); // Limit to top 4 suggestions

  } catch (error) {
    console.warn('Error identifying missing pieces:', error);
    return [];
  }
}

/**
 * Generate logical implementation sequence
 */
function generateImplementationSequence(
  relatedDocs: RelatedDocumentSuggestion[],
  missingPieces: MissingPieceSuggestion[],
  namespace: string,
  title: string
): ImplementationStep[] {
  const steps: ImplementationStep[] = [];
  let order = 1;

  // Step 1: Always start with current document
  steps.push({
    order: order++,
    action: getNamespaceAction(namespace),
    document: `Current document (${title})`,
    focus: getNamespaceFocus(namespace)
  });

  // Step 2: Add high-priority missing pieces
  const highPriorityPieces = missingPieces.filter(piece => piece.priority === 'high');
  for (const piece of highPriorityPieces.slice(0, 2)) { // Limit to 2 high priority
    const step: ImplementationStep = {
      order: order++,
      action: `Create ${piece.type}`,
      document: piece.suggested_path,
      focus: piece.reason
    };

    const defaultSections = getDefaultSectionsForType(piece.type);
    if (defaultSections.length > 0) {
      step.sections = defaultSections;
    }

    steps.push(step);
  }

  // Step 3: Reference related documents
  const topRelated = relatedDocs.slice(0, 2); // Top 2 related docs
  for (const related of topRelated) {
    if (related.implementation_gap != null) {
      const step: ImplementationStep = {
        order: order++,
        action: 'Reference and implement',
        document: related.path,
        focus: related.implementation_gap ?? 'Reference for implementation patterns'
      };

      if (related.sections_to_reference != null) {
        step.sections = related.sections_to_reference;
      }

      steps.push(step);
    }
  }

  return steps.slice(0, 4); // Limit to 4 steps for clarity
}

// Helper functions for suggestion analysis

/**
 * Extract keywords and concepts from title and overview
 */
function extractKeywords(title: string, overview: string): string[] {
  const text = `${title} ${overview}`.toLowerCase();
  const words = text.split(/\s+/).filter(word => word.length > 2);

  // Remove common words and focus on meaningful terms
  const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'will', 'can', 'are', 'you', 'how', 'what', 'when', 'where']);
  return words.filter(word => !stopWords.has(word));
}

/**
 * Calculate content relevance based on keyword overlap
 */
function calculateContentRelevance(keywords: string[], title: string, content: string): number {
  const targetText = `${title} ${content}`.toLowerCase();
  const matches = keywords.filter(keyword => targetText.includes(keyword));
  return matches.length / Math.max(keywords.length, 1);
}

/**
 * Analyze relationship between documents
 */
function analyzeDocumentRelationship(
  sourceNamespace: string,
  targetNamespace: string,
  _sourceTitle: string,
  _targetTitle: string
): { reason: string; sectionsToReference?: string[]; implementationGap?: string } {
  // API specs → guides relationship
  if (sourceNamespace === 'api/specs' && targetNamespace === 'api/guides') {
    return {
      reason: 'Related API implementation guide with proven patterns',
      sectionsToReference: ['#setup', '#implementation', '#testing'],
      implementationGap: 'Create implementation guide based on this API spec'
    };
  }

  // API specs → services relationship
  if (sourceNamespace === 'api/specs' && targetNamespace === 'backend/services') {
    return {
      reason: 'Backend service implementing similar API patterns',
      sectionsToReference: ['#architecture', '#data-layer'],
      implementationGap: 'Design service architecture for this API'
    };
  }

  // Guides → components relationship
  if (sourceNamespace === 'api/guides' && targetNamespace === 'frontend/components') {
    return {
      reason: 'Frontend component consuming this API functionality',
      sectionsToReference: ['#usage-examples', '#props-interface']
    };
  }

  // Default relationship
  return {
    reason: `Similar functionality and patterns in ${targetNamespace}`,
    sectionsToReference: ['#overview']
  };
}

/**
 * Extract reusable patterns from document content
 */
function extractReusablePatterns(content: string, namespace: string): string[] {
  const patterns: string[] = [];

  // Common patterns by namespace
  if (namespace === 'api/specs') {
    if (content.includes('authentication')) patterns.push('Authentication patterns');
    if (content.includes('rate limit')) patterns.push('Rate limiting');
    if (content.includes('pagination')) patterns.push('Pagination');
    if (content.includes('webhook')) patterns.push('Webhook handling');
  } else if (namespace === 'api/guides') {
    if (content.includes('step')) patterns.push('Step-by-step structure');
    if (content.includes('test')) patterns.push('Testing approach');
    if (content.includes('troubleshoot')) patterns.push('Troubleshooting flow');
  } else if (namespace === 'frontend/components') {
    if (content.includes('props')) patterns.push('Props interface design');
    if (content.includes('accessibility')) patterns.push('Accessibility patterns');
    if (content.includes('theme')) patterns.push('Theme integration');
  }

  return patterns;
}

/**
 * Generate similarity reason based on patterns
 */
function generateSimilarityReason(
  namespace: string,
  _title: string,
  _similarTitle: string,
  patterns: string[]
): string {
  if (patterns.length === 0) {
    return `Similar ${namespace} document with comparable structure`;
  }

  return `Shares proven patterns: ${patterns.slice(0, 2).join(', ')}`;
}

/**
 * Perform gap analysis to find missing documents
 */
async function performGapAnalysis(
  _manager: DocumentManager,
  namespace: string,
  title: string,
  _overview: string,
  relatedDocs: RelatedDocumentSuggestion[]
): Promise<MissingPieceSuggestion[]> {
  const gaps: MissingPieceSuggestion[] = [];

  // API spec → implementation guide gap
  if (namespace === 'api/specs') {
    const guideExists = relatedDocs.some(doc => doc.namespace === 'api/guides');
    if (!guideExists) {
      const { titleToSlug } = await import('../slug.js');
      const slug = titleToSlug(title);
      gaps.push({
        type: 'guide',
        suggested_path: `/api/guides/${slug}-implementation.md`,
        title: `${title} Implementation Guide`,
        reason: 'No implementation guide exists for this API specification',
        priority: 'high'
      });
    }
  }

  // Guide → troubleshooting gap
  if (namespace === 'api/guides' || namespace === 'frontend/components') {
    const troubleshootingExists = relatedDocs.some(doc => doc.namespace === 'docs/troubleshooting');
    if (!troubleshootingExists) {
      const { titleToSlug } = await import('../slug.js');
      const slug = titleToSlug(title);
      gaps.push({
        type: 'troubleshooting',
        suggested_path: `/docs/troubleshooting/${slug}-issues.md`,
        title: `${title} Common Issues`,
        reason: 'No troubleshooting documentation exists for this implementation',
        priority: 'medium'
      });
    }
  }

  return gaps;
}

/**
 * Identify namespace-specific missing pieces
 */
function identifyNamespaceMissingPieces(
  _namespace: string,
  _title: string,
  _relatedDocs: RelatedDocumentSuggestion[]
): MissingPieceSuggestion[] {
  // This could be expanded with more sophisticated analysis
  // For now, return basic suggestions based on namespace patterns
  return [];
}

/**
 * Get default sections for document type
 */
function getDefaultSectionsForType(type: string): string[] {
  switch (type) {
    case 'guide':
      return ['#prerequisites', '#step-by-step-implementation', '#testing'];
    case 'spec':
      return ['#overview', '#endpoints', '#authentication'];
    case 'troubleshooting':
      return ['#quick-diagnostics', '#common-issues', '#advanced-diagnostics'];
    case 'component':
      return ['#props-interface', '#usage-examples', '#styling'];
    case 'service':
      return ['#architecture-overview', '#components', '#deployment'];
    default:
      return ['#overview'];
  }
}

/**
 * Get action name for namespace
 */
function getNamespaceAction(namespace: string): string {
  switch (namespace) {
    case 'api/specs':
      return 'Create API specification';
    case 'api/guides':
      return 'Create implementation guide';
    case 'frontend/components':
      return 'Create component documentation';
    case 'backend/services':
      return 'Create service documentation';
    case 'docs/troubleshooting':
      return 'Create troubleshooting guide';
    default:
      return 'Create document';
  }
}

/**
 * Get focus description for namespace
 */
function getNamespaceFocus(namespace: string): string {
  switch (namespace) {
    case 'api/specs':
      return 'Define endpoints, schemas, and authentication requirements';
    case 'api/guides':
      return 'Provide step-by-step implementation with code examples';
    case 'frontend/components':
      return 'Document props, usage patterns, and accessibility features';
    case 'backend/services':
      return 'Define architecture, data flows, and integration patterns';
    case 'docs/troubleshooting':
      return 'Document common issues, diagnostics, and solutions';
    default:
      return 'Define structure and core content';
  }
}