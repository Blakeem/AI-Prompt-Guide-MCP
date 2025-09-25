/**
 * Implementation for view_task tool
 * Provides clean task viewing without stats overhead
 */

import type { SessionState } from '../../session/types.js';
import {
  ToolIntegration,
  DocumentNotFoundError,
  AddressingError,
  parseTaskAddress
} from '../../shared/addressing-system.js';
import {
  splitSlugPath,
  getParentSlug,
  getDocumentManager
} from '../../shared/utilities.js';

/**
 * Clean response format for view_task
 */
interface ViewTaskResponse {
  document: string;
  tasks: Array<{
    slug: string;
    title: string;
    content: string;
    depth: number;
    full_path: string;
    parent?: string;
    status: string;
    priority: string;
    linked_document?: string;
    dependencies: string[];
    word_count: number;
  }>;
  summary: {
    total_tasks: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    with_links: number;
  };
}

/**
 * Execute view_task tool
 */
export async function viewTask(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<ViewTaskResponse> {
  // Initialize document manager
  const manager = await getDocumentManager();

  // Import helper functions
  const {
    parseTasks,
    validateTaskCount
  } = await import('../schemas/view-task-schemas.js');

  // Validate required parameters
  if (typeof args['document'] !== 'string' || args['document'] === '') {
    throw new AddressingError('document parameter is required and must be a non-empty string', 'INVALID_PARAMETER');
  }

  if (args['task'] == null || (typeof args['task'] !== 'string' && !Array.isArray(args['task']))) {
    throw new AddressingError('task parameter is required and must be a string or array of strings', 'INVALID_PARAMETER');
  }

  // Parse tasks using existing schema helper but validate count
  const tasks = parseTasks(args['task'] as string | string[]);
  if (!validateTaskCount(tasks)) {
    throw new AddressingError(`Too many tasks. Maximum 10 tasks allowed, got ${tasks.length}`, 'TOO_MANY_TASKS');
  }

  // Use addressing system for document validation
  const { addresses } = ToolIntegration.validateAndParse({
    document: args['document'],
    // We don't use task here because we need to handle multiple tasks manually
  });

  // Get document
  const document = await manager.getDocument(addresses.document.path);
  if (document == null) {
    throw new DocumentNotFoundError(addresses.document.path);
  }

  // Find tasks section
  const tasksSection = document.headings.find(h =>
    h.slug === 'tasks' ||
    h.title.toLowerCase().includes('task') ||
    h.title.toLowerCase() === 'tasks'
  );

  if (tasksSection == null) {
    throw new AddressingError(`No tasks section found in document: ${addresses.document.path}`, 'NO_TASKS_SECTION', {
      document: addresses.document.path
    });
  }

  // Parse and validate all tasks using addressing system
  const taskAddresses = tasks.map(taskSlug => {
    try {
      return parseTaskAddress(taskSlug, addresses.document.path);
    } catch (error) {
      if (error instanceof AddressingError) {
        throw error;
      }
      throw new AddressingError(`Invalid task reference: ${taskSlug}`, 'INVALID_TASK', { taskSlug });
    }
  });

  // Import task identification logic from addressing system
  const { isTaskSection } = await import('../../shared/addressing-system.js');

  // Use getTaskHeadings similar to task.ts for consistent task identification
  const taskHeadings = await getTaskHeadings(document, tasksSection);

  // Validate all requested tasks exist and are actual tasks
  for (const taskAddr of taskAddresses) {
    const taskExists = taskHeadings.some(h => h.slug === taskAddr.slug);
    if (!taskExists) {
      // Get available tasks for error message (use same logic as task.ts)
      const availableTasks = taskHeadings.map(h => h.slug).join(', ');
      throw new AddressingError(
        `Task not found: ${taskAddr.slug}. Available tasks: ${availableTasks}`,
        'TASK_NOT_FOUND',
        { taskSlug: taskAddr.slug, document: addresses.document.path }
      );
    }

    // Validate this is actually a task using addressing system logic
    const compatibleDocument = {
      headings: document.headings.map(h => ({
        slug: h.slug,
        title: h.title,
        depth: h.depth
      }))
    };
    const isTask = await isTaskSection(taskAddr.slug, compatibleDocument);
    if (!isTask) {
      throw new AddressingError(
        `Section ${taskAddr.slug} is not a task (not under tasks section)`,
        'NOT_A_TASK',
        { taskSlug: taskAddr.slug, tasksSection: tasksSection.slug }
      );
    }
  }

  // Process each task
  const processedTasks = await Promise.all(taskAddresses.map(async taskAddr => {
    const heading = document.headings.find(h => h.slug === taskAddr.slug);
    if (heading == null) {
      throw new AddressingError(
        `Task not found: ${taskAddr.slug}`,
        'TASK_NOT_FOUND',
        { taskSlug: taskAddr.slug, document: addresses.document.path }
      );
    }

    // Get task content using the normalized slug
    const content = await manager.getSectionContent(addresses.document.path, taskAddr.slug) ?? '';

    // Parse task metadata from content
    const status = extractTaskField(content, 'Status') ?? 'pending';
    const priority = extractTaskField(content, 'Priority') ?? 'medium';
    const linkedDoc = extractLinkedDocument(content);
    const dependencies = extractDependencies(content);

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    // Build hierarchical information using existing utilities
    const slugParts = splitSlugPath(heading.slug);
    const fullPath = slugParts.join('/');
    const parent = getParentSlug(heading.slug);

    const taskData: ViewTaskResponse['tasks'][0] = {
      slug: heading.slug,
      title: heading.title,
      content,
      depth: heading.depth,
      full_path: fullPath,
      status,
      priority,
      dependencies,
      word_count: wordCount
    };

    if (parent != null && parent !== '') {
      taskData.parent = parent;
    }

    if (linkedDoc != null) {
      taskData.linked_document = linkedDoc;
    }

    return taskData;
  }));

  // Calculate summary statistics
  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  let withLinks = 0;

  for (const task of processedTasks) {
    statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
    priorityCounts[task.priority] = (priorityCounts[task.priority] ?? 0) + 1;
    if (task.linked_document != null) {
      withLinks++;
    }
  }

  const summary = {
    total_tasks: processedTasks.length,
    by_status: statusCounts,
    by_priority: priorityCounts,
    with_links: withLinks
  };

  return {
    document: addresses.document.path,
    tasks: processedTasks,
    summary
  };
}

/**
 * Extract task field value from content
 */
function extractTaskField(content: string, fieldName: string): string | null {
  const regex = new RegExp(`^\\s*-\\s*${fieldName}:\\s*(.+)$`, 'mi');
  const match = content.match(regex);
  return match?.[1]?.trim() ?? null;
}

/**
 * Extract linked document from content
 */
function extractLinkedDocument(content: string): string | null {
  const linkMatch = content.match(/→\s*@([^\s\n]+)/);
  return linkMatch?.[1] ?? null;
}

/**
 * Extract dependencies from content
 */
function extractDependencies(content: string): string[] {
  const depsMatch = content.match(/^\\s*-\\s*Dependencies:\\s*(.+)$/mi);
  if (depsMatch?.[1] == null) return [];

  const depsString = depsMatch[1].trim();
  if (depsString.toLowerCase() === 'none') return [];

  return depsString.split(',').map(dep => dep.trim()).filter(dep => dep !== '');
}

/**
 * Find all task headings that are children of the Tasks section
 * Updated to use addressing system's isTaskSection for consistent task identification
 * COPIED FROM task.ts FOR CONSISTENCY
 */
async function getTaskHeadings(
  document: { readonly headings: readonly { slug: string; title: string; depth: number }[] },
  tasksSection: { slug: string; depth: number }
): Promise<Array<{ slug: string; title: string; depth: number }>> {
  const taskHeadings: Array<{ slug: string; title: string; depth: number }> = [];
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
      const compatibleDocument = {
        headings: document.headings.map(h => ({
          slug: h.slug,
          title: h.title,
          depth: h.depth
        }))
      };

      const { isTaskSection } = await import('../../shared/addressing-system.js');
      const isTask = await isTaskSection(heading.slug, compatibleDocument);
      if (isTask) {
        taskHeadings.push({
          slug: heading.slug,
          title: heading.title,
          depth: heading.depth
        });
      }
    }

    // Skip deeper nested headings (they are children of tasks, not tasks themselves)
  }

  return taskHeadings;
}