/**
 * Central schema repository for create_document tool progressive discovery
 */

// Import BrokenReference from document-analysis
import type { BrokenReference } from '../../shared/document-analysis.js';

// Suggestion interface definitions for Stage 2.5
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
 * Progressive discovery schemas for create_document tool
 * Stage 0: Discovery - no parameters (show available namespaces)
 * Stage 1: Creation - namespace + title + overview (create blank document immediately)
 */
const CREATE_DOCUMENT_SCHEMAS: Record<number, CreateDocumentSchemaStage> = {
  0: {
    stage: 0,
    description: 'Discovery stage - call with no parameters to see available namespaces',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: true
    },
    responseExample: {
      stage: 'discovery',
      namespaces: [
        {
          name: 'Specifications',
          description: 'Feature specifications and API documentation'
        }
        // ... other namespaces
      ],
      next_step: 'Call again with \'namespace\', \'title\', and \'overview\' to create a blank document',
      example: { namespace: 'specs' }
    }
  },

  1: {
    stage: 1,
    description: 'Creation stage - call with namespace, title, and overview to create blank document',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          description: 'Document namespace (from stage 0, or custom namespace)'
        },
        title: {
          type: 'string',
          description: 'Document title (required for creation)'
        },
        overview: {
          type: 'string',
          description: 'Content for overview section (required for creation)'
        }
      },
      required: ['namespace', 'title', 'overview'],
      additionalProperties: true
    },
    responseExample: {
      success: true,
      document: '/docs/specs/search-api.md',
      slug: 'search-api'
    }
  }
};

/**
 * Get schema for a specific stage
 */
export function getCreateDocumentSchema(stage: number): CreateDocumentSchemaStage {
  const schema = CREATE_DOCUMENT_SCHEMAS[stage];
  if (schema != null) {
    return schema;
  }
  // Default to stage 0 for unknown stages
  const defaultSchema = CREATE_DOCUMENT_SCHEMAS[0];
  if (defaultSchema == null) {
    throw new Error('Default schema (stage 0) not found');
  }
  return defaultSchema;
}

/**
 * Determine current stage based on provided arguments
 */
export function determineCreateDocumentStage(args: Record<string, unknown>): number {
  const hasNamespace = args['namespace'] != null && args['namespace'] !== '';
  const hasTitle = args['title'] != null && args['title'] !== '';
  const hasOverview = args['overview'] != null && args['overview'] !== '';

  // Stage 1: Has all required parameters (create document immediately)
  if (hasNamespace && hasTitle && hasOverview) {
    return 1;
  }

  // Stage 0: No parameters or missing required fields
  return 0;
}

/**
 * Get next stage number for progression
 */
export function getNextCreateDocumentStage(currentStage: number): number {
  // Stage progression: 0 -> 1
  if (currentStage === 0) return 1;
  return 1; // Max stage
}

/**
 * Available document namespaces for create_document tool
 *
 * Workflow-Driven Namespaces:
 * - specs: spec-feature, spec-external, build-iterate, build-tdd
 * - reviews: review, review-codebase, audit, coverage, refactor
 * - decisions: decide
 * - fixes: fix
 * - tasks: Ad-hoc subagent task assignments (build-iterate, build-tdd)
 */
const DOCUMENT_NAMESPACES = {
  'specs': {
    name: 'Specifications',
    description: 'Feature specifications and API documentation'
  },
  'reviews': {
    name: 'Code Reviews & Audits',
    description: 'Code reviews, quality audits, and refactoring plans'
  },
  'decisions': {
    name: 'Technical Decisions',
    description: 'Architecture and implementation decisions with trade-off analysis'
  },
  'fixes': {
    name: 'Bug Fixes',
    description: 'Bug reproduction, diagnosis, and resolution tracking'
  },
  'tasks': {
    name: 'Subagent Tasks',
    description: 'Ad-hoc task assignments for subagent execution'
  }
};

/**
 * Get all document namespaces as array
 */
export function getDocumentNamespaces(): Array<{ name: string; description: string }> {
  return Object.values(DOCUMENT_NAMESPACES);
}

/**
 * Get namespace configuration by ID
 */
export function getNamespaceConfig(namespaceId: string): { name: string; description: string } | null {
  const namespace = DOCUMENT_NAMESPACES[namespaceId as keyof typeof DOCUMENT_NAMESPACES];
  return namespace ?? null;
}