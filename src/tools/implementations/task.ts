/**
 * Implementation for the task tool
 * Unified tool for creating, editing, completing, and listing tasks
 */

import type { SessionState } from '../../session/types.js';
import {
  getDocumentManager,
  pathToNamespace,
  pathToSlug
} from '../../shared/utilities.js';
import { titleToSlug } from '../../slug.js';
import { listHeadings } from '../../parse.js';
import { readSection } from '../../sections.js';

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
    const manager = await getDocumentManager();

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
  manager: unknown,
  docPath: string,
  statusFilter?: string,
  priorityFilter?: string,
  documentInfo?: unknown
): Promise<TaskResult> {
  try {
    // Try to read the Tasks section
    const tasksContent = readSection(await getDocumentContent(manager, docPath), 'tasks');

    if (tasksContent == null || tasksContent === '') {
      return {
        operation: 'list',
        document: docPath,
        tasks: [],
        ...(documentInfo != null && typeof documentInfo === 'object' ? { document_info: documentInfo as { slug: string; title: string; namespace: string } } : {}),
        timestamp: new Date().toISOString()
      };
    }

    // Parse tasks from the Tasks section
    const tasks = parseTasksFromContent(tasksContent);

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
  manager: unknown,
  docPath: string,
  title: string,
  content: string,
  referenceSlug?: string,
  documentInfo?: unknown
): Promise<TaskResult> {
  try {
    const taskSlug = titleToSlug(title);

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
    await (manager as { editSection: (path: string, slug: string, content: string, op: string, title: string) => Promise<void> }).editSection(docPath, targetSection, taskContent, operation, title);

    return {
      operation: 'create',
      document: docPath,
      task_created: {
        slug: taskSlug,
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
  manager: unknown,
  docPath: string,
  taskSlug: string,
  content: string,
  documentInfo?: unknown
): Promise<TaskResult> {
  try {
    // Update the task section with new content
    await (manager as { editSection: (path: string, slug: string, content: string, op: string) => Promise<void> }).editSection(docPath, taskSlug, content, 'replace');

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

async function getDocumentContent(manager: unknown, docPath: string): Promise<string> {
  const doc = await (manager as { getDocument: (path: string) => Promise<{ content: string } | null> }).getDocument(docPath);
  if (doc == null) {
    throw new Error(`Document not found: ${docPath}`);
  }
  return doc.content;
}

async function ensureTasksSection(manager: unknown, docPath: string): Promise<void> {
  const content = await getDocumentContent(manager, docPath);
  const tasksContent = readSection(content, 'tasks');

  if (tasksContent == null || tasksContent === '') {
    // Create Tasks section if it doesn't exist
    await (manager as { editSection: (path: string, slug: string, content: string, op: string, title: string) => Promise<void> }).editSection(docPath, 'tasks', '## Tasks\n\n_No tasks yet._', 'append_child', 'Tasks');
  }
}

function parseTasksFromContent(tasksContent: string): Array<{
  slug: string;
  title: string;
  status: string;
  priority?: string;
  link?: string;
  dependencies?: string[];
}> {
  const tasks: Array<{
    slug: string;
    title: string;
    status: string;
    priority?: string;
    link?: string;
    dependencies?: string[];
  }> = [];

  // Parse headings (tasks) from the content
  const headings = listHeadings(tasksContent);

  for (const heading of headings) {
    if (heading.depth <= 2) continue; // Skip the "Tasks" heading itself

    const slug = heading.slug;
    const title = heading.title;

    // Extract task content after the heading
    const taskContent = readSection(tasksContent, slug);
    if (taskContent == null || taskContent === '') continue;

    // Parse task metadata from content
    const status = extractMetadata(taskContent, 'Status') ?? 'pending';
    const priority = extractMetadata(taskContent, 'Priority');
    const link = extractLinkFromContent(taskContent);
    const dependencies = extractDependencies(taskContent);

    tasks.push({
      slug,
      title,
      status,
      ...(priority != null && priority !== '' && { priority }),
      ...(link != null && link !== '' && { link }),
      ...(dependencies.length > 0 && { dependencies })
    });
  }

  return tasks;
}

function extractMetadata(content: string, key: string): string | undefined {
  const match = content.match(new RegExp(`^- ${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim();
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

