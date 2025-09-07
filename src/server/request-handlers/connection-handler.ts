/**
 * Connection-related handlers for MCP server
 */

import { getGlobalLogger } from '../../utils/logger.js';
import { withErrorHandling } from '../../utils/error-formatter.js';
import { fileExists } from '../../fsio.js';
import type { ServerConfig } from '../../types/index.js';

/**
 * Build system information object
 */
function buildSystemInfo(): Record<string, unknown> {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
}

/**
 * Build server information object
 */
function buildServerInfo(serverConfig: ServerConfig): Record<string, unknown> {
  return {
    name: serverConfig.serverName,
    version: serverConfig.serverVersion,
    logLevel: serverConfig.logLevel,
    limits: {
      maxFileSize: serverConfig.maxFileSize,
      maxFilesPerOperation: serverConfig.maxFilesPerOperation,
    },
    features: {
      fileSafetyChecks: serverConfig.enableFileSafetyChecks,
      mtimePrecondition: serverConfig.enableMtimePrecondition,
    },
  };
}

/**
 * Test connection tool - validates server configuration and environment
 */
export async function handleTestConnection(
  args: Record<string, unknown>, 
  serverConfig: ServerConfig
): Promise<unknown> {
  const includeServerInfo = Boolean(args['includeServerInfo']);
  const includeSystemInfo = Boolean(args['includeSystemInfo']);

  return withErrorHandling(async () => {
    const logger = getGlobalLogger();
    logger.info('Testing connection', { includeServerInfo, includeSystemInfo });

    // Basic connectivity test
    const connectionTest = {
      status: 'connected',
      timestamp: new Date().toISOString(),
      serverName: serverConfig.serverName,
      serverVersion: serverConfig.serverVersion,
    };

    // Validate docs directory
    const docsPathExists = await fileExists(serverConfig.docsBasePath);
    if (!docsPathExists) {
      logger.warn('Docs directory does not exist, will create on first use', {
        path: serverConfig.docsBasePath,
      });
    }

    const result: Record<string, unknown> = {
      connection: connectionTest,
      docsPath: {
        path: serverConfig.docsBasePath,
        exists: docsPathExists,
      },
    };

    if (includeServerInfo) {
      result['serverInfo'] = buildServerInfo(serverConfig);
    }

    if (includeSystemInfo) {
      result['systemInfo'] = buildSystemInfo();
    }

    logger.info('Connection test successful');
    return result;
  }, 'test_connection');
}