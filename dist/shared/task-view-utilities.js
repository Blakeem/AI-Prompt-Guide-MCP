/**
 * Shared utilities for task viewing and enrichment across tools
 *
 * This module consolidates common task processing logic used by:
 * - view-task.ts
 * - complete-task.ts
 * - task.ts (where applicable)
 *
 * Features:
 * - Task metadata extraction (status, links)
 * - Reference loading and hierarchical content
 * - Consistent response formatting
 * - Performance optimization through shared patterns
 */
import { ReferenceExtractor } from './reference-extractor.js';
import { ReferenceLoader } from './reference-loader.js';
import { loadConfig } from '../config.js';
import { getParentSlug } from './utilities.js';
import { ToolIntegration } from './addressing-system.js';
/**
 * Extract task metadata from task content
 * Supports both "- Key: value" and "* Key: value" formats
 */
export function extractTaskMetadata(content) {
    const status = extractTaskField(content, 'Status') ?? 'pending';
    const link = extractTaskLink(content);
    const linkedDocument = extractLinkedDocument(content);
    return {
        status,
        ...(link != null && link !== '' && { link }),
        ...(linkedDocument != null && linkedDocument !== '' && { linkedDocument })
    };
}
/**
 * Extract a specific task field from content (Status, etc.)
 * Supports multiple metadata formats:
 * - "* Key: value" (list item with star)
 * - "- Key: value" (list item with dash)
 * - "**Key:** value" (bold format)
 * - "Key: value" (plain format without list marker)
 * Format priority order: * format, - format, ** format, then plain format
 * Automatically unescapes markdown-escaped characters (e.g., "in\_progress" becomes "in_progress")
 */
export function extractTaskField(content, fieldName) {
    // Support "* Key: value" format (highest priority)
    const starRegex = new RegExp(`^\\s*\\*\\s*${fieldName}:\\s*(.+)$`, 'm');
    const starMatch = content.match(starRegex);
    if (starMatch?.[1] != null) {
        return unescapeMarkdown(starMatch[1].trim());
    }
    // Support "- Key: value" format (second priority)
    const dashRegex = new RegExp(`^\\s*-\\s*${fieldName}:\\s*(.+)$`, 'm');
    const dashMatch = content.match(dashRegex);
    if (dashMatch?.[1] != null) {
        return unescapeMarkdown(dashMatch[1].trim());
    }
    // Support "**Key:** value" format (third priority, exact case match)
    const boldRegex = new RegExp(`^\\s*\\*\\*${fieldName}:\\*\\*\\s*(.+)$`, 'm');
    const boldMatch = content.match(boldRegex);
    if (boldMatch?.[1] != null) {
        return unescapeMarkdown(boldMatch[1].trim());
    }
    // Support plain "Key: value" format without list marker (lowest priority)
    const plainRegex = new RegExp(`^\\s*${fieldName}:\\s*(.+)$`, 'm');
    const plainMatch = content.match(plainRegex);
    return plainMatch?.[1] != null ? unescapeMarkdown(plainMatch[1].trim()) : null;
}
/**
 * Unescape markdown-escaped characters
 * Handles common markdown escapes like \_, \*, \[, \], etc.
 */
