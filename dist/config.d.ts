/**
 * Configuration management with Zod validation
 */
import { z } from 'zod';
import type { ServerConfig } from './types/index.js';
/**
 * Zod schema for project configuration from .mcp-config.json
 * All paths are optional and will fallback to defaults if not provided
 */
export declare const ProjectConfigSchema: z.ZodObject<{
    env: z.ZodObject<{
        MCP_WORKSPACE_PATH: z.ZodOptional<z.ZodString>;
        WORKFLOWS_BASE_PATH: z.ZodOptional<z.ZodString>;
        GUIDES_BASE_PATH: z.ZodOptional<z.ZodString>;
        DOCS_BASE_PATH: z.ZodOptional<z.ZodString>;
        ARCHIVED_BASE_PATH: z.ZodOptional<z.ZodString>;
        COORDINATOR_BASE_PATH: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Loads and parses .mcp-config.json from process.cwd()
 * Returns parsed env object or empty object if file doesn't exist
 * Logs warnings for invalid JSON or invalid structure
 */
export declare function loadProjectConfig(): Record<string, unknown>;
/**
 * Loads and validates server configuration
 * Project config from .mcp-config.json takes precedence over process.env
 */
export declare function loadConfig(): ServerConfig;
/**
 * Resolves the workspace base path relative to project root
 *
 * @param workspacePath - Workspace path from configuration (absolute or relative)
 * @returns Resolved absolute workspace path
 *
 * Note: This function is tested in __tests__/config-path-resolution.test.ts
 * which is excluded from dead-code checking (see package.json ignoreFiles pattern).
 */
export declare function getWorkspacePath(workspacePath: string): string;
/**
 * Resolves the workflows base path relative to project root
 *
 * @param workflowsPath - Workflows path from configuration (absolute or relative)
 * @returns Resolved absolute workflows path
 *
 * Note: This function is used in prompts/workflow-prompts.ts which is excluded
 * from dead-code checking (see package.json ignoreFiles pattern). The function
 * is exported for tool handler usage as per project requirements.
 */
export declare function getWorkflowsPath(workflowsPath: string): string;
/**
 * Resolves the guides base path relative to project root
 *
 * @param guidesPath - Guides path from configuration (absolute or relative)
 * @returns Resolved absolute guides path
 *
 * Note: This function is used in prompts/workflow-prompts.ts which is excluded
 * from dead-code checking (see package.json ignoreFiles pattern). The function
 * is exported for tool handler usage as per project requirements.
 */
export declare function getGuidesPath(guidesPath: string): string;
/**
 * Resolves the docs base path relative to project root
 *
 * @param docsPath - Docs path from configuration (absolute or relative)
 * @returns Resolved absolute docs path
 */
export declare function getDocsPath(docsPath: string): string;
/**
 * Resolves the archived base path relative to project root
 *
 * @param archivedPath - Archived path from configuration (absolute or relative)
 * @returns Resolved absolute archived path
 */
export declare function getArchivedPath(archivedPath: string): string;
/**
 * Resolves the coordinator base path relative to project root
 *
 * @param coordinatorPath - Coordinator path from configuration (absolute or relative)
 * @returns Resolved absolute coordinator path
 *
 * Note: This function is used in logConfigurationStartup for logging configuration.
 * It's exported for consistency with other path resolution functions.
 */
export declare function getCoordinatorPath(coordinatorPath: string): string;
//# sourceMappingURL=config.d.ts.map