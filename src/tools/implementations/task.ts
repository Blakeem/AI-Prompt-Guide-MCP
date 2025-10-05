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

interface TaskResult {
  operation: string;
  document: string;
  tasks?: Array<{
    slug: string;
    title: string;
    status: string;
    priority?: string;
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
  document_info?: {
    slug: string;
    title: string;
    namespace: string;
  };
  timestamp: string;
}

/**
 * MCP tool for comprehensive task management with creation, editing, and listing capabilities
 *
 * Supports task lifecycle management including creation of new tasks, editing existing ones,
 * and intelligent filtering by status, priority, and document context. Uses hierarchical
 * addressing for precise task location and management.
 *
 * @param args - Task operation parameters including action, document paths, and task details
 * @param _state - MCP session state (unused in current implementation)
 * @returns Task operation results with created/edited tasks, document context, and filtered lists
 *
 * @example
 * // Create a new task
 * const result = await task({
 *   action: "create",
 *   document: "project/setup.md",
 *   title: "Initialize Database",
 *   priority: "high",
 *   status: "pending"
 * });
 *
 * // List tasks with filtering
 * const result = await task({
 *   action: "list",
 *   documents: ["project/setup.md", "api/auth.md"],
 *   status: "pending",
 *   priority: "high"
 * });
 *
 * // Edit existing task
 * const result = await task({
 *   action: "edit",
 *   document: "project/setup.md",
 *   task: "initialize-database",
 *   status: "in-progress"
 * });
 *
 * @throws {AddressingError} When document or task addresses are invalid or not found
 * @throws {Error} When task operations fail due to content constraints or structural issues
 */
export async function task(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<TaskResult> {
  try {

    // Validate parameters using ToolIntegration utilities
    const documentPath = ToolIntegration.validateStringParameter(args['document'], 'document');
    const operationRaw = args['operation'] ?? 'list';
    const operation = ToolIntegration.validateOperation(
      operationRaw,
      ['list', 'create', 'edit'] as const,
      'task'
    );

    const taskSlug = ToolIntegration.validateOptionalStringParameter(args['task'], 'task');
    const content = ToolIntegration.validateOptionalStringParameter(args['content'], 'content');
    const title = ToolIntegration.validateOptionalStringParameter(args['title'], 'title');
    const statusFilter = ToolIntegration.validateOptionalStringParameter(args['status'], 'status');
    const priorityFilter = ToolIntegration.validateOptionalStringParameter(args['priority'], 'priority');

    // Use addressing system for validation and parsing
    const { addresses } = ToolIntegration.validateAndParse({
      document: documentPath,
      ...(taskSlug != null && { task: taskSlug })
    });

    // Get document and validate existence
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    // Format document info using addressing system helper
    const documentInfo = ToolIntegration.formatDocumentInfo(addresses.document, {
      title: document.metadata.title
    });

    switch (operation) {
      case 'list':
        return await listTasks(manager, addresses, statusFilter, priorityFilter, documentInfo);

      case 'create':
        if (title == null || content == null) {
          throw new AddressingError('Missing required parameters for create: title and content', 'MISSING_PARAMETER');
        }
        return await createTask(manager, addresses, title, content, taskSlug, documentInfo);

      case 'edit':
        if (taskSlug == null || content == null) {
          throw new AddressingError('Missing required parameters for edit: task and content', 'MISSING_PARAMETER');
        }
        if (addresses.task == null) {
          throw new AddressingError('Task address validation failed', 'INVALID_TASK');
        }
        return await editTask(manager, addresses, content, documentInfo);

      default:
        // This should never happen due to validateOperation, but keep for type safety
        throw new AddressingError(`Invalid operation: ${operation}. Must be one of: list, create, edit`, 'INVALID_OPERATION');
    }

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
 * List tasks from Tasks section with optional filtering
 * Updated to use addressing system for consistent task identification
 */
async function listTasks(
  manager: DocumentManager,
  addresses: { document: ReturnType<typeof parseDocumentAddress> },
  statusFilter?: string,
  priorityFilter?: string,
  documentInfo?: unknown
): Promise<TaskResult> {
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
        operation: 'list',
        document: addresses.document.path,
        tasks: [],
        ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
        timestamp: new Date().toISOString()
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
      priority?: string;
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
        const priority = extractTaskField(taskContent, 'Priority');
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
          ...(priority != null && priority !== '' && { priority }),
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
    if (priorityFilter != null && priorityFilter !== '') {
      filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }

    // Find next available task (pending or in_progress, high priority first)
    const nextTask = findNextTask(filteredTasks);

    // Generate hierarchical summary
    const hierarchicalSummary = generateHierarchicalSummary(filteredTasks);

    return {
      operation: 'list',
      document: addresses.document.path,
      tasks: filteredTasks,
      ...(hierarchicalSummary != null && { hierarchical_summary: hierarchicalSummary }),
      ...(nextTask != null && { next_task: nextTask }),
      ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
      timestamp: new Date().toISOString()
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
  referenceSlug?: string,
  documentInfo?: unknown
): Promise<TaskResult> {
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
      operation: 'create',
      document: addresses.document.path,
      task_created: {
        slug: taskSlug,  // Return the actual task slug without prefix
        title
      },
      ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
      timestamp: new Date().toISOString()
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
  content: string,
  documentInfo?: unknown
): Promise<TaskResult> {
  // Validate task address exists
  if (addresses.task == null) {
    throw new AddressingError('Task address is required for edit operation', 'MISSING_TASK');
  }
  try {
    // Update the task section with new content using validated addresses
    await performSectionEdit(manager, addresses.document.path, addresses.task.slug, content, 'replace');

    return {
      operation: 'edit',
      document: addresses.document.path,
      ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
      timestamp: new Date().toISOString()
    };

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
    // No Tasks section exists, we need to create one
    // This should be done by adding it to the document, not via performSectionEdit
    throw new AddressingError(
      'No Tasks section found in document. Please add a "## Tasks" section to the document first.',
      'NO_TASKS_SECTION',
      { document: docPath }
    );
  }
  // Tasks section exists, nothing to do
}

// getTaskHeadings function moved to shared/task-utilities.ts to eliminate duplication

// Metadata extraction functions moved to shared/task-view-utilities.ts to eliminate duplication


function findNextTask(tasks: Array<{ status: string; priority?: string; slug: string; title: string; link?: string }>): {
  slug: string;
  title: string;
  link?: string;
} | undefined {
  // Find next available task (pending or in_progress)
  const availableTasks = tasks.filter(task =>
    task.status === 'pending' || task.status === 'in_progress'
  );

  if (availableTasks.length === 0) return undefined;

  // Sort by priority (high first) then by order
  availableTasks.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    return bPriority - aPriority;
  });

  const nextTask = availableTasks[0];
  if (!nextTask) return undefined;

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

