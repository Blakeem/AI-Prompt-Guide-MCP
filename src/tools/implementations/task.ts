/**
 * Implementation for the task tool
 * Unified tool for creating, editing, completing, and listing tasks
 */

import type { SessionState } from '../../session/types.js';
import type { DocumentManager } from '../../document-manager.js';
import {
  getDocumentManager,
  pathToNamespace,
  pathToSlug,
  performSectionEdit
} from '../../shared/utilities.js';
import { titleToSlug } from '../../slug.js';

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

    const docPath = args['document'] as string;
    const taskSlug = args['task'] as string;
    const content = args['content'] as string;
    const operation = (args['operation'] as string) ?? 'list';
    const title = args['title'] as string;
    const statusFilter = args['status'] as string;
    const priorityFilter = args['priority'] as string;

    if (!docPath) {
      throw new Error('Missing required parameter: document');
    }

    const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;

    // Get document information
    const document = await manager.getDocument(normalizedPath);
    const documentInfo = document != null ? {
      path: normalizedPath,
      slug: pathToSlug(normalizedPath),
      title: document.metadata.title,
      namespace: pathToNamespace(normalizedPath)
    } : undefined;

    switch (operation) {
      case 'list':
        return await listTasks(manager, normalizedPath, statusFilter, priorityFilter, documentInfo);

      case 'create':
        if (!title || !content) {
          throw new Error('Missing required parameters for create: title and content');
        }
        return await createTask(manager, normalizedPath, title, content, taskSlug, documentInfo);

      case 'edit':
        if (!taskSlug || !content) {
          throw new Error('Missing required parameters for edit: task and content');
        }
        return await editTask(manager, normalizedPath, taskSlug, content, documentInfo);

      default:
        throw new Error(`Invalid operation: ${operation}. Must be one of: list, create, edit`);
    }

  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * List tasks from Tasks section with optional filtering
 */
async function listTasks(
  manager: DocumentManager,
  docPath: string,
  statusFilter?: string,
  priorityFilter?: string,
  documentInfo?: unknown
): Promise<TaskResult> {
  try {
    // Get the document to access its heading structure
    const document = await manager.getDocument(docPath);
    if (document == null) {
      throw new Error(`Document not found: ${docPath}`);
    }

    // Find the Tasks section heading
    const tasksSection = document.headings.find(h =>
      h.slug === 'tasks' ||
      h.title.toLowerCase() === 'tasks'
    );

    if (tasksSection == null) {
      return {
        operation: 'list',
        document: docPath,
        tasks: [],
        ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
        timestamp: new Date().toISOString()
      };
    }

    // Find all task headings (children of the Tasks section)
    const taskHeadings = getTaskHeadings(document.headings, tasksSection);

    // Parse task details from each task heading
    const tasks = await Promise.all(taskHeadings.map(async heading => {
      // Get the task content
      const taskContent = await manager.getSectionContent(docPath, heading.slug) ?? '';

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
      document: docPath,
      tasks: filteredTasks,
      ...(nextTask != null && { next_task: nextTask }),
      ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new task in the Tasks section
 */
async function createTask(
  manager: DocumentManager,
  docPath: string,
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

    // Use section tool logic to insert the task
    // If referenceSlug provided, insert after it, otherwise append to Tasks section
    const operation = referenceSlug != null && referenceSlug !== '' ? 'insert_after' : 'append_child';
    const targetSection = referenceSlug ?? 'tasks';

    // Create or update the Tasks section
    await ensureTasksSection(manager, docPath);

    // Insert the new task
    await performSectionEdit(manager, docPath, targetSection, taskContent, operation, title);

    return {
      operation: 'create',
      document: docPath,
      task_created: {
        slug: taskSlug,  // Return the actual task slug without prefix
        title
      },
      ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Failed to create task: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Edit an existing task
 */
async function editTask(
  manager: DocumentManager,
  docPath: string,
  taskSlug: string,
  content: string,
  documentInfo?: unknown
): Promise<TaskResult> {
  try {
    // Update the task section with new content
    await performSectionEdit(manager, docPath, taskSlug, content, 'replace');

    return {
      operation: 'edit',
      document: docPath,
      ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Failed to edit task: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * Helper functions
 */


async function ensureTasksSection(manager: DocumentManager, docPath: string): Promise<void> {
  const document = await manager.getDocument(docPath);
  if (document == null) {
    throw new Error(`Document not found: ${docPath}`);
  }

  // Check if Tasks section already exists
  const tasksSection = document.headings.find(h =>
    h.slug === 'tasks' ||
    h.title.toLowerCase() === 'tasks'
  );

  if (tasksSection == null) {
    // No Tasks section exists, we need to create one
    // This should be done by adding it to the document, not via performSectionEdit
    throw new Error('No Tasks section found in document. Please add a "## Tasks" section to the document first.');
  }
  // Tasks section exists, nothing to do
}

/**
 * Find all task headings that are children of the Tasks section
 * by checking their structural position and depth in the document
 */
function getTaskHeadings(
  headings: readonly { slug: string; title: string; depth: number }[],
  tasksSection: { slug: string; title: string; depth: number }
): Array<{ slug: string; title: string; depth: number }> {
  const taskHeadings: Array<{ slug: string; title: string; depth: number }> = [];
  const tasksIndex = headings.findIndex(h => h.slug === tasksSection.slug);

  if (tasksIndex === -1) return taskHeadings;

  const targetDepth = tasksSection.depth + 1;

  // Look at headings after the Tasks section
  for (let i = tasksIndex + 1; i < headings.length; i++) {
    const heading = headings[i];
    if (heading == null) continue;

    // If we hit a heading at the same or shallower depth as Tasks, we're done
    if (heading.depth <= tasksSection.depth) {
      break;
    }

    // If this is a direct child of Tasks section (depth = Tasks.depth + 1), it's a task
    if (heading.depth === targetDepth) {
      taskHeadings.push(heading);
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

