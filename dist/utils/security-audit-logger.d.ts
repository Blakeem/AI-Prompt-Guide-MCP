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
 * Security event types for classification
 */
export type SecurityEventType = 'PATH_TRAVERSAL' | 'INVALID_EXTENSION' | 'DANGEROUS_CHARS';
/**
 * Security violation event data
 */
export interface SecurityViolationEvent {
    /** Type of security violation */
    readonly type: SecurityEventType;
    /** Operation being performed when violation occurred */
    readonly operation: string;
    /** Path that triggered the violation (user-provided) */
    readonly attemptedPath: string;
    /** Resolved path if available (may differ from attempted) */
    readonly resolvedPath?: string;
    /** Session identifier if available */
    readonly sessionId?: string;
    /** ISO timestamp of violation */
    readonly timestamp: string;
}
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
export declare class SecurityAuditLogger {
    /**
     * Log a security violation with full context
     *
     * Outputs structured JSON log with [SECURITY_AUDIT] prefix
     * for easy filtering and monitoring.
     *
     * @param event - Security violation event data
     */
    logSecurityViolation(event: SecurityViolationEvent): void;
}
//# sourceMappingURL=security-audit-logger.d.ts.map