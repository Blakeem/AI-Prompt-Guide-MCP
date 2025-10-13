/**
 * Implementation for the task tool
 * Unified tool for creating, editing, completing, and listing tasks
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import { performSectionEdit } from '../../shared/utilities.js';
import { titleToSlug } from '../../slug.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError
} from '../../shared/addressing-system.js';
import { getTaskHeadingsFromHeadings } from '../../shared/task-utilities.js';
import {
  extractTaskField,
  extractTaskLink
} from '../../shared/task-view-utilities.js';
import type { parseDocumentAddress } from '../../shared/addressing-system.js';
import type {
  DocumentAddress,
  TaskAddress
} from '../../shared/addressing-system.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';

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
 * Get hierarchical context for a task slug
 */
function getTaskHierarchicalContext(taskSlug: string): TaskHierarchicalContext | null {
  if (!taskSlug.includes('/')) {
    return null; // No hierarchical context for flat tasks
  }

  const parts = taskSlug.split('/');
  if (parts.length < 2) {
    return null;
  }

  return {
    full_path: taskSlug,
    parent_path: parts.slice(0, -1).join('/'),
    phase: parts[0] ?? '',
    category: parts[1] ?? '',
    task_name: parts[parts.length - 1] ?? '',
    depth: parts.length
  };
}

/**
 * Hierarchical context for tasks
 */
