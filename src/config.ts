/**
 * Configuration management with Zod validation
 */

import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { ERROR_CODES, DEFAULT_CONFIG } from './constants/defaults.js';
import type { ServerConfig, SpecDocsError } from './types/index.js';
import { createRequire } from 'node:module';
import { getGlobalLogger } from './utils/logger.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

/**
 * Creates a custom error with code, context, and version information
 */
function createError(message: string, code: string, context?: Record<string, unknown>): SpecDocsError {
  const error = new Error(message) as SpecDocsError;
  return Object.assign(error, {
    code,
    context: { ...context, version: packageJson.version }
  });
}

/**
 * Reads package.json to get server name and version
 */
function getPackageInfo(): { name: string; version: string } {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { name?: unknown; version?: unknown };
    
    if (typeof packageJson.name !== 'string' || packageJson.name === '' ||
        typeof packageJson.version !== 'string' || packageJson.version === '') {
      throw new Error('package.json must have name and version fields');
    }
    
    return {
      name: packageJson.name,
      version: packageJson.version,
    };
  } catch (error) {
    throw createError(
      'Failed to read package.json',
      ERROR_CODES.CONFIG_VALIDATION_ERROR,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Zod schema for project configuration from .mcp-config.json
 * All paths are optional and will fallback to defaults if not provided
 */
export const ProjectConfigSchema = z.object({
  env: z.object({
    MCP_WORKSPACE_PATH: z.string().min(1).optional(),
    WORKFLOWS_BASE_PATH: z.string().min(1).optional(),
    GUIDES_BASE_PATH: z.string().min(1).optional(),
  }),
});

/**
 * Loads and parses .mcp-config.json from process.cwd()
 * Returns parsed env object or empty object if file doesn't exist
 * Logs warnings for invalid JSON or invalid structure
 */
export function loadProjectConfig(): Record<string, unknown> {
  const logger = getGlobalLogger();

  try {
    const configPath = join(process.cwd(), '.mcp-config.json');
    const configContent = readFileSync(configPath, 'utf-8');

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(configContent);
    } catch (error) {
      logger.warn('Failed to parse .mcp-config.json as valid JSON, using defaults', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {};
    }

    // Validate structure with Zod
    const result = ProjectConfigSchema.safeParse(parsed);

    if (!result.success) {
      logger.warn('Invalid .mcp-config.json structure, using defaults', {
        errors: result.error.issues.map((err: z.ZodIssue) =>
          `${err.path.join('.')}: ${err.message}`
        )
      });
      return {};
    }

    return result.data.env;
  } catch (error) {
    // File not found - silently return empty object (use defaults)
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }

    // Other errors - log warning and return empty object
    logger.warn('Failed to load .mcp-config.json, using defaults', {
      error: error instanceof Error ? error.message : String(error)
    });
    return {};
  }
}

/**
 * Zod schema for server configuration
 * Note: serverName and serverVersion are required and come from package.json
 */
const ServerConfigSchema = z.object({
  serverName: z.string().min(1),
  serverVersion: z.string().min(1),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
  workspaceBasePath: z.string().min(1),
  workflowsBasePath: z.string().min(1),
  guidesBasePath: z.string().min(1),
  maxFileSize: z.number().int().positive(),
  maxFilesPerOperation: z.number().int().positive(),
  rateLimitRequestsPerMinute: z.number().int().positive(),
  rateLimitBurstSize: z.number().int().positive(),
  enableFileSafetyChecks: z.boolean(),
  enableMtimePrecondition: z.boolean(),
  referenceExtractionDepth: z.number().int().min(1).max(5),
});

/**
 * Loads and validates environment variables
 * Only loads essential user-configurable settings, others use defaults
 */
function loadEnvironmentVariables(): Record<string, string | undefined> {
  // Load .env file if it exists
  try {
    dotenvConfig({ path: '.env' });
  } catch {
    // Ignore errors if .env file doesn't exist
  }

  return {
    // Optional: Allow override of server name for different instances
    MCP_SERVER_NAME: process.env['MCP_SERVER_NAME'],

    // Optional: Allow override of log level for debugging
    LOG_LEVEL: process.env['LOG_LEVEL'],

    // Optional: Allow override of reference extraction depth
    REFERENCE_EXTRACTION_DEPTH: process.env['REFERENCE_EXTRACTION_DEPTH'],

    // Required: The only setting users must configure
    MCP_WORKSPACE_PATH: process.env['MCP_WORKSPACE_PATH'],

    // Optional: Allow override of workflows and guides paths
    WORKFLOWS_BASE_PATH: process.env['WORKFLOWS_BASE_PATH'],
    GUIDES_BASE_PATH: process.env['GUIDES_BASE_PATH'],
  };
}

/**
 * Converts environment variables to typed configuration object
 * Uses sensible defaults for most settings, only requires MCP_WORKSPACE_PATH from user
 *
 * @param env - Environment variables to parse
 * @param projectConfig - Optional project config from .mcp-config.json (takes precedence)
 */
function parseEnvironmentVariables(
  env: Record<string, string | undefined>,
  projectConfig: Record<string, unknown> = {}
): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const errors: string[] = [];

  // Get package info for name and version
  const packageInfo = getPackageInfo();

  // Get plugin root for default paths
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pluginRoot = join(__dirname, '..');
  const defaultWorkflowsPath = join(pluginRoot, DEFAULT_CONFIG.WORKFLOWS_BASE_PATH);
  const defaultGuidesPath = join(pluginRoot, DEFAULT_CONFIG.GUIDES_BASE_PATH);

  // Use package.json name unless MCP_SERVER_NAME is explicitly set (allows override for different instances)
  config['serverName'] = env['MCP_SERVER_NAME'] ?? packageInfo.name;
  config['serverVersion'] = packageInfo.version; // Always use package.json version

  // Optional: Log level with default
  config['logLevel'] = env['LOG_LEVEL'] ?? DEFAULT_CONFIG.LOG_LEVEL;

  // Optional: Reference extraction depth with validation
  if (env['REFERENCE_EXTRACTION_DEPTH'] != null) {
    const depthStr = env['REFERENCE_EXTRACTION_DEPTH'].trim();

    // Check for non-numeric or decimal values
    if (!/^\d+$/.test(depthStr)) {
      errors.push('REFERENCE_EXTRACTION_DEPTH must be a number between 1 and 5');
    } else {
      const depth = parseInt(depthStr, 10);
      if (!Number.isSafeInteger(depth) || depth < 1 || depth > 5) {
        errors.push('REFERENCE_EXTRACTION_DEPTH must be a valid integer between 1 and 5');
      } else {
        config['referenceExtractionDepth'] = depth;
      }
    }
  } else {
    config['referenceExtractionDepth'] = DEFAULT_CONFIG.REFERENCE_EXTRACTION_DEPTH;
  }

  // Determine if project config exists (has any keys)
  const hasProjectConfig = Object.keys(projectConfig).length > 0;

  // Required: MCP_WORKSPACE_PATH is the only setting users must provide
  // Project config takes complete precedence - if project config exists, only use project config values
  let workspaceBasePath: string | undefined;
  if (hasProjectConfig) {
    // Project config exists - only use project config value or process.env if not overridden
    workspaceBasePath = (projectConfig['MCP_WORKSPACE_PATH'] as string | undefined) ?? env['MCP_WORKSPACE_PATH'];
  } else {
    // No project config - use process.env
    workspaceBasePath = env['MCP_WORKSPACE_PATH'];
  }

  if (workspaceBasePath == null || workspaceBasePath.length === 0) {
    errors.push('MCP_WORKSPACE_PATH is required - specify the path to your MCP workspace directory');
  } else {
    config['workspaceBasePath'] = workspaceBasePath;
  }

  // Optional: WORKFLOWS_BASE_PATH with precedence merging
  // If project config exists: project config value > default (ignore process.env)
  // If no project config: process.env > default
  let workflowsBasePath: string;
  if (hasProjectConfig) {
    // Project config exists - use project config value or default (ignore process.env)
    workflowsBasePath = (projectConfig['WORKFLOWS_BASE_PATH'] as string | undefined) ?? defaultWorkflowsPath;
  } else {
    // No project config - use process.env or default
    workflowsBasePath = env['WORKFLOWS_BASE_PATH'] ?? defaultWorkflowsPath;
  }
  config['workflowsBasePath'] = workflowsBasePath;

  // Optional: GUIDES_BASE_PATH with precedence merging
  // If project config exists: project config value > default (ignore process.env)
  // If no project config: process.env > default
  let guidesBasePath: string;
  if (hasProjectConfig) {
    // Project config exists - use project config value or default (ignore process.env)
    guidesBasePath = (projectConfig['GUIDES_BASE_PATH'] as string | undefined) ?? defaultGuidesPath;
  } else {
    // No project config - use process.env or default
    guidesBasePath = env['GUIDES_BASE_PATH'] ?? defaultGuidesPath;
  }
  config['guidesBasePath'] = guidesBasePath;

  // All other settings use sensible defaults (these are not currently enforced anyway)
  config['maxFileSize'] = DEFAULT_CONFIG.MAX_FILE_SIZE;
  config['maxFilesPerOperation'] = DEFAULT_CONFIG.MAX_FILES_PER_OPERATION;
  config['rateLimitRequestsPerMinute'] = DEFAULT_CONFIG.RATE_LIMIT_REQUESTS_PER_MINUTE;
  config['rateLimitBurstSize'] = DEFAULT_CONFIG.RATE_LIMIT_BURST_SIZE;
  config['enableFileSafetyChecks'] = DEFAULT_CONFIG.ENABLE_FILE_SAFETY_CHECKS;
  config['enableMtimePrecondition'] = DEFAULT_CONFIG.ENABLE_MTIME_PRECONDITION;

  // Validate path existence after resolution
  const logger = getGlobalLogger();

  // Required: MCP_WORKSPACE_PATH must exist
  if (workspaceBasePath != null) {
    const resolvedWorkspacePath = resolvePath(workspaceBasePath);
    if (!existsSync(resolvedWorkspacePath)) {
      errors.push(`MCP_WORKSPACE_PATH directory does not exist: ${resolvedWorkspacePath}`);
    }
  }

  // Optional: WORKFLOWS_BASE_PATH - log warning if doesn't exist
  const resolvedWorkflowsPath = resolvePath(workflowsBasePath);
  if (!existsSync(resolvedWorkflowsPath)) {
    logger.warn('WORKFLOWS_BASE_PATH directory does not exist, features may be limited', {
      path: resolvedWorkflowsPath
    });
  }

  // Optional: GUIDES_BASE_PATH - log warning if doesn't exist
  const resolvedGuidesPath = resolvePath(guidesBasePath);
  if (!existsSync(resolvedGuidesPath)) {
    logger.warn('GUIDES_BASE_PATH directory does not exist, features may be limited', {
      path: resolvedGuidesPath
    });
  }

  if (errors.length > 0) {
    throw createError(
      `Missing required configuration: ${errors.join(', ')}`,
      ERROR_CODES.ENVIRONMENT_ERROR,
      { errors, receivedEnv: env }
    );
  }

  return config;
}

