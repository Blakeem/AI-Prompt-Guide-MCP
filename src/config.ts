/**
 * Configuration management with Zod validation
 */

import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ERROR_CODES } from './constants/defaults.js';
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
 * All values are REQUIRED - no defaults or fallbacks
 */
function parseEnvironmentVariables(env: Record<string, string | undefined>): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const errors: string[] = [];

  // Get package info for name and version
  const packageInfo = getPackageInfo();
  
  // Use package.json name unless MCP_SERVER_NAME is explicitly set (allows override for different instances)
  config['serverName'] = env['MCP_SERVER_NAME'] ?? packageInfo.name;
  config['serverVersion'] = packageInfo.version; // Always use package.json version

  // Required string fields
  if (env['LOG_LEVEL'] == null || env['LOG_LEVEL'].length === 0) {
    errors.push('LOG_LEVEL is required');
  } else {
    config['logLevel'] = env['LOG_LEVEL'];
  }

  if (env['DOCS_BASE_PATH'] == null || env['DOCS_BASE_PATH'].length === 0) {
    errors.push('DOCS_BASE_PATH is required');
  } else {
    config['docsBasePath'] = env['DOCS_BASE_PATH'];
  }

  // Required number fields
  if (env['MAX_FILE_SIZE'] == null || env['MAX_FILE_SIZE'].length === 0) {
    errors.push('MAX_FILE_SIZE is required');
  } else {
    const parsed = parseInt(env['MAX_FILE_SIZE'], 10);
    if (isNaN(parsed)) {
      errors.push('MAX_FILE_SIZE must be a valid number');
    } else {
      config['maxFileSize'] = parsed;
    }
  }

  if (env['MAX_FILES_PER_OPERATION'] == null || env['MAX_FILES_PER_OPERATION'].length === 0) {
    errors.push('MAX_FILES_PER_OPERATION is required');
  } else {
    const parsed = parseInt(env['MAX_FILES_PER_OPERATION'], 10);
    if (isNaN(parsed)) {
      errors.push('MAX_FILES_PER_OPERATION must be a valid number');
    } else {
      config['maxFilesPerOperation'] = parsed;
    }
  }

  if (env['RATE_LIMIT_REQUESTS_PER_MINUTE'] == null || env['RATE_LIMIT_REQUESTS_PER_MINUTE'].length === 0) {
    errors.push('RATE_LIMIT_REQUESTS_PER_MINUTE is required');
  } else {
    const parsed = parseInt(env['RATE_LIMIT_REQUESTS_PER_MINUTE'], 10);
    if (isNaN(parsed)) {
      errors.push('RATE_LIMIT_REQUESTS_PER_MINUTE must be a valid number');
    } else {
      config['rateLimitRequestsPerMinute'] = parsed;
    }
  }

  if (env['RATE_LIMIT_BURST_SIZE'] == null || env['RATE_LIMIT_BURST_SIZE'].length === 0) {
    errors.push('RATE_LIMIT_BURST_SIZE is required');
  } else {
    const parsed = parseInt(env['RATE_LIMIT_BURST_SIZE'], 10);
    if (isNaN(parsed)) {
      errors.push('RATE_LIMIT_BURST_SIZE must be a valid number');
    } else {
      config['rateLimitBurstSize'] = parsed;
    }
  }

  // Required boolean fields
  if (env['ENABLE_FILE_SAFETY_CHECKS'] == null || env['ENABLE_FILE_SAFETY_CHECKS'].length === 0) {
    errors.push('ENABLE_FILE_SAFETY_CHECKS is required');
  } else {
    const value = env['ENABLE_FILE_SAFETY_CHECKS'].toLowerCase();
    if (value !== 'true' && value !== 'false') {
      errors.push('ENABLE_FILE_SAFETY_CHECKS must be "true" or "false"');
    } else {
      config['enableFileSafetyChecks'] = value === 'true';
    }
  }

  if (env['ENABLE_MTIME_PRECONDITION'] == null || env['ENABLE_MTIME_PRECONDITION'].length === 0) {
    errors.push('ENABLE_MTIME_PRECONDITION is required');
  } else {
    const value = env['ENABLE_MTIME_PRECONDITION'].toLowerCase();
    if (value !== 'true' && value !== 'false') {
      errors.push('ENABLE_MTIME_PRECONDITION must be "true" or "false"');
    } else {
      config['enableMtimePrecondition'] = value === 'true';
    }
  }

  if (errors.length > 0) {
    throw createError(
      `Missing or invalid environment variables: ${errors.join(', ')}`,
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






