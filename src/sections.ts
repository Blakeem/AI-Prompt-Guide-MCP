/**
 * Markdown sections CRUD operations using heading ranges
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toMarkdown } from 'mdast-util-to-markdown';
import { toString } from 'mdast-util-to-string';
import { headingRange } from 'mdast-util-heading-range';
import type { Root, Heading as MdHeading, Content } from 'mdast';
import { visitParents } from 'unist-util-visit-parents';
import { titleToSlug } from './slug.js';
import { ERROR_CODES, DEFAULT_LIMITS } from './constants/defaults.js';
import type { 
  HeadingDepth, 
  InsertMode, 
  SpecDocsError 
} from './types/index.js';

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
 * Parses markdown into AST
 */
function parseMarkdown(markdown: string): Root {
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
 * Creates a heading matcher function for the given slug
 */
function matchHeadingBySlug(slug: string) {
  return (value: string): boolean => {
    return titleToSlug(value.trim()) === slug;
  };
}

/**
 * Finds the parent heading index for a given slug
 */
function findParentHeadingIndex(tree: Root, slug: string): number | null {
  const headings: Array<{ node: MdHeading; index: number }> = [];
  let counter = -1;

  visitParents(tree as any, 'heading', (node: MdHeading) => {
    counter++;
    headings.push({ node, index: counter });
  });

  const target = headings.find(h => titleToSlug(toString(h.node).trim()) === slug);
  if (!target) {
    return null;
  }

  // Find the most recent heading with smaller depth
  for (let i = target.index - 1; i >= 0; i--) {
    const heading = headings[i];
    if (heading && heading.node.depth < target.node.depth) {
      return i;
    }
  }

  return null; // Top-level heading
}

/**
 * Ensures uniqueness among sibling headings
 */
function ensureUniqueAmongSiblings(
  tree: Root,
  parentIndex: number | null,
  depth: HeadingDepth,
  newTitle: string
): void {
  const targetSlug = titleToSlug(newTitle);
  const headings: Array<{ node: MdHeading; index: number }> = [];
  let counter = -1;

  visitParents(tree as any, 'heading', (node: MdHeading) => {
    counter++;
    headings.push({ node, index: counter });
  });

  // Get parent index for each heading
  const getParentIndex = (index: number): number | null => {
    for (let i = index - 1; i >= 0; i--) {
      const heading = headings[i];
      const targetHeading = headings[index];
      if (heading && targetHeading && heading.node.depth < targetHeading.node.depth) {
        return i;
      }
    }
    return null;
  };

  // Check for duplicates among siblings
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    if (heading === undefined || heading.node === undefined) continue;

    const headingParentIndex = getParentIndex(i);
    
    if (headingParentIndex === parentIndex && heading.node.depth === depth) {
      const existingSlug = titleToSlug(toString(heading.node).trim());
      if (existingSlug === targetSlug) {
        throw createError(
          `Duplicate heading at depth ${depth}: "${newTitle}" (slug: ${targetSlug})`,
          ERROR_CODES.DUPLICATE_HEADING,
          {
            title: newTitle,
            slug: targetSlug,
            depth,
            parentIndex,
            conflictingIndex: i,
          }
        );
      }
    }
  }
}

/**
 * Validates section body content
 */
function validateSectionBody(body: string): void {
  if (typeof body !== 'string') {
    throw createError(
      'Section body must be a string',
      ERROR_CODES.INVALID_SECTION_CONTENT,
      { type: typeof body }
    );
  }

  if (body.length > DEFAULT_LIMITS.MAX_SECTION_BODY_LENGTH) {
    throw createError(
      `Section body too long (max: ${DEFAULT_LIMITS.MAX_SECTION_BODY_LENGTH} characters)`,
      ERROR_CODES.INVALID_SECTION_CONTENT,
      { length: body.length, maxLength: DEFAULT_LIMITS.MAX_SECTION_BODY_LENGTH }
    );
  }
}

/**
 * Reads a section by slug and returns its markdown content
 */
