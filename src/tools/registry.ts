/**
 * Tool registry and definitions for the Spec-Docs MCP server
 */

import type { SessionState } from '../session/types.js';
import type { ToolDefinition } from './types.js';
import { getCreateDocumentSchema } from './schemas/create-document-schemas.js';
import { getBrowseDocumentsSchema } from './schemas/browse-documents-schemas.js';
import { getSectionSchema } from './schemas/section-schemas.js';
import { getViewDocumentSchema } from './schemas/view-document-schemas.js';
import { getViewSectionSchema } from './schemas/view-section-schemas.js';
import { getViewTaskSchema } from './schemas/view-task-schemas.js';
import { getDeleteDocumentSchema } from './schemas/delete-document-schemas.js';
import { getMoveDocumentSchema } from './schemas/move-document-schemas.js';
import { getTaskSchema } from './schemas/task-schemas.js';
import { getCompleteTaskSchema } from './schemas/complete-task-schemas.js';
import { getStartTaskSchema } from './schemas/start-task-schemas.js';
import { getMoveSchema } from './schemas/move-schemas.js';
import { getEditDocumentSchema } from './schemas/edit-document-schemas.js';
import { getSearchDocumentsSchema } from './schemas/search-documents-schemas.js';

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
    {
      name: 'search_documents',
      description: 'Search across documents with full-text or regex patterns. Returns structured results with match context.',
      inputSchema: getSearchDocumentsSchema(),
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
      name: 'edit_document',
      description: 'Edit document title and/or overview content',
      inputSchema: getEditDocumentSchema(),
    },
    {
      name: 'section',
      description: 'Perform multiple section operations in a single call. Always pass operations as an array, even for single edits. Supports create, edit, and remove operations with automatic depth calculation.',
      inputSchema: getSectionSchema(),
    },
    {
      name: 'move',
      description: 'Move section or task to a new location within same document or to different document',
      inputSchema: getMoveSchema(),
    },
    {
      name: 'delete_document',
      description: 'Delete document permanently or archive with audit trail',
      inputSchema: getDeleteDocumentSchema(),
    },
    {
      name: 'move_document',
      description: 'Move document to a new location',
      inputSchema: getMoveDocumentSchema(),
    },
    {
      name: 'task',
      description: 'Perform multiple task operations in a single call. Always pass operations as an array, even for single task operations. Supports create, edit, and list operations.',
      inputSchema: getTaskSchema(),
    },
    {
      name: 'complete_task',
      description: 'Mark tasks as completed with notes and get next available task with linked documents',
      inputSchema: getCompleteTaskSchema(),
    },
    {
      name: 'start_task',
      description: 'Start or resume work on a task with full context injection (main workflow, task workflow, and references). Use this when beginning a new session or resuming after context compression.',
      inputSchema: getStartTaskSchema(),
    },
    {
      name: 'view_document',
      description: 'Inspect document structure and content with comprehensive stats and metadata (like browse_documents). Supports multiple documents.',
      inputSchema: getViewDocumentSchema(),
    },
    {
      name: 'view_section',
      description: 'View specific sections with clean content data. Supports single or multiple sections without stats overhead.',
      inputSchema: getViewSectionSchema(),
    },
    {
      name: 'view_task',
      description: 'View specific tasks with clean task data including status. Supports single or multiple tasks.',
      inputSchema: getViewTaskSchema(),
    },
  ];

  // Return all tools
  return [...tools, ...documentManagementTools];
}