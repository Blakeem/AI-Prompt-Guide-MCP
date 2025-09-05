/**
 * Central constants and limits for the Spec-Docs MCP server
 */

export const DEFAULT_LIMITS = {
  /** Maximum file size in bytes (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  /** Maximum number of files to process in a single operation */
  MAX_FILES_PER_OPERATION: 100,
  
  /** Maximum heading depth to process */
  MAX_HEADING_DEPTH: 6,
  
  /** Maximum length of a heading title */
  MAX_HEADING_TITLE_LENGTH: 200,
  
  /** Maximum length of section body */
  MAX_SECTION_BODY_LENGTH: 100 * 1024, // 100KB
  
  /** Maximum number of headings in a single document */
  MAX_HEADINGS_PER_DOCUMENT: 1000,
} as const;

export const DEFAULT_PATHS = {
  /** Default base path for documents */
  DOCS_BASE_PATH: './.spec-docs-mcp/docs',
  
  /** Default test documents path */
  TEST_DOCS_PATH: './.spec-docs-mcp/docs/test',
} as const;

export const ERROR_CODES = {
  /** File operation errors */
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  
  /** Markdown operation errors */
  DUPLICATE_HEADING: 'DUPLICATE_HEADING',
  HEADING_NOT_FOUND: 'HEADING_NOT_FOUND',
  INVALID_HEADING_DEPTH: 'INVALID_HEADING_DEPTH',
  INVALID_SECTION_CONTENT: 'INVALID_SECTION_CONTENT',
  
  /** Validation errors */
  INVALID_SLUG: 'INVALID_SLUG',
  INVALID_TITLE: 'INVALID_TITLE',
  INVALID_OPERATION: 'INVALID_OPERATION',
  
  /** Configuration errors */
  CONFIG_VALIDATION_ERROR: 'CONFIG_VALIDATION_ERROR',
  ENVIRONMENT_ERROR: 'ENVIRONMENT_ERROR',
} as const;

export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

export const MCP_TOOL_NAMES = {
  TEST_CONNECTION: 'test_connection',
  LIST_HEADINGS: 'list_headings',
  READ_SECTION: 'read_section',
  CREATE_SECTION: 'create_section',
  UPDATE_SECTION: 'update_section',
  RENAME_HEADING: 'rename_heading',
  DELETE_SECTION: 'delete_section',
  BUILD_TOC: 'build_toc',
} as const;

export const HEADING_DEPTHS = [1, 2, 3, 4, 5, 6] as const;

export const INSERT_MODES = ['insert_before', 'insert_after', 'append_child'] as const;