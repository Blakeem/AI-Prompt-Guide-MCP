/**
 * Content analysis and similarity detection for document relationships
 */

import type { DocumentManager } from '../../document-manager.js';
import type { CachedDocument } from '../../document-cache.js';
import { pathToNamespace } from '../../shared/utilities.js';
import type { RelatedDocument, CycleDetectionContext } from './dependency-analyzer.js';
import { detectCycles } from './dependency-analyzer.js';
import { classifyRelationship } from './relationship-classifier.js';

export interface ImplementationReadiness {
  specs_ready: boolean;
  guides_available: boolean;
  components_needed: number;
  services_needed: number;
  estimated_completion: string;
}

/**
 * Find related documents by content similarity
 */
export async function findRelatedByContent(
  manager: DocumentManager,
  docPath: string,
  currentDoc: CachedDocument,
  context: CycleDetectionContext
): Promise<RelatedDocument[]> {
  const relatedDocs: RelatedDocument[] = [];

  try {
    // Get content from all sections of the current document
    let fullContent = '';
    for (const heading of currentDoc.headings) {
      try {
        const sectionContent = await manager.getSectionContent(docPath, heading.slug);
        if (sectionContent != null) {
          fullContent += `${sectionContent}\n`;
        }
      } catch {
        // Skip sections that can't be read
      }
    }

    // Extract key concepts from current document title and content
    const titleWords = extractKeywords(currentDoc.metadata.title);
    const contentKeywords = extractKeywords(fullContent.slice(0, 1000)); // First 1000 chars
    const allKeywords = [...titleWords, ...contentKeywords];

    if (allKeywords.length === 0) {
      return relatedDocs;
    }

    // Search for documents with similar content
    const searchQuery = allKeywords.slice(0, 5).join(' '); // Use top 5 keywords
    const searchResults = await manager.searchDocuments(searchQuery, {
      searchIn: ['title', 'content'],
      fuzzy: true,
      groupByDocument: true
    });

    for (const result of searchResults) {
      // Skip self and documents we've already processed
      if (result.documentPath === docPath) {
        continue;
      }

      // Skip if this would create a cycle
      if (detectCycles(context, result.documentPath)) {
        continue;
      }

      try {
        const relatedDoc = await manager.getDocument(result.documentPath);
        if (relatedDoc != null) {
          // Get content from other document's sections
          let otherContent = '';
          for (const heading of relatedDoc.headings.slice(0, 3)) { // Limit to first 3 sections for performance
            try {
              const sectionContent = await manager.getSectionContent(result.documentPath, heading.slug);
              if (sectionContent != null) {
                otherContent += `${sectionContent}\n`;
              }
            } catch {
              // Skip sections that can't be read
            }
          }

          // Calculate relevance based on shared concepts
          const otherKeywords = extractKeywords(`${relatedDoc.metadata.title} ${otherContent.slice(0, 1000)}`);
          const sharedConcepts = allKeywords.filter(keyword => otherKeywords.includes(keyword));
          const relevance = sharedConcepts.length / Math.max(allKeywords.length, otherKeywords.length);

          // Only include if relevance is above threshold
          if (relevance >= 0.6) {
            const relationship = classifyRelationship(docPath, result.documentPath, '', relatedDoc.metadata.title);

            const related: RelatedDocument = {
              path: result.documentPath,
              title: relatedDoc.metadata.title,
              namespace: pathToNamespace(result.documentPath),
              relationship,
              relevance: Math.round(relevance * 100) / 100,
              shared_concepts: sharedConcepts.slice(0, 5) // Top 5 shared concepts
            };

            relatedDocs.push(related);
          }
        }
      } catch {
        // Skip documents that can't be loaded
      }
    }

    // Sort by relevance descending
    relatedDocs.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));

    // Limit results to prevent overwhelming output
    return relatedDocs.slice(0, 10);

  } catch {
    // Return empty if analysis fails
  }

  return relatedDocs;
}

/**
 * Extract keywords from text for content similarity analysis
 */
export function extractKeywords(text: string): string[] {
  if (text == null || text === '') {
    return [];
  }

  // Remove markdown formatting and normalize
  const cleanText = text
    .replace(/[#*`_[\]()]/g, ' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words and filter
  const words = cleanText.split(' ').filter(word =>
    word.length > 2 &&
    !isStopWord(word) &&
    !word.match(/^\d+$/) // Skip pure numbers
  );

  // Remove duplicates and return
  return [...new Set(words)];
}

/**
 * Check if a word is a stop word (common words to ignore)
 */
export function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'can', 'may', 'might', 'must', 'shall', 'from', 'up', 'out', 'down', 'off',
    'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'now', 'get', 'set', 'put', 'use', 'new'
  ]);

  return stopWords.has(word);
}

/**
 * Analyze section content for metadata
 */
export function analyzeSectionContent(content: string): { has_code_blocks: boolean; has_links: boolean; content_preview: string } {
  const has_code_blocks = /```[\s\S]*?```|`[^`]+`/.test(content);
  const has_links = /\[[^\]]*\]\([^)]+\)|\[[^\]]*\]\[[^\]]*\]/.test(content);

  // Get first few lines as preview (up to 200 chars)
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const preview = lines.slice(0, 3).join(' ').trim();
  const content_preview = preview.length > 200 ? `${preview.slice(0, 200)}...` : preview;

  return { has_code_blocks, has_links, content_preview };
}

/**
 * Assess implementation readiness based on related documents
 */
export function assessImplementationReadiness(relatedDocs: RelatedDocument[]): ImplementationReadiness {
  const specs = relatedDocs.filter(doc => doc.relationship === 'implements_spec' || doc.namespace.includes('spec'));
  const guides = relatedDocs.filter(doc => doc.relationship === 'implementation_guide' || doc.namespace.includes('guide'));
  const components = relatedDocs.filter(doc => doc.namespace.includes('frontend') || doc.namespace.includes('component'));
  const services = relatedDocs.filter(doc => doc.namespace.includes('backend') || doc.namespace.includes('service'));

  // Helper function to determine completion status
  const determineCompletionStatus = (doc: RelatedDocument): 'completed' | 'in_progress' | 'pending' => {
    // Use completion status if available
    if (doc.completion_status != null && doc.completion_status !== '') {
      const percentage = parseInt(doc.completion_status.replace('%', ''), 10);
      if (percentage >= 100) return 'completed';
      if (percentage > 0) return 'in_progress';
      return 'pending';
    }

    // Use task information if available
    if (doc.tasks_linked != null && doc.tasks_linked > 0) {
      return 'in_progress';
    }

    // Default to pending for unknown status
    return 'pending';
  };

  const specs_ready = specs.length > 0 && specs.every(spec => determineCompletionStatus(spec) === 'completed');
  const guides_available = guides.length > 0;
  const components_needed = components.length;
  const services_needed = services.length;

  // Calculate overall completion percentage
  const allDocs = [...specs, ...guides, ...components, ...services];
  const completedDocs = allDocs.filter(doc => determineCompletionStatus(doc) === 'completed').length;
  const inProgressDocs = allDocs.filter(doc => determineCompletionStatus(doc) === 'in_progress').length;

  let estimatedCompletion = 0;
  if (allDocs.length > 0) {
    estimatedCompletion = Math.round(((completedDocs + (inProgressDocs * 0.5)) / allDocs.length) * 100);
  }

  return {
    specs_ready,
    guides_available,
    components_needed,
    services_needed,
    estimated_completion: `${estimatedCompletion}%`
  };
}