interface TaskHierarchicalContext {
  full_path: string;
  parent_path: string;
  phase: string;
  category: string;
  task_name: string;
  depth: number;
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
 * MCP tool for comprehensive task management with bulk operations support
 *
 * Supports bulk task operations including creation, editing, and listing in a single call.
 * Always pass operations as an array, even for single task operations.
 *
 * @param args - Object with document path and operations array
 * @param _state - MCP session state (unused in current implementation)
 * @returns Bulk operation results with created/edited tasks and filtered lists
 *
 * @example
 * // Single task creation (uses operations array)
 * const result = await task({
 *   document: "/project/setup.md",
 *   operations: [{
 *     operation: "create",
 *     title: "Initialize Database",
 *     content: "Status: pending\n\nSet up PostgreSQL database"
 *   }]
 * });
 *
 * // Multiple operations in one call
 * const result = await task({
 *   document: "/project/setup.md",
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
export async function task(
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

        // Convert empty string to undefined for createTask parameter
        const referenceSlug = taskSlug === '' ? undefined : taskSlug;
        const createResult = await createTask(manager, targetAddresses.addresses, title, content, referenceSlug);
        if (createResult.task_created != null) {
          results.push({
            operation: 'create',
            status: 'created',
            task: createResult.task_created
          });
        }

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

        await editTask(manager, taskAddresses.addresses, content);
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

        const listResult = await listTasks(manager, targetAddresses.addresses, statusFilter);

        const result: TaskOperationResult = {
          operation: 'list',
          status: 'listed',
          count: listResult.tasks?.length ?? 0
        };

        if (listResult.tasks != null) {
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

/**
 * Internal task result for helper functions
 */
interface InternalTaskResult {
  tasks?: Array<{
    slug: string;
    title: string;
    status: string;
    link?: string;
    referenced_documents?: HierarchicalContent[];
    hierarchical_context?: TaskHierarchicalContext;
  }>;
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
  task_created?: {
    slug: string;
    title: string;
    hierarchical_context?: TaskHierarchicalContext;
  };
}

/**
 * List tasks from Tasks section with optional filtering
 * Updated to use addressing system for consistent task identification
 */
async function listTasks(
  manager: DocumentManager,
  addresses: { document: ReturnType<typeof parseDocumentAddress> },
  statusFilter?: string
): Promise<InternalTaskResult> {
  try {
    // Get the document - existence already validated in main function
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    // Find the Tasks section using consistent addressing logic
    const tasksSection = document.headings.find(h =>
      h.slug === 'tasks' ||
      h.title.toLowerCase() === 'tasks'
    );

    if (tasksSection == null) {
      return {
        tasks: []
      };
    }

    // Find all task headings using standardized task identification logic
    const taskHeadings = await getTaskHeadingsFromHeadings(document, tasksSection);

    // Parse task details from each task heading using addressing system patterns
    // Use try-catch with cleanup for critical operations to prevent resource leaks
    interface TaskData {
      slug: string;
      title: string;
      status: string;
      link?: string;
      dependencies?: string[];
      hierarchical_context?: TaskHierarchicalContext;
    }
    let tasks: TaskData[] = [];
    try {
      tasks = await Promise.all(taskHeadings.map(async heading => {
        // Get the task content using validated document path
        const taskContent = await manager.getSectionContent(addresses.document.path, heading.slug) ?? '';

        // Parse task metadata from content
        const status = extractTaskField(taskContent, 'Status') ?? 'pending';
        const link = extractTaskLink(taskContent);

        // Extract and load references using new system
        const { loadConfig } = await import('../../config.js');
        const { ReferenceExtractor } = await import('../../shared/reference-extractor.js');
        const { ReferenceLoader } = await import('../../shared/reference-loader.js');
        const config = loadConfig();
        const extractor = new ReferenceExtractor();
        const loader = new ReferenceLoader();
        const refs = extractor.extractReferences(taskContent);
        const normalizedRefs = extractor.normalizeReferences(refs, addresses.document.path);
        const referencedDocuments = await loader.loadReferences(normalizedRefs, manager, config.referenceExtractionDepth);

        // Get hierarchical context for the task
        const hierarchicalContext = getTaskHierarchicalContext(heading.slug);

        return {
          slug: heading.slug,
          title: heading.title,
          status,
          ...(link != null && link !== '' && { link }),
          ...(referencedDocuments.length > 0 && { referenced_documents: referencedDocuments }),
          ...(hierarchicalContext != null && { hierarchical_context: hierarchicalContext })
        };
      }));
    } catch (error) {
      // Critical operation failed - ensure cache consistency by invalidating document
      // This prevents partial cache state that could cause data corruption
      try {
        manager['cache'].invalidateDocument(addresses.document.path);
      } catch (cleanupError) {
        // Log cleanup failure but don't mask original error
        console.warn(`Cache cleanup failed after task loading error: ${cleanupError}`);
      }

      // Re-throw original error to maintain expected behavior
      throw error;
    }

    // Apply filters
    let filteredTasks = tasks;
    if (statusFilter != null && statusFilter !== '') {
      filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }

    // Find next available task (pending or in_progress, sequential order)
    const nextTask = findNextTask(filteredTasks);

    // Generate hierarchical summary
    const hierarchicalSummary = generateHierarchicalSummary(filteredTasks);

    return {
      tasks: filteredTasks,
      ...(hierarchicalSummary != null && { hierarchical_summary: hierarchicalSummary }),
      ...(nextTask != null && { next_task: nextTask })
    };

  } catch (error) {
    if (error instanceof AddressingError) {
      const errorResponse = ToolIntegration.formatHierarchicalError(error, 'Check document has Tasks section and verify hierarchical structure');
      throw new AddressingError(errorResponse.error, error.code, errorResponse.context as Record<string, unknown> | undefined);
    }
    throw new AddressingError(
      `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`,
      'TASK_LIST_FAILED',
      { document: addresses.document.path }
    );
  }
}

/**
 * Create a new task in the Tasks section
 * Updated to use addressing system for validation and consistency
 */
async function createTask(
  manager: DocumentManager,
  addresses: { document: ReturnType<typeof parseDocumentAddress> },
  title: string,
  content: string,
  referenceSlug?: string
): Promise<InternalTaskResult> {
  try {
    const taskSlug = titleToSlug(title);
    // Task slugs are just the title slug, not prefixed with "tasks/"
    // The hierarchical relationship is maintained by document structure, not slug naming

    // Build task content in our standard format
    const taskContent = `### ${title}
${content}`;

    // Use section tool logic to insert the task with validated paths
    // If referenceSlug provided, insert after it, otherwise append to Tasks section
    const operation = referenceSlug != null && referenceSlug !== '' ? 'insert_after' : 'append_child';
    const targetSection = referenceSlug ?? 'tasks';

    // Create or update the Tasks section using addressing system validation
    await ensureTasksSection(manager, addresses.document.path);

    // Insert the new task using validated document path
    await performSectionEdit(manager, addresses.document.path, targetSection, taskContent, operation, title);

    return {
      task_created: {
        slug: taskSlug,  // Return the actual task slug without prefix
        title
      }
    };

  } catch (error) {
    if (error instanceof AddressingError) {
      const errorResponse = ToolIntegration.formatHierarchicalError(error, 'Ensure Tasks section exists and task hierarchy is valid');
      throw new AddressingError(errorResponse.error, error.code, errorResponse.context as Record<string, unknown> | undefined);
    }
    throw new AddressingError(
      `Failed to create task: ${error instanceof Error ? error.message : String(error)}`,
      'TASK_CREATE_FAILED',
      { document: addresses.document.path, title }
    );
  }
}

/**
 * Edit an existing task
 * Updated to use addressing system for task validation and consistency
 */
async function editTask(
  manager: DocumentManager,
  addresses: { document: DocumentAddress; task?: TaskAddress },
  content: string
): Promise<InternalTaskResult> {
  // Validate task address exists
  if (addresses.task == null) {
    throw new AddressingError('Task address is required for edit operation', 'MISSING_TASK');
  }
  try {
    // Update the task section with new content using validated addresses
    await performSectionEdit(manager, addresses.document.path, addresses.task.slug, content, 'replace');

    return {};

  } catch (error) {
    if (error instanceof AddressingError) {
      const errorResponse = ToolIntegration.formatHierarchicalError(error, 'Verify task exists and hierarchy structure is correct');
      throw new AddressingError(errorResponse.error, error.code, errorResponse.context as Record<string, unknown> | undefined);
    }
    throw new AddressingError(
      `Failed to edit task: ${error instanceof Error ? error.message : String(error)}`,
      'TASK_EDIT_FAILED',
      { document: addresses.document.path, task: addresses.task.slug }
    );
  }
}


/**
 * Helper functions
 */


async function ensureTasksSection(manager: DocumentManager, docPath: string): Promise<void> {
  const document = await manager.getDocument(docPath);
  if (document == null) {
    throw new DocumentNotFoundError(docPath);
  }

  // Check if Tasks section already exists
  const tasksSection = document.headings.find(h =>
    h.slug === 'tasks' ||
    h.title.toLowerCase() === 'tasks'
  );

  if (tasksSection == null) {
    // No Tasks section exists - AUTO-CREATE IT

    // Find the document title heading (H1) to append Tasks after it
    const titleHeading = document.headings.find(h => h.depth === 1);

    if (titleHeading == null) {
      throw new AddressingError(
        'Cannot auto-create Tasks section: document has no title heading (H1)',
        'NO_TITLE_HEADING',
        { document: docPath }
      );
    }

    const titleSlug = titleHeading.slug;

    // Create Tasks section as child of document title
    // This will create an H2 section (depth 2) with proper content
    await performSectionEdit(
      manager,
      docPath,
      titleSlug,
      'Task list for this document.',
      'append_child',
      'Tasks'
    );

    // Invalidate cache to ensure Tasks section is available for subsequent operations
    manager['cache'].invalidateDocument(docPath);
  }
  // Tasks section exists (either found or just created), nothing more to do
}

// getTaskHeadings function moved to shared/task-utilities.ts to eliminate duplication

// Metadata extraction functions moved to shared/task-view-utilities.ts to eliminate duplication


function findNextTask(tasks: Array<{ status: string; slug: string; title: string; link?: string }>): {
  slug: string;
  title: string;
  link?: string;
} | undefined {
  // Find next available task (pending or in_progress) in sequential document order
  const availableTasks = tasks.filter(task =>
    task.status === 'pending' || task.status === 'in_progress'
  );

  if (availableTasks.length === 0) return undefined;

  // Return first available task (already in document order)
  const nextTask = availableTasks[0];
  if (nextTask == null) return undefined;

  return {
    slug: nextTask.slug,
    title: nextTask.title,
    ...(nextTask.link != null && nextTask.link !== '' && { link: nextTask.link })
  };
}

/**
 * Generate hierarchical summary for tasks
 */
function generateHierarchicalSummary(
  tasks: Array<{
    slug: string;
    status: string;
    hierarchical_context?: TaskHierarchicalContext;
  }>
): {
  by_phase: Record<string, { total: number; pending: number; in_progress: number; completed: number }>;
  by_category: Record<string, { total: number; pending: number; in_progress?: number; completed?: number }>;
  critical_path: string[];
} | null {
  const hierarchicalTasks = tasks.filter(t => t.hierarchical_context != null);

  if (hierarchicalTasks.length === 0) {
    return null; // No hierarchical tasks
  }

  // Group by phase
  const byPhase: Record<string, { total: number; pending: number; in_progress: number; completed: number }> = {};
  const byCategory: Record<string, { total: number; pending: number; in_progress?: number; completed?: number }> = {};

  for (const task of hierarchicalTasks) {
    const context = task.hierarchical_context;
    if (context == null) continue;

    const phase = context.phase;
    const category = context.category;

    // Initialize phase stats
    byPhase[phase] ??= { total: 0, pending: 0, in_progress: 0, completed: 0 };

    // Initialize category stats
    byCategory[category] ??= { total: 0, pending: 0 };

    // Update counts
    const phaseStats = byPhase[phase];
    const categoryStats = byCategory[category];

    if (phaseStats != null) {
      phaseStats.total++;
    }
    if (categoryStats != null) {
      categoryStats.total++;
    }

    if (task.status === 'pending') {
      if (phaseStats != null) {
        phaseStats.pending++;
      }
      if (categoryStats != null) {
        categoryStats.pending++;
      }
    } else if (task.status === 'in_progress') {
      if (phaseStats != null) {
        phaseStats.in_progress++;
      }
      if (categoryStats != null) {
        categoryStats.in_progress ??= 0;
        categoryStats.in_progress++;
      }
    } else if (task.status === 'completed') {
      if (phaseStats != null) {
        phaseStats.completed++;
      }
      if (categoryStats != null) {
        categoryStats.completed ??= 0;
        categoryStats.completed++;
      }
    }
  }

  // Generate critical path (simplified - tasks in dependency order)
  const criticalPath = hierarchicalTasks
    .filter(task => task.hierarchical_context != null)
    .sort((a, b) => {
      // Sort by phase first, then by category, then by task name
      const aContext = a.hierarchical_context;
      const bContext = b.hierarchical_context;

      if (aContext == null || bContext == null) {
        return 0; // Should not happen due to filter above, but safety
      }

      if (aContext.phase !== bContext.phase) {
        return aContext.phase.localeCompare(bContext.phase);
      }
      if (aContext.category !== bContext.category) {
        return aContext.category.localeCompare(bContext.category);
      }
      return aContext.task_name.localeCompare(bContext.task_name);
    })
    .map(t => t.slug);

  return {
    by_phase: byPhase,
    by_category: byCategory,
    critical_path: criticalPath
  };
}

