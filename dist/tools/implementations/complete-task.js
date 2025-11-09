/**
 * Implementation for the complete_task tool
 * Mark tasks as completed and show next available task
 */
import { ToolIntegration, AddressingError, DocumentNotFoundError } from '../../shared/addressing-system.js';
import { findNextAvailableTask } from '../../shared/task-view-utilities.js';
import { enrichTaskWithWorkflow } from '../../shared/workflow-prompt-utilities.js';
import { completeTaskOperation } from '../../shared/task-operations.js';
export async function completeTask(args, _state, manager) {
    try {
        // Mode Detection: Parse document parameter to detect mode
        const documentParam = ToolIntegration.validateStringParameter(args['document'], 'document');
        const note = ToolIntegration.validateStringParameter(args['note'], 'note');
        let mode;
        let docPath;
        let taskSlug;
        if (documentParam.includes('#')) {
            // Ad-hoc mode: Parse document + slug
            const parts = documentParam.split('#');
            docPath = parts[0] ?? documentParam;
            taskSlug = parts[1];
            mode = 'adhoc';
            if (taskSlug == null || taskSlug === '') {
                throw new AddressingError('Task slug cannot be empty after #', 'EMPTY_TASK_SLUG');
            }
        }
        else {
            // Sequential mode: Document only
            docPath = documentParam;
            taskSlug = undefined;
            mode = 'sequential';
        }
        // Use addressing system for validation and parsing
        const { addresses } = ToolIntegration.validateAndParse({
            document: docPath,
            ...(taskSlug != null && { task: taskSlug })
        });
        // Get document and validate existence
        const document = await manager.getDocument(addresses.document.path);
        if (document == null) {
            throw new DocumentNotFoundError(addresses.document.path);
        }
        // Determine target task based on mode
        let targetTaskSlug;
        if (mode === 'adhoc') {
            // Ad-hoc mode: Use the provided task slug
            if (addresses.task == null) {
                throw new AddressingError('Task address required for ad-hoc mode', 'MISSING_TASK');
            }
            targetTaskSlug = addresses.task.slug;
        }
        else {
            // Sequential mode: Find next available task
            const nextTask = await findNextAvailableTask(manager, document, undefined);
            if (nextTask == null) {
                throw new AddressingError('No pending or in_progress tasks found in document', 'NO_AVAILABLE_TASKS', {
                    document: addresses.document.path,
                    suggestion: 'All tasks may be completed. Use view_task to check task status.'
                });
            }
            targetTaskSlug = nextTask.slug;
        }
        // Complete the task using shared operation
        const completedTaskData = await completeTaskOperation(manager, addresses.document.path, targetTaskSlug, note);
        // Get next available task based on mode
        let nextTaskData = null;
        if (mode === 'sequential') {
            // Sequential mode: Find next task after current one
            nextTaskData = await findNextAvailableTask(manager, document, targetTaskSlug);
        }
        // In ad-hoc mode, nextTaskData remains null
        let nextTask;
        if (nextTaskData != null) {
            // Get next task content for workflow extraction
            const nextTaskContent = await manager.getSectionContent(addresses.document.path, nextTaskData.slug) ?? '';
            // Enrich with task-specific workflow ONLY (no main workflow)
            const enrichedNext = enrichTaskWithWorkflow({
                slug: nextTaskData.slug,
                title: nextTaskData.title,
                content: nextTaskContent,
                status: nextTaskData.status
            }, nextTaskContent);
            // Build next_task response
            nextTask = {
                slug: enrichedNext.slug,
                title: enrichedNext.title,
                ...(nextTaskData.link != null && { link: nextTaskData.link }),
                // Add workflow if present (FULL object, not just name)
                ...(enrichedNext.workflow != null && {
                    workflow: {
                        name: enrichedNext.workflow.name,
                        description: enrichedNext.workflow.description,
                        content: enrichedNext.workflow.content,
                        whenToUse: enrichedNext.workflow.whenToUse
                    }
                }),
                ...(nextTaskData.referencedDocuments != null && nextTaskData.referencedDocuments.length > 0 && {
                    referenced_documents: nextTaskData.referencedDocuments
                })
            };
        }
        return {
            mode,
            completed_task: {
                slug: completedTaskData.slug,
                title: completedTaskData.title,
                note: completedTaskData.note,
                completed_date: completedTaskData.completed_date
            },
            ...(nextTask != null && { next_task: nextTask }),
            timestamp: new Date().toISOString().split('T')[0] ?? new Date().toISOString()
        };
    }
    catch (error) {
        if (error instanceof AddressingError) {
            throw error;
        }
        throw new AddressingError(`Task completion failed: ${error instanceof Error ? error.message : String(error)}`, 'COMPLETION_FAILED');
    }
}
// Helper functions moved to shared/task-operations.ts and shared/task-view-utilities.ts
//# sourceMappingURL=complete-task.js.map