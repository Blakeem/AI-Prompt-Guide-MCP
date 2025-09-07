/**
 * Prompt request handlers for MCP server
 */

import { 
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getGlobalLogger } from '../../utils/logger.js';
import type { SessionStore } from '../../welcome-gate.js';
import { 
  getVisiblePrompts, 
  getPromptTemplate
} from '../../welcome-gate.js';

/**
 * Registers prompt-related request handlers
 */
export function registerPromptHandlers(server: Server, sessionStore: SessionStore): void {
  const logger = getGlobalLogger();

  // Register prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug('Listing available prompts');
    
    const sessionId = 'default';
    const sessionState = sessionStore.getSession(sessionId);
    const prompts = getVisiblePrompts(sessionState);
    
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    
    logger.debug('Getting prompt', { promptName: name });
    
    const sessionId = 'default';
    const sessionState = sessionStore.getSession(sessionId);
    const prompts = getVisiblePrompts(sessionState);
    
    const prompt = prompts.find(p => p.name === name);
    if (prompt == null) {
      throw new Error(`Unknown prompt: ${name}`);
    }
    
    const template = await getPromptTemplate(name);
    if (template == null) {
      throw new Error(`No template for prompt: ${name}`);
    }
    
    return {
      ...prompt,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: template,
          },
        },
      ],
    };
  });

  logger.debug('Prompt handlers registered successfully');
}