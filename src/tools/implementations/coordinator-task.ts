/**
 * Implementation for the coordinator_task tool
 * Manages sequential coordinator task lists in /coordinator/ namespace
 *
 * Sequential only - NO #slug allowed (use task reordering instead)
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';
import {
  createTaskOperation,
  editTaskOperation,
  listTasksOperation,
  type TaskHierarchicalContext
} from '../../shared/task-operations.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
import { validateCoordinatorTaskAccess } from '../../shared/task-validation.js';
import {
  PATH_PREFIXES,
  FOLDER_NAMES
} from '../../shared/namespace-constants.js';

/**
 * Maximum number of operations allowed in a single batch request
 * Prevents performance issues and potential DoS attacks
 */
const MAX_BATCH_SIZE = 100;

/**
 * Individual task operation result
 */
interface TaskOperationResult {
  operation: 'create' | 'edit' | 'list';
  status: 'created' | 'updated' | 'listed' | 'error';
  task?: {
    slug: string;
    title: string;
    hierarchical_context?: TaskHierarchicalContext;
  };
  tasks?: Array<{
    slug: string;
    title: string;
    status: string;
    link?: string;
    referenced_documents?: HierarchicalContent[];
    hierarchical_context?: TaskHierarchicalContext;
  }>;
  count?: number;
  hierarchical_summary?: {
    by_phase: Record<string, { total: number; pending: number; in_progress: number; completed: number }>;
    by_category: Record<string, { total: number; pending: number; in_progress?: number; completed?: number }>;
    critical_path: string[];
  };
  next_task?: {
    slug: string;
    title: string;
    link?: string;
  };
  error?: string;
}

/**
 * Bulk task operations response
 */
interface TaskBulkResponse {
  success: boolean;
  document: string;
  operations_completed: number;
  results: TaskOperationResult[];
  timestamp: string;
}

/**
 * Coordinator task tool - sequential task management
 *
 * Automatically creates /coordinator/active.md if it doesn't exist
 * Validates coordinator namespace and sequential-only mode
 *
 * @param args - Tool arguments with operations array
 * @param _state - Session state (unused)
 * @param manager - Document manager
 * @returns Bulk operation results
 */
export async function coordinatorTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<TaskBulkResponse> {
  try {
    // Validate operations array
    const operations = args['operations'] as unknown;
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new AddressingError(
        'operations array is required and must not be empty',
        'MISSING_OPERATIONS'
      );
    }

    if (operations.length > MAX_BATCH_SIZE) {
      throw new AddressingError(
        `Batch size ${operations.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
        'BATCH_TOO_LARGE'
      );
    }

    // COORDINATOR-SPECIFIC: Fixed document path using explicit path prefix
    const documentPath = `${PATH_PREFIXES.COORDINATOR}active.md`;

    // Validate coordinator access (no #slug allowed, /coordinator/ namespace)
    validateCoordinatorTaskAccess(documentPath, undefined);

    // Auto-create /coordinator/active.md if it doesn't exist
    await ensureCoordinatorDocument(manager, documentPath);

    // Get document and validate existence
    const document = await manager.getDocument(documentPath);
    if (document == null) {
      throw new DocumentNotFoundError(documentPath);
    }

    // Process operations using shared task-operations.ts functions
    const results: TaskOperationResult[] = [];

    for (const op of operations) {
      try {
        const operation = ToolIntegration.validateOperation(
          op['operation'] ?? '',
          ['create', 'edit', 'list'] as const,
          'coordinator_task'
        );

        if (operation === 'create') {
          const title = ToolIntegration.validateOptionalStringParameter(op['title'], 'title');
          const content = ToolIntegration.validateOptionalStringParameter(op['content'], 'content');

          if (title == null || content == null) {
            throw new AddressingError('Missing required parameters for create: title and content', 'MISSING_PARAMETER');
          }

          const createResult = await createTaskOperation(manager, documentPath, title, content, undefined);
          results.push({
            operation: 'create',
            status: 'created',
            task: { slug: createResult.slug, title: createResult.title }
          });

        } else if (operation === 'edit') {
          const taskSlug = ToolIntegration.validateOptionalStringParameter(op['task'], 'task');
          const content = ToolIntegration.validateOptionalStringParameter(op['content'], 'content');

          if (taskSlug == null || content == null) {
            throw new AddressingError('Missing required parameters for edit: task and content', 'MISSING_PARAMETER');
          }

          await editTaskOperation(manager, documentPath, taskSlug, content);
          results.push({
            operation: 'edit',
            status: 'updated'
          });

        } else if (operation === 'list') {
          const statusFilter = ToolIntegration.validateOptionalStringParameter(op['status'], 'status');
          const listResult = await listTasksOperation(manager, documentPath, statusFilter);

          const result: TaskOperationResult = {
            operation: 'list',
            status: 'listed',
            count: listResult.tasks.length
          };

          if (listResult.tasks.length > 0) {
            result.tasks = listResult.tasks.map(t => ({
              slug: t.slug,
              title: t.title,
              status: t.status,
              ...(t.link != null && { link: t.link }),
              ...(t.referenced_documents != null && { referenced_documents: t.referenced_documents }),
              ...(t.hierarchical_context != null && { hierarchical_context: t.hierarchical_context })
            }));
          }
          if (listResult.hierarchical_summary != null) {
            result.hierarchical_summary = listResult.hierarchical_summary;
          }
          if (listResult.next_task != null) {
            result.next_task = listResult.next_task;
          }

          results.push(result);
        }

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          operation: (op['operation'] as 'create' | 'edit' | 'list') ?? 'create',
          status: 'error',
          error: message
        });
      }
    }

    return {
      success: true,
      document: documentPath,
      operations_completed: results.filter(r => r.status !== 'error').length,
      results,
      timestamp: new Date().toISOString().split('T')[0] ?? new Date().toISOString()
    };

  } catch (error) {
    throw new AddressingError(
      `Coordinator task operation failed: ${error instanceof Error ? error.message : String(error)}`,
      'COORDINATOR_OPERATION_FAILED'
    );
  }
}

/**
 * Ensure /coordinator/active.md exists, creating it if necessary
 */
async function ensureCoordinatorDocument(manager: DocumentManager, docPath: string): Promise<void> {
  const document = await manager.getDocument(docPath);

  if (document == null) {
    // Document doesn't exist - create it
    // First ensure /coordinator/ directory exists using FOLDER_NAMES constant
    const fs = await import('fs/promises');
    const path = await import('path');
    const docsRoot = manager['docsRoot'] as string;
    const coordinatorDir = path.join(docsRoot, FOLDER_NAMES.COORDINATOR);

    try {
      await fs.mkdir(coordinatorDir, { recursive: true });
    } catch (error) {
      // Ignore if already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    // Create blank document with title and overview
    // Use DocumentManager's createDocument (creates with template)
    await manager.createDocument(docPath, {
      title: 'Coordinator Tasks',
      template: 'blank'
    });

    // Add overview content after creation
    const docFilePath = path.join(docsRoot, docPath.substring(1));
    const content = await fs.readFile(docFilePath, 'utf8');
    const withOverview = content.replace(
      /^(# Coordinator Tasks\n\n)/,
      '$1Sequential coordinator task list. Auto-archives when all tasks complete.\n\n'
    );
    await fs.writeFile(docFilePath, withOverview, 'utf8');

    // Invalidate cache to pick up the overview
    manager['cache'].invalidateDocument(docPath);
  }
}
