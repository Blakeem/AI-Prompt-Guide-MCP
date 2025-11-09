/**
 * Workflow prompts for autonomous agents
 *
 * These prompts provide structured decision-making and problem-solving
 * frameworks for agents working on documentation, tasks, and development.
 *
 * Prompts are loaded dynamically from .md files in the workflows directory.
 */
import { loadConfig, getWorkflowsPath, getGuidesPath } from '../config.js';
import { PromptLoader } from './prompt-loader.js';
/**
 * Cache for loaded prompts (loaded once at startup)
 */
let cachedPrompts = null;
/**
 * Load workflow prompts from filesystem
 * Loads from both workflows/ and guides/ directories with appropriate prefixes
 * @returns Promise resolving to array of workflow prompts
 */
export async function loadWorkflowPrompts() {
    if (cachedPrompts != null) {
        return cachedPrompts;
    }
    const config = loadConfig();
    const workflowsDirectory = getWorkflowsPath(config.workflowsBasePath);
    const guidesDirectory = getGuidesPath(config.guidesBasePath);
    const loader = new PromptLoader([
        { path: workflowsDirectory, prefix: 'workflow_' },
        { path: guidesDirectory, prefix: 'guide_' }
    ]);
    cachedPrompts = await loader.loadAll();
    return cachedPrompts;
}
/**
 * Get all workflow prompts (synchronous, requires prompts to be loaded first)
 * @returns Array of workflow prompts
 * @throws Error if prompts have not been loaded yet
 */
export function getWorkflowPrompts() {
    if (cachedPrompts == null) {
        throw new Error('Workflow prompts have not been loaded yet. Call loadWorkflowPrompts() first.');
    }
    return cachedPrompts;
}
/**
 * Get prompt by name
 */
export function getWorkflowPrompt(name) {
    const prompts = getWorkflowPrompts();
    return prompts.find(p => p.name === name);
}
/**
 * Search prompts by situation/context
 */
export function findPromptsForSituation(situation) {
    const searchTerms = situation.toLowerCase();
    const prompts = getWorkflowPrompts();
    return prompts.filter(p => p.whenToUse.toLowerCase().includes(searchTerms) ||
        p.description.toLowerCase().includes(searchTerms));
}
//# sourceMappingURL=workflow-prompts.js.map