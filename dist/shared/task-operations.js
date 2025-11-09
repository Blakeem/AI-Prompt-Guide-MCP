/**
 * Shared task operations layer
 *
 * Provides core CRUD operations for tasks that can be used by both
 * subagent (ad-hoc) and coordinator (sequential) task systems.
 *
 * These operations are extracted from the original task.ts, complete-task.ts,
 * and start-task.ts to eliminate duplication and provide a clean foundation
 * for the dual task system architecture.
 */
import { performSectionEdit } from './utilities.js';
import { titleToSlug } from '../slug.js';
import { AddressingError, DocumentNotFoundError } from './addressing-system.js';
import { getTaskHeadingsFromHeadings } from './task-utilities.js';
import { ReferenceExtractor } from './reference-extractor.js';
import { ReferenceLoader } from './reference-loader.js';
import { loadConfig } from '../config.js';
import { extractTaskField, extractTaskLink } from './task-view-utilities.js';
/**
 * Create a new task in the Tasks section
 *
 * @param manager - Document manager instance
 * @param documentPath - Path to the document
 * @param title - Task title
 * @param content - Task content (should include Status field)
 * @param referenceSlug - Optional slug to insert after (or undefined to append to Tasks section)
 * @returns Created task slug and title
 * @throws {AddressingError} When task creation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export async function createTaskOperation(manager, documentPath, title, content, referenceSlug) {
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
        await ensureTasksSectionOperation(manager, documentPath);
        // Insert the new task using validated document path
        await performSectionEdit(manager, documentPath, targetSection, taskContent, operation, title);
        // Get hierarchical context if task slug contains hierarchy
        const hierarchicalContext = getTaskHierarchicalContext(taskSlug);
        return {
            slug: taskSlug, // Return the actual task slug without prefix
            title,
            ...(hierarchicalContext != null && { hierarchical_context: hierarchicalContext })
        };
    }
    catch (error) {
        throw new AddressingError(`Failed to create task: ${error instanceof Error ? error.message : String(error)}`, 'TASK_CREATE_FAILED', { document: documentPath, title });
    }
}
/**
 * Edit an existing task
 *
 * @param manager - Document manager instance
 * @param documentPath - Path to the document
 * @param taskSlug - Task slug to edit
 * @param content - New task content
 * @throws {AddressingError} When task edit fails
 */
export async function editTaskOperation(manager, documentPath, taskSlug, content) {
    try {
        // Update the task section with new content using validated addresses
        await performSectionEdit(manager, documentPath, taskSlug, content, 'replace');
    }
    catch (error) {
        throw new AddressingError(`Failed to edit task: ${error instanceof Error ? error.message : String(error)}`, 'TASK_EDIT_FAILED', { document: documentPath, task: taskSlug });
    }
}
/**
 * List tasks from Tasks section with optional filtering
 *
 * @param manager - Document manager instance
 * @param documentPath - Path to the document
 * @param statusFilter - Optional status filter (pending, in_progress, completed, blocked)
 * @param loadReferences - Whether to load referenced documents (default: false for list operations)
 * @returns List of tasks with metadata and optional hierarchical summary
 * @throws {AddressingError} When task listing fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export async function listTasksOperation(manager, documentPath, statusFilter, loadReferences = false) {
    try {
        // Get the document
        const document = await manager.getDocument(documentPath);
        if (document == null) {
            throw new DocumentNotFoundError(documentPath);
        }
        // Find the Tasks section using consistent addressing logic
        const tasksSection = document.headings.find(h => h.slug === 'tasks' ||
            h.title.toLowerCase() === 'tasks');
        if (tasksSection == null) {
            return {
                tasks: []
            };
        }
        // Find all task headings using standardized task identification logic
        const taskHeadings = await getTaskHeadingsFromHeadings(document, tasksSection);
        // Parse task details from each task heading
        let tasks = [];
        try {
            tasks = await Promise.all(taskHeadings.map(async (heading) => {
                // Get the task content using validated document path
                const taskContent = await manager.getSectionContent(documentPath, heading.slug) ?? '';
                // Parse task metadata from content
                const status = extractTaskField(taskContent, 'Status') ?? 'pending';
                const link = extractTaskLink(taskContent);
                // Check if task has references (always calculate this)
                const hasReferences = taskContent.includes('@/');
                // Conditionally load references based on loadReferences parameter
                let referencedDocuments = [];
                if (loadReferences && hasReferences) {
                    const config = loadConfig();
                    const extractor = new ReferenceExtractor();
                    const loader = new ReferenceLoader();
                    const refs = extractor.extractReferences(taskContent);
                    const normalizedRefs = extractor.normalizeReferences(refs, documentPath);
                    referencedDocuments = await loader.loadReferences(normalizedRefs, manager, config.referenceExtractionDepth);
                }
                // Get hierarchical context for the task
                const hierarchicalContext = getTaskHierarchicalContext(heading.slug);
                return {
                    slug: heading.slug,
                    title: heading.title,
                    status,
                    ...(link != null && link !== '' && { link }),
                    ...(hasReferences && { has_references: true }),
                    ...(referencedDocuments.length > 0 && { referenced_documents: referencedDocuments }),
                    ...(hierarchicalContext != null && { hierarchical_context: hierarchicalContext })
                };
            }));
        }
        catch (error) {
            // Critical operation failed - ensure cache consistency by invalidating document
            try {
                manager['cache'].invalidateDocument(documentPath);
            }
            catch (cleanupError) {
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
    }
    catch (error) {
        throw new AddressingError(`Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`, 'TASK_LIST_FAILED', { document: documentPath });
    }
}
/**
 * Complete a task by updating its status and adding completion metadata
 *
 * @param manager - Document manager instance
 * @param documentPath - Path to the document
 * @param taskSlug - Task slug to complete
 * @param note - Completion note
 * @returns Completion metadata
 * @throws {AddressingError} When task completion fails
 */
