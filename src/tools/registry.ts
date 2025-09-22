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
      name: 'browse_documents',
      description: 'Unified browsing and searching of documents with namespace awareness and cross-namespace linking. Browse mode (no query) shows folder/file structure. Search mode (with query) performs content search.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory to browse or limit search scope (e.g., "/api", "/guides")',
            default: '/',
          },
          query: {
            type: 'string',
            description: 'Search terms (if empty, browse mode). When provided, performs content search across documents.',
          },
          depth: {
            type: 'number',
            description: 'Maximum traversal depth for browsing (1-5)',
            minimum: 1,
            maximum: 5,
            default: 2,
          },
          limit: {
            type: 'number',
            description: 'Maximum results for search mode',
            minimum: 1,
            maximum: 50,
            default: 10,
          },
          include_related: {
            type: 'boolean',
            description: 'Whether to include related document analysis (forward/backward links, content similarity, dependency chains)',
            default: false,
          },
          link_depth: {
            type: 'number',
            description: 'Maximum depth for link traversal analysis (1-6)',
            minimum: 1,
            maximum: 6,
            default: 2,
          },
        },
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
      name: 'section',
      description: 'Unified tool for ALL section operations: create, edit, and remove sections with automatic depth calculation',
      inputSchema: {
        type: 'object',
        properties: {
          document: {
            type: 'string',
            description: 'Document path (e.g., "/specs/search-api.md")',
          },
          section: {
            type: 'string',
            description: 'Section slug to edit or reference section for new section placement (e.g., "#endpoints", "#authentication")',
          },
          content: {
            type: 'string',
            description: 'Content for the section',
          },
          operation: {
            type: 'string',
            enum: ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'],
            default: 'replace',
            description: 'Edit: replace/append/prepend. Create: insert_before/insert_after/append_child (auto-depth). Delete: remove',
          },
          title: {
            type: 'string',
            description: 'Title for new section (required for create operations: insert_before, insert_after, append_child)',
          },
        },
        required: ['document', 'section', 'content'],
        additionalProperties: false,
      },
    },
    {
      name: 'manage_document',
      description: 'Unified tool for ALL document operations: archive, delete, rename, move with batch support',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['archive', 'delete', 'rename', 'move'],
            description: 'Operation to perform: archive (with audit), delete (permanent), rename (title), move (relocate)',
          },
          document: {
            type: 'string',
            description: 'Document path (e.g., "/specs/api.md")',
          },
          new_path: {
            type: 'string',
            description: 'New path for move operation',
          },
          new_title: {
            type: 'string',
            description: 'New title for rename operation',
          },
          confirm: {
            type: 'boolean',
            description: 'Required confirmation for delete operation',
          },
        },
        required: ['operation', 'document'],
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
      description: 'Inspect document structure and content with namespace awareness, section-specific viewing, and linked document context loading',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path or document#section for section-specific viewing (e.g., "/api/specs/auth-api.md", "/api/specs/auth-api.md#api/authentication")',
          },
          include_linked: {
            type: 'boolean',
            description: 'Whether to load context from linked documents referenced via @ syntax',
            default: false,
          },
          link_depth: {
            type: 'number',
            description: 'Maximum depth for recursive context loading from linked documents (1-6)',
            minimum: 1,
            maximum: 6,
            default: 2,
          },
        },
        required: ['path'],
        additionalProperties: false,
      },
    },
  ];

  // Return all tools
  return [...tools, ...documentManagementTools];
}