/**
 * Logging middleware for request/response tracking
 */
/**
 * Request/Response logging utilities
 */
export declare class RequestLogger {
    /**
     * Log incoming tool request
     */
    static logToolRequest(toolName: string, args: Record<string, unknown>): void;
    /**
     * Log tool request completion
     */
    static logToolSuccess(toolName: string): void;
    /**
     * Log prompt request
     */
    static logPromptRequest(promptName: string): void;
    /**
     * Log list tools request
     */
    static logListToolsRequest(sessionId: string, toolCount: number, hasStartedWorkflow: boolean): void;
    /**
     * Log list prompts request
     */
    static logListPromptsRequest(): void;
}
//# sourceMappingURL=logging.d.ts.map