export async function completeTaskOperation(manager, documentPath, taskSlug, note) {
    try {
        // Get current task content
        const currentContent = await manager.getSectionContent(documentPath, taskSlug);
        if (currentContent == null || currentContent === '') {
            throw new AddressingError(`Task not found: ${taskSlug}`, 'TASK_NOT_FOUND', {
                document: documentPath,
                task: taskSlug
            });
        }
        // Get task title for response
        const taskHeading = (await manager.getDocument(documentPath))?.headings.find(h => h.slug === taskSlug);
        const taskTitle = taskHeading?.title ?? taskSlug;
        // Update task status to completed and add completion note
        const completedDate = new Date().toISOString().substring(0, 10); // YYYY-MM-DD format
        const updatedContent = updateTaskStatus(currentContent, 'completed', note, completedDate);
        // Update the task section
        await performSectionEdit(manager, documentPath, taskSlug, updatedContent, 'replace');
        return {
            slug: taskSlug,
            title: taskTitle,
            note,
            completed_date: completedDate
        };
    }
    catch (error) {
        throw new AddressingError(`Failed to complete task: ${error instanceof Error ? error.message : String(error)}`, 'TASK_COMPLETE_FAILED', { document: documentPath, task: taskSlug });
    }
}
/**
 * Ensure Tasks section exists in document, creating it if necessary
 *
 * @param manager - Document manager instance
 * @param docPath - Path to the document
 * @throws {AddressingError} When Tasks section creation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export async function ensureTasksSectionOperation(manager, docPath) {
    const document = await manager.getDocument(docPath);
    if (document == null) {
        throw new DocumentNotFoundError(docPath);
    }
    // Check if Tasks section already exists
    const tasksSection = document.headings.find(h => h.slug === 'tasks' ||
        h.title.toLowerCase() === 'tasks');
    if (tasksSection == null) {
        // No Tasks section exists - AUTO-CREATE IT
        // Find the document title heading (H1) to append Tasks after it
        const titleHeading = document.headings.find(h => h.depth === 1);
        if (titleHeading == null) {
            throw new AddressingError('Cannot auto-create Tasks section: document has no title heading (H1)', 'NO_TITLE_HEADING', { document: docPath });
        }
        const titleSlug = titleHeading.slug;
        // Create Tasks section as child of document title
        // This will create an H2 section (depth 2) with proper content
        await performSectionEdit(manager, docPath, titleSlug, 'Task list for this document.', 'append_child', 'Tasks');
        // Invalidate cache to ensure Tasks section is available for subsequent operations
        manager['cache'].invalidateDocument(docPath);
    }
    // Tasks section exists (either found or just created), nothing more to do
}
/**
 * Helper: Get hierarchical context for a task slug
 */
