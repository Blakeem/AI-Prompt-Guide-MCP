/**
 * Schema definitions for get_guide tool
 *
 * This module dynamically generates the MCP tool schema for get_guide
 * by loading guide prompts at startup and extracting their metadata
 * for enum generation and rich descriptions.
 */
import type { ToolDefinition } from '../types.js';
/**
 * Generate dynamic schema for get_guide tool
 *
 * Creates a tool schema with dynamically generated enum values from
 * loaded guide prompts. Filters for guide_ prefixed prompts only,
 * strips the prefix for cleaner enum values, and builds a rich description
 * string with bullet points and prompt descriptions.
 *
 * @returns ToolDefinition with dynamic enum and description
 * @throws Error if workflow prompts have not been loaded yet
 *
 * @example
 * ```typescript
 * import { loadWorkflowPrompts } from '../../prompts/workflow-prompts.js';
 * import { generateGetGuideSchema } from './get-guide-schemas.js';
 *
 * // Load prompts at startup
 * await loadWorkflowPrompts();
 *
 * // Generate schema with dynamic enum
 * const schema = generateGetGuideSchema();
 * console.log(schema.inputSchema.properties.guide.enum);
 * // => ['activate-guide-documentation', 'activate-specification-documentation', ...]
 * ```
 */
export declare function generateGetGuideSchema(): ToolDefinition;
//# sourceMappingURL=get-guide-schemas.d.ts.map