export function readSection(markdown: string, slug: string): string | null {
  if (!slug || typeof slug !== 'string') {
    throw createError(
      'Slug must be a non-empty string',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }

  const tree = parseMarkdown(markdown);
  let captured: string | null = null;

  headingRange(tree as any, matchHeadingBySlug(slug), (start, nodes, end) => {
    // Serialize the captured section including the heading
    const section: Root = {
      type: 'root',
      children: [start, ...nodes, end].filter(Boolean) as Content[],
    };
    
    try {
      captured = toMarkdown(section);
    } catch (error) {
      throw createError(
        'Failed to serialize section',
        ERROR_CODES.INVALID_SECTION_CONTENT,
        { 
          slug,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }

    return [start, ...nodes, end]; // No modification
  });

  return captured;
}

/**
 * Replaces the body of a section while keeping the heading
 */
export function replaceSectionBody(
  markdown: string,
  slug: string,
  newBodyMarkdown: string
): string {
  if (!slug || typeof slug !== 'string') {
    throw createError(
      'Slug must be a non-empty string',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }

  validateSectionBody(newBodyMarkdown);

  const tree = parseMarkdown(markdown);
  const newBodyTree = parseMarkdown(newBodyMarkdown);

  // Filter out any heading nodes from the new body (safety measure)
  const sanitizedChildren = newBodyTree.children.filter(node => node.type !== 'heading');

  let found = false;
  headingRange(tree as any, matchHeadingBySlug(slug), (start, _nodes, end) => {
    found = true;
    return [start, ...sanitizedChildren, end].filter(Boolean);
  });

  if (!found) {
    throw createError(
      `Heading not found: ${slug}`,
      ERROR_CODES.HEADING_NOT_FOUND,
      { slug }
    );
  }

  try {
    return toMarkdown(tree);
  } catch (error) {
    throw createError(
      'Failed to serialize updated markdown',
      ERROR_CODES.INVALID_SECTION_CONTENT,
      { 
        slug,
        error: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

/**
 * Inserts a new section relative to an existing heading
 */
export function insertRelative(
  markdown: string,
  refSlug: string,
  mode: InsertMode,
  newDepth: HeadingDepth,
  newTitle: string,
  bodyMarkdown = ''
): string {
  if (!refSlug || typeof refSlug !== 'string') {
    throw createError(
      'Reference slug must be a non-empty string',
      ERROR_CODES.INVALID_SLUG,
      { slug: refSlug }
    );
  }

  if (!newTitle || typeof newTitle !== 'string') {
    throw createError(
      'New title must be a non-empty string',
      ERROR_CODES.INVALID_TITLE,
      { title: newTitle }
    );
  }

  validateSectionBody(bodyMarkdown);

  const tree = parseMarkdown(markdown);

  // Determine parent index and depth based on mode
  let parentIndex: number | null;
  let finalDepth: HeadingDepth;

  if (mode === 'append_child') {
    // Parent is the reference heading itself
    const headings: Array<{ node: MdHeading; index: number }> = [];
    let counter = -1;
    
    visitParents(tree as any, 'heading', (node: MdHeading) => {
      counter++;
      headings.push({ node, index: counter });
    });

    const refHeading = headings.find(h => 
      titleToSlug(toString(h.node).trim()) === refSlug
    );

    if (!refHeading) {
      throw createError(
        `Reference heading not found: ${refSlug}`,
        ERROR_CODES.HEADING_NOT_FOUND,
        { slug: refSlug }
      );
    }

    parentIndex = refHeading.index;
    finalDepth = Math.min(6, refHeading.node.depth + 1) as HeadingDepth;
  } else {
    // Parent is the same as the reference heading's parent
    parentIndex = findParentHeadingIndex(tree, refSlug);
    finalDepth = newDepth;
  }

  // Ensure uniqueness among siblings
  ensureUniqueAmongSiblings(tree, parentIndex, finalDepth, newTitle);

  // Parse body content
  const bodyTree = parseMarkdown(bodyMarkdown);
  const bodyChildren = bodyTree.children.filter(node => node.type !== 'heading');

  // Create the new heading node
  const headingNode: MdHeading = {
    type: 'heading',
    depth: finalDepth,
    children: [{ type: 'text', value: newTitle }],
  };

  const insertNodes: Content[] = [headingNode, ...bodyChildren];

  let found = false;
  const resultTree = parseMarkdown(markdown); // Fresh tree for mutation
  
  headingRange(resultTree as any, matchHeadingBySlug(refSlug), (start, nodes, end) => {
    found = true;
    
    switch (mode) {
      case 'insert_before':
        return [...insertNodes, start, ...nodes, end].filter(Boolean);
      case 'insert_after':
        return [start, ...nodes, end, ...insertNodes].filter(Boolean);
      case 'append_child':
        return [start, ...nodes, ...insertNodes, end].filter(Boolean);
      default:
        throw createError(
          `Invalid insert mode: ${mode}`,
          ERROR_CODES.INVALID_OPERATION,
          { mode }
        );
    }
  });

  if (!found) {
    throw createError(
      `Reference heading not found: ${refSlug}`,
      ERROR_CODES.HEADING_NOT_FOUND,
      { slug: refSlug }
    );
  }

  try {
    return toMarkdown(resultTree);
  } catch (error) {
    throw createError(
      'Failed to serialize updated markdown',
      ERROR_CODES.INVALID_SECTION_CONTENT,
      { 
        refSlug,
        newTitle,
        error: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

/**
 * Renames a heading (changes its title and thus its slug)
 */
export function renameHeading(markdown: string, slug: string, newTitle: string): string {
  if (!slug || typeof slug !== 'string') {
    throw createError(
      'Slug must be a non-empty string',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }

  if (!newTitle || typeof newTitle !== 'string') {
    throw createError(
      'New title must be a non-empty string',
      ERROR_CODES.INVALID_TITLE,
      { title: newTitle }
    );
  }

  const tree = parseMarkdown(markdown);

  // Find the target heading
  const headings: Array<{ node: MdHeading; index: number }> = [];
  let counter = -1;
  
  visitParents(tree as any, 'heading', (node: MdHeading) => {
    counter++;
    headings.push({ node, index: counter });
  });

  let targetHeading: MdHeading | null = null;
  let targetIndex = -1;

  for (const { node, index } of headings) {
    if (titleToSlug(toString(node).trim()) === slug) {
      targetHeading = node;
      targetIndex = index;
      break;
    }
  }

  if (!targetHeading) {
    throw createError(
      `Heading not found: ${slug}`,
      ERROR_CODES.HEADING_NOT_FOUND,
      { slug }
    );
  }

  // Find parent of target heading
  let parentIndex: number | null = null;
  for (let i = targetIndex - 1; i >= 0; i--) {
    const heading = headings[i];
    if (heading && heading.node.depth < targetHeading.depth) {
      parentIndex = i;
      break;
    }
  }

  // Ensure uniqueness among siblings
  ensureUniqueAmongSiblings(tree, parentIndex, targetHeading.depth as HeadingDepth, newTitle);

  // Update the heading's text
  targetHeading.children = [{ type: 'text', value: newTitle }];

  try {
    return toMarkdown(tree);
  } catch (error) {
    throw createError(
      'Failed to serialize updated markdown',
      ERROR_CODES.INVALID_SECTION_CONTENT,
      { 
        slug,
        newTitle,
        error: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

/**
 * Deletes an entire section (heading and its content)
 */
export function deleteSection(markdown: string, slug: string): string {
  if (!slug || typeof slug !== 'string') {
    throw createError(
      'Slug must be a non-empty string',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }

  const tree = parseMarkdown(markdown);
  let found = false;

  headingRange(tree as any, matchHeadingBySlug(slug), () => {
    found = true;
    return []; // Return empty array to delete the entire section
  });

  if (!found) {
    throw createError(
      `Heading not found: ${slug}`,
      ERROR_CODES.HEADING_NOT_FOUND,
      { slug }
    );
  }

  try {
    return toMarkdown(tree);
  } catch (error) {
    throw createError(
      'Failed to serialize updated markdown',
      ERROR_CODES.INVALID_SECTION_CONTENT,
      { 
        slug,
        error: error instanceof Error ? error.message : String(error)
      }
    );
  }
}