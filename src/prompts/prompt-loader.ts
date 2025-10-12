/**
 * Prompt file loader for workflow prompts
 */

import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import matter from 'gray-matter';
import { getGlobalLogger } from '../utils/logger.js';
import type { WorkflowPrompt } from './workflow-prompts.js';
import type { ParsedPromptFile, PromptLoadError } from './types.js';
import { PromptLoadErrorType } from './types.js';
import {
  isValidFilename,
  getFilenameErrorMessage,
  validateFrontmatter,
  normalizeFrontmatter
} from './prompt-validator.js';

const logger = getGlobalLogger();

/**
 * Workflow prompt file extension
 */
const PROMPT_FILE_EXTENSION = '.md';

/**
 * Loads all workflow prompts from a directory
 */
export class PromptLoader {
  private readonly promptsDirectory: string;
  private readonly errors: PromptLoadError[] = [];

  constructor(promptsDirectory: string) {
    this.promptsDirectory = promptsDirectory;
  }

  /**
   * Load all workflow prompts from the prompts directory
   * @returns Array of loaded workflow prompts
   */
  async loadAll(): Promise<WorkflowPrompt[]> {
    this.errors.length = 0; // Clear previous errors

    // Check if directory exists
    try {
      await readdir(this.promptsDirectory);
    } catch (error) {
      logger.warn('Prompts directory not found', {
        directory: this.promptsDirectory,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }

    // Read all files in directory
    let files: string[];
    try {
      files = await readdir(this.promptsDirectory);
    } catch (error) {
      logger.error('Failed to read prompts directory', {
        directory: this.promptsDirectory,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }

    // Filter for .wfp.md files
    const promptFiles = files.filter(f => f.endsWith(PROMPT_FILE_EXTENSION));

    if (promptFiles.length === 0) {
      logger.warn('No workflow prompt files found', {
        directory: this.promptsDirectory,
        extension: PROMPT_FILE_EXTENSION
      });
      return [];
    }

    logger.info('Loading workflow prompts', {
      directory: this.promptsDirectory,
      fileCount: promptFiles.length
    });

    // Load and parse each file
    const prompts: WorkflowPrompt[] = [];
    for (const file of promptFiles) {
      const prompt = await this.loadPromptFile(file);
      if (prompt != null) {
        prompts.push(prompt);
      }
    }

    // Log summary
    logger.info('Workflow prompts loaded', {
      loaded: prompts.length,
      failed: this.errors.length,
      total: promptFiles.length
    });

    // Log errors if any
    if (this.errors.length > 0) {
      for (const error of this.errors) {
        logger.warn('Failed to load prompt file', {
          filename: error.filename,
          type: error.type,
          message: error.message,
          ...(error.details != null && { details: error.details })
        });
      }
    }

    return prompts;
  }

  /**
   * Load and parse a single prompt file
   * @param filename - The filename to load
   * @returns Parsed workflow prompt or null if loading failed
   */
  private async loadPromptFile(filename: string): Promise<WorkflowPrompt | null> {
    const filepath = join(this.promptsDirectory, filename);
    const nameWithoutExt = basename(filename, PROMPT_FILE_EXTENSION);

    // Validate filename format
    if (!isValidFilename(nameWithoutExt)) {
      this.errors.push({
        type: PromptLoadErrorType.INVALID_FILENAME,
        filename,
        message: getFilenameErrorMessage(nameWithoutExt)
      });
      return null;
    }

    // Read file contents
    let fileContents: string;
    try {
      fileContents = await readFile(filepath, 'utf-8');
    } catch (error) {
      this.errors.push({
        type: PromptLoadErrorType.FILE_READ_ERROR,
        filename,
        message: 'Failed to read file',
        details: error instanceof Error ? error.message : String(error)
      });
      return null;
    }

    // Parse frontmatter and content
    let parsed: ParsedPromptFile;
    try {
      const { data, content } = matter(fileContents);

      // Validate frontmatter
      const validationErrors = validateFrontmatter(data);
      if (validationErrors.length > 0) {
        this.errors.push({
          type: PromptLoadErrorType.VALIDATION_ERROR,
          filename,
          message: 'Invalid frontmatter',
          details: validationErrors.join('; ')
        });
        return null;
      }

      // Normalize frontmatter with defaults
      const frontmatter = normalizeFrontmatter(data, nameWithoutExt);

      parsed = {
        frontmatter,
        content: content.trim(),
        filename: nameWithoutExt,
        filepath
      };
    } catch (error) {
      this.errors.push({
        type: PromptLoadErrorType.PARSE_ERROR,
        filename,
        message: 'Failed to parse file',
        details: error instanceof Error ? error.message : String(error)
      });
      return null;
    }

    // Validate content is not empty
    if (parsed.content === '') {
      this.errors.push({
        type: PromptLoadErrorType.VALIDATION_ERROR,
        filename,
        message: 'Prompt content cannot be empty'
      });
      return null;
    }

    // Convert to WorkflowPrompt
    return this.convertToWorkflowPrompt(parsed);
  }

  /**
   * Convert parsed prompt file to WorkflowPrompt format
   * @param parsed - Parsed prompt file data
   * @returns WorkflowPrompt object
   */
  private convertToWorkflowPrompt(parsed: ParsedPromptFile): WorkflowPrompt {
    return {
      name: parsed.filename,
      description: parsed.frontmatter.description ?? '',
      content: parsed.content,
      tags: parsed.frontmatter.tags ?? [],
      whenToUse: parsed.frontmatter.whenToUse ?? []
    };
  }

  /**
   * Get all loading errors encountered
   * @returns Array of prompt load errors
   */
  getErrors(): readonly PromptLoadError[] {
    return this.errors;
  }
}
