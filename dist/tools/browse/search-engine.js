/**
 * Search operations and query processing for document discovery
 */
import { pathToNamespace, pathToSlug, getParentSlug } from '../../shared/utilities.js';
/**
 * Perform search across documents
 * Note: This function is currently unused after refactoring browse_documents to remove search mode.
 * It's kept here for future use by search_documents tool or other potential search features.
 */
// ts-unused-exports:disable-next-line
export async function performSearch(manager, query, pathFilter) {
    const documents = [];
    const matches = [];
    try {
        // Use existing search functionality
        const searchResults = await manager.searchDocuments(query, {
            searchIn: ['title', 'headings', 'content', 'code'],
            fuzzy: true,
            boost: {
                title: 2.0,
                headings: 1.5,
                code: 1.2
            },
            highlight: true,
            groupByDocument: true
        });
        // Apply path filter if specified
        const filteredResults = (pathFilter != null && pathFilter !== '')
            ? searchResults.filter((r) => r.documentPath.startsWith(pathFilter))
            : searchResults;
        // Process search results
        for (const result of filteredResults) {
            try {
                const document = await manager.getDocument(result.documentPath);
                if (document != null) {
                    // Convert headings to sections format with hierarchical slug support
                    const sections = document.headings.map((heading) => {
                        const hierarchicalSlug = heading.slug.includes('/') ? heading.slug : heading.slug;
                        const parent = getParentSlug(hierarchicalSlug);
                        return {
                            slug: hierarchicalSlug,
                            title: heading.title,
                            depth: heading.depth,
                            ...(parent != null && { parent }),
                            hasContent: true
                        };
                    });
                    // Calculate average relevance score
                    const avgRelevance = result.matches.length > 0
                        ? result.matches.reduce((sum, match) => sum + match.score, 0) / result.matches.length
                        : 0;
                    documents.push({
                        path: result.documentPath,
                        slug: pathToSlug(result.documentPath),
                        title: result.documentTitle,
                        namespace: pathToNamespace(result.documentPath),
                        sections,
                        section_count: sections.length,
                        word_count: document.metadata.wordCount,
                        lastModified: document.metadata.lastModified.toISOString(),
                        relevance: Math.round(avgRelevance * 10) / 10
                    });
                    // Add search matches
                    for (const match of result.matches) {
                        matches.push({
                            document: result.documentPath,
                            section: match.slug ?? 'document',
                            snippet: match.snippet,
                            relevance: Math.round(match.score * 10) / 10
                        });
                    }
                }
            }
            catch {
                // Skip documents that can't be loaded
            }
        }
        // Sort documents by relevance (descending)
        documents.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
        // Sort matches by relevance (descending)
        matches.sort((a, b) => b.relevance - a.relevance);
    }
    catch {
        // Return empty results if search fails
    }
    return { documents, matches };
}
/**
 * Get section-level structure for a document
 */
export async function getSectionStructure(manager, documentPath, analyzeSectionContent, targetSectionSlug) {
    const document = await manager.getDocument(documentPath);
    if (document == null) {
        return { sections: [], document_context: null };
    }
    const sections = [];
    const document_context = {
        path: documentPath,
        title: document.metadata.title,
        namespace: pathToNamespace(documentPath),
        slug: pathToSlug(documentPath),
        ...(targetSectionSlug != null && targetSectionSlug !== '' && { current_section: targetSectionSlug })
    };
    // If no specific section requested, show all top-level sections
    if (targetSectionSlug == null || targetSectionSlug === '') {
        for (const heading of document.headings) {
            try {
                const content = await manager.getSectionContent(documentPath, heading.slug) ?? '';
                const analysis = analyzeSectionContent(content);
                // Count subsections (headings with greater depth that come after this one)
                const headingIndex = document.headings.findIndex(h => h.slug === heading.slug);
                let subsection_count = 0;
                if (headingIndex >= 0) {
                    for (let i = headingIndex + 1; i < document.headings.length; i++) {
                        const nextHeading = document.headings[i];
                        if (nextHeading == null)
                            break;
                        if (nextHeading.depth <= heading.depth) {
                            break; // Reached sibling or parent heading
                        }
                        if (nextHeading.depth === heading.depth + 1) {
                            subsection_count++; // Direct child
                        }
                    }
                }
                // Generate hierarchical slug information
                const hierarchicalSlug = heading.slug.includes('/') ? heading.slug : heading.slug;
                const parent = getParentSlug(hierarchicalSlug);
                sections.push({
                    slug: hierarchicalSlug,
                    title: heading.title,
                    depth: heading.depth,
                    ...(parent != null && { parent }),
                    subsection_count,
                    ...analysis
                });
            }
            catch {
                // Skip sections that can't be analyzed
            }
        }
    }
    else {
        // Show subsections of the specified section
        const targetHeading = document.headings.find(h => h.slug === targetSectionSlug);
        if (targetHeading != null) {
            const headingIndex = document.headings.findIndex(h => h.slug === targetSectionSlug);
            if (headingIndex >= 0) {
                // Find all subsections (headings with greater depth that come after)
                for (let i = headingIndex + 1; i < document.headings.length; i++) {
                    const heading = document.headings[i];
                    if (heading == null)
                        break;
                    if (heading.depth <= targetHeading.depth) {
                        break; // Reached sibling or parent heading
                    }
                    // Only include direct children for now
                    if (heading.depth === targetHeading.depth + 1) {
                        try {
                            const content = await manager.getSectionContent(documentPath, heading.slug) ?? '';
                            const analysis = analyzeSectionContent(content);
                            // Count subsections for this heading
                            let subsection_count = 0;
                            for (let j = i + 1; j < document.headings.length; j++) {
                                const nextHeading = document.headings[j];
                                if (nextHeading == null)
                                    break;
                                if (nextHeading.depth <= heading.depth) {
                                    break;
                                }
                                if (nextHeading.depth === heading.depth + 1) {
                                    subsection_count++;
                                }
                            }
                            // Generate hierarchical slug information
                            const hierarchicalSlug = heading.slug.includes('/') ? heading.slug : heading.slug;
                            const parent = getParentSlug(hierarchicalSlug);
                            sections.push({
                                slug: hierarchicalSlug,
                                title: heading.title,
                                depth: heading.depth,
                                ...(parent != null && { parent }),
                                subsection_count,
                                ...analysis
                            });
                        }
                        catch {
                            // Skip sections that can't be analyzed
                        }
                    }
                }
            }
        }
    }
    return { sections, document_context };
}
//# sourceMappingURL=search-engine.js.map