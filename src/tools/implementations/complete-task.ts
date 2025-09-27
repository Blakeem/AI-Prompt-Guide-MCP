/**
 * Implementation for the complete_task tool
 * Mark tasks as completed and show next available task
 */

import type { SessionState } from '../../session/types.js';
import type { Heading } from '../../types/core.js';
import {
  getDocumentManager,
  performSectionEdit
} from '../../shared/utilities.js';
import {
  ToolIntegration,
  AddressingError,
  DocumentNotFoundError,
  isTaskSection
} from '../../shared/addressing-system.js';
import type {
  parseDocumentAddress
} from '../../shared/addressing-system.js';

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

    // Validate required parameters
    if (typeof args['document'] !== 'string' || args['document'] === '') {
      throw new AddressingError('Missing required parameter: document', 'MISSING_PARAMETER');
    }
    if (typeof args['task'] !== 'string' || args['task'] === '') {
      throw new AddressingError('Missing required parameter: task', 'MISSING_PARAMETER');
    }
    if (typeof args['note'] !== 'string' || args['note'] === '') {
      throw new AddressingError('Missing required parameter: note', 'MISSING_PARAMETER');
    }

    // Use addressing system for validation and parsing
    const { addresses } = await ToolIntegration.validateAndParse({
      document: args['document'],
      task: args['task']
    });

    // Get document and validate existence
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
      throw new DocumentNotFoundError(addresses.document.path);
    }

    // Validate task address exists
    if (addresses.task == null) {
      throw new AddressingError('Task address is required for complete operation', 'MISSING_TASK');
    }

    // Format document info using addressing system helper
    const documentInfo = ToolIntegration.formatDocumentInfo(addresses.document, {
      title: document.metadata.title
    });

    // Get current task content using validated addresses
    const currentContent = await manager.getSectionContent(addresses.document.path, addresses.task.slug);
    if (currentContent == null || currentContent === '') {
      throw new AddressingError(`Task not found: ${addresses.task.slug}`, 'TASK_NOT_FOUND', {
        document: addresses.document.path,
        task: addresses.task.slug
      });
    }

    // Get task title for response
    const taskTitle = extractTaskTitle(currentContent);

    // Update task status to completed and add completion note
    const completedDate = new Date().toISOString().substring(0, 10);  // YYYY-MM-DD format
    const note = args['note'] as string;
    const updatedContent = updateTaskStatus(currentContent, 'completed', note, completedDate);

    // Update the task section with validated addresses
    await performSectionEdit(manager, addresses.document.path, addresses.task.slug, updatedContent, 'replace');

    // Get next available task using addressing system
    const nextTask = await findNextAvailableTask(manager, addresses, addresses.task.slug);

    return {
      completed_task: {
        slug: addresses.task.slug,
        title: taskTitle,
        note,
        completed_date: completedDate
      },
      ...(nextTask != null && { next_task: nextTask }),
      document_info: documentInfo,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    if (error instanceof AddressingError) {
      throw error;
    }
    throw new AddressingError(
      `Task completion failed: ${error instanceof Error ? error.message : String(error)}`,
      'COMPLETION_FAILED'
    );
  }
}

/**
 * Find the next available task in priority order using addressing system
 * Updated to use addressing system's isTaskSection for consistent task identification
 */
async function findNextAvailableTask(
  manager: Awaited<ReturnType<typeof getDocumentManager>>,
  addresses: { document: ReturnType<typeof parseDocumentAddress> },
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
    // Get document to access heading structure (existence already validated in main function)
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) return undefined;

    // Find the Tasks section using consistent addressing logic
    const tasksSection = document.headings.find(h =>
      h.slug === 'tasks' ||
      h.title.toLowerCase() === 'tasks'
    );
    if (tasksSection == null) return undefined;

    // Find all task headings using standardized task identification logic
    const taskHeadings = await getTaskHeadings(document, tasksSection);

    // Parse task details from each task heading using validated document path
    // Use try-catch with cleanup for critical operations to prevent resource leaks
    interface TaskData {
      slug: string;
      title: string;
      status: string;
      priority?: string;
      link?: string;
    }
    let tasks: TaskData[] = [];
    try {
      tasks = await Promise.all(taskHeadings.map(async heading => {
        const taskContent = await manager.getSectionContent(addresses.document.path, heading.slug) ?? '';

        // Parse task metadata from content
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

    // Filter out completed task and find available tasks
    const availableTasks = tasks.filter(task =>
      task.slug !== completedTaskSlug &&
      (task.status === 'pending' || task.status === 'in_progress')
    );

    if (availableTasks.length === 0) return undefined;

    // Sort by priority (high first) then by document order (top to bottom)
    availableTasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;

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

/**
 * Get linked document content using addressing system for validation
 */
async function getLinkedDocument(
  manager: Awaited<ReturnType<typeof getDocumentManager>>,
  link: string
): Promise<{ path: string; title: string; content?: string } | undefined> {
  try {
    // Parse link format: @/path/doc.md#section or just @/path/doc.md
    const linkMatch = link.match(/^@?(\/[^#]+)(?:#(.+))?$/);
    if (linkMatch == null) return undefined;

    const [, docPath, sectionSlug] = linkMatch;
    if (docPath == null || docPath === '') return undefined;

    const document = await manager.getDocument(docPath);
    if (document == null) return undefined;

    let content: string | undefined;
    if (sectionSlug != null && sectionSlug !== '') {
      // Get specific section content using validated document path
      const sectionContent = await manager.getSectionContent(docPath, sectionSlug);
      content = sectionContent ?? undefined;
    } else {
      // Get document summary (first heading or first 500 chars from sections if available)
      if (document.sections && document.sections.size > 0) {
        const firstSection = Array.from(document.sections.values())[0];
        if (firstSection != null) {
          content = firstSection.content.slice(0, 500);
          if (firstSection.content.length > 500) {
            content = `${content}...`;
          }
        }
      }
      // If no content available, use document title as fallback
      content ??= `Document: ${document.metadata.title}`;
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
  // Support both "* Key: value" and "- Key: value" formats
  const starMatch = content.match(new RegExp(`^\\* ${key}:\\s*(.+)$`, 'm'));
  if (starMatch != null) return starMatch[1]?.trim();

  const dashMatch = content.match(new RegExp(`^- ${key}:\\s*(.+)$`, 'm'));
  return dashMatch?.[1]?.trim();
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