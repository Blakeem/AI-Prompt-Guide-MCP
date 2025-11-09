/**
 * Schema definitions for get_guide tool
 *
 * This module dynamically generates the MCP tool schema for get_guide
 * by loading guide prompts at startup and extracting their metadata
 * for enum generation and rich descriptions.
 */
import { getWorkflowPrompts } from '../../prompts/workflow-prompts.js';
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
export function generateGetGuideSchema() {
    // Get loaded prompts (throws if not loaded yet)
    const allPrompts = getWorkflowPrompts();
    // Filter for guide_ prefixed prompts only
    const guidePrompts = allPrompts.filter(p => p.name.startsWith('guide_'));
    // Extract guide names without prefix for enum values
    const guideNames = guidePrompts.map(p => p.name.replace(/^guide_/, ''));
    // Build rich description with all guides and their descriptions
    const descriptionLines = ['Available guides:'];
    guidePrompts.forEach(prompt => {
        const name = prompt.name.replace(/^guide_/, '');
        const desc = prompt.description;
        descriptionLines.push(`• ${name}: ${desc}`);
    });
    const guideDescription = descriptionLines.join('\n');
    return {
        name: 'get_guide',
        description: 'Get documentation and research best practice guides',
        inputSchema: {
            type: 'object',
            properties: {
                guide: {
                    type: 'string',
                    enum: guideNames,
                    description: guideDescription,
                },
            },
            required: ['guide'],
            additionalProperties: false,
        },
    };
}
//# sourceMappingURL=get-guide-schemas.js.map