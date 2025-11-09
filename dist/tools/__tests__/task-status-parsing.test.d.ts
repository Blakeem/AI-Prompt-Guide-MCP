/**
 * Regression test for BUG #3: Task Status Parsing Incorrect
 *
 * This test ensures that the extractMetadata function correctly parses
 * all status formats used in task sections:
 * - * Status: value (star format)
 * - - Status: value (dash format)
 * - **Status:** value (bold format)
 *
 * Issue: extractMetadata only supported star and dash formats,
 * but many documents use the bold format which was being ignored,
 * causing all tasks to show as "pending" regardless of actual status.
 */
export {};
//# sourceMappingURL=task-status-parsing.test.d.ts.map