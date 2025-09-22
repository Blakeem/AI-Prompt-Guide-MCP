/**
 * Enhanced view_document tool implementation with namespace support and linked document context loading
 */

import type { SessionState } from '../../session/types.js';
import { initializeGlobalCache } from '../../document-cache.js';
import {
  loadLinkedDocumentContext,
  parseLink,
  splitSlugPath,
  getParentSlug
} from '../../shared/utilities.js';

/**
 * Enhanced response format for view_document
 */
interface ViewDocumentResponse {
  // Core document information
  path: string;
  slug: string;
  title: string;
  namespace: string;
  sections: Array<{
    slug: string;
    title: string;
    depth: number;
    full_path: string;
    parent?: string;
    hasContent: boolean;
    links: string[];
  }>;

  // Context loading fields (optional)
  linked_context?: Array<{
    source_link: string;
    document_path: string;
    section_slug?: string;
    content: string;
    namespace: string;
    title: string;
    relevance: 'primary' | 'secondary' | 'tertiary';
  }>;

  // Section-specific viewing (optional)
  section_context?: {
    current_section: string;
    parent_sections: string[];
    child_sections: string[];
    sibling_sections: string[];
  };

  // Enhanced metadata
  documentLinks: {
    total: number;
    internal: number;
    external: number;
    broken: number;
    sectionsWithoutLinks: string[];
  };

  // Standard metadata
  tasks?: {
    total: number;
    completed: number;
    pending: number;
    sections_with_tasks: string[];
  };
  lastModified: string;
  wordCount: number;
  headingCount: number;
}

/**
 * Execute view_document tool with enhanced capabilities
 */
