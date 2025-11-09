/**
 * Link context loading functionality
 */
/**
 * Load linked document context for enhanced view_document responses
 *
 * @param manager - DocumentManager instance
 * @param documentPath - Path to the source document
 * @param sectionSlug - Optional section slug to limit scope
 * @param linkDepth - Maximum depth for recursive context loading (1-3)
 * @returns Array of linked context objects
 */
export async function loadLinkedDocumentContext(manager, documentPath, sectionSlug, linkDepth = 2) {
    // Input validation
    if (linkDepth < 1 || linkDepth > 3) {
        linkDepth = 2;
    }
    const linkedContext = [];
    // Track visited links to prevent cycles
    const visited = new Set();
    // Queue for breadth-first context loading
    const queue = [];
    // Get the source document
    const sourceDocument = await manager.getDocument(documentPath);
    if (!sourceDocument) {
        return linkedContext;
    }
    // Determine content to scan for links
    let contentToScan = '';
    if (sectionSlug != null && sectionSlug !== '') {
        // Scan only the specified section
        const sectionContent = await manager.getSectionContent(documentPath, sectionSlug);
        contentToScan = sectionContent ?? '';
    }
    else {
        // Scan entire document using DocumentManager's cache which knows the correct root path
        const fullContent = await manager.cache.readDocumentContent(documentPath);
        if (fullContent == null) {
            return linkedContext;
        }
        contentToScan = fullContent;
    }
    // Extract all @ links from content using unified ReferenceExtractor
    const { ReferenceExtractor } = await import('./reference-extractor.js');
    const extractor = new ReferenceExtractor();
    const refs = extractor.extractReferences(contentToScan);
    // Process each unique link
    const uniqueLinks = [...new Set(refs)];
    for (const linkText of uniqueLinks) {
        const { parseLink: parseLinkFn } = await import('./link-utils.js');
        const parsedLink = parseLinkFn(linkText, documentPath);
        if (parsedLink.type === 'external') {
            continue;
        }
        // Resolve the link
        const { resolveLinkWithContext } = await import('./link-utils.js');
        const resolved = await resolveLinkWithContext(linkText, documentPath, manager);
        if (resolved.validation.valid !== true || resolved.resolvedPath == null) {
            continue;
        }
        // Extract document path and section from resolved path
        const hashIndex = resolved.resolvedPath.indexOf('#');
        const docPath = hashIndex === -1 ? resolved.resolvedPath : resolved.resolvedPath.slice(0, hashIndex);
        const sectionSlug = hashIndex === -1 ? undefined : resolved.resolvedPath.slice(hashIndex + 1);
        // Add to processing queue (will check visited set during queue processing)
        const queueItem = {
            docPath,
            depth: 1,
            relevance: 'primary'
        };
        if (sectionSlug != null && sectionSlug !== '') {
            queueItem.sectionSlug = sectionSlug;
        }
        queue.push(queueItem);
    }
    // Process queue with depth limiting
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || current.depth > linkDepth) {
            continue;
        }
        const currentId = `${current.docPath}#${current.sectionSlug ?? ''}`;
        if (visited.has(currentId)) {
            continue;
        }
        visited.add(currentId);
        // Load the linked document
        const linkedDoc = await manager.getDocument(current.docPath);
        if (!linkedDoc) {
            continue;
        }
        // Get content and metadata
        let content = '';
        let title = linkedDoc.metadata.title;
        if (current.sectionSlug != null && current.sectionSlug !== '') {
            // Load specific section
            const sectionContent = await manager.getSectionContent(current.docPath, current.sectionSlug);
            content = sectionContent ?? '';
            // Find section title
            const section = linkedDoc.headings.find(h => h.slug === current.sectionSlug);
            if (section != null) {
                title = section.title;
            }
        }
        else {
            // Load entire document using DocumentManager's cache which knows the correct root path
            const fullContent = await manager.cache.readDocumentContent(current.docPath);
            if (fullContent == null) {
                continue;
            }
            content = fullContent;
        }
        // Extract namespace using central addressing system
        const { pathToNamespace } = await import('./path-utilities.js');
        const namespace = pathToNamespace(current.docPath);
        // Create source link reference
        const sourceLink = current.sectionSlug != null && current.sectionSlug !== ''
            ? `@${current.docPath}#${current.sectionSlug}`
            : `@${current.docPath}`;
        // Add to context
        const contextItem = {
            source_link: sourceLink,
            document_path: current.docPath,
            content,
            namespace,
            title,
            relevance: current.relevance
        };
        if (current.sectionSlug != null && current.sectionSlug !== '') {
            contextItem.section_slug = current.sectionSlug;
        }
        linkedContext.push(contextItem);
        // If we haven't reached max depth, scan this content for more links
        if (current.depth < linkDepth) {
            const nestedRefs = extractor.extractReferences(content);
            const uniqueNestedLinks = [...new Set(nestedRefs)];
            for (const nestedLinkText of uniqueNestedLinks) {
                const { parseLink: parseLinkNestedFn } = await import('./link-utils.js');
                const nestedParsed = parseLinkNestedFn(nestedLinkText, current.docPath);
                if (nestedParsed.type === 'external') {
                    continue;
                }
                const { resolveLinkWithContext: resolveLinkNestedFn } = await import('./link-utils.js');
                const nestedResolved = await resolveLinkNestedFn(nestedLinkText, current.docPath, manager);
                if (nestedResolved.validation.valid !== true || nestedResolved.resolvedPath == null) {
                    continue;
                }
                // Extract document path and section from resolved path
                const nestedHashIndex = nestedResolved.resolvedPath.indexOf('#');
                const nestedDocPath = nestedHashIndex === -1 ? nestedResolved.resolvedPath : nestedResolved.resolvedPath.slice(0, nestedHashIndex);
                const nestedSectionSlug = nestedHashIndex === -1 ? undefined : nestedResolved.resolvedPath.slice(nestedHashIndex + 1);
                const nestedId = `${nestedDocPath}#${nestedSectionSlug ?? ''}`;
                if (visited.has(nestedId)) {
                    continue;
                }
                // Add to queue with incremented depth and reduced relevance
                const nextRelevance = current.relevance === 'primary' ? 'secondary' : 'tertiary';
                const nestedQueueItem = {
                    docPath: nestedDocPath,
                    depth: current.depth + 1,
                    relevance: nextRelevance
                };
                if (nestedSectionSlug != null && nestedSectionSlug !== '') {
                    nestedQueueItem.sectionSlug = nestedSectionSlug;
                }
                queue.push(nestedQueueItem);
            }
        }
    }
    return linkedContext;
}
//# sourceMappingURL=link-context.js.map