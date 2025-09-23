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
  task_completed?: {
    slug: string;
    title: string;
    note?: string;
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
    const note = args['note'] as string;
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

      case 'complete':
        if (!taskSlug) {
          throw new Error('Missing required parameter for complete: task');
        }
        return await completeTask(manager, normalizedPath, taskSlug, note, documentInfo);

      default:
        throw new Error(`Invalid operation: ${operation}. Must be one of: list, create, edit, complete`);
    }

  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * List tasks from Tasks section with optional filtering
 */
async function listTasks(
  manager: any,
  docPath: string,
  statusFilter?: string,
  priorityFilter?: string,
  documentInfo?: any
): Promise<TaskResult> {
  try {
    // Try to read the Tasks section
    const tasksContent = readSection(await getDocumentContent(manager, docPath), 'tasks');

    if (!tasksContent) {
      return {
        operation: 'list',
        document: docPath,
        tasks: [],
        document_info: documentInfo,
        timestamp: new Date().toISOString()
      };
    }

    // Parse tasks from the Tasks section
    const tasks = parseTasksFromContent(tasksContent);

    // Apply filters
    let filteredTasks = tasks;
    if (statusFilter) {
      filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }
    if (priorityFilter) {
      filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }

    // Find next available task (pending or in_progress, high priority first)
    const nextTask = findNextTask(filteredTasks);

    return {
      operation: 'list',
      document: docPath,
      tasks: filteredTasks,
      ...(nextTask && { next_task: nextTask }),
      document_info: documentInfo,
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
  manager: any,
  docPath: string,
  title: string,
  content: string,
  referenceSlug?: string,
  documentInfo?: any
): Promise<TaskResult> {
  try {
    const taskSlug = titleToSlug(title);

    // Build task content in our standard format
    const taskContent = `### ${title}
${content}`;

    // Use section tool logic to insert the task
    // If referenceSlug provided, insert after it, otherwise append to Tasks section
    const operation = referenceSlug ? 'insert_after' : 'append_child';
    const targetSection = referenceSlug || 'tasks';

    // Create or update the Tasks section
    await ensureTasksSection(manager, docPath);

    // Insert the new task
    await manager.editSection(docPath, targetSection, taskContent, operation, title);

    return {
      operation: 'create',
      document: docPath,
      task_created: {
        slug: taskSlug,
        title: title
      },
      document_info: documentInfo,
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
  manager: any,
  docPath: string,
  taskSlug: string,
  content: string,
  documentInfo?: any
): Promise<TaskResult> {
  try {
    // Update the task section with new content
    await manager.editSection(docPath, taskSlug, content, 'replace');

    return {
      operation: 'edit',
      document: docPath,
      document_info: documentInfo,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Failed to edit task: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Complete a task and show next task
 */
async function completeTask(
  manager: any,
  docPath: string,
  taskSlug: string,
  note?: string,
  documentInfo?: any
): Promise<TaskResult> {
  try {
    // Get current task content
    const currentContent = await manager.getSectionContent(docPath, taskSlug);
    if (!currentContent) {
      throw new Error(`Task not found: ${taskSlug}`);
    }

    // Update task status to completed and add completion note
    const updatedContent = updateTaskStatus(currentContent, 'completed', note);
    await manager.editSection(docPath, taskSlug, updatedContent, 'replace');

    // Get task title for response
    const taskTitle = extractTaskTitle(currentContent);

    // Get next available task
    const tasksContent = readSection(await getDocumentContent(manager, docPath), 'tasks');
    const tasks = tasksContent ? parseTasksFromContent(tasksContent) : [];
    const nextTask = findNextTask(tasks.filter(task => task.slug !== taskSlug));

    return {
      operation: 'complete',
      document: docPath,
      task_completed: {
        slug: taskSlug,
        title: taskTitle,
        ...(note && { note })
      },
      ...(nextTask && { next_task: nextTask }),
      document_info: documentInfo,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Failed to complete task: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper functions
 */

async function getDocumentContent(manager: any, docPath: string): Promise<string> {
  const doc = await manager.getDocument(docPath);
  if (!doc) {
    throw new Error(`Document not found: ${docPath}`);
  }
  return doc.content;
}

async function ensureTasksSection(manager: any, docPath: string): Promise<void> {
  try {
    const content = await getDocumentContent(manager, docPath);
    const tasksContent = readSection(content, 'tasks');

    if (!tasksContent) {
      // Create Tasks section if it doesn't exist
      await manager.editSection(docPath, 'tasks', '## Tasks\n\n_No tasks yet._', 'append_child', 'Tasks');
    }
  } catch (error) {
    // If document doesn't exist, let the error bubble up
    throw error;
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
    if (!taskContent) continue;

    // Parse task metadata from content
    const status = extractMetadata(taskContent, 'Status') || 'pending';
    const priority = extractMetadata(taskContent, 'Priority');
    const link = extractLinkFromContent(taskContent);
    const dependencies = extractDependencies(taskContent);

    tasks.push({
      slug,
      title,
      status,
      ...(priority && { priority }),
      ...(link && { link }),
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
  if (!match || match === 'none') return [];
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
    ...(nextTask.link && { link: nextTask.link })
  };
}

function updateTaskStatus(content: string, newStatus: string, note?: string): string {
  // Update status line
  let updated = content.replace(/^- Status:\s*.+$/m, `- Status: ${newStatus}`);

  // Add completion note if provided
  if (note && newStatus === 'completed') {
    updated += `\n- Completed: ${new Date().toISOString().split('T')[0]}\n- Note: ${note}`;
  }

  return updated;
}

function extractTaskTitle(content: string): string {
  const match = content.match(/^### (.+)$/m);
  return match?.[1]?.trim() || 'Unknown Task';
}