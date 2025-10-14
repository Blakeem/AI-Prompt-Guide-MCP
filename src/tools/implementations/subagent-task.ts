/**
 * Implementation for the subagent_task tool
 * Unified tool for creating, editing, completing, and listing tasks in ad-hoc mode
 * (requires #slug for assigned subagent tasks)
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
import {
  createTaskOperation,
  editTaskOperation,
  listTasksOperation,
  type TaskHierarchicalContext
} from '../../shared/task-operations.js';
import { PATH_PREFIXES } from '../../shared/namespace-constants.js';

/**
 * Maximum number of operations allowed in a single batch request
 * Prevents performance issues and potential DoS attacks
 */
const MAX_BATCH_SIZE = 100;

/**
 * Parse operation target with document override support
 * Supports three formats:
 * 1. Slug only: "task-slug" (uses default document)
 * 2. Full path: "/doc.md#task-slug" (overrides document)
 * 3. Null/undefined (for create operations without specific task reference)
 */
function parseOperationTarget(
  operation: { task?: string },
  defaultDocument: string
): { document: string; slug: string } {
  const fieldValue = operation.task;

  if (fieldValue == null) {
    // Create operations may not have task slug
    return { document: defaultDocument, slug: '' };
  }

  // Check for full path (contains #)
  if (fieldValue.includes('#')) {
    const parts = fieldValue.split('#');
    const docPath = parts[0];
    const slug = parts[1];

    if (docPath == null || docPath === '') {
      throw new AddressingError(
        'Full path must include document path before #',
        'MISSING_DOCUMENT_PATH'
      );
    }

    if (slug == null || slug === '') {
      throw new AddressingError(
        'Full path must include task slug after #',
        'MISSING_SLUG'
      );
    }

    // Override: use embedded document path
    return { document: docPath, slug };
  }

  // Check for path without slug (error case)
  if (fieldValue.startsWith('/')) {
    throw new AddressingError(
      'Document path must include task slug after # (e.g., "/doc.md#slug")',
      'PATH_WITHOUT_SLUG'
    );
  }

  // Slug only: use default document
  return { document: defaultDocument, slug: fieldValue };
}


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
 * MCP tool for subagent task management with bulk operations support
 *
 * Supports bulk task operations including creation, editing, and listing in a single call.
 * Always pass operations as an array, even for single task operations.
 *
 * VALIDATION: Requires document to be in /docs/ namespace (explicit path prefix required).
 *
 * @param args - Object with document path and operations array
 * @param _state - MCP session state (unused in current implementation)
 * @returns Bulk operation results with created/edited tasks and filtered lists
 *
 * @example
 * // Single task creation (uses operations array)
 * const result = await subagentTask({
 *   document: "/docs/project/setup.md",
 *   operations: [{
 *     operation: "create",
 *     title: "Initialize Database",
 *     content: "Status: pending\n\nSet up PostgreSQL database"
 *   }]
 * });
 *
 * // Multiple operations in one call
 * const result = await subagentTask({
 *   document: "/docs/project/setup.md",
 *   operations: [
 *     { operation: "create", title: "Task 1", content: "Status: pending\n\nContent 1" },
 *     { operation: "create", title: "Task 2", content: "Status: pending\n\nContent 2" },
 *     { operation: "list" }
 *   ]
 * });
 *
 * @throws {AddressingError} When document or task addresses are invalid or not found
 * @throws {Error} When task operations fail due to content constraints or structural issues
 */
export async function subagentTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<TaskBulkResponse> {
  try {
    // Validate operations array exists and is valid
    const operations = args['operations'] as unknown;

    if (!Array.isArray(operations)) {
      throw new AddressingError(
        'operations array is required and must be an array',
        'MISSING_OPERATIONS',
        { provided: operations, type: typeof operations }
      );
    }

    if (operations.length === 0) {
      throw new AddressingError(
        'operations array cannot be empty - must contain at least one operation',
        'EMPTY_OPERATIONS'
      );
    }

    // Extract and validate document path
    const documentPath = ToolIntegration.validateStringParameter(args['document'], 'document');

    // Use addressing system for document validation
    const { addresses } = ToolIntegration.validateAndParse({
      document: documentPath
    });

    // REQUIRED: Subagent tools only work in /docs/ namespace
    if (!addresses.document.path.startsWith(PATH_PREFIXES.DOCS)) {
      throw new AddressingError(
        `Subagent tools only work in ${PATH_PREFIXES.DOCS} namespace. Use coordinator tools for /coordinator/ namespace.`,
        'INVALID_NAMESPACE_FOR_SUBAGENT',
        {
          document: addresses.document.path,
          suggestion: `Use ${PATH_PREFIXES.DOCS} prefix (e.g., /docs/api/auth.md) or use coordinator_task for coordinator tasks`
        }
      );
    }

    // Get document and validate existence
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    // Process all operations
    return await processTaskOperations(addresses.document.path, operations, manager);

  } catch (error) {
    if (error instanceof AddressingError) {
      const errorResponse = ToolIntegration.formatHierarchicalError(error, 'Verify task section structure and document organization');
      throw new AddressingError(errorResponse.error, error.code, errorResponse.context as Record<string, unknown> | undefined);
    }
    throw new AddressingError(
      `Task operation failed: ${error instanceof Error ? error.message : String(error)}`,
      'OPERATION_FAILED'
    );
  }
}

