/**
 * Configuration management with Zod validation
 */

import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ERROR_CODES, DEFAULT_CONFIG } from './constants/defaults.js';
import type { ServerConfig, SpecDocsError } from './types/index.js';

/**
 * Creates a custom error with code and context
 */
function createError(message: string, code: string, context?: Record<string, unknown>): SpecDocsError {
  const error = new Error(message) as SpecDocsError;
  return Object.assign(error, { code, context });
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
 * Zod schema for server configuration
 * Note: serverName and serverVersion are required and come from package.json
 */
const ServerConfigSchema = z.object({
  serverName: z.string().min(1),
  serverVersion: z.string().min(1),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
  docsBasePath: z.string().min(1),
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
    DOCS_BASE_PATH: process.env['DOCS_BASE_PATH'],
  };
}

/**
 * Converts environment variables to typed configuration object
 * Uses sensible defaults for most settings, only requires DOCS_BASE_PATH from user
 */
function parseEnvironmentVariables(env: Record<string, string | undefined>): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const errors: string[] = [];

  // Get package info for name and version
  const packageInfo = getPackageInfo();

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

  // Required: DOCS_BASE_PATH is the only setting users must provide
  if (env['DOCS_BASE_PATH'] == null || env['DOCS_BASE_PATH'].length === 0) {
    errors.push('DOCS_BASE_PATH is required - specify the path to your documents directory');
  } else {
    config['docsBasePath'] = env['DOCS_BASE_PATH'];
  }

  // All other settings use sensible defaults (these are not currently enforced anyway)
  config['maxFileSize'] = DEFAULT_CONFIG.MAX_FILE_SIZE;
  config['maxFilesPerOperation'] = DEFAULT_CONFIG.MAX_FILES_PER_OPERATION;
  config['rateLimitRequestsPerMinute'] = DEFAULT_CONFIG.RATE_LIMIT_REQUESTS_PER_MINUTE;
  config['rateLimitBurstSize'] = DEFAULT_CONFIG.RATE_LIMIT_BURST_SIZE;
  config['enableFileSafetyChecks'] = DEFAULT_CONFIG.ENABLE_FILE_SAFETY_CHECKS;
  config['enableMtimePrecondition'] = DEFAULT_CONFIG.ENABLE_MTIME_PRECONDITION;

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
 * Loads and validates server configuration
 */
export function loadConfig(): ServerConfig {
  try {
    const env = loadEnvironmentVariables();
    const parsedEnv = parseEnvironmentVariables(env);
    
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






