/**
 * Tests for view_document include_linked feature
 *
 * Issue: Setting include_linked=true doesn't add linked_context field to response
 * Root Cause: normalizePath in link-utils.ts doesn't add .md extension, causing document lookup failures
 */
export {};
//# sourceMappingURL=view-document.linked-context.test.d.ts.map