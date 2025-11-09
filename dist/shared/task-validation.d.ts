/**
 * Task validation layer for dual task system
 *
 * Provides validation functions for subagent (ad-hoc) and coordinator (sequential)
 * task tools. These validators enforce namespace and mode restrictions to ensure
 * correct tool usage.
 *
 * Validation Rules:
 * - Subagent tasks: MUST include #slug, MUST be in /docs/ namespace
 * - Coordinator tasks: MUST NOT include #slug, MUST be in /coordinator/ namespace
 */
/**
 * Validate subagent task access (ad-hoc only)
 *
 * Rules:
 * - MUST include taskSlug (ad-hoc mode required)
 * - MUST be within /docs/ namespace
 * - ERROR if sequential mode attempted
 *
 * @param documentPath - Path to the document
 * @param taskSlug - Task slug (required for subagent)
 * @throws {AddressingError} When validation fails
 */
export declare function validateSubagentTaskAccess(documentPath: string, taskSlug?: string): void;
/**
 * Validate coordinator task access (sequential only)
 *
 * Rules:
 * - MUST NOT include taskSlug (sequential mode required)
 * - MUST be in /.ai-prompt-guide/coordinator/ namespace
 * - ERROR if ad-hoc mode attempted
 *
 * @param documentPath - Path to the document
 * @param taskSlug - Task slug (must be undefined for coordinator)
 * @throws {AddressingError} When validation fails
 */
export declare function validateCoordinatorTaskAccess(documentPath: string, taskSlug?: string): void;
/**
 * Validate Main-Workflow requirement for coordinator first task
 * Warning only - doesn't throw, just logs
 *
 * This checks if the first task in a coordinator document has a Main-Workflow
 * field. If missing, it logs a warning but doesn't block execution.
 *
 * @param isFirstTask - Whether this is the first task in the document
 * @param hasMainWorkflow - Whether the task has a Main-Workflow field
 * @param taskTitle - Title of the task for logging
 */
export declare function validateMainWorkflowPresence(isFirstTask: boolean, hasMainWorkflow: boolean, taskTitle: string): void;
//# sourceMappingURL=task-validation.d.ts.map