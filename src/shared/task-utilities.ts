/**
 * Task Utilities - Shared task identification logic
 *
 * This module provides shared utilities for task identification across tools,
 * eliminating code duplication between task.ts, complete-task.ts, view-task.ts, and view-document.ts.
 *
 * Used by task.ts, complete-task.ts, view-task.ts, and view-document.ts for consistent task identification.
 */

import type { Heading } from '../types/index.js';
import { isTaskSection } from './addressing-system.js';

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
export async function getTaskHeadings(
  document: TaskDocument,
  tasksSection: TasksSection
): Promise<HeadingInfo[]> {
  const taskHeadings: HeadingInfo[] = [];
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
      // Convert headings to compatible format for isTaskSection
      const compatibleDocument = {
        headings: document.headings.map(h => ({
          slug: h.slug,
          title: h.title,
          depth: h.depth
        }))
      };

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

/**
 * Convenience function for working with full Heading objects
 * Returns full Heading objects for compatibility with existing tool code
 *
 * @param document - Document with full Heading objects
 * @param tasksSection - Full Heading object for tasks section
 * @returns Promise resolving to array of full Heading objects that are tasks
 */
export async function getTaskHeadingsFromHeadings(
  document: { readonly headings: readonly Heading[] },
  tasksSection: Heading
): Promise<Heading[]> {
  const taskHeadingInfos = await getTaskHeadings(document, tasksSection);

  // Convert back to full Heading objects by finding matches in original headings
  const taskHeadings: Heading[] = [];
  for (const taskInfo of taskHeadingInfos) {
    const fullHeading = document.headings.find(h => h.slug === taskInfo.slug);
    if (fullHeading != null) {
      taskHeadings.push(fullHeading);
    }
  }

  return taskHeadings;
}