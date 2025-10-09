/**
 * Prompt request handlers for MCP server
 *
 * Exposes workflow prompts to help agents make structured decisions
 * and follow best practices for common development scenarios.
 */

import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getGlobalLogger } from '../../utils/logger.js';
import type { ServerConfig } from '../../types/index.js';
import {
  getWorkflowPrompts,
  getWorkflowPrompt,
  type WorkflowPrompt
} from '../../prompts/workflow-prompts.js';
import {
  createErrorResponse,
  formatLogError,
} from '../../utils/error-formatter.js';

/**
 * Convert workflow prompt to MCP prompt format
 */
function convertToMCPPrompt(workflowPrompt: WorkflowPrompt): {
  name: string;
  description: string;
} {
  return {
    name: workflowPrompt.name,
    description: workflowPrompt.description
  };
}

/**
 * Registers prompt-related request handlers
 */
export function registerPromptHandlers(
  server: Server,
  _serverConfig: ServerConfig
): void {
  const logger = getGlobalLogger();

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug('Listing available workflow prompts');

    try {
      const workflowPrompts = getWorkflowPrompts();
      const prompts = workflowPrompts.map(convertToMCPPrompt);

      logger.debug('Returning workflow prompts', {
        promptCount: prompts.length
      });

      return { prompts };
    } catch (error) {
      logger.error('Failed to get workflow prompts', formatLogError(error, 'list_prompts'));
      // Return empty list on error to avoid breaking the inspector
      return { prompts: [] };
    }
  });

  // Get specific prompt
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;

    logger.debug('Handling prompt request', { promptName: name });

    try {
      const workflowPrompt = getWorkflowPrompt(name);

      if (workflowPrompt == null) {
        logger.warn('Prompt not found', { promptName: name });
        return createErrorResponse(
          `Prompt '${name}' not found. Use prompts/list to see available prompts.`
        );
      }

      // Build the full prompt content
      let promptContent = workflowPrompt.content;

      // Add "when to use" section as a reminder
      const whenToUseSection = `\n\n---\n\n## When This Protocol Applies\n\n${workflowPrompt.whenToUse.map((use, i) => `${i + 1}. ${use}`).join('\n')}`;
      promptContent += whenToUseSection;

      // Add tags for additional context
      const tagsSection = `\n\n---\n\n**Tags:** ${workflowPrompt.tags.join(', ')}`;
      promptContent += tagsSection;

      logger.debug('Returning prompt content', { promptName: name });

      return {
        description: workflowPrompt.description,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptContent
            }
          }
        ]
      };

    } catch (error) {
      logger.error('Error retrieving prompt', formatLogError(error, `get_prompt(${name})`));
      return createErrorResponse(
        `Failed to retrieve prompt '${name}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}