function unescapeMarkdown(text) {
    return text.replace(/\\([_*[\](){}#+\-.!`])/g, '$1');
}
/**
 * Extract task link from content (legacy arrow syntax)
 */
export function extractTaskLink(content) {
    const match = content.match(/^→\s*(.+)$/m);
    return match?.[1]?.trim() ?? null;
}
/**
 * Extract linked document from content (@/path/to/doc.md format)
 */
export function extractLinkedDocument(content) {
    const linkMatch = content.match(/→\s*@([^\s\n]+)/);
    return linkMatch?.[1] ?? null;
}
/**
 * Extract task title from content (first heading)
 */
export function extractTaskTitle(content) {
    const match = content.match(/^### (.+)$/m);
    return match?.[1]?.trim() ?? 'Unknown Task';
}
/**
 * Calculate word count for content
 */
export function calculateWordCount(content) {
    return content.split(/\s+/).filter(word => word.length > 0).length;
}
/**
 * Enrich task with references and metadata
 * This is the main function that consolidates all task processing logic
 */
export async function enrichTaskWithReferences(manager, documentPath, taskSlug, taskContent, heading, taskAddress) {
    // Extract basic metadata
    const metadata = extractTaskMetadata(taskContent);
    const title = heading?.title ?? extractTaskTitle(taskContent);
    // Extract and load references using unified system
    const config = loadConfig();
    const extractor = new ReferenceExtractor();
    const loader = new ReferenceLoader();
    const refs = extractor.extractReferences(taskContent);
    const normalizedRefs = extractor.normalizeReferences(refs, documentPath);
    const referencedDocuments = await loader.loadReferences(normalizedRefs, manager, config.referenceExtractionDepth);
    // Build enriched task data
    const taskData = {
        slug: taskSlug,
        title,
        content: taskContent,
        status: metadata.status,
        ...(metadata.link != null && { link: metadata.link }),
        ...(metadata.linkedDocument != null && { linkedDocument: metadata.linkedDocument }),
        ...(referencedDocuments.length > 0 && { referencedDocuments })
    };
    // Add optional properties if available
    if (heading != null) {
        taskData.depth = heading.depth;
        const parent = getParentSlug(heading.slug);
        if (parent != null && parent !== '') {
            taskData.parent = parent;
        }
    }
    if (taskAddress != null) {
        taskData.fullPath = ToolIntegration.formatTaskPath(taskAddress);
    }
    // Calculate word count
    taskData.wordCount = calculateWordCount(taskContent);
    return taskData;
}
/**
 * Format task data for consistent API responses
 * Controls which fields are included based on context
 */
export function formatTaskResponse(taskData, options = {}) {
    const { includeContent = false, includeWordCount = false, includeHierarchy = false, includeReferences = true } = options;
    const response = {
        slug: taskData.slug,
        title: taskData.title,
        status: taskData.status
    };
    // Optional metadata
    if (taskData.link != null)
        response['link'] = taskData.link;
    if (taskData.linkedDocument != null)
        response['linked_document'] = taskData.linkedDocument;
    // Conditional inclusions
    if (includeContent)
        response['content'] = taskData.content;
    if (includeWordCount && taskData.wordCount != null)
        response['word_count'] = taskData.wordCount;
    if (includeHierarchy) {
        if (taskData.depth != null)
            response['depth'] = taskData.depth;
        if (taskData.parent != null)
            response['parent'] = taskData.parent;
        if (taskData.fullPath != null)
            response['full_path'] = taskData.fullPath;
    }
    if (includeReferences && taskData.referencedDocuments != null && taskData.referencedDocuments.length > 0) {
        response['referenced_documents'] = taskData.referencedDocuments;
    }
    return response;
}
/**
 * Batch process multiple tasks with enrichment
 * Optimized for handling multiple tasks efficiently
 */
async function enrichMultipleTasks(manager, documentPath, tasks) {
    const results = await Promise.allSettled(tasks.map(async ({ slug, heading, taskAddress }) => {
        const content = await manager.getSectionContent(documentPath, slug) ?? '';
        return enrichTaskWithReferences(manager, documentPath, slug, content, heading, taskAddress);
    }));
    return results
        .filter((result) => result.status === 'fulfilled')
        .map(result => result.value);
}
/**
 * Calculate summary statistics for multiple tasks
 */
export function calculateTaskSummary(tasks) {
    const statusCounts = {};
    let withLinks = 0;
    let withReferences = 0;
    for (const task of tasks) {
        // Count by status
        statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
        // Count tasks with links
        if (task.link != null || task.linkedDocument != null) {
            withLinks++;
        }
        // Count tasks with references
        if (task.referencedDocuments != null && task.referencedDocuments.length > 0) {
            withReferences++;
        }
    }
    return {
        total_tasks: tasks.length,
        by_status: statusCounts,
        with_links: withLinks,
        with_references: withReferences
    };
}
/**
 * Find next available task in sequential document order
 * Used by complete-task to suggest next work
 *
 * Returns the next pending/in_progress task that appears after the excluded task
 * in document order. If excludeTaskSlug is not provided, returns the first
 * available task.
 */
export async function findNextAvailableTask(manager, document, excludeTaskSlug) {
    try {
        // Find the Tasks section
        const tasksSection = document.headings.find(h => h.slug === 'tasks' || h.title.toLowerCase() === 'tasks');
        if (tasksSection == null)
            return null;
        // Get all task headings in document order
        const { getTaskHeadingsFromHeadings } = await import('./task-utilities.js');
        const taskHeadings = await getTaskHeadingsFromHeadings(document, tasksSection);
        // Enrich all tasks with metadata
        const allTasks = await enrichMultipleTasks(manager, document.metadata.path, taskHeadings.map(heading => ({ slug: heading.slug, heading })));
        // Find the position of the excluded task (if provided)
        let startIndex = 0;
        if (excludeTaskSlug != null && excludeTaskSlug !== '') {
            const excludedIndex = allTasks.findIndex(task => task.slug === excludeTaskSlug);
            if (excludedIndex !== -1) {
                startIndex = excludedIndex + 1; // Start search after excluded task
            }
        }
        // Find first available task after excluded task (in document order)
        for (let i = startIndex; i < allTasks.length; i++) {
            const task = allTasks[i];
            if (task != null && (task.status === 'pending' || task.status === 'in_progress')) {
                return task;
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=task-view-utilities.js.map