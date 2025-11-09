/**
 * Implementation for view_subagent_task tool
 * Provides clean task viewing for subagent tasks in /docs/ namespace
 * For coordinator tasks, use view_coordinator_task instead
 */
import { ToolIntegration, DocumentNotFoundError, AddressingError, parseTaskAddress } from '../../shared/addressing-system.js';
import { getTaskHeadings } from '../../shared/task-utilities.js';
import { enrichTaskWithReferences, calculateTaskSummary, extractTaskMetadata } from '../../shared/task-view-utilities.js';
import { extractWorkflowName, extractMainWorkflowName } from '../../shared/workflow-prompt-utilities.js';
/**
 * Execute view_subagent_task tool
 * Works with subagent tasks in /docs/ namespace only
 * For coordinator tasks, use view_coordinator_task instead
 */
export async function viewSubagentTask(args, _state, manager) {
    // Mode Detection: Parse document parameter to detect mode
    const documentParam = ToolIntegration.validateStringParameter(args['document'], 'document');
    let mode;
    let docPath;
    let taskSlugs;
    if (documentParam.includes('#')) {
        // Detail mode: Parse document + slug(s)
        const parts = documentParam.split('#');
        docPath = parts[0] ?? documentParam;
        const slugsPart = parts[1];
        mode = 'detail';
        if (slugsPart == null || slugsPart === '') {
            throw new AddressingError('Task slug(s) cannot be empty after #', 'EMPTY_TASK_SLUG');
        }
        // Support comma-separated slugs: #task1,task2,task3
        taskSlugs = slugsPart.split(',').map(s => s.trim()).filter(s => s !== '');
        if (taskSlugs.length === 0) {
            throw new AddressingError('At least one task slug required in detail mode', 'NO_TASK_SLUGS');
        }
        // Validate count using standardized utility
        ToolIntegration.validateCountLimit(taskSlugs, 10, 'tasks');
    }
    else {
        // Overview mode: Document only
        docPath = documentParam;
        taskSlugs = undefined;
        mode = 'overview';
    }
    // Use addressing system for document validation
    const { addresses } = ToolIntegration.validateAndParse({
        document: docPath
    });
    // Get document
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
        throw new DocumentNotFoundError(addresses.document.path);
    }
    // Find tasks section (consistent with task.ts)
    const tasksSection = document.headings.find(h => h.slug === 'tasks' ||
        h.title.toLowerCase() === 'tasks');
    if (tasksSection == null) {
        throw new AddressingError(`No tasks section found in document: ${addresses.document.path}`, 'NO_TASKS_SECTION', {
            document: addresses.document.path
        });
    }
    // Handle Overview Mode: Return all tasks with minimal data (no content)
    if (mode === 'overview') {
        const taskHeadings = await getTaskHeadings(document, tasksSection);
        // Process all tasks with minimal data
        const overviewTasks = await Promise.all(taskHeadings.map(async (heading) => {
            const content = await manager.getSectionContent(addresses.document.path, heading.slug) ?? '';
            const metadata = extractTaskMetadata(content);
            const workflowName = extractWorkflowName(content);
            const mainWorkflowName = extractMainWorkflowName(content);
            return {
                slug: heading.slug,
                title: heading.title,
                status: metadata.status,
                depth: heading.depth,
                full_path: `${addresses.document.path}#${heading.slug}`,
                has_workflow: workflowName != null && workflowName !== '',
                ...(workflowName != null && workflowName !== '' && { workflow_name: workflowName }),
                ...(mainWorkflowName != null && mainWorkflowName !== '' && { main_workflow_name: mainWorkflowName })
            };
        }));
        // Calculate summary for overview
        const statusCounts = {};
        let tasksWithWorkflows = 0;
        let tasksWithMainWorkflow = 0;
        for (const task of overviewTasks) {
            statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
            if (task.has_workflow)
                tasksWithWorkflows++;
            if (task.main_workflow_name != null)
                tasksWithMainWorkflow++;
        }
        return {
            mode: 'overview',
            document: addresses.document.path,
            tasks: overviewTasks,
            summary: {
                total_tasks: overviewTasks.length,
                by_status: statusCounts,
                with_links: 0,
                with_references: 0,
                tasks_with_workflows: tasksWithWorkflows,
                tasks_with_main_workflow: tasksWithMainWorkflow
            }
        };
    }
    // Detail Mode: Process specified tasks with full content
    // At this point we're in detail mode, so taskSlugs must be defined
    if (taskSlugs == null) {
        throw new AddressingError('Internal error: taskSlugs undefined in detail mode', 'INTERNAL_ERROR');
    }
    const tasks = taskSlugs;
    // Parse and validate all tasks using addressing system
    // Use Promise.allSettled for non-critical view operations to handle partial failures gracefully
    const taskAddressResults = await Promise.allSettled(tasks.map(taskSlug => {
        try {
            return parseTaskAddress(taskSlug, addresses.document.path);
        }
        catch (error) {
            if (error instanceof AddressingError) {
                const errorResponse = ToolIntegration.formatHierarchicalError(error, 'Check task path format and hierarchical structure');
                throw new AddressingError(errorResponse.error, error.code, errorResponse.context);
            }
            throw new AddressingError(`Invalid task reference: ${taskSlug}`, 'INVALID_TASK', { taskSlug });
        }
    }));
    // Separate successful addresses from failures for graceful handling
    const taskAddresses = [];
    const failedTasks = [];
    taskAddressResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            taskAddresses.push(result.value);
        }
        else {
            const taskSlug = tasks[index];
            if (taskSlug != null) {
                failedTasks.push(taskSlug);
            }
        }
    });
    // If all tasks failed, throw the first error to maintain backward compatibility
    if (taskAddresses.length === 0 && failedTasks.length > 0) {
        const firstResult = taskAddressResults[0];
        if (firstResult?.status === 'rejected') {
            throw firstResult.reason;
        }
    }
    // Import task identification logic from addressing system
    const { isTaskSection } = await import('../../shared/addressing-system.js');
    // Use getTaskHeadings from shared utilities for consistent task identification
    const taskHeadings = await getTaskHeadings(document, tasksSection);
    // Validate all requested tasks exist and are actual tasks
    for (const taskAddr of taskAddresses) {
        const taskExists = taskHeadings.some(h => h.slug === taskAddr.slug);
        if (!taskExists) {
            // Get available tasks for error message (use same logic as task.ts)
            const availableTasks = taskHeadings.map(h => h.slug).join(', ');
            throw new AddressingError(`Task not found: ${taskAddr.slug}. Available tasks: ${availableTasks}`, 'TASK_NOT_FOUND', { taskSlug: taskAddr.slug, document: addresses.document.path });
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
            throw new AddressingError(`Section ${taskAddr.slug} is not a task (not under tasks section)`, 'NOT_A_TASK', { taskSlug: taskAddr.slug, tasksSection: tasksSection.slug });
        }
    }
    // Extract main workflow name from first task (if present)
    let mainWorkflowName = null;
    const firstTask = taskHeadings[0];
    if (firstTask != null) {
        const firstTaskContent = await manager.getSectionContent(addresses.document.path, firstTask.slug);
        if (firstTaskContent != null) {
            const extractedMainWorkflow = extractMainWorkflowName(firstTaskContent);
            if (extractedMainWorkflow != null && extractedMainWorkflow !== '') {
                mainWorkflowName = extractedMainWorkflow;
            }
        }
    }
    // Process each task using shared utilities with Promise.allSettled for graceful partial failure handling
    const taskProcessingResults = await Promise.allSettled(taskAddresses.map(async (taskAddr) => {
        const heading = document.headings.find(h => h.slug === taskAddr.slug);
        if (heading == null) {
            throw new AddressingError(`Task not found: ${taskAddr.slug}`, 'TASK_NOT_FOUND', { taskSlug: taskAddr.slug, document: addresses.document.path });
        }
        // Get task content using the normalized slug
        const content = await manager.getSectionContent(addresses.document.path, taskAddr.slug) ?? '';
        // Use shared enrichment function for consistent processing
        const enrichedTask = await enrichTaskWithReferences(manager, addresses.document.path, taskAddr.slug, content, heading, taskAddr);
        // Extract workflow name from task content
        const workflowName = extractWorkflowName(content);
        // Workflow field exists and has a non-empty value
        const hasWorkflow = workflowName != null && workflowName !== '';
        // Format for view-subagent-task specific response structure
        const taskData = {
            slug: enrichedTask.slug,
            title: enrichedTask.title,
            content: enrichedTask.content,
            depth: enrichedTask.depth ?? heading.depth,
            full_path: enrichedTask.fullPath ?? ToolIntegration.formatTaskPath(taskAddr),
            status: enrichedTask.status,
            word_count: enrichedTask.wordCount ?? 0,
            has_workflow: hasWorkflow
        };
        // Add optional workflow name (only if present and non-empty)
        if (hasWorkflow) {
            taskData.workflow_name = workflowName;
        }
        // Add main workflow name (only if present and non-empty)
        if (mainWorkflowName != null && mainWorkflowName !== '') {
            taskData.main_workflow_name = mainWorkflowName;
        }
        // Add optional fields
        if (enrichedTask.parent != null) {
            taskData.parent = enrichedTask.parent;
        }
        if (enrichedTask.linkedDocument != null) {
            taskData.linked_document = enrichedTask.linkedDocument;
        }
        if (enrichedTask.referencedDocuments != null && enrichedTask.referencedDocuments.length > 0) {
            taskData.referenced_documents = enrichedTask.referencedDocuments;
        }
        return taskData;
    }));
    // Separate successful tasks from failures
    const processedTasks = [];
    const processingErrors = [];
    taskProcessingResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            processedTasks.push(result.value);
        }
        else {
            processingErrors.push({
                taskSlug: taskAddresses[index]?.slug ?? failedTasks[0] ?? 'unknown',
                error: result.reason
            });
        }
    });
    // If all tasks failed to process, throw the first error for backward compatibility
    if (processedTasks.length === 0 && processingErrors.length > 0) {
        const firstError = processingErrors[0];
        if (firstError != null) {
            throw firstError.error;
        }
    }
    // Calculate summary statistics using shared utility
    const taskViewData = processedTasks.map(task => {
        const viewData = {
            slug: task.slug,
            title: task.title,
            content: task.content ?? '', // Default to empty string for summary calculation
            status: task.status
        };
        // Only add optional fields if they exist
        if (task.linked_document != null) {
            viewData.linkedDocument = task.linked_document;
        }
        if (task.referenced_documents != null && task.referenced_documents.length > 0) {
            viewData.referencedDocuments = task.referenced_documents;
        }
        return viewData;
    });
    const baseSummary = calculateTaskSummary(taskViewData);
    // Calculate workflow-specific counts
    const tasksWithWorkflows = processedTasks.filter(task => task.has_workflow).length;
    const tasksWithMainWorkflow = processedTasks.filter(task => task.main_workflow_name != null).length;
    return {
        mode: 'detail',
        document: addresses.document.path,
        tasks: processedTasks,
        summary: {
            ...baseSummary,
            tasks_with_workflows: tasksWithWorkflows,
            tasks_with_main_workflow: tasksWithMainWorkflow
        }
    };
}
// Utility functions moved to shared/task-view-utilities.ts to eliminate duplication
//# sourceMappingURL=view-subagent-task.js.map