/**
 * Process bulk task operations
 */
async function processTaskOperations(
  documentPath: string,
  operations: Array<Record<string, unknown>>,
  manager: DocumentManager
): Promise<TaskBulkResponse> {
  // Validate batch size to prevent performance issues
  if (operations.length > MAX_BATCH_SIZE) {
    throw new AddressingError(
      `Batch size ${operations.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
      'BATCH_TOO_LARGE',
      { batchSize: operations.length, maxSize: MAX_BATCH_SIZE }
    );
  }

  const results: TaskOperationResult[] = [];

  for (const op of operations) {
    try {
      // Validate operation type
      const operation = ToolIntegration.validateOperation(
        op['operation'] ?? '',
        ['create', 'edit', 'list'] as const,
        'task'
      );

      // Process based on operation type
      if (operation === 'create') {
        const title = ToolIntegration.validateOptionalStringParameter(op['title'], 'title');
        const content = ToolIntegration.validateOptionalStringParameter(op['content'], 'content');

        if (title == null || content == null) {
          throw new AddressingError('Missing required parameters for create: title and content', 'MISSING_PARAMETER');
        }

        // Parse operation target with potential document override
        const { document: targetDoc, slug: taskSlug } = parseOperationTarget(op as { task?: string }, documentPath);

        // Validate target document (may be different from default)
        const targetAddresses = ToolIntegration.validateAndParse({
          document: targetDoc
        });

        // Verify document exists
        const targetDocument = await manager.getDocument(targetAddresses.addresses.document.path);
        if (targetDocument == null) {
          throw new DocumentNotFoundError(targetAddresses.addresses.document.path);
        }

        // Convert empty string to undefined for createTaskOperation parameter
        const referenceSlug = taskSlug === '' ? undefined : taskSlug;
        const createResult = await createTaskOperation(
          manager,
          targetAddresses.addresses.document.path,
          title,
          content,
          referenceSlug
        );

        results.push({
          operation: 'create',
          status: 'created',
          task: {
            slug: createResult.slug,
            title: createResult.title,
            ...(createResult.hierarchical_context != null && {
              hierarchical_context: createResult.hierarchical_context
            })
          }
        });

      } else if (operation === 'edit') {
        const content = ToolIntegration.validateOptionalStringParameter(op['content'], 'content');

        if (content == null) {
          throw new AddressingError('Missing required parameters for edit: content', 'MISSING_PARAMETER');
        }

        // Parse operation target with potential document override
        const { document: targetDoc, slug: taskSlug } = parseOperationTarget(op as { task?: string }, documentPath);

        if (taskSlug === '') {
          throw new AddressingError('Missing required parameter for edit: task slug', 'MISSING_PARAMETER');
        }

        // Parse task address with potentially overridden document
        const taskAddresses = ToolIntegration.validateAndParse({
          document: targetDoc,
          task: taskSlug
        });

        if (taskAddresses.addresses.task == null) {
          throw new AddressingError('Task address validation failed', 'INVALID_TASK');
        }

        // Verify document exists
        const targetDocument = await manager.getDocument(taskAddresses.addresses.document.path);
        if (targetDocument == null) {
          throw new DocumentNotFoundError(taskAddresses.addresses.document.path);
        }

        await editTaskOperation(
          manager,
          taskAddresses.addresses.document.path,
          taskSlug,
          content
        );

        results.push({
          operation: 'edit',
          status: 'updated'
        });

      } else if (operation === 'list') {
        const statusFilter = ToolIntegration.validateOptionalStringParameter(op['status'], 'status');

        // Parse operation target with potential document override
        const { document: targetDoc } = parseOperationTarget(op as { task?: string }, documentPath);

        // Validate target document (may be different from default)
        const targetAddresses = ToolIntegration.validateAndParse({
          document: targetDoc
        });

        // Verify document exists
        const targetDocument = await manager.getDocument(targetAddresses.addresses.document.path);
        if (targetDocument == null) {
          throw new DocumentNotFoundError(targetAddresses.addresses.document.path);
        }

        const listResult = await listTasksOperation(
          manager,
          targetAddresses.addresses.document.path,
          statusFilter
        );

        const result: TaskOperationResult = {
          operation: 'list',
          status: 'listed',
          count: listResult.tasks.length
        };

        if (listResult.tasks.length > 0) {
          result.tasks = listResult.tasks;
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
}


