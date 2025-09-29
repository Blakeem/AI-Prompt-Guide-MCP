/**
 * Comprehensive link validation utilities for the Document Linking System
 */

import type { DocumentManager } from '../document-manager.js';
import { parseLink, validateLink } from './link-utils.js';
import { pathToNamespace } from './utilities.js';
import { ReferenceExtractor } from './reference-extractor.js';

/**
 * Result of validating a single link
 */
interface LinkValidationResult {
  link_text: string;
  is_valid: boolean;
  target_document?: string;
  target_section?: string;
  validation_error?: string;
  suggestions?: string[];
  link_type: 'cross-doc' | 'within-doc' | 'external' | 'malformed';
}

/**
 * Result of validating all links in a document
 */
interface DocumentLinkReport {
  document_path: string;
  document_title: string;
  namespace: string;
  total_links: number;
  valid_links: number;
  broken_links: number;
  external_links: number;
  links: LinkValidationResult[];
  sections_with_broken_links: string[];
  health_score: number; // 0-100 percentage
  recommendations: string[];
}

/**
 * Result of validating links across multiple documents
 */
interface SystemLinkReport {
  total_documents: number;
  total_links: number;
  overall_health_score: number;
  documents_with_issues: number;
  most_broken_documents: Array<{
    path: string;
    title: string;
    broken_count: number;
  }>;
  common_issues: Array<{
    issue_type: string;
    count: number;
    examples: string[];
  }>;
  document_reports: DocumentLinkReport[];
}

/**
 * Validate a single link with detailed analysis
 */
export async function validateSingleLink(
  linkText: string,
  currentDocumentPath: string,
  manager: DocumentManager
): Promise<LinkValidationResult> {
  const result: LinkValidationResult = {
    link_text: linkText,
    is_valid: false,
    link_type: 'malformed'
  };

  try {
    // Parse the link to understand its structure
    const parsed = parseLink(linkText, currentDocumentPath);
    result.link_type = parsed.type;

    if (parsed.type === 'external') {
      result.is_valid = true;
      return result;
    }

    // Validate internal links
    const validation = await validateLink(linkText, manager);
    result.is_valid = validation.valid;

    if (validation.valid) {
      // Extract target information for valid links
      if (parsed.type === 'cross-doc' && parsed.document != null && parsed.document !== '') {
        result.target_document = parsed.document;
        if (parsed.section != null && parsed.section !== '') {
          result.target_section = parsed.section;
        }
      } else if (parsed.type === 'within-doc' && parsed.section != null && parsed.section !== '') {
        result.target_document = currentDocumentPath;
        result.target_section = parsed.section;
      }
    } else {
      result.validation_error = validation.error ?? 'Validation failed';
      result.suggestions = await generateLinkSuggestions(linkText, validation, manager);
    }

  } catch (error) {
    result.validation_error = error instanceof Error ? error.message : String(error);
    result.suggestions = ['Check link syntax: use @/path/doc.md or @#section format'];
  }

  return result;
}

/**
 * Validate all links in a document and generate a comprehensive report
 */
export async function validateDocumentLinks(
  documentPath: string,
  manager: DocumentManager
): Promise<DocumentLinkReport> {
  const document = await manager.getDocument(documentPath);
  if (!document) {
    throw new Error(`Document not found: ${documentPath}`);
  }

  const report: DocumentLinkReport = {
    document_path: documentPath,
    document_title: document.metadata.title,
    namespace: pathToNamespace(documentPath),
    total_links: 0,
    valid_links: 0,
    broken_links: 0,
    external_links: 0,
    links: [],
    sections_with_broken_links: [],
    health_score: 0,
    recommendations: []
  };

  // Extract all links from all sections using unified ReferenceExtractor
  const allLinks: Array<{ linkText: string; sectionSlug: string }> = [];
  const extractor = new ReferenceExtractor();

  for (const heading of document.headings) {
    try {
      const sectionContent = await manager.getSectionContent(documentPath, heading.slug) ?? '';
      const references = extractor.extractReferences(sectionContent);

      for (const ref of references) {
        allLinks.push({
          linkText: ref,
          sectionSlug: heading.slug
        });
      }
    } catch {
      // Skip sections that can't be read
    }
  }

  report.total_links = allLinks.length;

  // Validate each link
  const sectionsBrokenLinks = new Set<string>();

  for (const { linkText, sectionSlug } of allLinks) {
    const linkResult = await validateSingleLink(linkText, documentPath, manager);
    report.links.push(linkResult);

    if (linkResult.link_type === 'external') {
      report.external_links++;
      report.valid_links++; // Assume external links are valid
    } else if (linkResult.is_valid) {
      report.valid_links++;
    } else {
      report.broken_links++;
      sectionsBrokenLinks.add(sectionSlug);
    }
  }

  report.sections_with_broken_links = Array.from(sectionsBrokenLinks);

  // Calculate health score (percentage of valid links)
  if (report.total_links > 0) {
    report.health_score = Math.round((report.valid_links / report.total_links) * 100);
  } else {
    report.health_score = 100; // No links means perfect health
  }

  // Generate recommendations
  report.recommendations = generateDocumentRecommendations(report);

  return report;
}

