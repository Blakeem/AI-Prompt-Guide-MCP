/**
 * File creator for create-document pipeline
 * Handles Stage 1 (Creation) file system operations and finalization
 */
import { parseDocumentAddress, AddressingError } from '../../shared/addressing-system.js';
/**
 * Create document with structured content
 */
export async function createDocumentFile(namespace, title, overview, manager, content, docPath, slug) {
    try {
        // Validate the document path using addressing system
        try {
            parseDocumentAddress(docPath);
        }
        catch (error) {
            if (error instanceof AddressingError) {
                return {
                    error: 'Invalid document path for creation',
                    details: error.message,
                    provided_parameters: {
                        namespace,
                        title,
                        overview
                    }
                };
            }
            throw error; // Re-throw non-addressing errors
        }
        // Create the document with basic structure first
        await manager.createDocument(docPath, {
            title,
            template: 'blank', // We're providing our own structure
            features: {
                toc: false, // No TOC - user can add manually if needed
                anchors: true,
                codeHighlight: true,
                mermaid: true,
                searchIndex: true
            }
        });
        // Write the structured content to the file
        await writeDocumentContent(manager, docPath, content);
        // Refresh the cache to get the updated document
        await refreshDocumentCache(manager, docPath);
        // Return simplified response with minimal next-step guidance
        return {
            success: true,
            document: docPath,
            slug,
            next_step: 'Use section tool with append_child on the slug to add first section'
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            error: 'Failed to create document',
            details: message,
            provided_parameters: {
                namespace,
                title,
                overview
            }
        };
    }
}
/**
 * Write content to document file
 */
async function writeDocumentContent(manager, docPath, content) {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    // Get the docs root from the manager (supports testing with custom paths)
    const docsRoot = manager.docsRoot;
    const fullPath = path.join(docsRoot, docPath);
    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    await fs.mkdir(parentDir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
}
/**
 * Refresh document cache after creation
 */
async function refreshDocumentCache(manager, docPath) {
    manager.cache.invalidateDocument(docPath);
}
/**
 * Validate document creation prerequisites
 */
export async function validateCreationPrerequisites(namespace, title, overview, _manager) {
    // Basic input validation
    if (namespace.trim() === '') {
        return 'Namespace cannot be empty';
    }
    if (title.trim() === '') {
        return 'Title cannot be empty';
    }
    if (overview.trim() === '') {
        return 'Overview cannot be empty';
    }
    // Manager is already validated at the pipeline level
    return null; // No validation errors
}
//# sourceMappingURL=file-creator.js.map