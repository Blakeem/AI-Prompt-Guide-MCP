/**
 * Implementation for the start_subagent_task tool
 *
 * Signals "I'm starting work on this task" and provides FULL CONTEXT including:
 * - Task-specific workflow (if present in task metadata)
 * - Referenced documents (hierarchical @reference loading)
 *
 * AD-HOC MODE ONLY:
 * - REQUIRES #slug (format: /docs/path.md#task-slug)
 * - Works exclusively with /docs/ namespace
 * - Task workflow only (NO main workflow injection)
 *
 * This tool is used for:
 * - Starting work on an assigned subagent task
 * - Resuming work after context compression
 *
 * Unlike view_subagent_task (passive inspection) or complete_subagent_task (work continuation),
 * start_subagent_task provides full workflow injection for new/resumed sessions.
 */
import { ToolIntegration, AddressingError, DocumentNotFoundError } from '../../shared/addressing-system.js';
import { validateSubagentTaskAccess } from '../../shared/task-validation.js';
import { enrichTaskWithReferences, extractTaskField } from '../../shared/task-view-utilities.js';
import { enrichTaskWithWorkflow } from '../../shared/workflow-prompt-utilities.js';
import { getTaskHeadings } from '../../shared/task-utilities.js';
/**
 * Start work on a subagent task with full context injection
 *
 * AD-HOC MODE ONLY: Requires #slug, enforces /docs/ namespace
 *
 * @param args - Tool arguments containing document path with task slug (format: /docs/path.md#task-slug)
 * @param _state - Session state (unused but required by tool signature)
 * @param manager - Document manager for accessing documents
 * @returns Promise resolving to enriched task data with task workflow and references (NO main workflow)
 * @throws {AddressingError} When parameters are invalid or task validation fails
 * @throws {DocumentNotFoundError} When document doesn't exist
 */
