/**
 * Workflow prompts for autonomous agents
 *
 * These prompts provide structured decision-making and problem-solving
 * frameworks for agents working on documentation, tasks, and development.
 *
 * Prompts are loaded dynamically from .md files in the workflows directory.
 */
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
    /** When agents should consider using this prompt */
    whenToUse: string;
}
/**
 * Load workflow prompts from filesystem
 * Loads from both workflows/ and guides/ directories with appropriate prefixes
 * @returns Promise resolving to array of workflow prompts
 */
export declare function loadWorkflowPrompts(): Promise<WorkflowPrompt[]>;
/**
 * Get all workflow prompts (synchronous, requires prompts to be loaded first)
 * @returns Array of workflow prompts
 * @throws Error if prompts have not been loaded yet
 */
export declare function getWorkflowPrompts(): WorkflowPrompt[];
/**
 * Get prompt by name
 */
export declare function getWorkflowPrompt(name: string): WorkflowPrompt | undefined;
/**
 * Search prompts by situation/context
 */
export declare function findPromptsForSituation(situation: string): WorkflowPrompt[];
//# sourceMappingURL=workflow-prompts.d.ts.map