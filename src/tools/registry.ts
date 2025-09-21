/**
 * Tool registry and definitions for the Spec-Docs MCP server
 */

import type { SessionState } from '../session/types.js';
import type { ToolDefinition } from './types.js';
import { getCreateDocumentSchema } from './schemas/create-document-schemas.js';

/**
 * Get all available tools based on session state
 */
export function getVisibleTools(state: SessionState): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    {
      name: 'list_documents',
      description: 'Browse and list existing documents in the knowledge base',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path to browse (e.g., "/api", "/guides")',
            default: '/',
          },
          depth: {
            type: 'number',
            description: 'Maximum depth to traverse (1-5)',
            minimum: 1,
            maximum: 5,
            default: 2,
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'search_documents',
      description: 'Search through existing documents by content, title, or path',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (supports text, keywords, or path patterns)',
          },
          path_filter: {
            type: 'string',
            description: 'Optional path prefix to limit search scope',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            minimum: 1,
            maximum: 50,
            default: 10,
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  ];

  // Get dynamic schema for create_document based on session state
  const createDocumentSchema = getCreateDocumentSchema(state.createDocumentStage);

  const documentManagementTools: ToolDefinition[] = [
    {
      name: 'create_document',
      description: `Create a new document with progressive discovery pattern (Stage ${createDocumentSchema.stage}: ${createDocumentSchema.description})`,
      inputSchema: createDocumentSchema.inputSchema,
    },
    {
      name: 'edit_section',
      description: 'Update or add a specific section within an existing document',
      inputSchema: {
        type: 'object',
        properties: {
          document: {
            type: 'string',
            description: 'Document path (e.g., "/specs/search-api.md")',
          },
          section: {
            type: 'string',
            description: 'Section slug to update (e.g., "#endpoints", "#authentication")',
          },
          content: {
            type: 'string',
            description: 'New content for the section',
          },
          operation: {
            type: 'string',
            enum: ['replace', 'append', 'prepend'],
            default: 'replace',
            description: 'How to apply the content: replace (overwrite), append (add to end), prepend (add to beginning)',
          },
        },
        required: ['document', 'section', 'content'],
        additionalProperties: false,
      },
    },
    {
      name: 'archive_document',
      description: 'Archive a document or folder (move to archive folder for safety)',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document or folder path to archive (with or without .md extension)',
          },
        },
        required: ['path'],
        additionalProperties: false,
      },
    },
    {
      name: 'insert_section',
      description: 'Insert a new section at a specific location',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path',
          },
          reference_section: {
            type: 'string',
            description: 'Reference section slug to insert relative to',
          },
          position: {
            type: 'string',
            enum: ['before', 'after', 'child'],
            description: 'Where to insert relative to reference section',
            default: 'after',
          },
          title: {
            type: 'string',
            description: 'New section title',
          },
          content: {
            type: 'string',
            description: 'Initial section content',
            default: '',
          },
          depth: {
            type: 'number',
            minimum: 1,
            maximum: 6,
            description: 'Heading depth (1-6). If not specified, determined from position',
          },
        },
        required: ['path', 'reference_section', 'title'],
        additionalProperties: false,
      },
    },
    {
      name: 'add_task',
      description: 'Add tasks with links to specifications',
      inputSchema: {
        type: 'object',
        properties: {
          document: {
            type: 'string',
            description: 'Document path (e.g., "/specs/search-api.md")',
          },
          title: {
            type: 'string',
            description: 'Task title',
          },
          criteria: {
            type: 'string',
            description: 'Measurable completion criteria',
          },
          links: {
            type: 'array',
            items: { type: 'string' },
            description: 'References to specification documents',
          },
        },
        required: ['document', 'title'],
        additionalProperties: false,
      },
    },
    {
      name: 'complete_task',
      description: 'Mark tasks as completed with notes',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'Task identifier (e.g., "search-api.md#tasks[3]")',
          },
          note: {
            type: 'string',
            description: 'Completion notes or implementation details',
          },
        },
        required: ['task_id'],
        additionalProperties: false,
      },
    },
    {
      name: 'reopen_task',
      description: 'Revert task completion',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'Task identifier (e.g., "api.md#tasks[0]")',
          },
        },
        required: ['task_id'],
        additionalProperties: false,
      },
    },
    {
      name: 'view_document',
      description: 'Inspect document structure and content',
      inputSchema: {
        type: 'object',
        properties: {
          document: {
            type: 'string',
            description: 'Document path (e.g., "/specs/search-api.md")',
          },
        },
        required: ['document'],
        additionalProperties: false,
      },
    },
    {
      name: 'remove_section',
      description: 'Delete sections (with safety check)',
      inputSchema: {
        type: 'object',
        properties: {
          document: {
            type: 'string',
            description: 'Document path',
          },
          section: {
            type: 'string',
            description: 'Section slug to remove (e.g., "#deprecated")',
          },
        },
        required: ['document', 'section'],
        additionalProperties: false,
      },
    },
  ];

  // Return all tools
  return [...tools, ...documentManagementTools];
}