/**
 * Prompt file loader for workflow prompts
 */
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import matter from 'gray-matter';
import { getGlobalLogger } from '../utils/logger.js';
import { PromptLoadErrorType } from './types.js';
import { isValidFilename, getFilenameErrorMessage, validateFrontmatter, normalizeFrontmatter } from './prompt-validator.js';
const logger = getGlobalLogger();
/**
 * Workflow prompt file extension
 */
const PROMPT_FILE_EXTENSION = '.md';
/**
 * Loads all workflow prompts from one or more directories
 */
export class PromptLoader {
    directories;
    errors = [];
    /**
     * Create a new PromptLoader
     * @param directories - Single directory config or array of directory configs
     */
    constructor(directories) {
        this.directories = Array.isArray(directories) ? directories : [directories];
    }
    /**
     * Load all workflow prompts from configured directories
     * @returns Array of loaded workflow prompts
     */
    async loadAll() {
        this.errors.length = 0; // Clear previous errors
        const allPrompts = [];
        // Process each directory
        for (const dirConfig of this.directories) {
            const prompts = await this.loadFromDirectory(dirConfig);
            allPrompts.push(...prompts);
        }
        // Log summary
        logger.info('Workflow prompts loaded from all directories', {
            loaded: allPrompts.length,
            failed: this.errors.length,
            directories: this.directories.length
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
        return allPrompts;
    }
    /**
     * Load prompts from a single directory
     * @param dirConfig - Directory configuration
     * @returns Array of loaded workflow prompts from this directory
     */
    async loadFromDirectory(dirConfig) {
        const { path: promptsDirectory, prefix } = dirConfig;
        // Check if directory exists
        try {
            await readdir(promptsDirectory);
        }
        catch (error) {
            logger.warn('Prompts directory not found', {
                directory: promptsDirectory,
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
        // Read all files in directory
        let files;
        try {
            files = await readdir(promptsDirectory);
        }
        catch (error) {
            logger.error('Failed to read prompts directory', {
                directory: promptsDirectory,
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
        // Filter for .md files
        const promptFiles = files.filter(f => f.endsWith(PROMPT_FILE_EXTENSION));
        if (promptFiles.length === 0) {
            logger.warn('No workflow prompt files found', {
                directory: promptsDirectory,
                extension: PROMPT_FILE_EXTENSION
            });
            return [];
        }
        logger.info('Loading workflow prompts from directory', {
            directory: promptsDirectory,
            fileCount: promptFiles.length,
            prefix: prefix ?? 'none'
        });
        // Load and parse each file
        const prompts = [];
        for (const file of promptFiles) {
            const prompt = await this.loadPromptFile(promptsDirectory, file, prefix);
            if (prompt != null) {
                prompts.push(prompt);
            }
        }
        return prompts;
    }
    /**
     * Load and parse a single prompt file
     * @param directory - The directory containing the file
     * @param filename - The filename to load
     * @param prefix - Optional prefix to add to the prompt name
     * @returns Parsed workflow prompt or null if loading failed
     */
    async loadPromptFile(directory, filename, prefix) {
        const filepath = join(directory, filename);
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
        let fileContents;
        try {
            fileContents = await readFile(filepath, 'utf-8');
        }
        catch (error) {
            this.errors.push({
                type: PromptLoadErrorType.FILE_READ_ERROR,
                filename,
                message: 'Failed to read file',
                details: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
        // Parse frontmatter and content
        let parsed;
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
        }
        catch (error) {
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
        // Convert to WorkflowPrompt with optional prefix
        return this.convertToWorkflowPrompt(parsed, prefix);
    }
    /**
     * Convert parsed prompt file to WorkflowPrompt format
     * @param parsed - Parsed prompt file data
     * @param prefix - Optional prefix to add to the prompt name
     * @returns WorkflowPrompt object
     */
    convertToWorkflowPrompt(parsed, prefix) {
        // Apply prefix if provided and not empty
        const name = (prefix != null && prefix !== '') ? `${prefix}${parsed.filename}` : parsed.filename;
        return {
            name,
            description: parsed.frontmatter.description ?? '',
            content: parsed.content,
            whenToUse: parsed.frontmatter.whenToUse ?? ''
        };
    }
    /**
     * Get all loading errors encountered
     * @returns Array of prompt load errors
     */
    getErrors() {
        return this.errors;
    }
}
//# sourceMappingURL=prompt-loader.js.map