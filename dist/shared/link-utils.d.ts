/**
 * Link parsing and resolution utilities for the Document Linking System
 */
import type { ParsedLink, LinkValidation, LinkResolution, LinkOptions } from '../types/linking.js';
import type { DocumentManager } from '../document-manager.js';
/**
 * Parse a link reference into structured components
 *
 * Handles formats:
 * - Cross-document: @/path/doc.md#section
 * - Within-document: @#section
 * - External: https://example.com (no @ prefix)
 */
export declare function parseLink(linkText: string, currentDocPath?: string): ParsedLink;
/**
 * Resolve a parsed link to an absolute path
 *
 * Converts relative links to absolute paths and resolves within-doc references
 */
export declare function resolveLink(link: ParsedLink, currentDocPath: string): string;
/**
 * Validate that a link target exists and is accessible
 */
export declare function validateLink(linkPath: string, manager: DocumentManager): Promise<LinkValidation>;
/**
 * Simple boolean check for link validity (convenience wrapper)
 */
export declare function linkExists(linkPath: string, manager: DocumentManager): Promise<boolean>;
/**
 * Resolve a link with full validation and context loading
 */
export declare function resolveLinkWithContext(linkText: string, currentDocPath: string, manager: DocumentManager, options?: LinkOptions): Promise<LinkResolution>;
//# sourceMappingURL=link-utils.d.ts.map