/**
 * Implementation for view_section tool
 * Provides clean section viewing without stats overhead
 */
import { ToolIntegration, DocumentNotFoundError, SectionNotFoundError, AddressingError, parseSectionAddress } from '../../shared/addressing-system.js';
import { getParentSlug } from '../../shared/utilities.js';
import { ReferenceExtractor } from '../../shared/reference-extractor.js';
/**
 * Execute view_section tool
 */
export async function viewSection(args, _state, manager) {
    // Mode Detection: Parse document parameter to detect mode
    const documentParam = ToolIntegration.validateStringParameter(args['document'], 'document');
    let mode;
    let docPath;
    let sectionSlugs;
    if (documentParam.includes('#')) {
        // Detail mode: Parse document + slug(s)
        const parts = documentParam.split('#');
        docPath = parts[0] ?? documentParam;
        const slugsPart = parts[1];
        mode = 'detail';
        if (slugsPart == null || slugsPart === '') {
            throw new AddressingError('Section slug(s) cannot be empty after #', 'EMPTY_SECTION_SLUG');
        }
        // Support comma-separated slugs: #section1,section2,section3
        sectionSlugs = slugsPart.split(',').map(s => s.trim()).filter(s => s !== '');
        if (sectionSlugs.length === 0) {
            throw new AddressingError('At least one section slug required in detail mode', 'NO_SECTION_SLUGS');
        }
        // Validate count using standardized utility
        ToolIntegration.validateCountLimit(sectionSlugs, 10, 'sections');
    }
    else {
        // Overview mode: Document only
        docPath = documentParam;
        sectionSlugs = undefined;
        mode = 'overview';
    }
    // Use addressing system for document validation
    const { addresses } = ToolIntegration.validateAndParse({
        document: docPath
    });
    // Get document
    const document = await manager.getDocument(addresses.document.path);
    if (document == null) {
        throw new DocumentNotFoundError(addresses.document.path);
    }
    // Handle Overview Mode: Return all sections with minimal data (no content)
    if (mode === 'overview') {
        // Get all sections from document headings
        const overviewSections = document.headings.map(heading => ({
            slug: heading.slug,
            title: heading.title,
            depth: heading.depth
        }));
        return {
            sections: overviewSections
        };
    }
    // Detail Mode: Process specified sections with full content
    // At this point we're in detail mode, so sectionSlugs must be defined
    if (sectionSlugs == null) {
        throw new AddressingError('Internal error: sectionSlugs undefined in detail mode', 'INTERNAL_ERROR');
    }
    const sections = sectionSlugs;
    // Parse and validate all sections using addressing system
    // Use Promise.allSettled for non-critical view operations to handle partial failures gracefully
    const sectionAddressResults = await Promise.allSettled(sections.map(sectionSlug => {
        try {
            return parseSectionAddress(sectionSlug, addresses.document.path);
        }
        catch (error) {
            if (error instanceof AddressingError) {
                throw error;
            }
            throw new AddressingError(`Invalid section reference: ${sectionSlug}`, 'INVALID_SECTION', { sectionSlug });
        }
    }));
    // Separate successful addresses from failures for graceful handling
    const sectionAddresses = [];
    const failedSections = [];
    sectionAddressResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            sectionAddresses.push(result.value);
        }
        else {
            const sectionSlug = sections[index];
            if (sectionSlug != null) {
                failedSections.push(sectionSlug);
            }
        }
    });
    // If all sections failed, throw the first error to maintain backward compatibility
    if (sectionAddresses.length === 0 && failedSections.length > 0) {
        const firstResult = sectionAddressResults[0];
        if (firstResult?.status === 'rejected') {
            throw firstResult.reason;
        }
    }
    // Validate all sections exist in document
    for (const sectionAddr of sectionAddresses) {
        const sectionExists = document.headings.some(h => h.slug === sectionAddr.slug);
        if (!sectionExists) {
            throw new SectionNotFoundError(sectionAddr.slug, addresses.document.path);
        }
    }
    // Process each section using Promise.allSettled for graceful partial failure handling
    const sectionProcessingResults = await Promise.allSettled(sectionAddresses.map(async (sectionAddr) => {
        const heading = document.headings.find(h => h.slug === sectionAddr.slug);
        if (heading == null) {
            throw new SectionNotFoundError(sectionAddr.slug, addresses.document.path);
        }
        // Get section content using the normalized slug
        const content = await manager.getSectionContent(addresses.document.path, sectionAddr.slug) ?? '';
        // Analyze section for links using unified ReferenceExtractor
        const links = [];
        const extractor = new ReferenceExtractor();
        const references = extractor.extractReferences(content);
        links.push(...references);
        // Calculate word count
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
        // Build hierarchical information using standardized ToolIntegration methods
        const parent = getParentSlug(heading.slug);
        const sectionData = {
            slug: heading.slug,
            title: heading.title,
            content,
            depth: heading.depth,
            word_count: wordCount,
            links
        };
        if (parent != null && parent !== '') {
            sectionData.parent = parent;
        }
        return sectionData;
    }));
    // Separate successful sections from failures
    const processedSections = [];
    const processingErrors = [];
    sectionProcessingResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            processedSections.push(result.value);
        }
        else {
            processingErrors.push({
                sectionSlug: sectionAddresses[index]?.slug ?? failedSections[0] ?? 'unknown',
                error: result.reason
            });
        }
    });
    // If all sections failed to process, throw the first error for backward compatibility
    if (processedSections.length === 0 && processingErrors.length > 0) {
        const firstError = processingErrors[0];
        if (firstError != null) {
            throw firstError.error;
        }
    }
    return {
        sections: processedSections
    };
}
//# sourceMappingURL=view-section.js.map