/**
 * Validate links across multiple documents or entire system
 */
export async function validateSystemLinks(
  manager: DocumentManager,
  pathFilter?: string
): Promise<SystemLinkReport> {
  // Get all documents to validate
  let documentsToCheck: Array<{ path: string; title: string; lastModified: Date; headingCount: number; wordCount: number }>;

  try {
    const allDocuments = await manager.listDocuments();
    documentsToCheck = pathFilter != null && pathFilter !== ''
      ? allDocuments.filter(doc => doc.path.startsWith(pathFilter))
      : allDocuments;
  } catch (error) {
    throw new Error(`Failed to get document list: ${error instanceof Error ? error.message : String(error)}`);
  }

  const documentReports: DocumentLinkReport[] = [];
  const commonIssues = new Map<string, Array<string>>();

  // Validate each document
  for (const docInfo of documentsToCheck) {
    try {
      const report = await validateDocumentLinks(docInfo.path, manager);
      documentReports.push(report);

      // Collect common issues
      for (const link of report.links) {
        if (!link.is_valid && link.validation_error != null && link.validation_error !== '') {
          const issueType = categorizeValidationError(link.validation_error);
          if (!commonIssues.has(issueType)) {
            commonIssues.set(issueType, []);
          }
          commonIssues.get(issueType)?.push(link.link_text);
        }
      }
    } catch (error) {
      // Skip documents that can't be validated
      console.warn(`Failed to validate links in ${docInfo.path}:`, error);
    }
  }

  // Calculate system-wide statistics
  const totalLinks = documentReports.reduce((sum, report) => sum + report.total_links, 0);
  const totalValidLinks = documentReports.reduce((sum, report) => sum + report.valid_links, 0);
  const overallHealthScore = totalLinks > 0 ? Math.round((totalValidLinks / totalLinks) * 100) : 100;

  // Find documents with issues
  const documentsWithIssues = documentReports.filter(report => report.broken_links > 0);

  // Find most broken documents
  const mostBrokenDocuments = documentReports
    .filter(report => report.broken_links > 0)
    .sort((a, b) => b.broken_links - a.broken_links)
    .slice(0, 5)
    .map(report => ({
      path: report.document_path,
      title: report.document_title,
      broken_count: report.broken_links
    }));

  // Process common issues
  const commonIssuesArray = Array.from(commonIssues.entries())
    .map(([issueType, examples]) => ({
      issue_type: issueType,
      count: examples.length,
      examples: examples.slice(0, 3) // Show top 3 examples
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 issue types

  return {
    total_documents: documentReports.length,
    total_links: totalLinks,
    overall_health_score: overallHealthScore,
    documents_with_issues: documentsWithIssues.length,
    most_broken_documents: mostBrokenDocuments,
    common_issues: commonIssuesArray,
    document_reports: documentReports
  };
}

/**
 * Find and fix common link issues automatically
 */
export async function autoFixLinks(
  documentPath: string,
  manager: DocumentManager,
  dryRun: boolean = true
): Promise<{
  fixes_found: number;
  fixes_applied: number;
  suggested_fixes: Array<{
    original_link: string;
    suggested_fix: string;
    reason: string;
    section: string;
  }>;
}> {
  const suggestedFixes: Array<{
    original_link: string;
    suggested_fix: string;
    reason: string;
    section: string;
  }> = [];

  const document = await manager.getDocument(documentPath);
  if (!document) {
    throw new Error(`Document not found: ${documentPath}`);
  }

  // Analyze each section for fixable issues using unified ReferenceExtractor
  const extractor = new ReferenceExtractor();

  for (const heading of document.headings) {
    try {
      const sectionContent = await manager.getSectionContent(documentPath, heading.slug) ?? '';
      const references = extractor.extractReferences(sectionContent);

      for (const ref of references) {
        const validation = await validateSingleLink(ref, documentPath, manager);

        if (!validation.is_valid && validation.suggestions) {
          for (const suggestion of validation.suggestions) {
            if (suggestion.startsWith('Try:')) {
              const suggestedFix = suggestion.replace('Try:', '').trim();
              suggestedFixes.push({
                original_link: ref,
                suggested_fix: suggestedFix,
                reason: validation.validation_error ?? 'Link validation failed',
                section: heading.slug
              });
            }
          }
        }
      }
    } catch {
      // Skip sections that can't be processed
    }
  }

  // Apply fixes if not in dry run mode
  const fixesApplied = 0;
  if (!dryRun && suggestedFixes.length > 0) {
    // TODO: Implement actual content replacement
    // This would require careful content replacement logic
    // For now, we'll just count potential fixes
  }

  return {
    fixes_found: suggestedFixes.length,
    fixes_applied: fixesApplied,
    suggested_fixes: suggestedFixes
  };
}

/**
 * Generate suggestions for fixing a broken link
 */
async function generateLinkSuggestions(
  linkText: string,
  validation: Awaited<ReturnType<typeof validateLink>>,
  manager: DocumentManager
): Promise<string[]> {
  const suggestions: string[] = [];

  if (validation.error?.includes('Document not found') === true) {
    // Try to find similar document paths
    try {
      const allDocuments = await manager.listDocuments();
      const cleanedLinkText = linkText.replace('@', '').replace(/^\//, '');
      const similarDocs = allDocuments.filter(doc =>
        doc.path.toLowerCase().includes(cleanedLinkText.toLowerCase()) ||
        cleanedLinkText.toLowerCase().includes(doc.path.toLowerCase())
      );

      if (similarDocs.length > 0) {
        const firstDoc = similarDocs[0];
        if (firstDoc) {
          suggestions.push(`Try: @${firstDoc.path}`);
          if (similarDocs.length > 1) {
            suggestions.push(`Other options: ${similarDocs.slice(1, 3).map(d => `@${d.path}`).join(', ')}`);
          }
        }
      }
    } catch {
      // Ignore search errors
    }

    suggestions.push('Check the document path and ensure the file exists');
    suggestions.push('Use absolute paths starting with / (e.g., @/api/specs/doc.md)');
  }

  if (validation.error?.includes('Section not found') === true) {
    suggestions.push('Check the section slug spelling and format');
    suggestions.push('Section slugs use lowercase with hyphens (e.g., #user-authentication)');

    if (validation.documentExists === true && linkText.includes('#')) {
      const docPath = linkText.split('#')[0]?.replace('@', '') ?? '';
      try {
        const doc = await manager.getDocument(docPath);
        if (doc?.headings && doc.headings.length > 0) {
          const availableSections = doc.headings.slice(0, 3).map(h => `#${h.slug}`);
          suggestions.push(`Available sections: ${availableSections.join(', ')}`);
        }
      } catch {
        // Ignore document loading errors
      }
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('Verify link syntax: @/path/doc.md for documents, @#section for within-document');
  }

  return suggestions;
}

/**
 * Generate recommendations for improving document link health
 */
function generateDocumentRecommendations(report: DocumentLinkReport): string[] {
  const recommendations: string[] = [];

  if (report.health_score < 50) {
    recommendations.push('🚨 Critical: Many broken links detected. Review and fix immediately.');
  } else if (report.health_score < 80) {
    recommendations.push('⚠️ Warning: Some broken links found. Consider fixing for better navigation.');
  } else if (report.health_score === 100 && report.total_links > 0) {
    recommendations.push('✅ Excellent: All links are valid and working properly.');
  }

  if (report.total_links === 0) {
    recommendations.push('💡 Consider adding links to related documents for better connectivity.');
  } else if (report.total_links < 3) {
    recommendations.push('💡 Consider adding more links to improve document interconnectedness.');
  }

  if (report.sections_with_broken_links.length > 0) {
    recommendations.push(`🔧 Focus on fixing links in: ${report.sections_with_broken_links.slice(0, 3).join(', ')}`);
  }

  if (report.external_links > report.total_links * 0.5) {
    recommendations.push('💡 High external link ratio. Consider linking to more internal documentation.');
  }

  return recommendations;
}

/**
 * Categorize validation errors for common issue analysis
 */
function categorizeValidationError(error: string): string {
  if (error.includes('Document not found')) {
    return 'Missing Document';
  }
  if (error.includes('Section not found')) {
    return 'Missing Section';
  }
  if (error.includes('Invalid syntax') || error.includes('malformed')) {
    return 'Syntax Error';
  }
  if (error.includes('permission') || error.includes('access')) {
    return 'Access Error';
  }
  return 'Other Error';
}