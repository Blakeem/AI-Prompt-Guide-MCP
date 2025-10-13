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
import { generateGetWorkflowSchema } from './schemas/get-workflow-schemas.js';
import { generateGetGuideSchema } from './schemas/get-guide-schemas.js';

/**
 * Get all available tools based on session state
 */
export function getVisibleTools(state: SessionState): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    {
      name: 'browse_documents',
      description: 'Navigate document hierarchy and browse folders/documents with namespace awareness. Shows folder/file structure and basic document metadata. Use search_documents for content search.',
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
      description: 'Bulk section operations with unified path support. Document parameter ALWAYS required (default context). Section field supports: 1) "slug" (uses document), 2) "#slug" (uses document), 3) "/doc.md#slug" (overrides document). Enables cross-document edits in single batch.',
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
      description: 'Bulk task operations with unified path support. Document parameter ALWAYS required (default context). Task field supports: 1) "slug" (uses document), 2) "#slug" (uses document), 3) "/doc.md#slug" (overrides document). Enables cross-document task creation in single batch.',
      inputSchema: getTaskSchema(),
    },
    {
      name: 'complete_task',
      description: 'Mark a task as completed. TWO MODES: Sequential ("/doc.md") completes next pending task and returns next task. Ad-hoc ("/doc.md#task") completes ONLY that specific task (no next task returned). ⚠️ CRITICAL: Always use FULL PATH with #slug for assigned tasks or you will complete the WRONG TASK!',
      inputSchema: getCompleteTaskSchema(),
    },
    {
      name: 'start_task',
      description: 'Start work on a task. TWO MODES: Sequential ("/doc.md") starts first pending task with main+task workflows. Ad-hoc ("/doc.md#task") starts ONLY that task with task workflow only (no main workflow). ⚠️ CRITICAL: Always use FULL PATH with #slug for assigned tasks or you will start the WRONG TASK!',
      inputSchema: getStartTaskSchema(),
    },
    {
      name: 'view_document',
      description: 'Inspect document structure and content with comprehensive stats and metadata (like browse_documents). Supports multiple documents.',
      inputSchema: getViewDocumentSchema(),
    },
    {
      name: 'view_section',
      description: 'View document sections. TWO MODES: Overview ("/doc.md") lists ALL sections with titles only. Detail ("/doc.md#section") shows full content for specified section(s). Supports multiple: "/doc.md#section1,section2"',
      inputSchema: getViewSectionSchema(),
    },
    {
      name: 'view_task',
      description: 'View document tasks. TWO MODES: Overview ("/doc.md") lists ALL tasks with status only. Detail ("/doc.md#task") shows full content for specified task(s). Supports multiple: "/doc.md#task1,task2"',
      inputSchema: getViewTaskSchema(),
    },
  ];

  // Workflow and guide tools with dynamic schemas
  const workflowTools: ToolDefinition[] = [
    generateGetWorkflowSchema(),
    generateGetGuideSchema(),
  ];

  // Return all tools
  return [...tools, ...documentManagementTools, ...workflowTools];
}