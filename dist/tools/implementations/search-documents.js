/**
 * Implementation for the search_documents tool
 * Full-text and regex search across all documents with structured results
 */
import { AddressingError, ToolIntegration, isTaskSection } from '../../shared/addressing-system.js';
import { pathToNamespace } from '../../shared/utilities.js';
import { SEARCH_DOCUMENTS_CONSTANTS } from '../schemas/search-documents-schemas.js';
/**
 * Validates a numeric parameter with range constraints
 */
function validateNumericParameter(value, paramName, min, max, defaultValue) {
    if (value == null)
        return defaultValue;
    const num = Number(value);
    if (!Number.isFinite(num)) {
        throw new AddressingError(`${paramName} must be a finite number`, 'INVALID_PARAMETER', { value, paramName });
    }
    if (num < min || num > max) {
        throw new AddressingError(`${paramName} must be between ${min} and ${max}`, 'INVALID_PARAMETER', { value: num, min, max, paramName });
    }
    return Math.floor(num);
}
/**
 * Truncate match text to specified length with ellipsis
 */
function truncateMatch(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.substring(0, maxLength - 3)}...`;
}
/**
 * Extract context lines around a match
 */
function extractContext(lines, matchLineIndex, contextLines) {
    const startIndex = Math.max(0, matchLineIndex - contextLines);
    const endIndex = Math.min(lines.length - 1, matchLineIndex + contextLines);
    return {
        before: lines.slice(startIndex, matchLineIndex).join('\n'),
        after: lines.slice(matchLineIndex + 1, endIndex + 1).join('\n')
    };
}
/**
 * Find current section for a line index
 */
function getCurrentSection(lines, lineIndex) {
    // Walk backwards to find the most recent heading
    for (let i = lineIndex; i >= 0; i--) {
        const line = lines[i];
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        if (line != null && line.trim().startsWith('#')) {
            // Extract slug from heading
            const title = line.replace(/^#+\s*/, '').trim();
            return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }
    }
    return 'document-root';
}
/**
 * Perform full-text search
 */
function performFullTextSearch(content, query) {
    return content.toLowerCase().includes(query.toLowerCase());
}
/**
 * Perform regex search
 */
function performRegexSearch(content, pattern) {
    try {
        const regex = new RegExp(pattern, 'gim');
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match);
        }
        return matches.length > 0 ? matches : null;
    }
    catch {
        return null;
    }
}
/**
 * Search documents implementation
 */
export async function searchDocuments(args, _state, manager) {
    // Extract and validate parameters
    const query = args['query'];
    if (query == null || query.trim() === '') {
        throw new AddressingError('query parameter is required and cannot be empty', 'MISSING_PARAMETER', { parameter: 'query' });
    }
    const scope = args['scope'] ?? null;
    const searchType = args['type'] ?? 'fulltext';
    const verbose = args['verbose'] ?? false;
    const contextLines = validateNumericParameter(args['context_lines'], 'context_lines', SEARCH_DOCUMENTS_CONSTANTS.CONTEXT_LINES.MIN, SEARCH_DOCUMENTS_CONSTANTS.CONTEXT_LINES.MAX, SEARCH_DOCUMENTS_CONSTANTS.CONTEXT_LINES.DEFAULT);
    const maxResults = validateNumericParameter(args['max_results'], 'max_results', SEARCH_DOCUMENTS_CONSTANTS.MAX_RESULTS.MIN, SEARCH_DOCUMENTS_CONSTANTS.MAX_RESULTS.MAX, SEARCH_DOCUMENTS_CONSTANTS.MAX_RESULTS.DEFAULT);
    const maxMatchLength = validateNumericParameter(args['max_match_length'], 'max_match_length', SEARCH_DOCUMENTS_CONSTANTS.MAX_MATCH_LENGTH.MIN, SEARCH_DOCUMENTS_CONSTANTS.MAX_MATCH_LENGTH.MAX, SEARCH_DOCUMENTS_CONSTANTS.MAX_MATCH_LENGTH.DEFAULT);
    // Validate search type
    if (searchType !== 'fulltext' && searchType !== 'regex') {
        throw new AddressingError('type must be either "fulltext" or "regex"', 'INVALID_PARAMETER', { value: searchType, parameter: 'type' });
    }
    // Validate regex pattern if regex search
    if (searchType === 'regex') {
        try {
            new RegExp(query);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new AddressingError(`Invalid regex pattern: ${errorMessage}`, 'INVALID_REGEX', { query, error: errorMessage });
        }
    }
    // Validate scope path if provided
    if (scope != null && scope !== '' && !scope.startsWith('/')) {
        throw new AddressingError('scope must start with /', 'INVALID_SCOPE', { scope });
    }
    // Get all documents
    const { documents: allDocuments } = await manager.listDocuments();
    // Apply scope filter if provided
    const documentsToSearch = (scope != null && scope !== '')
        ? allDocuments.filter(doc => {
            const docNamespace = pathToNamespace(doc.path);
            return doc.path.startsWith(scope) || docNamespace.startsWith(scope.substring(1));
        })
        : allDocuments;
    // Search through documents
    const results = [];
    let totalMatches = 0;
    let truncated = false;
    for (const docInfo of documentsToSearch) {
        try {
            const content = await manager.getDocumentContent(docInfo.path);
            if (content == null)
                continue;
            const document = await manager.getDocument(docInfo.path);
            if (document == null)
                continue;
            const lines = content.split('\n');
            // Check if document matches query
            let documentMatches = false;
            let regexMatches = null;
            if (searchType === 'fulltext') {
                documentMatches = performFullTextSearch(content, query);
            }
            else {
                regexMatches = performRegexSearch(content, query);
                documentMatches = regexMatches !== null;
            }
            if (!documentMatches)
                continue;
            // Extract matches with context
            const matches = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line == null)
                    continue;
                let lineMatches = false;
                let matchText = '';
                if (searchType === 'fulltext') {
                    lineMatches = line.toLowerCase().includes(query.toLowerCase());
                    if (lineMatches) {
                        // Use full line, will be truncated later
                        matchText = line.trim();
                    }
                }
                else {
                    try {
                        const regex = new RegExp(query, 'i');
                        const match = line.match(regex);
                        if (match != null) {
                            lineMatches = true;
                            matchText = line.trim();
                        }
                    }
                    catch {
                        // Invalid regex for this line, skip
                    }
                }
                if (lineMatches) {
                    const currentSection = getCurrentSection(lines, i);
                    const matchData = {
                        section: `#${currentSection}`,
                        line_number: i + 1,
                        match_text: truncateMatch(matchText, maxMatchLength),
                        type: 'section' // Will be updated after checking task status
                    };
                    if (verbose && contextLines > 0) {
                        const context = extractContext(lines, i, contextLines);
                        if (context.before !== '') {
                            matchData.context_before = context.before;
                        }
                        if (context.after !== '') {
                            matchData.context_after = context.after;
                        }
                    }
                    matches.push(matchData);
                    totalMatches++;
                    // Check if we've hit max results
                    if (totalMatches >= maxResults) {
                        truncated = true;
                        break;
                    }
                }
            }
            if (matches.length > 0) {
                // Update match types by checking each section with structural analysis
                for (const match of matches) {
                    const sectionSlug = match.section.replace(/^#/, '');
                    const isTask = await isTaskSection(sectionSlug, document);
                    match.type = isTask ? 'task' : 'section';
                }
                // Get document address for consistent formatting
                const { addresses } = ToolIntegration.validateAndParse({
                    document: docInfo.path
                });
                const docInfo_formatted = ToolIntegration.formatDocumentInfo(addresses.document, {
                    title: document.metadata.title
                });
                results.push({
                    document: {
                        path: addresses.document.path,
                        slug: addresses.document.slug,
                        namespace: addresses.document.namespace,
                        ...docInfo_formatted
                    },
                    matches,
                    match_count: matches.length
                });
            }
            if (truncated)
                break;
        }
        catch {
            // Skip documents that fail to load
            continue;
        }
    }
    return {
        query,
        search_type: searchType,
        scope,
        results,
        total_matches: totalMatches,
        total_documents: results.length,
        truncated
    };
}
//# sourceMappingURL=search-documents.js.map