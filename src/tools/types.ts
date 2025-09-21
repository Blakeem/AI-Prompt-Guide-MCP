/**
 * Tool-related type definitions for the Spec-Docs MCP server
 */

/**
 * Tool definition interface matching MCP specification
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
    oneOf?: unknown[];
  };
}