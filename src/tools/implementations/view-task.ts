/**
 * Implementation for view_task tool
 * Provides clean task viewing without stats overhead
 */

import type { SessionState } from '../../session/types.js';
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

  // Input validation and parsing
  const documentParam = args['document'];
  if (typeof documentParam !== 'string' || documentParam === '') {
    throw new Error('document parameter is required and must be a non-empty string');
  }

  const taskParam = args['task'];
  if (taskParam == null || (typeof taskParam !== 'string' && !Array.isArray(taskParam))) {
    throw new Error('task parameter is required and must be a string or array of strings');
  }

  const tasks = parseTasks(taskParam as string | string[]);
  if (!validateTaskCount(tasks)) {
    throw new Error(`Too many tasks. Maximum 10 tasks allowed, got ${tasks.length}`);
  }

  // Normalize document path
  const documentPath = documentParam.startsWith('/') ? documentParam : `/${documentParam}`;

  // Get document
  const document = await manager.getDocument(documentPath);
  if (document == null) {
    throw new Error(`Document not found: ${documentPath}`);
  }

  // Find tasks section
  const tasksSection = document.headings.find(h =>
    h.slug === 'tasks' ||
    h.title.toLowerCase().includes('task') ||
    h.title.toLowerCase() === 'tasks'
  );

  if (tasksSection == null) {
    throw new Error(`No tasks section found in document: ${documentPath}`);
  }

  // Validate all tasks exist within the tasks section
  const taskHeadings = document.headings.filter(h =>
    h.slug.startsWith(`${tasksSection.slug}/`) ||
    tasks.includes(h.slug)
  );

  for (const taskSlug of tasks) {
    const taskExists = taskHeadings.some(h => h.slug === taskSlug);
    if (!taskExists) {
      const availableTasks = taskHeadings.map(h => h.slug).join(', ');
      throw new Error(`Task not found: ${taskSlug}. Available tasks: ${availableTasks}`);
    }
  }

  // Process each task
  const processedTasks = await Promise.all(tasks.map(async taskSlug => {
    const heading = document.headings.find(h => h.slug === taskSlug);
    if (heading == null) {
      throw new Error(`Task not found: ${taskSlug}`);
    }

    // Get task content
    const content = await manager.getSectionContent(documentPath, taskSlug) ?? '';

    // Parse task metadata from content
    const status = extractTaskField(content, 'Status') ?? 'pending';
    const priority = extractTaskField(content, 'Priority') ?? 'medium';
    const linkedDoc = extractLinkedDocument(content);
    const dependencies = extractDependencies(content);

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    // Build hierarchical information
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
    document: documentPath,
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