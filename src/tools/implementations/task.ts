/**
 * Implementation for the task tool
 * Unified tool for creating, editing, completing, and listing tasks
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import type { Heading } from '../../types/core.js';
import {
  getDocumentManager,
  performSectionEdit
} from '../../shared/utilities.js';
import { titleToSlug } from '../../slug.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError,
  isTaskSection
} from '../../shared/addressing-system.js';
import type {
  parseTaskAddress,
  parseDocumentAddress
} from '../../shared/addressing-system.js';

interface TaskResult {
  operation: string;
  document: string;
  tasks?: Array<{
    slug: string;
    title: string;
    status: string;
    priority?: string;
    link?: string;
    dependencies?: string[];
  }>;
  next_task?: {
    slug: string;
    title: string;
    link?: string;
  };
  task_created?: {
    slug: string;
    title: string;
  };
  document_info?: {
    slug: string;
    title: string;
    namespace: string;
  };
  timestamp: string;
}

export async function task(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<TaskResult> {
  try {
    const manager: DocumentManager = await getDocumentManager();

    // Validate required parameters
    if (typeof args['document'] !== 'string' || args['document'] === '') {
      throw new AddressingError('Missing required parameter: document', 'MISSING_PARAMETER');
    }

    const operation = (args['operation'] as string) ?? 'list';
    const taskSlug = args['task'] as string;
    const content = args['content'] as string;
    const title = args['title'] as string;
    const statusFilter = args['status'] as string;
    const priorityFilter = args['priority'] as string;

    // Use addressing system for validation and parsing
    const { addresses } = ToolIntegration.validateAndParse({
      document: args['document'],
      ...(taskSlug != null && taskSlug !== '' && { task: taskSlug })
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
        if (!title || !content) {
          throw new AddressingError('Missing required parameters for create: title and content', 'MISSING_PARAMETER');
        }
        return await createTask(manager, addresses, title, content, taskSlug, documentInfo);

      case 'edit':
        if (!taskSlug || !content) {
          throw new AddressingError('Missing required parameters for edit: task and content', 'MISSING_PARAMETER');
        }
        if (addresses.task == null) {
          throw new AddressingError('Task address validation failed', 'INVALID_TASK');
        }
        return await editTask(manager, addresses, content, documentInfo);

      default:
        throw new AddressingError(`Invalid operation: ${operation}. Must be one of: list, create, edit`, 'INVALID_OPERATION');
    }

  } catch (error) {
    if (error instanceof AddressingError) {
      throw error;
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
    const taskHeadings = await getTaskHeadings(document, tasksSection);

    // Parse task details from each task heading using addressing system patterns
    const tasks = await Promise.all(taskHeadings.map(async heading => {
      // Get the task content using validated document path
      const taskContent = await manager.getSectionContent(addresses.document.path, heading.slug) ?? '';

      // Parse task metadata from content
      const status = extractMetadata(taskContent, 'Status') ?? 'pending';
      const priority = extractMetadata(taskContent, 'Priority');
      const link = extractLinkFromContent(taskContent);
      const dependencies = extractDependencies(taskContent);

      return {
        slug: heading.slug,
        title: heading.title,
        status,
        ...(priority != null && priority !== '' && { priority }),
        ...(link != null && link !== '' && { link }),
        ...(dependencies.length > 0 && { dependencies })
      };
    }));

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

    return {
      operation: 'list',
      document: addresses.document.path,
      tasks: filteredTasks,
      ...(nextTask != null && { next_task: nextTask }),
      ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    if (error instanceof AddressingError) {
      throw error;
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
      throw error;
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
  addresses: { document: ReturnType<typeof parseDocumentAddress>; task?: ReturnType<typeof parseTaskAddress> },
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
      throw error;
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

/**
 * Find all task headings that are children of the Tasks section
 * Updated to use addressing system's isTaskSection for consistent task identification
 */
async function getTaskHeadings(
  document: { readonly headings: readonly Heading[] },
  tasksSection: Heading
): Promise<Heading[]> {
  const taskHeadings: Heading[] = [];
  const tasksIndex = document.headings.findIndex(h => h.slug === tasksSection.slug);

  if (tasksIndex === -1) return taskHeadings;

  const targetDepth = tasksSection.depth + 1;

  // Look at headings after the Tasks section using addressing system validation
  for (let i = tasksIndex + 1; i < document.headings.length; i++) {
    const heading = document.headings[i];
    if (heading == null) continue;

    // If we hit a heading at the same or shallower depth as Tasks, we're done
    if (heading.depth <= tasksSection.depth) {
      break;
    }

    // If this is a direct child of Tasks section (depth = Tasks.depth + 1), it's a task
    if (heading.depth === targetDepth) {
      // Use addressing system to validate this is actually a task
      // Convert readonly Heading[] to compatible format
      const compatibleDocument = {
        headings: document.headings.map(h => ({
          slug: h.slug,
          title: h.title,
          depth: h.depth
        }))
      };
      const isTask = await isTaskSection(heading.slug, compatibleDocument);
      if (isTask) {
        taskHeadings.push(heading);
      }
    }

    // Skip deeper nested headings (they are children of tasks, not tasks themselves)
  }

  return taskHeadings;
}

function extractMetadata(content: string, key: string): string | undefined {
  // Support both "* Key: value" and "- Key: value" formats
  const starMatch = content.match(new RegExp(`^\\* ${key}:\\s*(.+)$`, 'm'));
  if (starMatch != null) return starMatch[1]?.trim();

  const dashMatch = content.match(new RegExp(`^- ${key}:\\s*(.+)$`, 'm'));
  return dashMatch?.[1]?.trim();
}

function extractLinkFromContent(content: string): string | undefined {
  const match = content.match(/^→ (.+)$/m);
  return match?.[1]?.trim();
}

function extractDependencies(content: string): string[] {
  const match = extractMetadata(content, 'Dependencies');
  if (match == null || match === '' || match === 'none') return [];
  return match.split(',').map(dep => dep.trim());
}

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

