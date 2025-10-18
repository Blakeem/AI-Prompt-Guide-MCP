/**
 * Get Workflow Tool Implementation
 *
 * Retrieves workflow prompts by name with formatted metadata and content.
 */

import { AddressingError } from '../../shared/addressing-system.js';
import { getWorkflowPrompt, getWorkflowPrompts } from '../../prompts/workflow-prompts.js';

/**
 * Execute get_workflow tool
 * @param args - Tool arguments containing workflow name
 * @returns Formatted workflow data or error with available workflows
 */
export async function executeGetWorkflow(
  args: Record<string, unknown>,
  _state?: unknown,
  _manager?: unknown
): Promise<unknown> {
  // IPO Pattern: Input Collection
  const workflow = args['workflow'];

  // Input Validation
  if (workflow == null || workflow === '') {
    throw new AddressingError(
      'workflow parameter is required',
      'INVALID_PARAMETER'
    );
  }

  if (typeof workflow !== 'string') {
    throw new AddressingError(
      'workflow parameter must be a string',
      'INVALID_PARAMETER'
    );
  }

  const workflowName = workflow.trim();

  if (workflowName === '') {
    throw new AddressingError(
      'workflow parameter is required',
      'INVALID_PARAMETER'
    );
  }

  // Processing: Try to find workflow with both prefixes
  // Handle case where user already provided prefix
  let prompt: ReturnType<typeof getWorkflowPrompt>;

  // If the name already has a prefix, use it as-is first
  if (workflowName.startsWith('workflow_') || workflowName.startsWith('guide_')) {
    prompt = getWorkflowPrompt(workflowName);
  } else {
    // Try workflow_ prefix first, then guide_ prefix
    prompt = getWorkflowPrompt(`workflow_${workflowName}`) ?? getWorkflowPrompt(`guide_${workflowName}`);
  }

  // Handle workflow not found - return error with available options
  if (prompt == null) {
    const allPrompts = getWorkflowPrompts();
    const available = allPrompts.map(p => {
      // Strip workflow_ and guide_ prefixes from names
      if (p.name.startsWith('workflow_')) {
        return p.name.substring('workflow_'.length);
      }
      if (p.name.startsWith('guide_')) {
        return p.name.substring('guide_'.length);
      }
      return p.name;
    });

    return {
      error: `Workflow '${workflowName}' not found`,
      available
    };
  }

  // Output Construction: Format successful response
  // Strip prefix from returned name for consistency
  let displayName = prompt.name;
  if (displayName.startsWith('workflow_')) {
    displayName = displayName.substring('workflow_'.length);
  } else if (displayName.startsWith('guide_')) {
    displayName = displayName.substring('guide_'.length);
  }

  return {
    name: displayName,
    description: prompt.description,
    content: prompt.content,
    when_to_use: prompt.whenToUse
  };
}
