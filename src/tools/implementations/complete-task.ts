/**
 * Implementation for the complete_task tool
 * Mark tasks as completed and show next available task
 */

import type { SessionState } from '../../session/types.js';
import {
  getDocumentManager,
  pathToNamespace,
  pathToSlug
} from '../../shared/utilities.js';

interface CompleteTaskResult {
  completed_task: {
    slug: string;
    title: string;
    note: string;
    completed_date: string;
  };
  next_task?: {
    slug: string;
    title: string;
    priority?: string;
    link?: string;
    linked_document?: {
      path: string;
      title: string;
      content?: string;
    };
  };
  document_info: {
    path: string;
    slug: string;
    title: string;
    namespace: string;
  };
  timestamp: string;
}

export async function completeTask(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<CompleteTaskResult> {
  try {
    const manager = await getDocumentManager();

    // Extract and validate required parameters
    const docPath = args['document'];
    const taskSlug = args['task'];
    const note = args['note'];

    if (typeof docPath !== 'string' || !docPath ||
        typeof taskSlug !== 'string' || !taskSlug ||
        typeof note !== 'string' || !note) {
      throw new Error('Missing required parameters: document, task, and note');
    }
    const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;

    // Get document information
    const document = await manager.getDocument(normalizedPath);
    if (!document) {
      throw new Error(`Document not found: ${normalizedPath}`);
    }

    const documentInfo = {
      path: normalizedPath,
      slug: pathToSlug(normalizedPath),
      title: document.metadata.title,
      namespace: pathToNamespace(normalizedPath)
    };

    // Get current task content
    const currentContent = await manager.getSectionContent(normalizedPath, taskSlug);
    if (currentContent == null || currentContent === '') {
      throw new Error(`Task not found: ${taskSlug}`);
    }

    // Get task title for response
    const taskTitle = extractTaskTitle(currentContent);

    // Update task status to completed and add completion note
    const completedDate = new Date().toISOString().substring(0, 10);  // YYYY-MM-DD format
    const updatedContent = updateTaskStatus(currentContent, 'completed', note, completedDate);

    // Use performSectionEdit like the section tool does
    const { performSectionEdit } = await import('../../shared/utilities.js');
    await performSectionEdit(manager, normalizedPath, taskSlug, updatedContent, 'replace');

    // Get next available task
    const nextTask = await findNextAvailableTask(manager, normalizedPath, taskSlug);

    return {
      completed_task: {
        slug: taskSlug,
        title: taskTitle,
        note,
        completed_date: completedDate
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
 * Find the next available task in priority order
 */
async function findNextAvailableTask(
  manager: unknown,
  docPath: string,
  completedTaskSlug: string
): Promise<{
  slug: string;
  title: string;
  priority?: string;
  link?: string;
  linked_document?: {
    path: string;
    title: string;
    content?: string;
  };
} | undefined> {
  try {
    // Get document to access heading structure
    const doc = await (manager as { getDocument: (path: string) => Promise<{ content: string; headings: Array<{ slug: string; title: string; depth: number }> } | null> }).getDocument(docPath);
    if (doc == null) return undefined;

    // Find the Tasks section
    const tasksSection = doc.headings.find(h =>
      h.slug === 'tasks' ||
      h.title.toLowerCase() === 'tasks'
    );
    if (tasksSection == null) return undefined;

    // Find all task headings (children of the Tasks section)
    const taskHeadings = doc.headings.filter(h => {
      return h.slug.startsWith('tasks/') && h.depth === tasksSection.depth + 1;
    });

    // Parse task details from each task heading
    const tasks = await Promise.all(taskHeadings.map(async heading => {
      const taskContent = await (manager as { getSectionContent: (path: string, slug: string) => Promise<string | null> }).getSectionContent(docPath, heading.slug) ?? '';
      const status = extractMetadata(taskContent, 'Status') ?? 'pending';
      const priority = extractMetadata(taskContent, 'Priority');
      const link = extractLinkFromContent(taskContent);

      return {
        slug: heading.slug,
        title: heading.title,
        status,
        ...(priority != null && priority !== '' && { priority }),
        ...(link != null && link !== '' && { link })
      };
    }));

    // Filter out completed task and find available tasks
    const availableTasks = tasks.filter(task =>
      task.slug !== completedTaskSlug &&
      (task.status === 'pending' || task.status === 'in_progress')
    );

    if (availableTasks.length === 0) return undefined;

    // Sort by priority (high first) then by document order (top to bottom)
    availableTasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;

      if (bPriority !== aPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // Same priority, maintain document order (tasks appear in order in markdown)
      return 0;
    });

    const nextTask = availableTasks[0];
    if (!nextTask) return undefined;

    // Get linked document if available
    let linkedDocument: { path: string; title: string; content?: string } | undefined;
    if (nextTask.link != null && nextTask.link !== '') {
      linkedDocument = await getLinkedDocument(manager, nextTask.link);
    }

    return {
      slug: nextTask.slug,
      title: nextTask.title,
      ...(nextTask.priority != null && nextTask.priority !== '' && { priority: nextTask.priority }),
      ...(nextTask.link != null && nextTask.link !== '' && { link: nextTask.link }),
      ...(linkedDocument && { linked_document: linkedDocument })
    };

  } catch {
    // Return undefined if we can't find next task
    return undefined;
  }
}

/**
 * Get linked document content
 */
async function getLinkedDocument(
  manager: unknown,
  link: string
): Promise<{ path: string; title: string; content?: string } | undefined> {
  try {
    // Parse link format: @/path/doc.md#section or just @/path/doc.md
    const linkMatch = link.match(/^@?(\/[^#]+)(?:#(.+))?$/);
    if (!linkMatch) return undefined;

    const [, docPath, sectionSlug] = linkMatch;
    if (docPath == null || docPath === '') return undefined;
    const document = await (manager as { getDocument: (path: string) => Promise<{ content: string; metadata: { title: string } } | null> }).getDocument(docPath);
    if (document == null) return undefined;

    let content: string | undefined;
    if (sectionSlug != null && sectionSlug !== '') {
      // Get specific section content
      const sectionContent = await (manager as { getSectionContent: (path: string, slug: string) => Promise<string | null> }).getSectionContent(docPath, sectionSlug);
      content = sectionContent ?? undefined;
    } else {
      // Get first 500 characters of document
      content = document.content.slice(0, 500);
      if (document.content.length > 500) {
        content += '...';
      }
    }

    return {
      path: docPath,
      title: document.metadata.title,
      ...(content != null && { content })
    };

  } catch {
    return undefined;
  }
}

/**
 * Helper functions
 */

function extractMetadata(content: string, key: string): string | undefined {
  const match = content.match(new RegExp(`^- ${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() ?? undefined;
}

function extractLinkFromContent(content: string): string | undefined {
  const match = content.match(/^→ (.+)$/m);
  return match?.[1]?.trim() ?? undefined;
}

function updateTaskStatus(content: string, newStatus: string, note: string, completedDate: string): string {
  // Update status line
  let updated = content.replace(/^- Status:\s*.+$/m, `- Status: ${newStatus}`);

  // Add completion info
  updated += `\n- Completed: ${completedDate}`;
  updated += `\n- Note: ${note}`;

  return updated;
}

function extractTaskTitle(content: string): string {
  const match = content.match(/^### (.+)$/m);
  return match?.[1]?.trim() ?? 'Unknown Task';
}