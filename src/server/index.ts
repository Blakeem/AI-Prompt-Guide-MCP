/**
 * Main server entry point (minimal)
 */

export { createMCPServer } from './server-factory.js';
export * from './request-handlers/index.js';
export * from './middleware/index.js';
export * from './transport/stdio-transport.js';