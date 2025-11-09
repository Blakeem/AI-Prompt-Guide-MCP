/**
 * Validation processor for create-document pipeline
 * Handles Stage 0 (Discovery) and Stage 1 (Instructions) validation
 */
import { getDocumentNamespaces } from '../schemas/create-document-schemas.js';
// NAMESPACE_INSTRUCTIONS removed - no longer using hardcoded templates
/**
 * Process Stage 0: Discovery - Return available namespaces
 */
export function processDiscovery() {
    return {
        stage: 'discovery',
        namespaces: getDocumentNamespaces(),
        next_step: "Call again with 'namespace', 'title', and 'overview' to create a blank document",
        example: { namespace: "specs" }
    };
}
// processInstructions removed - Stage 1 no longer exists (direct creation)
/**
 * Validate and normalize namespace for creation stage
 * Strips leading slashes to ensure relative paths
 */
export function validateNamespaceForCreation(namespace) {
    // Normalize: remove leading slashes (namespace should be relative)
    const normalized = namespace.replace(/^\/+/, '');
    // Use the normalized namespace for validation
    return validateCustomNamespacePath(normalized);
}
/**
 * Normalize namespace by removing leading slashes
 * Used by template-processor.ts for path construction
 */
// ts-unused-exports:disable-next-line
export function normalizeNamespace(namespace) {
    // Strip both leading and trailing slashes
    return namespace.replace(/^\/+/, '').replace(/\/+$/, '');
}
// Helper functions removed - no longer generating examples for instructions stage
/**
 * Validate custom namespace path for security and structure
 */
function validateCustomNamespacePath(namespace) {
    // Check for empty namespace
    if (namespace.trim() === '') {
        return {
            stage: 'error_fallback',
            error: 'Empty namespace not allowed',
            help: 'Please provide a valid namespace. Use predefined namespaces or create custom ones like "myproject/docs"',
            namespaces: getDocumentNamespaces(),
            next_step: "Call again with a valid 'namespace' parameter",
            example: { namespace: "custom/my-namespace" }
        };
    }
    // Check for path traversal attempts
    if (namespace.includes('..') || namespace.includes('\\')) {
        return {
            stage: 'error_fallback',
            error: 'Invalid namespace path',
            provided_namespace: namespace,
            help: 'Namespace cannot contain ".." or "\\" characters for security reasons',
            namespaces: getDocumentNamespaces(),
            next_step: "Call again with a safe namespace path",
            example: { namespace: "custom/safe-namespace" }
        };
    }
    // Check for Windows drive letters (colons in paths)
    // Note: Leading / is allowed - addressing system normalizes paths
    if (namespace.includes(':')) {
        return {
            stage: 'error_fallback',
            error: 'Windows drive letters not allowed in namespace',
            provided_namespace: namespace,
            help: 'Use relative namespace paths only, such as "custom/my-namespace"',
            namespaces: getDocumentNamespaces(),
            next_step: "Call again with a relative namespace path",
            example: { namespace: "custom/my-namespace" }
        };
    }
    // Check for invalid characters
    const invalidChars = /[<>"|*?:]/;
    if (invalidChars.test(namespace)) {
        return {
            stage: 'error_fallback',
            error: 'Invalid characters in namespace',
            provided_namespace: namespace,
            help: 'Namespace can only contain letters, numbers, hyphens, underscores, and forward slashes',
            namespaces: getDocumentNamespaces(),
            next_step: "Call again with a valid namespace using only allowed characters",
            example: { namespace: "custom/my-namespace" }
        };
    }
    // Validate length and structure
    if (namespace.length > 100) {
        return {
            stage: 'error_fallback',
            error: 'Namespace too long',
            provided_namespace: namespace,
            help: 'Namespace must be 100 characters or less',
            namespaces: getDocumentNamespaces(),
            next_step: "Call again with a shorter namespace",
            example: { namespace: "custom/shorter-name" }
        };
    }
    // No validation errors
    return null;
}
//# sourceMappingURL=validation-processor.js.map