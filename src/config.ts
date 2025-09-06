/**
 * Configuration management with Zod validation
 */

import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { DEFAULT_LIMITS, DEFAULT_PATHS, ERROR_CODES } from './constants/defaults.js';
import type { ServerConfig, SpecDocsError } from './types/index.js';

/**
 * Creates a custom error with code and context
 */
function createError(message: string, code: string, context?: Record<string, unknown>): SpecDocsError {
  const error = new Error(message) as SpecDocsError;
  return Object.assign(error, { code, context });
}

/**
 * Zod schema for server configuration
 */
const ServerConfigSchema = z.object({
  serverName: z.string().min(1).default('spec-docs-mcp'),
  serverVersion: z.string().min(1).default('1.0.0'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  docsBasePath: z.string().min(1).default(DEFAULT_PATHS.DOCS_BASE_PATH),
  maxFileSize: z.number().int().positive().default(DEFAULT_LIMITS.MAX_FILE_SIZE),
  maxFilesPerOperation: z.number().int().positive().default(DEFAULT_LIMITS.MAX_FILES_PER_OPERATION),
  rateLimitRequestsPerMinute: z.number().int().positive().default(1000),
  rateLimitBurstSize: z.number().int().positive().default(100),
  enableFileSafetyChecks: z.boolean().default(true),
  enableMtimePrecondition: z.boolean().default(true),
});

/**
 * Loads and validates environment variables
 */
function loadEnvironmentVariables(): Record<string, string | undefined> {
  // Load .env file if it exists
  try {
    dotenvConfig({ path: '.env' });
  } catch {
    // Ignore errors if .env file doesn't exist
  }

  return {
    MCP_SERVER_NAME: process.env['MCP_SERVER_NAME'],
    MCP_SERVER_VERSION: process.env['MCP_SERVER_VERSION'],
    LOG_LEVEL: process.env['LOG_LEVEL'],
    DOCS_BASE_PATH: process.env['DOCS_BASE_PATH'],
    MAX_FILE_SIZE: process.env['MAX_FILE_SIZE'],
    MAX_FILES_PER_OPERATION: process.env['MAX_FILES_PER_OPERATION'],
    RATE_LIMIT_REQUESTS_PER_MINUTE: process.env['RATE_LIMIT_REQUESTS_PER_MINUTE'],
    RATE_LIMIT_BURST_SIZE: process.env['RATE_LIMIT_BURST_SIZE'],
    ENABLE_FILE_SAFETY_CHECKS: process.env['ENABLE_FILE_SAFETY_CHECKS'],
    ENABLE_MTIME_PRECONDITION: process.env['ENABLE_MTIME_PRECONDITION'],
  };
}

/**
 * Converts environment variables to typed configuration object
 */
function parseEnvironmentVariables(env: Record<string, string | undefined>): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  if (env['MCP_SERVER_NAME'] != null && env['MCP_SERVER_NAME'].length > 0) {
    config['serverName'] = env['MCP_SERVER_NAME'];
  }
  if (env['MCP_SERVER_VERSION'] != null && env['MCP_SERVER_VERSION'].length > 0) {
    config['serverVersion'] = env['MCP_SERVER_VERSION'];
  }
  if (env['LOG_LEVEL'] != null && env['LOG_LEVEL'].length > 0) {
    config['logLevel'] = env['LOG_LEVEL'];
  }
  if (env['DOCS_BASE_PATH'] != null && env['DOCS_BASE_PATH'].length > 0) {
    config['docsBasePath'] = env['DOCS_BASE_PATH'];
  }

  if (env['MAX_FILE_SIZE'] != null && env['MAX_FILE_SIZE'].length > 0) {
    const parsed = parseInt(env['MAX_FILE_SIZE'], 10);
    if (!isNaN(parsed)) config['maxFileSize'] = parsed;
  }

  if (env['MAX_FILES_PER_OPERATION'] != null && env['MAX_FILES_PER_OPERATION'].length > 0) {
    const parsed = parseInt(env['MAX_FILES_PER_OPERATION'], 10);
    if (!isNaN(parsed)) config['maxFilesPerOperation'] = parsed;
  }

  if (env['RATE_LIMIT_REQUESTS_PER_MINUTE'] != null && env['RATE_LIMIT_REQUESTS_PER_MINUTE'].length > 0) {
    const parsed = parseInt(env['RATE_LIMIT_REQUESTS_PER_MINUTE'], 10);
    if (!isNaN(parsed)) config['rateLimitRequestsPerMinute'] = parsed;
  }

  if (env['RATE_LIMIT_BURST_SIZE'] != null && env['RATE_LIMIT_BURST_SIZE'].length > 0) {
    const parsed = parseInt(env['RATE_LIMIT_BURST_SIZE'], 10);
    if (!isNaN(parsed)) config['rateLimitBurstSize'] = parsed;
  }

  if (env['ENABLE_FILE_SAFETY_CHECKS'] != null && env['ENABLE_FILE_SAFETY_CHECKS'].length > 0) {
    config['enableFileSafetyChecks'] = env['ENABLE_FILE_SAFETY_CHECKS'].toLowerCase() === 'true';
  }

  if (env['ENABLE_MTIME_PRECONDITION'] != null && env['ENABLE_MTIME_PRECONDITION'].length > 0) {
    config['enableMtimePrecondition'] = env['ENABLE_MTIME_PRECONDITION'].toLowerCase() === 'true';
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

/**
 * Validates a partial configuration object
 */
export function validatePartialConfig(config: Partial<ServerConfig>): void {
  try {
    const result = ServerConfigSchema.partial().safeParse(config);
    
    if (!result.success) {
      const errors = result.error.issues.map((err: z.ZodIssue) => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      throw createError(
        `Configuration validation failed: ${errors}`,
        ERROR_CODES.CONFIG_VALIDATION_ERROR,
        { errors: result.error.issues, receivedData: config }
      );
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error; // Re-throw our custom errors
    }

    throw createError(
      'Configuration validation failed',
      ERROR_CODES.CONFIG_VALIDATION_ERROR,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Creates a default configuration for testing
 */
export function createTestConfig(): ServerConfig {
  return ServerConfigSchema.parse({
    serverName: 'spec-docs-mcp-test',
    serverVersion: '1.0.0-test',
    logLevel: 'error',
    docsBasePath: './.spec-docs-mcp/docs',
    maxFileSize: 1048576, // 1MB for tests
    maxFilesPerOperation: 10,
    rateLimitRequestsPerMinute: 10000,
    rateLimitBurstSize: 1000,
    enableFileSafetyChecks: true,
    enableMtimePrecondition: true,
  });
}

/**
 * Gets the current environment name
 */
export function getEnvironment(): string {
  return process.env['NODE_ENV'] ?? 'development';
}

/**
 * Checks if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Checks if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Checks if running in test mode
 */
export function isTest(): boolean {
  return getEnvironment() === 'test';
}