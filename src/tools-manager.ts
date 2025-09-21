/**
 * Tools manager - compatibility re-export layer
 *
 * This file maintains backward compatibility while the actual implementation
 * has been modularized into separate files under src/session/, src/tools/, and src/shared/
 */

// Session management exports
export type { SessionState } from './session/index.js';
export { SessionStore } from './session/index.js';

// Tool exports
export type { ToolDefinition } from './tools/index.js';
export { getVisibleTools, executeTool } from './tools/index.js';

// Shared utilities exports (for any external usage)
export { performSectionEdit, getDocumentManager } from './shared/index.js';