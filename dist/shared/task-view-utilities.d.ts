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
import type { DocumentManager } from '../document-manager.js';
import type { CachedDocument } from '../document-cache.js';
import type { HeadingInfo } from './task-utilities.js';
import type { TaskAddress } from './addressing-system.js';
import { type HierarchicalContent } from './reference-loader.js';
/**
 * Complete task data with metadata and references
 */
export interface TaskViewData {
    slug: string;
    title: string;
    content: string;
    status: string;
    link?: string;
    linkedDocument?: string;
    referencedDocuments?: HierarchicalContent[];
    wordCount?: number;
    depth?: number;
    parent?: string;
    fullPath?: string;
}
/**
 * Task metadata extracted from content
 */
export interface TaskMetadata {
    readonly status: string;
    readonly link?: string;
    readonly linkedDocument?: string;
}
/**
 * Extract task metadata from task content
 * Supports both "- Key: value" and "* Key: value" formats
 */
export declare function extractTaskMetadata(content: string): TaskMetadata;
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
export declare function extractTaskField(content: string, fieldName: string): string | null;
/**
 * Extract task link from content (legacy arrow syntax)
 */
export declare function extractTaskLink(content: string): string | null;
/**
 * Extract linked document from content (@/path/to/doc.md format)
 */
export declare function extractLinkedDocument(content: string): string | null;
/**
 * Extract task title from content (first heading)
 */
export declare function extractTaskTitle(content: string): string;
/**
 * Calculate word count for content
 */
export declare function calculateWordCount(content: string): number;
/**
 * Enrich task with references and metadata
 * This is the main function that consolidates all task processing logic
 */
export declare function enrichTaskWithReferences(manager: DocumentManager, documentPath: string, taskSlug: string, taskContent: string, heading?: HeadingInfo, taskAddress?: TaskAddress): Promise<TaskViewData>;
/**
 * Format task data for consistent API responses
 * Controls which fields are included based on context
 */
export declare function formatTaskResponse(taskData: TaskViewData, options?: {
    includeContent?: boolean;
    includeWordCount?: boolean;
    includeHierarchy?: boolean;
    includeReferences?: boolean;
}): Record<string, unknown>;
/**
 * Calculate summary statistics for multiple tasks
 */
export declare function calculateTaskSummary(tasks: TaskViewData[]): {
    total_tasks: number;
    by_status: Record<string, number>;
    with_links: number;
    with_references: number;
};
/**
 * Find next available task in sequential document order
 * Used by complete-task to suggest next work
 *
 * Returns the next pending/in_progress task that appears after the excluded task
 * in document order. If excludeTaskSlug is not provided, returns the first
 * available task.
 */
export declare function findNextAvailableTask(manager: DocumentManager, document: CachedDocument, excludeTaskSlug?: string): Promise<TaskViewData | null>;
//# sourceMappingURL=task-view-utilities.d.ts.map