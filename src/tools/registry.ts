/**
 * Tool registry and definitions for the Spec-Docs MCP server
 */

import type { SessionState } from '../session/types.js';
import type { ToolDefinition } from './types.js';
import { getCreateDocumentSchema } from './schemas/create-document-schemas.js';
import { getBrowseDocumentsSchema } from './schemas/browse-documents-schemas.js';
import { getSectionSchema } from './schemas/section-schemas.js';
import { getViewDocumentSchema } from './schemas/view-document-schemas.js';
import { getManageDocumentSchema } from './schemas/manage-document-schemas.js';
import { getTaskSchema } from './schemas/task-schemas.js';

/**
 * Get all available tools based on session state
 */
export function getVisibleTools(state: SessionState): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    {
      name: 'browse_documents',
      description: 'Unified browsing and searching of documents with namespace awareness and cross-namespace linking. Browse mode (no query) shows folder/file structure. Search mode (with query) performs content search.',
      inputSchema: getBrowseDocumentsSchema(),
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
      inputSchema: getSectionSchema(),
    },
    {
      name: 'manage_document',
      description: 'Unified tool for ALL document operations: archive, delete, rename, move with batch support',
      inputSchema: getManageDocumentSchema(),
    },
    {
      name: 'task',
      description: 'Unified tool for ALL task operations: create, edit, complete, and list tasks with slug-based addressing',
      inputSchema: getTaskSchema(),
    },
    {
      name: 'view_document',
      description: 'Inspect document structure and content with namespace awareness, section-specific viewing, and linked document context loading',
      inputSchema: getViewDocumentSchema(),
    },
  ];

  // Return all tools
  return [...tools, ...documentManagementTools];
}