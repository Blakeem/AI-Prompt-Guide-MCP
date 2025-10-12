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
          id: 'api/specs',
          name: 'API Specifications',
          description: 'Document REST APIs with endpoints, schemas, and examples',
          folder: '/api/specs'
        }
        // ... other namespaces
      ],
      next_step: 'Call again with \'namespace\', \'title\', and \'overview\' to create a blank document',
      example: { namespace: 'api/specs' }
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
        },
        includeTasks: {
          type: 'boolean',
          description: 'Include a "## Tasks" section for task management (default: false)'
        }
      },
      required: ['namespace', 'title', 'overview'],
      additionalProperties: true
    },
    responseExample: {
      stage: 'creation',
      success: true,
      created: '/api/specs/search-api.md',
      document: {
        path: '/api/specs/search-api.md',
        slug: 'search-api',
        title: 'Search API',
        namespace: 'api/specs',
        created: '2025-01-20T12:00:00Z'
      },
      sections: ['#search-api', '#table-of-contents'],
      suggestions: {
        related_documents: [
          {
            path: '/api/specs/user-api.md',
            title: 'User API',
            namespace: 'api/specs',
            reason: 'Related documentation in api/specs',
            relevance: 0.85
          }
        ],
        broken_references: []
      },
      namespace_patterns: {
        common_sections: ['#overview', '#authentication', '#endpoints'],
        frequent_links: ['/api/guides/auth-implementation'],
        typical_tasks: ['Implement endpoint validation']
      }
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
 */
const DOCUMENT_NAMESPACES = {
  'api/specs': {
    id: 'api/specs',
    name: 'API Specifications',
    description: 'Document REST APIs with endpoints, schemas, and examples',
    folder: '/api/specs',
    template: 'api_spec'
  },
  'api/guides': {
    id: 'api/guides',
    name: 'API Implementation Guides',
    description: 'Step-by-step API implementation instructions with code examples',
    folder: '/api/guides',
    template: 'implementation_guide'
  },
  'frontend/components': {
    id: 'frontend/components',
    name: 'Frontend Component Documentation',
    description: 'UI component specifications, usage guides, and design patterns',
    folder: '/frontend/components',
    template: 'component_doc'
  },
  'backend/services': {
    id: 'backend/services',
    name: 'Backend Service Documentation',
    description: 'Service architecture, APIs, and implementation details',
    folder: '/backend/services',
    template: 'architecture_doc'
  },
  'docs/troubleshooting': {
    id: 'docs/troubleshooting',
    name: 'Troubleshooting Guides',
    description: 'Problem diagnosis, solutions, and debugging workflows',
    folder: '/docs/troubleshooting',
    template: 'troubleshooting'
  }
};

/**
 * Get all document namespaces as array
 */
export function getDocumentNamespaces(): Array<{ id: string; name: string; description: string; folder: string; template: string }> {
  return Object.values(DOCUMENT_NAMESPACES);
}

/**
 * Get namespace configuration by ID
 */
export function getNamespaceConfig(namespaceId: string): { id: string; name: string; description: string; folder: string; template: string } | null {
  const namespace = DOCUMENT_NAMESPACES[namespaceId as keyof typeof DOCUMENT_NAMESPACES];
  return namespace ?? null;
}