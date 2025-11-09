/**
 * Centralized logging utility with sanitization
 */
import { LOG_LEVELS } from '../constants/defaults.js';
/**
 * Log level hierarchy for filtering
 */
const LOG_LEVEL_PRIORITY = {
    [LOG_LEVELS.ERROR]: 0,
    [LOG_LEVELS.WARN]: 1,
    [LOG_LEVELS.INFO]: 2,
    [LOG_LEVELS.DEBUG]: 3,
};
/**
 * Sanitizes sensitive information from log context
 */
function sanitizeContext(context) {
    const sanitized = {};
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
        }
        else if (typeof value === 'string' && value.length > 500) {
            // Truncate very long strings
            sanitized[key] = `${value.substring(0, 497)}...`;
        }
        else if (value instanceof Error) {
            sanitized[key] = {
                name: value.name,
                message: value.message,
                stack: value.stack,
            };
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
/**
 * Formats log message with timestamp and level
 */
function formatLogMessage(level, message, context) {
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
class ConsoleLogger {
    levelPriority;
    constructor(logLevel) {
        this.levelPriority = LOG_LEVEL_PRIORITY[logLevel] ?? 2;
    }
    shouldLog(level) {
        const targetPriority = LOG_LEVEL_PRIORITY[level];
        return targetPriority !== undefined && targetPriority <= this.levelPriority;
    }
    error(message, context) {
        if (this.shouldLog(LOG_LEVELS.ERROR)) {
            const formatted = formatLogMessage(LOG_LEVELS.ERROR, message, context);
            console.error(formatted);
        }
    }
    warn(message, context) {
        if (this.shouldLog(LOG_LEVELS.WARN)) {
            const formatted = formatLogMessage(LOG_LEVELS.WARN, message, context);
            console.warn(formatted);
        }
    }
    info(message, context) {
        if (this.shouldLog(LOG_LEVELS.INFO)) {
            const formatted = formatLogMessage(LOG_LEVELS.INFO, message, context);
            // Use console.error for info level logging to comply with ESLint rules
            console.error(formatted);
        }
    }
    debug(message, context) {
        if (this.shouldLog(LOG_LEVELS.DEBUG)) {
            const formatted = formatLogMessage(LOG_LEVELS.DEBUG, message, context);
            // Use console.error for debug level logging to comply with ESLint rules
            console.error(formatted);
        }
    }
}
/**
 * Silent logger for testing (logs nothing)
 */
class SilentLogger {
    error() {
        // Silent
    }
    warn() {
        // Silent
    }
    info() {
        // Silent
    }
    debug() {
        // Silent
    }
}
/**
 * Creates a logger instance based on configuration
 */
export function createLogger(config) {
    // Use silent logger in test mode unless explicitly overridden
    if (process.env['NODE_ENV'] === 'test' && process.env['ENABLE_TEST_LOGGING'] == null) {
        return new SilentLogger();
    }
    return new ConsoleLogger(config.logLevel);
}
/**
 * Creates a silent logger (for testing)
 */
export function createSilentLogger() {
    return new SilentLogger();
}
/**
 * Global logger instance (set by server initialization)
 */
let globalLogger = null;
/**
 * Sets the global logger instance
 */
export function setGlobalLogger(logger) {
    globalLogger = logger;
}
/**
 * Gets the global logger instance
 */
export function getGlobalLogger() {
    globalLogger ??= new ConsoleLogger(LOG_LEVELS.INFO);
    return globalLogger;
}
//# sourceMappingURL=logger.js.map