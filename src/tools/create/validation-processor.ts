/**
 * Validation processor for create-document pipeline
 * Handles Stage 0 (Discovery) and Stage 1 (Instructions) validation
 */

import {
  getDocumentNamespaces
} from '../schemas/create-document-schemas.js';

/**
 * Stage 0: Discovery validation result
 */
export interface DiscoveryResult {
  stage: 'discovery';
  namespaces: ReturnType<typeof getDocumentNamespaces>;
  next_step: string;
  example: { namespace: string };
}

/**
 * Stage 1: Instructions validation result (removed - direct creation now)
 */

/**
 * Error fallback result for validation issues
 */
export interface ValidationErrorResult {
  stage: 'error_fallback';
  error: string;
  provided_namespace?: string;
  valid_namespaces?: string[];
  help: string;
  namespaces?: ReturnType<typeof getDocumentNamespaces>;
  next_step: string;
  example: Record<string, unknown>;
}

export type ValidationResult = DiscoveryResult | ValidationErrorResult;

// NAMESPACE_INSTRUCTIONS removed - no longer using hardcoded templates

/**
 * Process Stage 0: Discovery - Return available namespaces
 */
export function processDiscovery(): DiscoveryResult {
  return {
    stage: 'discovery',
    namespaces: getDocumentNamespaces(),
    next_step: "Call again with 'namespace', 'title', and 'overview' to create a blank document",
    example: { namespace: "specs" }
  };
}

// processInstructions removed - Stage 1 no longer exists (direct creation)

/**
 * Validate namespace for creation stage
 */
export function validateNamespaceForCreation(namespace: string): ValidationErrorResult | null {
  // Use the same path validation as stage 1
  return validateCustomNamespacePath(namespace);
}


// Helper functions removed - no longer generating examples for instructions stage

/**
 * Validate custom namespace path for security and structure
 */
function validateCustomNamespacePath(namespace: string): ValidationErrorResult | null {
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

  // Check for absolute paths
  if (namespace.startsWith('/') || namespace.includes(':')) {
    return {
      stage: 'error_fallback',
      error: 'Absolute paths not allowed in namespace',
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