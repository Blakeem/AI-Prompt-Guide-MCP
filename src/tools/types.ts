/**
 * Tool-related type definitions for the Spec-Docs MCP server
 *
 * This module defines the core interfaces and types used throughout the MCP tool system,
 * ensuring compliance with the Model Context Protocol specification while providing
 * type safety and clear contracts for tool implementations.
 */

/**
 * Tool definition interface matching MCP specification
 *
 * Defines the structure for MCP tool definitions, including metadata and input schema.
 * This interface ensures all tools conform to the MCP protocol requirements while
 * providing flexibility for tool-specific parameters and validation.
 *
 * @example Basic tool definition
 * ```typescript
 * const viewDocumentTool: ToolDefinition = {
 *   name: 'view_document',
 *   description: 'View document content with analysis and statistics',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       document: {
 *         type: 'string',
 *         description: 'Document path to view'
 *       }
 *     },
 *     required: ['document'],
 *     additionalProperties: false
 *   }
 * };
 * ```
 *
 * @example Tool with complex schema
 * ```typescript
 * const sectionTool: ToolDefinition = {
 *   name: 'section',
 *   description: 'Comprehensive section management with unified operations',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       document: { type: 'string', description: 'Document path' },
 *       section: { type: 'string', description: 'Section slug' },
 *       operation: {
 *         type: 'string',
 *         enum: ['replace', 'append', 'prepend', 'insert_before', 'insert_after', 'append_child', 'remove'],
 *         description: 'Operation to perform'
 *       },
 *       content: { type: 'string', description: 'Section content' }
 *     },
 *     required: ['document', 'section'],
 *     additionalProperties: false
 *   }
 * };
 * ```
 *
 * @example Progressive discovery tool
 * ```typescript
 * // Stage 0: Minimal schema
 * const createDocumentStage0: ToolDefinition = {
 *   name: 'create_document',
 *   description: 'Create new specification document with progressive guidance',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       namespace: { type: 'string', description: 'Document namespace (e.g., "api/specs")' }
 *     },
 *     required: ['namespace'],
 *     additionalProperties: false
 *   }
 * };
 *
 * // Later stages reveal additional parameters based on session state
 * ```
 *
 * @see {@link https://modelcontextprotocol.io/docs/concepts/tools} MCP Tools Specification
 * @see {@link https://json-schema.org/draft/2020-12/schema} JSON Schema Specification
 */
export interface ToolDefinition {
  /** Unique tool identifier following MCP naming conventions */
  name: string;

  /** Human-readable tool description for MCP clients */
  description: string;

  /** JSON Schema defining valid input parameters */
  inputSchema: {
    /** Schema type, always 'object' for MCP tools */
    type: 'object';

    /** Property definitions for tool parameters */
    properties?: Record<string, unknown>;

    /** Array of required property names */
    required?: string[];

    /** Whether additional properties beyond those defined are allowed */
    additionalProperties?: boolean;

    /** Alternative schema definitions for conditional validation */
    oneOf?: unknown[];
  };
}