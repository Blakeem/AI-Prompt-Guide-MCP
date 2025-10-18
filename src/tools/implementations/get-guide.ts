/**
 * Get Guide Tool Implementation
 *
 * Retrieves guide prompts by name with formatted metadata and content.
 * Filters for guide_ prefixed prompts only (not workflows).
 */

import { AddressingError } from '../../shared/addressing-system.js';
import { getWorkflowPrompt, getWorkflowPrompts } from '../../prompts/workflow-prompts.js';

/**
 * Execute get_guide tool
 * @param args - Tool arguments containing guide name
 * @returns Formatted guide data or error with available guides
 */
export async function executeGetGuide(
  args: Record<string, unknown>,
  _state?: unknown,
  _manager?: unknown
): Promise<unknown> {
  // IPO Pattern: Input Collection
  const guide = args['guide'];

  // Input Validation
  if (guide == null || guide === '') {
    throw new AddressingError(
      'guide parameter is required',
      'INVALID_PARAMETER'
    );
  }

  if (typeof guide !== 'string') {
    throw new AddressingError(
      'guide parameter must be a string',
      'INVALID_PARAMETER'
    );
  }

  const guideName = guide.trim();

  if (guideName === '') {
    throw new AddressingError(
      'guide parameter is required',
      'INVALID_PARAMETER'
    );
  }

  // Processing: Try to find guide with guide_ prefix
  // Handle case where user already provided prefix
  let prompt: ReturnType<typeof getWorkflowPrompt>;

  // If the name already has guide_ prefix, use it as-is
  if (guideName.startsWith('guide_')) {
    prompt = getWorkflowPrompt(guideName);
  } else {
    // Add guide_ prefix for lookup
    prompt = getWorkflowPrompt(`guide_${guideName}`);
  }

  // Handle guide not found - return error with available guides only
  if (prompt == null) {
    const allPrompts = getWorkflowPrompts();

    // Filter for guides only (guide_ prefix) and strip prefix
    const available = allPrompts
      .filter(p => p.name.startsWith('guide_'))
      .map(p => p.name.substring('guide_'.length));

    return {
      error: `Guide '${guideName}' not found`,
      available
    };
  }

  // Output Construction: Format successful response
  // Strip guide_ prefix from returned name for consistency
  let displayName = prompt.name;
  if (displayName.startsWith('guide_')) {
    displayName = displayName.substring('guide_'.length);
  }

  return {
    name: displayName,
    description: prompt.description,
    content: prompt.content,
    when_to_use: prompt.whenToUse
  };
}
