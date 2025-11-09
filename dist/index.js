#!/usr/bin/env node
/**
 * MCP server entry point for Spec-Docs markdown CRUD operations
 */
import { createMCPServer } from './server/server-factory.js';
/**
 * Main entry point
 */
async function main() {
    const server = await createMCPServer();
    await server.start();
}
// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map