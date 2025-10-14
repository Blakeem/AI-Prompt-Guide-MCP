/**
 * Namespace constants for document and coordinator separation
 *
 * All paths in the system use EXPLICIT folder prefixes:
 * - Regular docs: /docs/api/auth.md → .ai-prompt-guide/docs/api/auth.md
 * - Coordinator: /coordinator/active.md → .ai-prompt-guide/coordinator/active.md
 * - Archives: /archived/docs/... or /archived/coordinator/...
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
 * Logical path prefixes (explicit in all paths)
 *
 * All paths MUST start with one of these prefixes for deterministic resolution.
 */
export const PATH_PREFIXES = {
  /** Docs namespace: /docs/ */
  DOCS: `/${FOLDER_NAMES.DOCS}/`,

  /** Coordinator namespace: /coordinator/ */
  COORDINATOR: `/${FOLDER_NAMES.COORDINATOR}/`,

  /** Archive namespace: /archived/ */
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
 */
export function isDocsPath(logicalPath: string): boolean {
  return logicalPath.startsWith(PATH_PREFIXES.DOCS);
}
