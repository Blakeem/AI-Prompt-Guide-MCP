/**
 * Security Audit Logger for tracking security violations
 *
 * This module provides structured logging for security-related events
 * with comprehensive context for incident response and forensic analysis.
 *
 * All security violations are logged with:
 * - Event type classification
 * - Operation context
 * - Path information (attempted and resolved)
 * - Timestamp
 * - Optional session identifier
 */
/**
 * Security Audit Logger
 *
 * Provides structured logging for security violations with
 * consistent formatting and comprehensive context.
 *
 * @example Basic usage
 * ```typescript
 * const logger = new SecurityAuditLogger();
 * logger.logSecurityViolation({
 *   type: 'PATH_TRAVERSAL',
 *   operation: 'readFile',
 *   attemptedPath: '../../../etc/passwd',
 *   resolvedPath: '/etc/passwd',
 *   timestamp: new Date().toISOString()
 * });
 * ```
 */
export class SecurityAuditLogger {
    /**
     * Log a security violation with full context
     *
     * Outputs structured JSON log with [SECURITY_AUDIT] prefix
     * for easy filtering and monitoring.
     *
     * @param event - Security violation event data
     */
    logSecurityViolation(event) {
        // Construct structured log entry
        const logEntry = {
            severity: 'SECURITY_VIOLATION',
            type: event.type,
            operation: event.operation,
            attemptedPath: event.attemptedPath,
            ...(event.resolvedPath != null && { resolvedPath: event.resolvedPath }),
            ...(event.sessionId != null && { sessionId: event.sessionId }),
            timestamp: event.timestamp
        };
        // Log with security audit prefix for monitoring/alerting
        console.warn('[SECURITY_AUDIT]', JSON.stringify(logEntry, null, 2));
    }
}
//# sourceMappingURL=security-audit-logger.js.map