/**
 * Document manager factory with dependency injection support
 *
 * This factory provides clean dependency injection while maintaining
 * backward compatibility with the old singleton pattern.
 */
import type { DocumentManager } from '../document-manager.js';
/**
 * Create a new DocumentManager instance with proper dependency injection
 *
 * @param docsRoot - Optional custom docs root path (for testing)
 * @returns A new DocumentManager instance
 *
 * @example
 * // Production usage
 * const manager = createDocumentManager();
 *
 * @example
 * // Testing with custom path
 * const manager = createDocumentManager('/tmp/test-docs');
 */
export declare function createDocumentManager(docsRoot?: string): DocumentManager;
/**
 * Get or create the default DocumentManager instance (singleton pattern)
 *
 * @deprecated Use createDocumentManager() and dependency injection instead
 * This function maintains backward compatibility but should not be used in new code.
 *
 * @returns The singleton DocumentManager instance
 */
export declare function getDocumentManager(): Promise<DocumentManager>;
//# sourceMappingURL=document-manager-factory.d.ts.map