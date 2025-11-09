/**
 * Namespace pattern analysis functionality
 */
import { pathToNamespace } from './path-utilities.js';
/**
 * Analyze namespace patterns for common sections and links
 */
export async function analyzeNamespacePatterns(manager, namespace) {
    try {
        // Get all documents in the namespace
        const { documents: allDocuments } = await manager.listDocuments();
        const namespaceDocuments = allDocuments.filter(docInfo => pathToNamespace(docInfo.path) === namespace);
        const sectionCounts = new Map();
        const linkCounts = new Map();
        const taskCounts = new Map();
        // Analyze each document
        for (const docInfo of namespaceDocuments) {
            const document = await manager.getDocument(docInfo.path);
            if (document == null)
                continue;
            // Count sections
            for (const heading of document.headings) {
                const sectionName = `#${heading.slug}`;
                sectionCounts.set(sectionName, (sectionCounts.get(sectionName) ?? 0) + 1);
            }
            // For content analysis, we need to read the actual content
            const content = await manager.getSectionContent(docInfo.path, '') ?? '';
            // Extract links and tasks from content
            const links = extractLinks(content);
            const tasks = extractTasks(content);
            for (const link of links) {
                linkCounts.set(link, (linkCounts.get(link) ?? 0) + 1);
            }
            for (const task of tasks) {
                taskCounts.set(task, (taskCounts.get(task) ?? 0) + 1);
            }
        }
        // Get most common patterns (appearing in >30% of documents)
        const threshold = Math.max(1, Math.floor(namespaceDocuments.length * 0.3));
        return {
            common_sections: getTopPatterns(sectionCounts, threshold, 8),
            frequent_links: getTopPatterns(linkCounts, threshold, 5),
            typical_tasks: getTopPatterns(taskCounts, threshold, 6)
        };
    }
    catch (error) {
        console.warn('Error analyzing namespace patterns:', error);
        return {
            common_sections: [],
            frequent_links: [],
            typical_tasks: []
        };
    }
}
/**
 * Extract links from markdown content
 */
function extractLinks(content) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    match = linkRegex.exec(content);
    while (match !== null) {
        const url = match[2];
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        if (url != null && url.startsWith('/')) { // Internal links only
            links.push(url);
        }
        match = linkRegex.exec(content);
    }
    return links;
}
/**
 * Extract tasks from markdown content
 */
function extractTasks(content) {
    const taskRegex = /- \[ \] (.+)/g;
    const tasks = [];
    let match;
    match = taskRegex.exec(content);
    while (match !== null) {
        const task = match[1];
        if (task != null) {
            tasks.push(task);
        }
        match = taskRegex.exec(content);
    }
    return tasks;
}
/**
 * Get top patterns from count map
 */
function getTopPatterns(countMap, threshold, limit) {
    return Array.from(countMap.entries())
        .filter(([, count]) => count >= threshold)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([pattern]) => pattern);
}
//# sourceMappingURL=namespace-analysis.js.map