/**
 * Schema definitions for get_workflow tool
 *
 * This module dynamically generates the MCP tool schema for get_workflow
 * by loading workflow prompts at startup and extracting their metadata
 * for enum generation and rich descriptions.
 */
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
export declare function generateGetWorkflowSchema(): ToolDefinition;
//# sourceMappingURL=get-workflow-schemas.d.ts.map