function getTaskHierarchicalContext(taskSlug) {
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
 * Helper: Find next available task (pending or in_progress)
 */
function findNextTask(tasks) {
    // Find next available task (pending or in_progress) in sequential document order
    const availableTasks = tasks.filter(task => task.status === 'pending' || task.status === 'in_progress');
    if (availableTasks.length === 0)
        return undefined;
    // Return first available task (already in document order)
    const nextTask = availableTasks[0];
    if (nextTask == null)
        return undefined;
    return {
        slug: nextTask.slug,
        title: nextTask.title,
        ...(nextTask.link != null && nextTask.link !== '' && { link: nextTask.link })
    };
}
/**
 * Helper: Generate hierarchical summary for tasks
 */
function generateHierarchicalSummary(tasks) {
    const hierarchicalTasks = tasks.filter(t => t.hierarchical_context != null);
    if (hierarchicalTasks.length === 0) {
        return null; // No hierarchical tasks
    }
    // Group by phase
    const byPhase = {};
    const byCategory = {};
    for (const task of hierarchicalTasks) {
        const context = task.hierarchical_context;
        if (context == null)
            continue;
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
        }
        else if (task.status === 'in_progress') {
            if (phaseStats != null) {
                phaseStats.in_progress++;
            }
            if (categoryStats != null) {
                categoryStats.in_progress ??= 0;
                categoryStats.in_progress++;
            }
        }
        else if (task.status === 'completed') {
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
/**
 * Update task status with completion metadata
 *
 * Supports multiple status field formats:
 * - Bold format: `**Status:** pending`
 * - List format: `- Status: pending` or `* Status: pending`
 * - Plain format: `Status: pending`
 *
 * Preserves the original format style when updating.
 *
 * @param content - Task content containing status field
 * @param newStatus - New status value (e.g., 'completed', 'in_progress')
 * @param note - Completion note to append
 * @param completedDate - Completion date in YYYY-MM-DD format
 * @returns Updated content with new status and completion metadata
 */
export function updateTaskStatus(content, newStatus, note, completedDate) {
    // Regex to match all supported status field formats:
    // - Bold format: **Status:** pending
    // - List format: - Status: pending or * Status: pending
    // - Plain format: Status: pending
    const statusLineRegex = /^(\*\*)?([*-])?\s*Status:(\*\*)?\s*.+$/m;
    const statusMatch = content.match(statusLineRegex);
    if (statusMatch == null) {
        // No status field found - this shouldn't happen in well-formed tasks
        // Add status field at the beginning of content
        const statusLine = `**Status:** ${newStatus}`;
        const completionInfo = `\n- Completed: ${completedDate}\n- Note: ${note}`;
        return `${statusLine}\n${content}${completionInfo}`;
    }
    // Extract format markers from matched line
    const hasBoldMarker = statusMatch[1] != null; // Leading **
    const listMarker = statusMatch[2]; // - or * or undefined
    const hasTrailingBold = statusMatch[3] != null; // Trailing **
    // Construct replacement line preserving original format
    let replacementLine;
    if (hasBoldMarker && hasTrailingBold) {
        // Bold format: **Status:** value
        replacementLine = `**Status:** ${newStatus}`;
    }
    else if (listMarker != null) {
        // List format: - Status: value or * Status: value
        replacementLine = `${listMarker} Status: ${newStatus}`;
    }
    else {
        // Plain format: Status: value
        replacementLine = `Status: ${newStatus}`;
    }
    // Replace the status line
    let updated = content.replace(statusLineRegex, replacementLine);
    // Add completion metadata using list format (standard for completion notes)
    updated += `\n- Completed: ${completedDate}`;
    updated += `\n- Note: ${note}`;
    return updated;
}
//# sourceMappingURL=task-operations.js.map