/**
 * Type definitions for workflow prompt system
 */

/**
 * Frontmatter metadata from workflow .md files
 */
export interface PromptFrontmatter {
  /** Display title for the prompt (optional, defaults to filename) */
  title?: string;
  /** Brief description of what the prompt does (optional) */
  description?: string;
  /** Single-line description of when to use this prompt (optional) */
  whenToUse?: string;
}

/**
 * Parsed workflow prompt file
 */
export interface ParsedPromptFile {
  /** Frontmatter metadata */
  frontmatter: PromptFrontmatter;
  /** Markdown content (body of the file) */
  content: string;
  /** Original filename without extension */
  filename: string;
  /** Full file path */
  filepath: string;
}

/**
 * Prompt loading error types
 */
export enum PromptLoadErrorType {
  INVALID_FILENAME = 'INVALID_FILENAME',
  PARSE_ERROR = 'PARSE_ERROR',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

/**
 * Error information for prompt loading failures
 */
export interface PromptLoadError {
  type: PromptLoadErrorType;
  filename: string;
  message: string;
  details?: string;
}
