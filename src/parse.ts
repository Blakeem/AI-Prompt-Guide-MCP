/**
 * Markdown parsing utilities for heading extraction and TOC building
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toString } from 'mdast-util-to-string';
import { visitParents } from 'unist-util-visit-parents';
import type { Heading as MdHeading, Root } from 'mdast';
import { titleToSlug } from './slug.js';
import { DEFAULT_LIMITS, ERROR_CODES } from './constants/defaults.js';
import type { Heading, TocNode, HeadingDepth, SpecDocsError } from './types/index.js';

/**
 * Creates a custom error with code and context
 */
function createError(message: string, code: string, context?: Record<string, unknown>): SpecDocsError {
  const error = new Error(message) as SpecDocsError;
  (error as any).code = code;
  if (context) {
    (error as any).context = context;
  }
  return error;
}

/**
 * Validates heading depth and normalizes it to valid range
 */
function normalizeHeadingDepth(depth: number): HeadingDepth {
  const normalized = Math.max(1, Math.min(6, depth)) as HeadingDepth;
  return normalized;
}

/**
 * Parses markdown text into an AST
 */
export function parseMarkdown(markdown: string): Root {
  if (typeof markdown !== 'string') {
    throw createError(
      'Markdown content must be a string',
      ERROR_CODES.INVALID_SECTION_CONTENT,
      { type: typeof markdown }
    );
  }

  try {
    return unified().use(remarkParse).parse(markdown) as Root;
  } catch (error) {
    throw createError(
      'Failed to parse markdown',
      ERROR_CODES.INVALID_SECTION_CONTENT,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Extracts all headings from markdown with hierarchy information
 */
export function listHeadings(markdown: string): readonly Heading[] {
  const tree = parseMarkdown(markdown);
  const headings: Heading[] = [];
  // Track parent-child relationships through AST traversal
  let counter = -1;

  visitParents(tree as any, 'heading', (node: MdHeading) => {
    counter++;

    // Validate heading count limit
    if (counter >= DEFAULT_LIMITS.MAX_HEADINGS_PER_DOCUMENT) {
      throw createError(
        `Too many headings in document (max: ${DEFAULT_LIMITS.MAX_HEADINGS_PER_DOCUMENT})`,
        ERROR_CODES.INVALID_SECTION_CONTENT,
        { headingCount: counter + 1, maxHeadings: DEFAULT_LIMITS.MAX_HEADINGS_PER_DOCUMENT }
      );
    }

    const title = toString(node).trim();
    
    // Validate title length
    if (title.length > DEFAULT_LIMITS.MAX_HEADING_TITLE_LENGTH) {
      throw createError(
        `Heading title too long (max: ${DEFAULT_LIMITS.MAX_HEADING_TITLE_LENGTH} characters)`,
        ERROR_CODES.INVALID_TITLE,
        { title, length: title.length, maxLength: DEFAULT_LIMITS.MAX_HEADING_TITLE_LENGTH }
      );
    }

    if (title.length === 0) {
      throw createError(
        'Heading title cannot be empty',
        ERROR_CODES.INVALID_TITLE,
        { index: counter }
      );
    }

    const slug = titleToSlug(title);
    const depth = normalizeHeadingDepth(node.depth);

    // Find parent heading (nearest previous heading with smaller depth)
    let parentIndex: number | null = null;
    
    // Look through already processed headings in reverse order
    for (let i = headings.length - 1; i >= 0; i--) {
      if (headings[i]!.depth < depth) {
        parentIndex = i;
        break;
      }
    }

    headings.push({
      index: counter,
      depth,
      title,
      slug,
      parentIndex,
    });
  });

  return headings;
}

/**
 * Builds a hierarchical table of contents from markdown
 */
export function buildToc(markdown: string): readonly TocNode[] {
  const headings = listHeadings(markdown);
  const nodes: TocNode[] = [];
  const nodesByIndex = new Map<number, TocNode>();

  // Create TocNode for each heading
  headings.forEach((heading) => {
    const node: TocNode = {
      title: heading.title,
      slug: heading.slug,
      depth: heading.depth,
      children: [],
    };
    
    nodesByIndex.set(heading.index, node);

    // Add to parent or root
    if (heading.parentIndex === null) {
      nodes.push(node);
    } else {
      const parent = nodesByIndex.get(heading.parentIndex);
      if (parent) {
        (parent.children as TocNode[]).push(node);
      } else {
        // If parent not found, add to root (fallback)
        nodes.push(node);
      }
    }
  });

  return nodes;
}

/**
 * Finds a heading by slug in the parsed headings
 */
export function findHeadingBySlug(headings: readonly Heading[], slug: string): Heading | null {
  return headings.find(h => h.slug === slug) ?? null;
}

/**
 * Validates that a markdown document structure is well-formed
 */
export function validateMarkdownStructure(markdown: string): void {
  try {
    const headings = listHeadings(markdown);
    const slugCounts = new Map<string, number>();

    // Check for duplicate slugs at the same hierarchical level
    headings.forEach((heading) => {
      const key = `${heading.parentIndex}:${heading.slug}`;
      const count = slugCounts.get(key) ?? 0;
      slugCounts.set(key, count + 1);

      if (count > 0) {
        throw createError(
          `Duplicate heading slug "${heading.slug}" found at same hierarchical level`,
          ERROR_CODES.DUPLICATE_HEADING,
          {
            slug: heading.slug,
            title: heading.title,
            parentIndex: heading.parentIndex,
            index: heading.index,
          }
        );
      }
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error; // Re-throw our custom errors
    }
    throw createError(
      'Failed to validate markdown structure',
      ERROR_CODES.INVALID_SECTION_CONTENT,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Gets the hierarchical path of a heading (all parent titles)
 */
export function getHeadingPath(headings: readonly Heading[], targetSlug: string): string[] {
  const target = findHeadingBySlug(headings, targetSlug);
  if (!target) {
    return [];
  }

  const path: string[] = [];
  let current: Heading | null = target;

  while (current) {
    path.unshift(current.title);
    current = current.parentIndex !== null 
      ? headings[current.parentIndex] ?? null 
      : null;
  }

  return path;
}