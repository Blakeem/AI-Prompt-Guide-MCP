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
import { getViewSubagentTaskSchema } from './schemas/view-subagent-task-schemas.js';
import { getViewCoordinatorTaskSchema } from './schemas/view-coordinator-task-schemas.js';
import { getDeleteDocumentSchema } from './schemas/delete-document-schemas.js';
import { getMoveDocumentSchema } from './schemas/move-document-schemas.js';
import { getSubagentTaskSchema } from './schemas/subagent-task-schemas.js';
import { getCompleteSubagentTaskSchema } from './schemas/complete-subagent-task-schemas.js';
import { getStartSubagentTaskSchema } from './schemas/start-subagent-task-schemas.js';
import { getCoordinatorTaskSchema } from './schemas/coordinator-task-schemas.js';
import { getCompleteCoordinatorTaskSchema } from './schemas/complete-coordinator-task-schemas.js';
import { getStartCoordinatorTaskSchema } from './schemas/start-coordinator-task-schemas.js';
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
      description: 'Move sections within or across documents (supports both regular sections and subagent tasks)',
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
      name: 'subagent_task',
      description: 'Bulk task operations for subagent tasks (ad-hoc mode). Document parameter ALWAYS required (default context). Task field supports: 1) "slug" (uses document), 2) "#slug" (uses document), 3) "/docs/doc.md#slug" (overrides document). Works with /docs/ namespace for assigned subagent tasks.',
      inputSchema: getSubagentTaskSchema(),
    },
    {
      name: 'complete_subagent_task',
      description: 'Mark a subagent task as completed (REQUIRES #slug). Ad-hoc mode only: "/docs/doc.md#task" completes the specified task (no next task returned). ⚠️ CRITICAL: Must include #slug and be in /docs/ namespace!',
      inputSchema: getCompleteSubagentTaskSchema(),
    },
    {
      name: 'start_subagent_task',
      description: 'Start work on a subagent task (REQUIRES #slug). Ad-hoc mode only: "/docs/doc.md#task" starts the specified task with task workflow (no main workflow). ⚠️ CRITICAL: Must include #slug and be in /docs/ namespace!',
      inputSchema: getStartSubagentTaskSchema(),
    },
    {
      name: 'coordinator_task',
      description: 'Bulk task operations for coordinator tasks (sequential mode). Document is always /coordinator/active.md (no document parameter). Task operations work with sequential task list. Auto-creates document if needed.',
      inputSchema: getCoordinatorTaskSchema(),
    },
    {
      name: 'complete_coordinator_task',
      description: 'Complete current coordinator task (sequential mode). Auto-finds next pending task, completes it, returns next task. Auto-archives to /archived/coordinator/ when all tasks complete. ⚠️ Sequential only - NO #slug allowed!',
      inputSchema: getCompleteCoordinatorTaskSchema(),
    },
    {
      name: 'start_coordinator_task',
      description: 'Start work on coordinator task (sequential mode). Auto-finds next pending task, injects Main-Workflow from first task + task workflow. ⚠️ Sequential only - NO #slug allowed!',
      inputSchema: getStartCoordinatorTaskSchema(),
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
      name: 'view_subagent_task',
      description: 'View subagent tasks in /docs/ namespace. TWO MODES: Overview ("/docs/doc.md") lists ALL tasks with status only. Detail ("/docs/doc.md#task") shows full content for specified task(s). Supports multiple: "/docs/doc.md#task1,task2". For coordinator tasks, use view_coordinator_task instead.',
      inputSchema: getViewSubagentTaskSchema(),
    },
    {
      name: 'view_coordinator_task',
      description: 'View coordinator tasks from /coordinator/active.md. TWO MODES: Overview (no slug) lists ALL coordinator tasks with status only. Detail (with slug) shows full content for specified task(s). Supports multiple: "phase-1,phase-2". Coordinator tasks only - use view_subagent_task for /docs/ tasks.',
      inputSchema: getViewCoordinatorTaskSchema(),
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