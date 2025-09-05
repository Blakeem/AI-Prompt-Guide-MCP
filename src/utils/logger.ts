/**
 * Centralized logging utility with sanitization
 */

import { LOG_LEVELS } from '../constants/defaults.js';
import type { Logger, ServerConfig } from '../types/index.js';

/**
 * Log level hierarchy for filtering
 */
const LOG_LEVEL_PRIORITY = {
  [LOG_LEVELS.ERROR]: 0,
  [LOG_LEVELS.WARN]: 1,
  [LOG_LEVELS.INFO]: 2,
  [LOG_LEVELS.DEBUG]: 3,
} as const;

/**
 * Sanitizes sensitive information from log context
 */
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = new Set([
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'credential',
    'api_key',
    'apikey',
  ]);

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.has(lowerKey) || lowerKey.includes('pass') || lowerKey.includes('secret')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 500) {
      // Truncate very long strings
      sanitized[key] = value.substring(0, 497) + '...';
    } else if (value instanceof Error) {
      sanitized[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Formats log message with timestamp and level
 */
function formatLogMessage(level: string, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5);
  
  let formatted = `${timestamp} [${levelUpper}] ${message}`;
  
  if (context && Object.keys(context).length > 0) {
    const sanitized = sanitizeContext(context);
    formatted += ` | Context: ${JSON.stringify(sanitized)}`;
  }
  
  return formatted;
}

/**
 * Console logger implementation
 */
class ConsoleLogger implements Logger {
  private readonly levelPriority: number;

  constructor(logLevel: string) {
    this.levelPriority = LOG_LEVEL_PRIORITY[logLevel as keyof typeof LOG_LEVEL_PRIORITY] ?? 2;
  }

  private shouldLog(level: string): boolean {
    const targetPriority = LOG_LEVEL_PRIORITY[level as keyof typeof LOG_LEVEL_PRIORITY];
    return targetPriority !== undefined && targetPriority <= this.levelPriority;
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      const formatted = formatLogMessage(LOG_LEVELS.ERROR, message, context);
      console.error(formatted);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      const formatted = formatLogMessage(LOG_LEVELS.WARN, message, context);
      console.warn(formatted);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      const formatted = formatLogMessage(LOG_LEVELS.INFO, message, context);
      console.info(formatted);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      const formatted = formatLogMessage(LOG_LEVELS.DEBUG, message, context);
      console.debug(formatted);
    }
  }
}

/**
 * Silent logger for testing (logs nothing)
 */
class SilentLogger implements Logger {
  error(): void {
    // Silent
  }

  warn(): void {
    // Silent
  }

  info(): void {
    // Silent
  }

  debug(): void {
    // Silent
  }
}

/**
 * Creates a logger instance based on configuration
 */
export function createLogger(config: ServerConfig): Logger {
  // Use silent logger in test mode unless explicitly overridden
  if (process.env['NODE_ENV'] === 'test' && !process.env['ENABLE_TEST_LOGGING']) {
    return new SilentLogger();
  }

  return new ConsoleLogger(config.logLevel);
}

/**
 * Creates a logger with specified level (for testing)
 */
export function createLoggerWithLevel(level: string): Logger {
  return new ConsoleLogger(level);
}

/**
 * Creates a silent logger (for testing)
 */
export function createSilentLogger(): Logger {
  return new SilentLogger();
}

/**
 * Global logger instance (set by server initialization)
 */
let globalLogger: Logger | null = null;

/**
 * Sets the global logger instance
 */
export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Gets the global logger instance
 */
export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    // Fallback to console logger with info level
    globalLogger = new ConsoleLogger(LOG_LEVELS.INFO);
  }
  return globalLogger;
}