export async function startSubagentTask(args, _state, manager) {
    try {
        // ===== INPUT VALIDATION =====
        const documentParam = ToolIntegration.validateStringParameter(args['document'], 'document');
        // Parse document path and task slug (ad-hoc mode only)
        if (!documentParam.includes('#')) {
            throw new AddressingError('Subagent tasks require #slug (ad-hoc mode). Use coordinator tools for sequential work.', 'SUBAGENT_REQUIRES_SLUG', {
                suggestion: 'Format: /docs/path.md#task-slug',
                coordinator_alternative: 'Use start_coordinator_task for sequential work'
            });
        }
        const parts = documentParam.split('#');
        const docPath = parts[0] ?? documentParam;
        const taskSlug = parts[1];
        if (taskSlug == null || taskSlug === '') {
            throw new AddressingError('Task slug cannot be empty after #', 'EMPTY_TASK_SLUG');
        }
        // ===== SUBAGENT-SPECIFIC VALIDATION =====
        // Enforce ad-hoc mode with #slug and /docs/ namespace
        validateSubagentTaskAccess(docPath, taskSlug);
        // ===== ADDRESS PARSING =====
        const { addresses } = ToolIntegration.validateAndParse({
            document: docPath,
            task: taskSlug
        });
        // ===== DOCUMENT LOADING =====
        const document = await manager.getDocument(addresses.document.path);
        if (document == null) {
            throw new DocumentNotFoundError(addresses.document.path);
        }
        // ===== TASK VALIDATION =====
        // Find tasks section
        const tasksSection = document.headings.find(h => h.slug === 'tasks' || h.title.toLowerCase() === 'tasks');
        if (tasksSection == null) {
            throw new AddressingError('No tasks section found in document', 'NO_TASKS_SECTION', {
                document: addresses.document.path,
                available_sections: document.headings.map(h => h.slug)
            });
        }
        // ===== TASK RESOLUTION (AD-HOC MODE ONLY) =====
        // Use the provided task slug directly
        if (addresses.task == null) {
            throw new AddressingError('Task address is required in ad-hoc mode', 'MISSING_TASK_ADDRESS');
        }
        const taskAddress = addresses.task;
        const tasksIndex = document.headings.findIndex(h => h.slug === tasksSection.slug);
        const taskIndex = document.headings.findIndex(h => h.slug === taskAddress.slug);
        // Check if task exists after tasks section and is deeper than tasks section
        const taskHeading = document.headings[taskIndex];
        const isUnderTasksSection = taskIndex > tasksIndex &&
            taskHeading != null &&
            taskHeading.depth > tasksSection.depth;
        if (!isUnderTasksSection) {
            // Build list of available tasks for helpful error message
            const taskHeadings = await getTaskHeadings(document, tasksSection);
            throw new AddressingError(`Task not found: ${taskAddress.slug}`, 'TASK_NOT_FOUND', {
                document: addresses.document.path,
                task: taskAddress.slug,
                available_tasks: taskHeadings.map(h => h.slug)
            });
        }
        // Check if the next heading at same or shallower depth is still under tasks section
        // This ensures we haven't gone past the tasks section boundary
        let withinTasksSection = true;
        for (let i = taskIndex + 1; i < document.headings.length; i++) {
            const nextHeading = document.headings[i];
            if (nextHeading != null && nextHeading.depth <= tasksSection.depth) {
                // Hit a heading at same or shallower depth as tasks section
                withinTasksSection = true;
                break;
            }
        }
        if (!withinTasksSection) {
            throw new AddressingError(`Section ${taskAddress.slug} is not under tasks section`, 'NOT_A_TASK', {
                document: addresses.document.path,
                section: taskAddress.slug
            });
        }
        const targetTaskSlug = taskAddress.slug;
        // ===== TASK CONTENT LOADING =====
        const taskContent = await manager.getSectionContent(addresses.document.path, targetTaskSlug);
        if (taskContent == null) {
            throw new AddressingError(`Task content not found for ${targetTaskSlug}`, 'TASK_CONTENT_NOT_FOUND', {
                document: addresses.document.path,
                task: targetTaskSlug
            });
        }
        // ===== BASE TASK DATA EXTRACTION =====
        const heading = document.headings.find(h => h.slug === targetTaskSlug);
        const title = heading?.title ?? targetTaskSlug;
        const status = extractTaskField(taskContent, 'Status') ?? 'pending';
        // Build base task data
        const baseTaskData = {
            slug: targetTaskSlug,
            title,
            content: taskContent,
            status
        };
        // ===== WORKFLOW ENRICHMENT (AD-HOC MODE ONLY) =====
        // Enrich with task-specific workflow (if present in task metadata)
        // Ad-hoc mode: task workflow only, NO main workflow injection
        const taskWithWorkflow = enrichTaskWithWorkflow(baseTaskData, taskContent);
        // ===== REFERENCE ENRICHMENT =====
        // Enrich with hierarchical references from task content
        const enrichedTask = await enrichTaskWithReferences(manager, addresses.document.path, targetTaskSlug, taskContent, heading, taskAddress);
        // Merge workflow data with reference-enriched data
        // Extract task workflow (ad-hoc mode: NO main workflow)
        const workflow = 'workflow' in taskWithWorkflow
            ? taskWithWorkflow.workflow
            : undefined;
        const fullyEnriched = {
            ...enrichedTask,
            ...(workflow != null && { workflow })
        };
        // ===== OUTPUT CONSTRUCTION =====
        return {
            document: addresses.document.path,
            task: {
                slug: fullyEnriched.slug,
                title: fullyEnriched.title,
                content: fullyEnriched.content,
                status: fullyEnriched.status,
                full_path: fullyEnriched.fullPath ?? ToolIntegration.formatTaskPath(taskAddress),
                ...(workflow != null && { workflow }),
                ...(fullyEnriched.referencedDocuments != null &&
                    fullyEnriched.referencedDocuments.length > 0 && {
                    referenced_documents: fullyEnriched.referencedDocuments
                })
            }
        };
    }
    catch (error) {
        // Re-throw known error types
        if (error instanceof AddressingError || error instanceof DocumentNotFoundError) {
            throw error;
        }
        // Wrap unexpected errors
        throw new AddressingError(`Failed to start task: ${error instanceof Error ? error.message : String(error)}`, 'START_TASK_FAILED', {
            originalError: error instanceof Error ? error.message : String(error)
        });
    }
}
//# sourceMappingURL=start-subagent-task.js.map