/**
 * Task Utilities - Shared task identification logic
 *
 * This module provides shared utilities for task identification across tools,
 * eliminating code duplication between task.ts, complete-task.ts, view-task.ts, and view-document.ts.
 *
 * Used by task.ts, complete-task.ts, view-task.ts, and view-document.ts for consistent task identification.
 */
import type { Heading } from '../types/index.js';
/**
 * Minimal heading interface for task identification
 * Supports both full Heading interface and minimal heading structures
 */
export interface HeadingInfo {
    readonly slug: string;
    readonly title: string;
    readonly depth: number;
}
/**
 * Minimal document interface for task identification
 * Supports both CachedDocument and minimal document structures
 */
export interface TaskDocument {
    readonly headings: readonly HeadingInfo[];
}
/**
 * Minimal tasks section interface
 * Supports various task section representations
 */
export interface TasksSection {
    readonly slug: string;
    readonly depth: number;
}
/**
 * Extract task headings from a document's tasks section
 *
 * This function performs hierarchical task validation and depth calculations
 * to identify task headings under a Tasks section. It uses the addressing system
 * for consistent task validation across all tools.
 *
 * @param document - Document containing headings (supports CachedDocument or minimal interface)
 * @param tasksSection - Tasks section heading (with slug and depth)
 * @returns Promise resolving to array of task headings
 *
 * @example
 * ```typescript
 * const taskHeadings = await getTaskHeadings(document, tasksSection);
 * console.log(`Found ${taskHeadings.length} tasks`);
 * ```
 */
export declare function getTaskHeadings(document: TaskDocument, tasksSection: TasksSection): Promise<HeadingInfo[]>;
/**
 * Convenience function for working with full Heading objects
 * Returns full Heading objects for compatibility with existing tool code
 *
 * @param document - Document with full Heading objects
 * @param tasksSection - Full Heading object for tasks section
 * @returns Promise resolving to array of full Heading objects that are tasks
 */
export declare function getTaskHeadingsFromHeadings(document: {
    readonly headings: readonly Heading[];
}, tasksSection: Heading): Promise<Heading[]>;
//# sourceMappingURL=task-utilities.d.ts.map