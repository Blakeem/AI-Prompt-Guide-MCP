/**
 * Centralized logging utility with sanitization
 */
import type { Logger, ServerConfig } from '../types/index.js';
/**
 * Creates a logger instance based on configuration
 */
export declare function createLogger(config: ServerConfig): Logger;
/**
 * Creates a silent logger (for testing)
 */
export declare function createSilentLogger(): Logger;
/**
 * Sets the global logger instance
 */
export declare function setGlobalLogger(logger: Logger): void;
/**
 * Gets the global logger instance
 */
export declare function getGlobalLogger(): Logger;
//# sourceMappingURL=logger.d.ts.map