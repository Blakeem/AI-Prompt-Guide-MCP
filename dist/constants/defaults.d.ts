/**
 * Central constants and limits for the Spec-Docs MCP server
 */
export declare const DEFAULT_LIMITS: {
    /** Maximum file size in bytes (10MB) */
    readonly MAX_FILE_SIZE: number;
    /** Maximum number of files to process in a single operation */
    readonly MAX_FILES_PER_OPERATION: 100;
    /** Maximum heading depth to process */
    readonly MAX_HEADING_DEPTH: 6;
    /** Maximum length of a heading title */
    readonly MAX_HEADING_TITLE_LENGTH: 200;
    /** Maximum length of section body */
    readonly MAX_SECTION_BODY_LENGTH: number;
    /** Maximum number of headings in a single document */
    readonly MAX_HEADINGS_PER_DOCUMENT: 1000;
    /** Maximum total headings loaded across all cached documents (DoS protection) */
    readonly MAX_TOTAL_HEADINGS: 100000;
};
export declare const ERROR_CODES: {
    /** File operation errors */
    readonly PRECONDITION_FAILED: "PRECONDITION_FAILED";
    readonly FILE_NOT_FOUND: "FILE_NOT_FOUND";
    readonly FILE_TOO_LARGE: "FILE_TOO_LARGE";
    /** Markdown operation errors */
    readonly DUPLICATE_HEADING: "DUPLICATE_HEADING";
    readonly HEADING_NOT_FOUND: "HEADING_NOT_FOUND";
    readonly INVALID_HEADING_DEPTH: "INVALID_HEADING_DEPTH";
    readonly INVALID_SECTION_CONTENT: "INVALID_SECTION_CONTENT";
    /** Validation errors */
    readonly INVALID_SLUG: "INVALID_SLUG";
    readonly INVALID_TITLE: "INVALID_TITLE";
    readonly INVALID_OPERATION: "INVALID_OPERATION";
    /** Configuration errors */
    readonly CONFIG_VALIDATION_ERROR: "CONFIG_VALIDATION_ERROR";
    readonly ENVIRONMENT_ERROR: "ENVIRONMENT_ERROR";
    /** Resource exhaustion errors */
    readonly RESOURCE_EXHAUSTED: "RESOURCE_EXHAUSTED";
};
export declare const LOG_LEVELS: {
    readonly ERROR: "error";
    readonly WARN: "warn";
    readonly INFO: "info";
    readonly DEBUG: "debug";
};
export declare const HEADING_DEPTHS: readonly [1, 2, 3, 4, 5, 6];
export declare const INSERT_MODES: readonly ["insert_before", "insert_after", "append_child"];
/**
 * Default MCP server configuration values
 * These are reasonable defaults for most users and don't need to be user-configurable
 */
export declare const DEFAULT_CONFIG: {
    /** Default log level for MCP server */
    readonly LOG_LEVEL: "info";
    /** Maximum file size in bytes (10MB) - not currently enforced but defined for future use */
    readonly MAX_FILE_SIZE: number;
    /** Maximum files per operation - not currently enforced but defined for future use */
    readonly MAX_FILES_PER_OPERATION: 100;
    /** Rate limiting - not currently implemented, reasonable defaults for future use */
    readonly RATE_LIMIT_REQUESTS_PER_MINUTE: 1000;
    readonly RATE_LIMIT_BURST_SIZE: 100;
    /** Safety features - not currently implemented, defaults for future use */
    readonly ENABLE_FILE_SAFETY_CHECKS: true;
    readonly ENABLE_MTIME_PRECONDITION: true;
    /** Reference extraction depth - controls how deep to traverse document references */
    readonly REFERENCE_EXTRACTION_DEPTH: 3;
    /** Default workflows directory - relative to plugin root */
    readonly WORKFLOWS_BASE_PATH: ".ai-prompt-guide/workflows";
    /** Default guides directory - relative to plugin root */
    readonly GUIDES_BASE_PATH: ".ai-prompt-guide/guides";
    /** Default docs directory - relative to workspace */
    readonly DOCS_BASE_PATH: "docs";
    /** Default archived directory - relative to workspace */
    readonly ARCHIVED_BASE_PATH: "archived";
    /** Default coordinator directory - relative to workspace */
    readonly COORDINATOR_BASE_PATH: "coordinator";
};
//# sourceMappingURL=defaults.d.ts.map