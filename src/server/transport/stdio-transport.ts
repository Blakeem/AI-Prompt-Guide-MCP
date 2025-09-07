/**
 * STDIO transport configuration
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Create and configure STDIO transport
 */
export function createStdioTransport(): StdioServerTransport {
  return new StdioServerTransport();
}