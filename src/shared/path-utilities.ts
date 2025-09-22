/**
 * Path manipulation utilities
 */

/**
 * Convert a file system path to a namespace
 */
export function pathToNamespace(docPath: string): string {
  // Convert document path to namespace (e.g., "/api/specs/auth.md" → "api/specs")
  const parts = docPath.split('/').filter(part => part !== '' && part !== '.');
  if (parts.length === 0) {
    return '';
  }

  // Remove .md extension from the last part if it's a file
  const lastPart = parts[parts.length - 1];
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  if (lastPart != null && lastPart.endsWith('.md')) {
    parts.pop(); // Remove the file part to get folder namespace
  }

  return parts.join('/');
}

/**
 * Convert a document path to a slug
 * Enhanced to support hierarchical path-to-slug conversion
 */
export function pathToSlug(docPath: string): string {
  const parts = docPath.split('/').filter(part => part !== '' && part !== '.');
  if (parts.length === 0) {
    return '';
  }

  const fileName = parts[parts.length - 1];
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  if (fileName != null && fileName.endsWith('.md')) {
    return fileName.slice(0, -3); // Remove .md extension
  }

  return fileName ?? '';
}