/**
 * Markdown parsing utilities for heading extraction and TOC building
 */
import type { Heading, TocNode } from './types/index.js';
/**
 * Extracts all headings from markdown with hierarchy information
 * Uses document-scoped slugger to ensure unique slugs for duplicate titles
 */
export declare function listHeadings(markdown: string): readonly Heading[];
/**
 * Builds a hierarchical table of contents from markdown
 */
export declare function buildToc(markdown: string): readonly TocNode[];
/**
 * Validates that a markdown document structure is well-formed
 * Note: With stateful slugger, duplicate slugs are automatically handled
 */
export declare function validateMarkdownStructure(markdown: string): void;
//# sourceMappingURL=parse.d.ts.map