/**
 * Logs configuration details at startup
 *
 * @param config - The validated server configuration
 * @param hasProjectConfig - Whether .mcp-config.json was loaded
 */
function logConfigurationStartup(config: ServerConfig, hasProjectConfig: boolean): void {
  const logger = getGlobalLogger();

  logger.info('Server configuration loaded', {
    projectRoot: process.cwd(),
    workspacePath: getWorkspacePath(config.workspaceBasePath),
    workflowsPath: getWorkflowsPath(config.workflowsBasePath),
    guidesPath: getGuidesPath(config.guidesBasePath),
    referenceExtractionDepth: config.referenceExtractionDepth,
    hasProjectConfig
  });
}

/**
 * Loads and validates server configuration
 * Project config from .mcp-config.json takes precedence over process.env
 */
export function loadConfig(): ServerConfig {
  try {
    // Load project config first (from .mcp-config.json)
    const projectConfig = loadProjectConfig();
    const hasProjectConfig = Object.keys(projectConfig).length > 0;

    // Load environment variables
    const env = loadEnvironmentVariables();

    // Parse with project config precedence
    const parsedEnv = parseEnvironmentVariables(env, projectConfig);

    const result = ServerConfigSchema.safeParse(parsedEnv);

    if (!result.success) {
      const errors = result.error.issues.map((err: z.ZodIssue) =>
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');

      throw createError(
        `Configuration validation failed: ${errors}`,
        ERROR_CODES.CONFIG_VALIDATION_ERROR,
        {
          errors: result.error.issues,
          receivedData: parsedEnv
        }
      );
    }

    // Log configuration after successful load
    logConfigurationStartup(result.data, hasProjectConfig);

    return result.data;
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error; // Re-throw our custom errors
    }

    throw createError(
      'Failed to load configuration',
      ERROR_CODES.ENVIRONMENT_ERROR,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Resolves a path relative to process.cwd() or returns absolute path as-is
 *
 * @param path - Path to resolve (absolute or relative)
 * @returns Resolved absolute path
 */
function resolvePath(path: string): string {
  if (isAbsolute(path)) {
    return path;
  }
  return join(process.cwd(), path);
}

/**
 * Resolves the workspace base path relative to project root
 *
 * @param workspacePath - Workspace path from configuration (absolute or relative)
 * @returns Resolved absolute workspace path
 */
export function getWorkspacePath(workspacePath: string): string {
  return resolvePath(workspacePath);
}

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
// ts-unused-exports:disable-next-line
export function getWorkflowsPath(workflowsPath: string): string {
  return resolvePath(workflowsPath);
}

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
// ts-unused-exports:disable-next-line
export function getGuidesPath(guidesPath: string): string {
  return resolvePath(guidesPath);
}






