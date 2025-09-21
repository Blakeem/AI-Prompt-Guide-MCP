/**
 * Central schema repository for create_document tool progressive discovery
 */

export interface CreateDocumentSchemaStage {
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
 * Stage 0: Discovery - no parameters (show available types)
 * Stage 1: Instructions - type parameter (show guidance for selected type)
 * Stage 2: Creation - type + title + overview (create the document)
 */
export const CREATE_DOCUMENT_SCHEMAS: Record<number, CreateDocumentSchemaStage> = {
  0: {
    stage: 0,
    description: 'Discovery stage - call with no parameters to see available document types',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: true
    },
    responseExample: {
      stage: 'discovery',
      types: [
        {
          id: 'api_spec',
          name: 'API Specification',
          description: 'Document REST APIs with endpoints, schemas, and examples'
        }
        // ... other types
      ],
      next_step: 'Call again with \'type\' parameter to get specific instructions',
      example: { type: 'api_spec' }
    }
  },

  1: {
    stage: 1,
    description: 'Instructions stage - call with document type to get specific guidance',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Document type (choose from available types shown in stage 0)',
          enum: ['api_spec', 'implementation_guide', 'architecture_doc', 'troubleshooting']
        }
      },
      required: ['type'],
      additionalProperties: true
    },
    responseExample: {
      stage: 'instructions',
      type: 'api_spec',
      instructions: [
        'Research current API patterns and industry standards for your domain',
        'Define clear request/response schemas using JSON Schema or OpenAPI',
        // ... other instructions
      ],
      next_step: 'Call again with type, title, and overview to create the document',
      example: {
        type: 'api_spec',
        title: 'Search API',
        overview: 'Full-text search with ranking capabilities'
      }
    }
  },

  2: {
    stage: 2,
    description: 'Creation stage - call with type, title, and overview to create document',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Document type (from stage 0)',
          enum: ['api_spec', 'implementation_guide', 'architecture_doc', 'troubleshooting']
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
      required: ['type', 'title', 'overview'],
      additionalProperties: true
    },
    responseExample: {
      stage: 'creation',
      success: true,
      created: '/specs/search-api.md',
      document: {
        path: '/specs/search-api.md',
        title: 'Search API',
        type: 'api_spec',
        created: '2025-01-20T12:00:00Z'
      },
      sections: ['#overview', '#authentication', '#endpoints', '#error-handling'],
      next_actions: [
        'Use edit_section to add detailed content to each section',
        'Use add_task to populate the tasks section with specific items'
      ]
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
  const hasType = args['type'] != null && args['type'] !== '';
  const hasTitle = args['title'] != null && args['title'] !== '';
  const hasOverview = args['overview'] != null && args['overview'] !== '';

  // Stage 2: Has all required parameters
  if (hasType && hasTitle && hasOverview) {
    return 2;
  }

  // Stage 1: Has type but missing title or overview
  if (hasType) {
    return 1;
  }

  // Stage 0: No parameters or missing type
  return 0;
}

/**
 * Get next stage number for progression
 */
export function getNextCreateDocumentStage(currentStage: number): number {
  return Math.min(currentStage + 1, 2);
}

/**
 * Available document types for create_document tool
 */
export const DOCUMENT_TYPES = {
  api_spec: {
    id: 'api_spec',
    name: 'API Specification',
    description: 'Document REST APIs with endpoints, schemas, and examples'
  },
  implementation_guide: {
    id: 'implementation_guide',
    name: 'Implementation Guide',
    description: 'Step-by-step implementation instructions with code examples'
  },
  architecture_doc: {
    id: 'architecture_doc',
    name: 'Architecture Document',
    description: 'System design, components, and architectural decisions'
  },
  troubleshooting: {
    id: 'troubleshooting',
    name: 'Troubleshooting Guide',
    description: 'Problem diagnosis, solutions, and debugging workflows'
  }
};

/**
 * Get all document types as array
 */
export function getDocumentTypes(): Array<{ id: string; name: string; description: string }> {
  return Object.values(DOCUMENT_TYPES);
}