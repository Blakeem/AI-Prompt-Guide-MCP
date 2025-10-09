/**
 * Workflow prompts for autonomous agents
 *
 * These prompts provide structured decision-making and problem-solving
 * frameworks for agents working on documentation, tasks, and development.
 *
 * Prompts are loaded dynamically from .wfp.md files in the prompts directory.
 */

import { join } from 'path';
import { loadConfig } from '../config.js';
import { PromptLoader } from './prompt-loader.js';

/**
 * Prompt definition interface
 */
export interface WorkflowPrompt {
  /** Unique identifier for the prompt */
  name: string;
  /** Short, attention-grabbing description */
  description: string;
  /** Full prompt content with instructions */
  content: string;
  /** Keywords for discoverability */
  tags: string[];
  /** When agents should consider using this prompt */
  whenToUse: string[];
}

/**
 * Cache for loaded prompts (loaded once at startup)
 */
let cachedPrompts: WorkflowPrompt[] | null = null;

/**
 * Load workflow prompts from filesystem
 * @returns Promise resolving to array of workflow prompts
 */
export async function loadWorkflowPrompts(): Promise<WorkflowPrompt[]> {
  if (cachedPrompts != null) {
    return cachedPrompts;
  }

  const config = loadConfig();
  const promptsDirectory = join(config.docsBasePath, '../prompts');

  const loader = new PromptLoader(promptsDirectory);
  cachedPrompts = await loader.loadAll();

  return cachedPrompts;
}

/**
 * Get all workflow prompts (synchronous, requires prompts to be loaded first)
 * @returns Array of workflow prompts
 * @throws Error if prompts have not been loaded yet
 */
export function getWorkflowPrompts(): WorkflowPrompt[] {
  if (cachedPrompts == null) {
    throw new Error('Workflow prompts have not been loaded yet. Call loadWorkflowPrompts() first.');
  }
  return cachedPrompts;
}

/**
 * Get prompt by name
 */
export function getWorkflowPrompt(name: string): WorkflowPrompt | undefined {
  const prompts = getWorkflowPrompts();
  return prompts.find(p => p.name === name);
}

/**
 * Find prompts by tag
 */
export function findPromptsByTag(tag: string): WorkflowPrompt[] {
  const prompts = getWorkflowPrompts();
  return prompts.filter(p => p.tags.includes(tag.toLowerCase()));
}

/**
 * Search prompts by situation/context
 */
export function findPromptsForSituation(situation: string): WorkflowPrompt[] {
  const searchTerms = situation.toLowerCase();
  const prompts = getWorkflowPrompts();
  return prompts.filter(p =>
    p.whenToUse.some(use => use.toLowerCase().includes(searchTerms)) ||
    p.description.toLowerCase().includes(searchTerms) ||
    p.tags.some(tag => searchTerms.includes(tag))
  );
}