export async function viewDocument(
  args: Record<string, unknown>,
  _state: SessionState
): Promise<ViewDocumentResponse> {
  // Initialize document manager
  const { loadConfig } = await import('../../config.js');
  const config = loadConfig();
  const docsBasePath = config.docsBasePath;
  initializeGlobalCache(docsBasePath);

  const { DocumentManager } = await import('../../document-manager.js');
  const manager = new DocumentManager(docsBasePath);

  // Input validation and parsing
  const path = args['path'];
  if (typeof path !== 'string' || path === '') {
    throw new Error('path parameter is required and must be a non-empty string');
  }

  const includeLinked = args['include_linked'] as boolean ?? false;
  let linkDepth = args['link_depth'] as number ?? 2;

  // Validate link depth
  if (linkDepth < 1 || linkDepth > 6) {
    linkDepth = 2;
  }

  // Parse path to separate document and section components
  let documentPath = path;
  let sectionSlug: string | undefined;

  if (path.includes('#')) {
    const hashIndex = path.indexOf('#');
    documentPath = path.substring(0, hashIndex);
    sectionSlug = path.substring(hashIndex + 1);

    // Remove leading # if present
    if (sectionSlug.startsWith('#')) {
      sectionSlug = sectionSlug.substring(1);
    }

    // Handle empty section slug
    if (sectionSlug === '') {
      sectionSlug = undefined;
    }
  }

  // Normalize document path
  if (!documentPath.startsWith('/')) {
    documentPath = `/${documentPath}`;
  }

  // Get document
  const document = await manager.getDocument(documentPath);
  if (!document) {
    throw new Error(`Document not found: ${documentPath}`);
  }

  // If section-specific viewing, validate section exists
  if (sectionSlug != null && sectionSlug !== '') {
    const sectionExists = document.headings.some(h => h.slug === sectionSlug);
    if (!sectionExists) {
      const availableSections = document.headings.map(h => h.slug).join(', ');
      throw new Error(`Section not found: ${sectionSlug}. Available sections: ${availableSections}`);
    }
  }

  // Extract namespace from document path
  const namespace = documentPath.includes('/')
    ? documentPath.substring(1, documentPath.lastIndexOf('/'))
    : '';

  // Build enhanced sections list with hierarchical information
  let sectionsToShow = document.headings;

  // If section-specific viewing, filter sections
  if (sectionSlug != null && sectionSlug !== '') {
    const targetSection = document.headings.find(h => h.slug === sectionSlug);
    if (targetSection != null) {
      // Include the target section and all its children
      sectionsToShow = document.headings.filter(h => {
        return h.slug === sectionSlug || h.slug.startsWith(`${sectionSlug}/`);
      });
    }
  }

  const enhancedSections = await Promise.all(sectionsToShow.map(async heading => {
    // Get section content to analyze for links
    const content = await manager.getSectionContent(documentPath, heading.slug) ?? '';

    // Analyze section for links
    const links: string[] = [];
    const linkMatches = content.match(/@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g) ?? [];
    links.push(...linkMatches);

    // Build hierarchical information
    const slugParts = splitSlugPath(heading.slug);
    const fullPath = slugParts.join('/');
    const parent = getParentSlug(heading.slug);

    const sectionData: {
      slug: string;
      title: string;
      depth: number;
      full_path: string;
      parent?: string;
      hasContent: boolean;
      links: string[];
    } = {
      slug: heading.slug,
      title: heading.title,
      depth: heading.depth,
      full_path: fullPath,
      hasContent: (content.trim() !== ''),
      links
    };

    if (parent != null && parent !== '') {
      sectionData.parent = parent;
    }

    return sectionData;
  }));

  // Build section context if viewing specific section
  let sectionContext: ViewDocumentResponse['section_context'];
  if (sectionSlug != null && sectionSlug !== '') {
    // Find parent sections (breadcrumb trail)
    const parentSections: string[] = [];
    let currentParent = getParentSlug(sectionSlug);
    while (currentParent != null) {
      parentSections.unshift(currentParent);
      currentParent = getParentSlug(currentParent);
    }

    // Find child sections
    const childSections = document.headings
      .filter(h => h.slug.startsWith(`${sectionSlug}/`) && h.slug.split('/').length === sectionSlug.split('/').length + 1)
      .map(h => h.slug);

    // Find sibling sections (same parent, same depth)
    const parentSlug = getParentSlug(sectionSlug);
    const siblingPrefix = parentSlug != null && parentSlug !== '' ? `${parentSlug}/` : '';
    const siblingPattern = new RegExp(`^${siblingPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^/]+$`);

    const siblingSections = document.headings
      .filter(h => h.slug !== sectionSlug && siblingPattern.test(h.slug))
      .map(h => h.slug);

    sectionContext = {
      current_section: sectionSlug,
      parent_sections: parentSections,
      child_sections: childSections,
      sibling_sections: siblingSections
    };
  }

  // Calculate document statistics
  const { readFile, stat } = await import('node:fs/promises');
  const path_module = await import('node:path');
  const absolutePath = path_module.join(config.docsBasePath, documentPath);

  let fullContent = '';
  let lastModified = '';
  try {
    fullContent = await readFile(absolutePath, 'utf-8');
    const stats = await stat(absolutePath);
    lastModified = stats.mtime.toISOString();
  } catch {
    // Handle file read errors gracefully
    lastModified = new Date().toISOString();
  }

  // Calculate word count and heading count
  const wordCount = fullContent.split(/\s+/).filter(word => word.length > 0).length;
  const headingCount = document.headings.length;

  // Analyze document links
  const allLinks = fullContent.match(/@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g) ?? [];
  const externalLinks = fullContent.match(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g) ?? [];

  let brokenLinks = 0;
  const sectionsWithoutLinks: string[] = [];

  // Check for broken links and sections without links
  for (const heading of document.headings) {
    const sectionContent = await manager.getSectionContent(documentPath, heading.slug) ?? '';
    const sectionLinks = sectionContent.match(/@(?:\/[^\s\]]+(?:#[^\s\]]*)?|#[^\s\]]*)/g) ?? [];

    if (sectionLinks.length === 0) {
      sectionsWithoutLinks.push(heading.slug);
    }

    // Basic broken link detection (could be enhanced with actual validation)
    for (const link of sectionLinks) {
      const parsed = parseLink(link, documentPath);
      if (parsed.type === 'cross-doc' && parsed.document != null && parsed.document !== '' && !parsed.document.includes('.md')) {
        brokenLinks++;
      }
    }
  }

  const documentLinks = {
    total: allLinks.length + externalLinks.length,
    internal: allLinks.length,
    external: externalLinks.length,
    broken: brokenLinks,
    sectionsWithoutLinks
  };

  // Analyze tasks if present
  let tasks: ViewDocumentResponse['tasks'];
  const taskSection = document.headings.find(h => h.slug === 'tasks' || h.title.toLowerCase().includes('task'));
  if (taskSection != null) {
    const taskContent = await manager.getSectionContent(documentPath, taskSection.slug) ?? '';
    const taskMatches = taskContent.match(/^\s*- \[([ x])\]/gm) ?? [];
    const totalTasks = taskMatches.length;
    const completedTasks = taskMatches.filter((match: string) => match.includes('[x]')).length;
    const pendingTasks = totalTasks - completedTasks;

    const sectionsWithTasks: string[] = [];
    for (const heading of document.headings) {
      const content = await manager.getSectionContent(documentPath, heading.slug) ?? '';
      if (content.match(/^\s*- \[([ x])\]/m) != null) {
        sectionsWithTasks.push(heading.slug);
      }
    }

    tasks = {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      sections_with_tasks: sectionsWithTasks
    };
  }

  // Load linked context if requested
  let linkedContext: ViewDocumentResponse['linked_context'];
  if (includeLinked) {
    try {
      linkedContext = await loadLinkedDocumentContext(
        manager,
        documentPath,
        sectionSlug,
        linkDepth
      );
    } catch (error) {
      // Gracefully handle context loading errors
      console.warn('Failed to load linked context:', error);
      linkedContext = [];
    }
  }

  // Build response
  const response: ViewDocumentResponse = {
    path: documentPath,
    slug: documentPath.split('/').pop()?.replace('.md', '') ?? 'unknown',
    title: document.metadata.title,
    namespace,
    sections: enhancedSections,
    documentLinks,
    lastModified,
    wordCount,
    headingCount
  };

  // Add optional fields
  if (linkedContext != null) {
    response.linked_context = linkedContext;
  }

  if (sectionContext != null) {
    response.section_context = sectionContext;
  }

  if (tasks != null) {
    response.tasks = tasks;
  }

  return response;
}