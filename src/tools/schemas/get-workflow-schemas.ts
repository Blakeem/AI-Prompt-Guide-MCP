/**
 * Schema definitions for get_workflow tool
 *
 * This module dynamically generates the MCP tool schema for get_workflow
 * by loading workflow prompts at startup and extracting their metadata
 * for enum generation and rich descriptions.
 */

import { getWorkflowPrompts } from '../../prompts/workflow-prompts.js';
import type { ToolDefinition } from '../types.js';

/**
 * Generate dynamic schema for get_workflow tool
 *
 * Creates a tool schema with dynamically generated enum values from
 * loaded workflow prompts. Filters for workflow_ prefixed prompts only,
 * strips the prefix for cleaner enum values, and builds a rich description
 * string with emojis and prompt descriptions.
 *
 * @returns ToolDefinition with dynamic enum and description
 * @throws Error if workflow prompts have not been loaded yet
 *
 * @example
 * ```typescript
 * import { loadWorkflowPrompts } from '../../prompts/workflow-prompts.js';
 * import { generateGetWorkflowSchema } from './get-workflow-schemas.js';
 *
 * // Load prompts at startup
 * await loadWorkflowPrompts();
 *
 * // Generate schema with dynamic enum
 * const schema = generateGetWorkflowSchema();
 * console.log(schema.inputSchema.properties.workflow.enum);
 * // => ['tdd-incremental-orchestration', 'spec-first-integration', ...]
 * ```
 */
export function generateGetWorkflowSchema(): ToolDefinition {
  // Get loaded prompts (throws if not loaded yet)
  const allPrompts = getWorkflowPrompts();

  // Filter for workflow_ prefixed prompts only
  const workflowPrompts = allPrompts.filter(p => p.name.startsWith('workflow_'));

  // Extract workflow names without prefix for enum values
  const workflowNames = workflowPrompts.map(p => p.name.replace(/^workflow_/, ''));

  // Build rich description with all workflows and their descriptions
  const descriptionLines = ['Available workflows:'];
  workflowPrompts.forEach(prompt => {
    const name = prompt.name.replace(/^workflow_/, '');
    const desc = prompt.description;
    const whenToUse = prompt.whenToUse !== '' ? `\n  Use for: ${prompt.whenToUse}` : '';
    descriptionLines.push(`• ${name}: ${desc}${whenToUse}`);
  });
  const workflowDescription = descriptionLines.join('\n');

  return {
    name: 'get_workflow',
    description: 'Get structured workflow protocol content for common development scenarios',
    inputSchema: {
      type: 'object',
      properties: {
        workflow: {
          type: 'string',
          enum: workflowNames,
          description: workflowDescription,
        },
      },
      required: ['workflow'],
      additionalProperties: false,
    },
  };
}
