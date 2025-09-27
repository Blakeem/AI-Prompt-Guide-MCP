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
import { listHeadings } from './parse.js';
import { ERROR_CODES, DEFAULT_LIMITS } from './constants/defaults.js';
import type {
  HeadingDepth,
  InsertMode,
  SpecDocsError,
  Heading
} from './types/index.js';

/**
 * Creates a custom error with code and context
 */
function createError(message: string, code: string, context?: Record<string, unknown>): SpecDocsError {
  const error = new Error(message) as SpecDocsError;
  return Object.assign(error, { code, context });
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
 * Creates a heading matcher function for the given slug with hierarchical support
 */
function matchHeadingBySlug(slug: string, headings?: readonly Heading[]) {
  let headingIndex = -1; // Track which heading we're currently testing

  return (value: string): boolean => {
    headingIndex++; // Increment for each heading tested
    const basicSlug = titleToSlug(value.trim());

    // For hierarchical paths, we need to match the specific heading, not just any heading with the same title
    if (slug.includes('/') && headings) {
      // Find the target heading using our hierarchical logic
      const targetHeading = findTargetHierarchicalHeading(slug, headings);
      if (targetHeading) {
        // Only match if this is the exact heading we want
        return headingIndex === targetHeading.index && titleToSlug(targetHeading.title) === basicSlug;
      }
      return false;
    }

    // Direct flat match (current behavior)
    return basicSlug === slug;
  };
}

/**
 * Finds all headings that could potentially match a given slug, including disambiguated versions
 *
 * @param finalSlug - The target slug to match (e.g., "overview")
 * @param headings - Array of all headings in the document
 * @returns Array of candidate headings that match the slug exactly or with disambiguation suffix
 *
 * @example
 * // For slug "overview", finds headings with slugs: "overview", "overview-1", "overview-2", etc.
 * const candidates = findCandidateSections("overview", headings);
 */
function findCandidateSections(finalSlug: string, headings: readonly Heading[]): Heading[] {
  return headings.filter(h => {
    return h.slug === finalSlug || h.slug.startsWith(`${finalSlug}-`);
  });
}

/**
 * Builds the hierarchical path for a given heading by walking backwards through parent headings
 *
 * @param targetSection - The heading to build the path for
 * @param headings - Complete array of all headings in the document (must be in document order)
 * @returns Array of slugs representing the hierarchical path from root to target
 *
 * @example
 * // For a heading at depth 3 with parents, returns something like:
 * // ["api", "authentication", "jwt-tokens"]
 * const path = buildHierarchicalPath(jwtHeading, allHeadings);
 */
function buildHierarchicalPath(targetSection: Heading, headings: readonly Heading[]): string[] {
  const actualPath: string[] = [];
  let currentDepth = targetSection.depth;
  const currentIndex = targetSection.index;

  // Walk backwards through headings to build the actual path
  for (let i = currentIndex - 1; i >= 0; i--) {
    const heading = headings[i];
    if (heading != null && heading.depth < currentDepth) {
      actualPath.unshift(heading.slug);
      currentDepth = heading.depth;
    }
  }
  actualPath.push(targetSection.slug);

  return actualPath;
}

/**
 * Checks if an actual path matches the expected path pattern (exact or suffix match)
 *
 * @param actualPath - The actual hierarchical path built from document structure
 * @param expectedParts - The expected path parts to match against
 * @returns true if the actual path exactly matches or ends with the expected pattern
 *
 * @example
 * // Exact match
 * matchesPathPattern(["api", "auth"], ["api", "auth"]) // → true
 *
 * // Suffix match (allows deeper nesting)
 * matchesPathPattern(["docs", "api", "auth"], ["api", "auth"]) // → true
 */
function matchesPathPattern(actualPath: string[], expectedParts: string[]): boolean {
  const actualPathStr = actualPath.join('/');
  const expectedPathStr = expectedParts.join('/');

  // For hierarchical matching, check if the expected path is a suffix of the actual path
  return actualPathStr === expectedPathStr || actualPathStr.endsWith(`/${expectedPathStr}`);
}

/**
 * Attempts to match paths by handling disambiguation in intermediate path components
 *
 * @param actualPath - The actual hierarchical path with potential disambiguation suffixes
 * @param expectedParts - The expected path parts without disambiguation suffixes
 * @returns true if the paths match when accounting for disambiguation (e.g., "-1", "-2" suffixes)
 *
 * @example
 * // Handles disambiguation in path components
 * const actual = ["frontend", "authentication-1", "jwt-tokens-1"];
 * const expected = ["frontend", "authentication", "jwt-tokens"];
 * tryDisambiguationMatching(actual, expected) // → true
 *
 * @throws Never throws - returns false for any invalid input
 */
function tryDisambiguationMatching(actualPath: string[], expectedParts: string[]): boolean {
  if (expectedParts.length <= 1) {
    return false;
  }

  // Build expected path with potential disambiguation
  const expectedWithPossibleDisambiguation = expectedParts.map((part, index) => {
    // For each part, see if there's a disambiguated version in the actual path
    const actualPart = actualPath[actualPath.length - expectedParts.length + index];
    if (actualPart != null && actualPart !== '' && (actualPart === part || actualPart.startsWith(`${part}-`))) {
      return actualPart;
    }
    return part;
  });

  return matchesPathPattern(actualPath, expectedWithPossibleDisambiguation);
}

/**
 * Finds the specific heading that matches the hierarchical path
 *
 * @param targetPath - Hierarchical path to match (e.g., "api/auth/jwt-tokens")
 * @param headings - Complete array of all headings in the document (must be in document order)
 * @returns The matching heading or null if no match found
 *
 * @example
 * // Find a heading using hierarchical path
 * const heading = findTargetHierarchicalHeading("api/auth/jwt-tokens", allHeadings);
 * if (heading) {
 *   console.log(`Found heading: ${heading.title} (slug: ${heading.slug})`);
 * }
 *
 * @throws Never throws - returns null for invalid input or no match
 */
function findTargetHierarchicalHeading(targetPath: string, headings: readonly Heading[]): Heading | null {
  const pathParts = targetPath.toLowerCase().split('/');
  const finalSlug = pathParts[pathParts.length - 1];

  if (finalSlug == null) {
    return null; // Empty path parts, should not happen due to validation
  }

  const candidateSections = findCandidateSections(finalSlug, headings);

  // For each candidate, check if its hierarchy matches the expected path
  for (const targetSection of candidateSections) {
    const actualPath = buildHierarchicalPath(targetSection, headings);

    // Try exact or suffix matching first
    if (matchesPathPattern(actualPath, pathParts)) {
      return targetSection;
    }

    // Try disambiguation matching for intermediate path components
    if (tryDisambiguationMatching(actualPath, pathParts)) {
      return targetSection;
    }

    // Also check if we can match by replacing the final slug with the disambiguated version
    const expectedWithDisambiguated = pathParts.slice(0, -1).concat([targetSection.slug]);
    if (matchesPathPattern(actualPath, expectedWithDisambiguated)) {
      return targetSection;
    }
  }

  return null;
}


/**
 * Finds the parent heading index for a given slug
 */
function findParentHeadingIndex(tree: Root, slug: string): number | null {
  const headings: Array<{ node: MdHeading; index: number }> = [];
  let counter = -1;

  visitParents(tree, 'heading', (node: MdHeading) => {
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

  visitParents(tree, 'heading', (node: MdHeading) => {
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
    if (heading?.node === undefined) continue;

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
 * Validates hierarchical path for security and format compliance
 */
function validateHierarchicalPath(slug: string): void {
  // Maximum path length (total characters)
  const MAX_PATH_LENGTH = 1000;
  // Maximum path depth (number of segments)
  const MAX_PATH_DEPTH = 20;
  // Maximum individual component length
  const MAX_COMPONENT_LENGTH = 200;

  if (slug.length > MAX_PATH_LENGTH) {
    throw createError(
      `Hierarchical path too long (max: ${MAX_PATH_LENGTH} characters)`,
      ERROR_CODES.INVALID_SLUG,
      { slug, length: slug.length, maxLength: MAX_PATH_LENGTH }
    );
  }

  // Normalize Unicode to prevent normalization attacks
  const normalizedSlug = slug.normalize('NFC');
  if (normalizedSlug !== slug) {
    throw createError(
      'Path contains non-normalized Unicode characters',
      ERROR_CODES.INVALID_SLUG,
      { slug, normalized: normalizedSlug }
    );
  }

  // Check for dangerous characters
  // eslint-disable-next-line no-control-regex
  const dangerousChars = /[\x00-\x1F\x7F\uFFFE\uFFFF\\%]/;
  if (dangerousChars.test(slug)) {
    throw createError(
      'Path contains dangerous characters (control chars, null bytes, backslashes, or percent encoding)',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }

  // Check for whitespace at start/end or in problematic positions
  if (slug.trim() !== slug || /\s{2,}/.test(slug)) {
    throw createError(
      'Path contains leading/trailing whitespace or multiple consecutive spaces',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }

  // Split into components for detailed validation
  const components = slug.split('/');

  if (components.length > MAX_PATH_DEPTH) {
    throw createError(
      `Path too deep (max: ${MAX_PATH_DEPTH} levels)`,
      ERROR_CODES.INVALID_SLUG,
      { slug, depth: components.length, maxDepth: MAX_PATH_DEPTH }
    );
  }

  for (const component of components) {
    if (component.length === 0) {
      throw createError(
        'Path contains empty components (double slashes)',
        ERROR_CODES.INVALID_SLUG,
        { slug }
      );
    }

    if (component.length > MAX_COMPONENT_LENGTH) {
      throw createError(
        `Path component too long (max: ${MAX_COMPONENT_LENGTH} characters)`,
        ERROR_CODES.INVALID_SLUG,
        { slug, component, length: component.length, maxLength: MAX_COMPONENT_LENGTH }
      );
    }

    // Check for path traversal attempts
    if (component === '.' || component === '..' || component.includes('..')) {
      throw createError(
        'Path contains path traversal attempts',
        ERROR_CODES.INVALID_SLUG,
        { slug, component }
      );
    }

    // Check for percent encoding (simple detection)
    if (component.includes('%')) {
      throw createError(
        'Path contains percent encoding which is not allowed',
        ERROR_CODES.INVALID_SLUG,
        { slug, component }
      );
    }
  }

  // Additional security checks
  if (slug.startsWith('/') || slug.endsWith('/')) {
    throw createError(
      'Path cannot start or end with forward slash',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }

  if (slug.includes('//')) {
    throw createError(
      'Path cannot contain double slashes',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
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
 * Validates a slug for security and format compliance (both flat and hierarchical)
 * Returns the normalized slug for further processing
 */
function validateSlugSecurity(slug: string): string {
  // Auto-normalize Unicode to prevent normalization attacks
  const normalizedSlug = slug.normalize('NFC');

  // Check for dangerous characters in the normalized slug
  // eslint-disable-next-line no-control-regex
  const dangerousChars = /[\x00-\x1F\x7F\uFFFE\uFFFF\\%]/;
  if (dangerousChars.test(normalizedSlug)) {
    throw createError(
      'Slug contains dangerous characters (control chars, null bytes, backslashes, or percent encoding)',
      ERROR_CODES.INVALID_SLUG,
      { slug: normalizedSlug }
    );
  }

  // Check for length limits
  const MAX_SLUG_LENGTH = 1000;
  if (normalizedSlug.length > MAX_SLUG_LENGTH) {
    throw createError(
      `Slug too long (max: ${MAX_SLUG_LENGTH} characters)`,
      ERROR_CODES.INVALID_SLUG,
      { slug: normalizedSlug, length: normalizedSlug.length, maxLength: MAX_SLUG_LENGTH }
    );
  }

  // Check for whitespace issues
  if (normalizedSlug.trim() !== normalizedSlug || /\s{2,}/.test(normalizedSlug)) {
    throw createError(
      'Slug contains leading/trailing whitespace or multiple consecutive spaces',
      ERROR_CODES.INVALID_SLUG,
      { slug: normalizedSlug }
    );
  }

  return normalizedSlug;
}

/**
 * Extracts the content of a specific section from a markdown document
 *
 * Supports both flat slug addressing (e.g., "overview") and hierarchical addressing
 * (e.g., "api/auth/jwt-tokens") with comprehensive security validation and disambiguation handling.
 *
 * @param markdown - The complete markdown content to search
 * @param slug - Section identifier (flat slug or hierarchical path)
 * @returns The section content (heading + body) or null if not found
 *
 * @example
 * // Flat addressing
 * const content = readSection(markdownContent, "overview");
 *
 * // Hierarchical addressing
 * const content = readSection(markdownContent, "api/auth/jwt-tokens");
 *
 * // Returns the heading and body content:
 * // "## Overview\n\nThis section covers..."
 *
 * @throws {Error} When slug is invalid, contains dangerous characters, or violates security constraints
 * @throws {Error} When hierarchical path validation fails (too long, dangerous chars, etc.)
 */
export function readSection(markdown: string, slug: string): string | null {
  if (!slug || typeof slug !== 'string') {
    throw createError(
      'Slug must be a non-empty string',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }

  // Validate slug security and get normalized version
  const normalizedSlug = validateSlugSecurity(slug);

  // For hierarchical paths, perform additional hierarchical validation
  if (normalizedSlug.includes('/')) {
    validateHierarchicalPath(normalizedSlug);

    const headings = listHeadings(markdown);
    const targetHeading = findTargetHierarchicalHeading(normalizedSlug, headings);
    if (!targetHeading) {
      throw createError(
        `Section not found in hierarchical context: ${normalizedSlug}`,
        ERROR_CODES.HEADING_NOT_FOUND,
        { slug: normalizedSlug }
      );
    }
  }

  const tree = parseMarkdown(markdown);
  const headings = listHeadings(markdown); // Get heading context
  let captured: string | null = null;

  headingRange(tree, matchHeadingBySlug(normalizedSlug, headings), (start, nodes, end) => {
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
          slug: normalizedSlug,
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
  const headings = listHeadings(markdown); // Get heading context
  const newBodyTree = parseMarkdown(newBodyMarkdown);

  // Filter out any heading nodes from the new body (safety measure)
  const sanitizedChildren = newBodyTree.children.filter(node => node.type !== 'heading');

  let found = false;
  headingRange(tree, matchHeadingBySlug(slug, headings), (start, _nodes, end) => {
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
    
    visitParents(tree, 'heading', (node: MdHeading) => {
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
  const headings = listHeadings(markdown); // Get heading context

  headingRange(resultTree, matchHeadingBySlug(refSlug, headings), (start, nodes, end) => {
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
  
  visitParents(tree, 'heading', (node: MdHeading) => {
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
 * Gets the content that would be removed by a deleteSection operation
 * This excludes the end boundary marker to match actual removal behavior
 */
export function getSectionContentForRemoval(markdown: string, slug: string): string | null {
  if (!slug || typeof slug !== 'string') {
    throw createError(
      'Slug must be a non-empty string',
      ERROR_CODES.INVALID_SLUG,
      { slug }
    );
  }

  const tree = parseMarkdown(markdown);
  const headings = listHeadings(markdown); // Get heading context
  let captured: string | null = null;

  headingRange(tree, matchHeadingBySlug(slug, headings), (start, nodes, _end) => {
    // Serialize only the content that will be removed (excluding end boundary)
    // This matches the behavior of deleteSection which preserves the end marker
    const section: Root = {
      type: 'root',
      children: [start, ...nodes].filter(Boolean) as Content[],
    };

    try {
      captured = toMarkdown(section);
    } catch (error) {
      throw createError(
        'Failed to serialize section content for removal',
        ERROR_CODES.INVALID_SECTION_CONTENT,
        {
          slug,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }

    return [start, ...nodes]; // No modification (not actually removing anything here)
  });

  return captured;
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
  const headings = listHeadings(markdown); // Get heading context
  let found = false;

  headingRange(tree, matchHeadingBySlug(slug, headings), (_start, _nodes, end) => {
    found = true;
    // CRITICAL BUG FIX: Preserve the end heading to prevent data loss
    // The end heading marks the start of the next section and must not be deleted
    return end ? [end] : [];
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