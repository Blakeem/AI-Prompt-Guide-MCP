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
export declare const FOLDER_NAMES: {
    /** Main docs folder: .ai-prompt-guide/docs */
    readonly DOCS: "docs";
    /** Coordinator tasks folder: .ai-prompt-guide/coordinator */
    readonly COORDINATOR: "coordinator";
    /** Archive root folder: .ai-prompt-guide/archived */
    readonly ARCHIVED: "archived";
};
/**
 * Logical path prefixes for INTERNAL file operations
 *
 * These are used for file I/O operations within the system.
 * User-facing responses should use relative paths via toUserPath().
 */
export declare const PATH_PREFIXES: {
    /** Docs namespace: /docs/ (internal) */
    readonly DOCS: "/docs/";
    /** Coordinator namespace: /coordinator/ (internal) */
    readonly COORDINATOR: "/coordinator/";
    /** Archive namespace: /archived/ (kept explicit per requirements) */
    readonly ARCHIVED: "/archived/";
};
/**
 * Full archive path prefixes (combining archived + subfolder)
 */
export declare const ARCHIVE_PREFIXES: {
    /** Archived docs: /archived/docs/ */
    readonly DOCS: "/archived/docs/";
    /** Archived coordinator: /archived/coordinator/ */
    readonly COORDINATOR: "/archived/coordinator/";
};
/**
 * Check if a logical path is in the coordinator namespace
 */
export declare function isCoordinatorPath(logicalPath: string): boolean;
/**
 * Check if a logical path is in the docs namespace
 * NOTE: With relative paths, docs are anything NOT in coordinator or archived/coordinator
 */
export declare function isDocsPath(logicalPath: string): boolean;
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
export declare function toUserPath(internalPath: string): string;
//# sourceMappingURL=namespace-constants.d.ts.map