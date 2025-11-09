/**
 * Prompt file loader for workflow prompts
 */
import type { WorkflowPrompt } from './workflow-prompts.js';
import type { PromptLoadError } from './types.js';
/**
 * Directory configuration for prompt loading
 */
export interface DirectoryConfig {
    /** Path to the directory */
    path: string;
    /** Optional prefix to add to prompt names from this directory */
    prefix?: string;
}
/**
 * Loads all workflow prompts from one or more directories
 */
export declare class PromptLoader {
    private readonly directories;
    private readonly errors;
    /**
     * Create a new PromptLoader
     * @param directories - Single directory config or array of directory configs
     */
    constructor(directories: DirectoryConfig | DirectoryConfig[]);
    /**
     * Load all workflow prompts from configured directories
     * @returns Array of loaded workflow prompts
     */
    loadAll(): Promise<WorkflowPrompt[]>;
    /**
     * Load prompts from a single directory
     * @param dirConfig - Directory configuration
     * @returns Array of loaded workflow prompts from this directory
     */
    private loadFromDirectory;
    /**
     * Load and parse a single prompt file
     * @param directory - The directory containing the file
     * @param filename - The filename to load
     * @param prefix - Optional prefix to add to the prompt name
     * @returns Parsed workflow prompt or null if loading failed
     */
    private loadPromptFile;
    /**
     * Convert parsed prompt file to WorkflowPrompt format
     * @param parsed - Parsed prompt file data
     * @param prefix - Optional prefix to add to the prompt name
     * @returns WorkflowPrompt object
     */
    private convertToWorkflowPrompt;
    /**
     * Get all loading errors encountered
     * @returns Array of prompt load errors
     */
    getErrors(): readonly PromptLoadError[];
}
//# sourceMappingURL=prompt-loader.d.ts.map