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
import { getManageDocumentSchema } from './schemas/manage-document-schemas.js';
import { getMoveDocumentSchema } from './schemas/move-document-schemas.js';
import { getTaskSchema } from './schemas/task-schemas.js';
import { getCompleteTaskSchema } from './schemas/complete-task-schemas.js';
import { getStartTaskSchema } from './schemas/start-task-schemas.js';
import { getMoveSchema } from './schemas/move-schemas.js';

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
      name: 'move',
      description: 'Move section or task to a new location within same document or to different document',
      inputSchema: getMoveSchema(),
    },
    {
      name: 'manage_document',
      description: 'Unified tool for ALL document operations: archive, delete, rename with batch support',
      inputSchema: getManageDocumentSchema(),
    },
    {
      name: 'move_document',
      description: 'Move document to a new location',
      inputSchema: getMoveDocumentSchema(),
    },
    {
      name: 'task',
      description: 'Unified tool for task operations: create, edit, and list tasks with slug-based addressing',
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