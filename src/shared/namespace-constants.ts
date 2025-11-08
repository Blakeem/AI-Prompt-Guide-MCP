/**
 * Namespace constants for document and coordinator separation
 *
 * IMPORTANT: PATH_PREFIXES are for INTERNAL file operations only.
 * User-facing paths should be RELATIVE to their base folders:
 * - Regular docs: /api/auth.md (relative to docs/) → .ai-prompt-guide/docs/api/auth.md
 * - Coordinator: /active.md (relative to coordinator/) → .ai-prompt-guide/coordinator/active.md
 * - Archives: /archived/docs/... or /archived/coordinator/... (explicit prefix per requirements)
 *
 * This provides deterministic, clear path resolution with no implicit behavior.
 */

/**
 * Physical folder names (used in .ai-prompt-guide directory structure)
 *
 * Use these constants instead of hardcoded strings to allow easy renaming.
 */
export const FOLDER_NAMES = {
  /** Main docs folder: .ai-prompt-guide/docs */
  DOCS: 'docs',

  /** Coordinator tasks folder: .ai-prompt-guide/coordinator */
  COORDINATOR: 'coordinator',

  /** Archive root folder: .ai-prompt-guide/archived */
  ARCHIVED: 'archived'
} as const;

/**
 * Logical path prefixes for INTERNAL file operations
 *
 * These are used for file I/O operations within the system.
 * User-facing responses should use relative paths via toUserPath().
 */
export const PATH_PREFIXES = {
  /** Docs namespace: /docs/ (internal) */
  DOCS: `/${FOLDER_NAMES.DOCS}/`,

  /** Coordinator namespace: /coordinator/ (internal) */
  COORDINATOR: `/${FOLDER_NAMES.COORDINATOR}/`,

  /** Archive namespace: /archived/ (kept explicit per requirements) */
  ARCHIVED: `/${FOLDER_NAMES.ARCHIVED}/`
} as const;

/**
 * Full archive path prefixes (combining archived + subfolder)
 */
export const ARCHIVE_PREFIXES = {
  /** Archived docs: /archived/docs/ */
  DOCS: `${PATH_PREFIXES.ARCHIVED}${FOLDER_NAMES.DOCS}/`,

  /** Archived coordinator: /archived/coordinator/ */
  COORDINATOR: `${PATH_PREFIXES.ARCHIVED}${FOLDER_NAMES.COORDINATOR}/`
} as const;

/**
 * Check if a logical path is in the coordinator namespace
 */
export function isCoordinatorPath(logicalPath: string): boolean {
  return logicalPath.startsWith(PATH_PREFIXES.COORDINATOR);
}

/**
 * Check if a logical path is in the docs namespace
 * NOTE: With relative paths, docs are anything NOT in coordinator or archived/coordinator
 */
export function isDocsPath(logicalPath: string): boolean {
  // Coordinator paths are NOT docs paths
  if (logicalPath.startsWith(PATH_PREFIXES.COORDINATOR)) {
    return false;
  }
  // Archived coordinator paths are NOT docs paths
  if (logicalPath.startsWith(ARCHIVE_PREFIXES.COORDINATOR)) {
    return false;
  }
  // Everything else is docs (including regular paths and archived/docs/)
  return true;
}

/**
 * Convert internal path to user-facing path
 *
 * Removes namespace prefixes for user responses:
 * - /coordinator/active.md → /active.md
 * - /docs/api/auth.md → /api/auth.md (future)
 * - /archived/... → /archived/... (kept explicit per requirements)
 *
 * @param internalPath - Path with namespace prefix
 * @returns User-facing relative path
 */
export function toUserPath(internalPath: string): string {
  // Archives keep explicit prefix
  if (internalPath.startsWith(PATH_PREFIXES.ARCHIVED)) {
    return internalPath;
  }

  // Strip coordinator prefix
  if (internalPath.startsWith(PATH_PREFIXES.COORDINATOR)) {
    return internalPath.replace(PATH_PREFIXES.COORDINATOR, '/');
  }

  // Strip docs prefix (future-proofing)
  if (internalPath.startsWith(PATH_PREFIXES.DOCS)) {
    return internalPath.replace(PATH_PREFIXES.DOCS, '/');
  }

  // Return as-is if no known prefix
  return internalPath;
}
