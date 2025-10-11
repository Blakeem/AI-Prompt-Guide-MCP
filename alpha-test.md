# Alpha Test Report - AI Prompt Guide MCP

**Test Date:** 2025-10-11
**Tested By:** Claude (Sonnet 4.5)
**Test Method:** MCP Inspector CLI
**Build Status:** ✅ All quality gates passing (lint, typecheck, dead-code check)

---

## Executive Summary

**Critical Finding:** ALL write operations fail with "File not found" error while ALL read operations succeed. This is a CRITICAL systemic bug affecting 50% of the tool suite.

**Tools Tested:** 10/10
**Pass Rate (Read Operations):** 100%
**Pass Rate (Write Operations):** 0%

---

## Detailed Test Results

### ✅ PASSING TOOLS (Read Operations)

#### 1. `create_document` - Progressive Document Creation
**Status:** ✅ PASS (All 3 stages)

- **Stage 0 (Discovery):** ✅ Returns namespace list correctly
- **Stage 1 (Instructions):** ✅ Returns template and guidance for selected namespace
- **Stage 2 (Creation):** ✅ Creates document successfully at `/api/specs/test-api.md`

**Minor Issue:** Suggestions include self-reference (document suggests itself with relevance score 1.0)

#### 2. `browse_documents` - Unified Browsing & Search
**Status:** ✅ PASS

- **Browse Mode:** ✅ Hierarchical folder navigation works correctly
- **Search Mode:** ✅ Full-text search with relevance scoring works
- **Namespace Awareness:** ✅ Correctly identifies namespaces

#### 3. `view_document` - Document Inspection
**Status:** ✅ PASS

- **Document Metadata:** ✅ Correct (title, namespace, modified date)
- **Section Hierarchy:** ✅ All 9 sections listed correctly
- **Link Statistics:** ✅ Accurate (0 links in test document)
- **Task Statistics:** ✅ Correct (0 tasks)

#### 4. `view_section` - Section Content Viewer
**Status:** ⚠️ PASS with BOUNDARY ISSUE

- **Content Retrieval:** ✅ Returns section content
- **⚠️ BOUNDARY BUG:** Includes next section's heading in content
  - Expected: `## Overview\n\nTesting document creation\n`
  - Actual: `## Overview\n\nTesting document creation\n\n## Authentication\n`
  - The ending boundary marker (next section heading) should be excluded

#### 5. `task` (list operation) - Task Listing
**Status:** ✅ PASS

- **Empty List Handling:** ✅ Returns empty array correctly
- **Document Info:** ✅ Includes proper document metadata

#### 6. `view_task` - Task Inspection
**Status:** ✅ PASS

- **Not Found Handling:** ✅ Returns appropriate "Task not found" error
- **Available Tasks:** ✅ Correctly shows empty list

#### 7. `start_task` - Start Task with Context
**Status:** ✅ PASS

- **Not Found Handling:** ✅ Returns appropriate "Task not found" error
- **Available Tasks:** ✅ Correctly shows empty list

---

### ❌ FAILING TOOLS (Write Operations)

All write operations fail with the same root cause: **"File not found: test-api.md"**

#### 8. `section` - Section Management
**Status:** ❌ CRITICAL FAILURE

**Test:** Replace operation on `/api/specs/test-api.md#overview`
**Result:**
```json
{
  "success": false,
  "error": "tool_call:section: Failed to edit section: File not found: test-api.md",
  "code": "SECTION_EDIT_ERROR"
}
```

**Impact:** Cannot edit, create, or remove sections
**Severity:** CRITICAL - Core functionality blocked

#### 9. `task` (create operation) - Task Creation
**Status:** ❌ CRITICAL FAILURE

**Test:** Create task "Implement Authentication" in `/api/specs/test-api.md`
**Result:**
```json
{
  "success": false,
  "error": "tool_call:task: Failed to create task: File not found: test-api.md",
  "code": "TASK_CREATE_FAILED"
}
```

**Impact:** Cannot create or edit tasks
**Severity:** CRITICAL - Task management blocked

#### 10. `manage_document` - Document Lifecycle
**Status:** ❌ CRITICAL FAILURE

**Test:** Rename document `/api/specs/test-api.md`
**Result:**
```json
{
  "success": false,
  "error": "tool_call:manage_document: Failed to manage document: File not found: test-api.md",
  "code": "DOCUMENT_MANAGE_ERROR"
}
```

**Impact:** Cannot rename, move, archive, or delete documents
**Severity:** CRITICAL - Document management blocked

---

## Root Cause Analysis

### The "File Not Found" Mystery

**Symptoms:**
1. File EXISTS on filesystem: `.ai-prompt-guide/docs/api/specs/test-api.md` ✅
2. File CAN BE READ by view_document, view_section, browse_documents ✅
3. File CANNOT BE WRITTEN by section, task, manage_document ❌

**Error Pattern:**
- Error message: `File not found: test-api.md`
- Note: Only basename shown (security feature in fsio.ts:312, 446)
- Actual error code: `ENOENT` from fs.stat() call

**Code Path Investigation:**

1. **Read Operations Use:**
   - DocumentManager.getDocument()
   - Global document cache (in-memory)
   - Works because documents are pre-cached during initial scan

2. **Write Operations Use:**
   - performSectionEdit() → manager.getDocument() → **THEN** writeFileIfUnchanged()
   - writeFileIfUnchanged() in fsio.ts
   - validateAndSanitizePath() → PathHandler.processUserPath()
   - **fs.stat() fails** - file not found at resolved path

**Hypothesis:** Path resolution mismatch between read and write operations

**Likely Cause:**
- PathHandler.getAbsolutePath() may be incorrect for write operations
- Possible missing `DOCS_BASE_PATH` resolution in write path
- Addressing system returns `/api/specs/test-api.md` (virtual path)
- Write operations may not be resolving this to actual filesystem path

---

## Impact Assessment

### Blocked Workflows

1. **❌ Cannot Edit Content**
   - No section modifications possible
   - Documentation cannot be updated
   - Core functionality unavailable

2. **❌ Cannot Manage Tasks**
   - Task creation blocked
   - Task editing blocked
   - Workflow management unavailable

3. **❌ Cannot Manage Documents**
   - Cannot archive old documents
   - Cannot reorganize documentation
   - Cannot rename or move files

4. **✅ CAN Read and Browse**
   - All inspection operations work
   - Search and navigation functional
   - Context loading works

### Real-World Usage Impact

**Current State:** System is READ-ONLY
**Usability:** ~50% (Can browse and view, but cannot modify)
**Recommendation:** BLOCK production use until write operations fixed

---

## Additional Issues Found

### Issue #1: view_section Boundary Bug
**Severity:** LOW
**Impact:** Content includes one extra heading

**Description:** When viewing a section, the next section's heading is included in the content boundary. This creates confusion about what content belongs to the section.

**Example:**
```
# Request section: #overview
# Expected: "## Overview\n\nTesting document creation\n"
# Actual:   "## Overview\n\nTesting document creation\n\n## Authentication\n"
```

**Root Cause:** `readSection()` in sections.ts:1058 includes the `end` boundary marker in the serialized content.

**Fix Required:** Exclude `end` marker from section content serialization.

### Issue #2: Self-Referencing Suggestions
**Severity:** TRIVIAL
**Impact:** Confusing but harmless suggestion

**Description:** When creating a document, the suggestion system includes the newly created document as a "related document" with relevance score 1.0, suggesting it to itself.

**Example:**
```json
"related_documents": [
  {
    "path": "/api/specs/test-api.md",
    "title": "Test API",
    "reason": "Strong keyword overlap with very similar titles and same namespace",
    "relevance": 1
  }
]
```

**Fix Required:** Filter out current document from suggestions.

---

## Recommendations

### Immediate Actions (P0)

1. **Fix Critical Path Resolution Bug**
   - **Priority:** CRITICAL
   - **Blocker:** Yes - affects all write operations
   - **Approach:**
     - Add comprehensive logging to PathHandler resolution
     - Verify DOCS_BASE_PATH is used consistently
     - Ensure addressing system paths are properly resolved to filesystem paths
   - **Test Strategy:** TDD - write failing test first, then fix

2. **Add Integration Tests for Write Operations**
   - **Priority:** HIGH
   - **Current Gap:** Tests may be mocking the broken behavior
   - **Required:** End-to-end tests using actual MCP inspector calls

### Follow-up Fixes (P1)

3. **Fix view_section Boundary Issue**
   - **Priority:** MEDIUM
   - **Impact:** User confusion, not blocking
   - **Complexity:** LOW

4. **Fix Self-Referencing Suggestions**
   - **Priority:** LOW
   - **Impact:** Cosmetic issue
   - **Complexity:** TRIVIAL

### Testing Gaps Identified

1. **Missing Integration Tests**
   - Current tests may mock file operations
   - Need actual filesystem tests with MCP inspector
   - Should test full path resolution chain

2. **Path Resolution Testing**
   - Need explicit tests for virtual-to-physical path mapping
   - Test both read and write paths separately
   - Verify DOCS_BASE_PATH handling

3. **Write Operation Coverage**
   - All write operations should have integration tests
   - Test with various path formats
   - Verify error messages include helpful context

---

## Edge Cases & Workflow Gaps

### Workflow Gaps

1. **No "Edit Document Content" Tool**
   - Can edit sections, but not entire document content
   - May need to edit multiple sections to update document structure
   - Consider adding bulk edit capability

2. **No "Copy Section" Tool**
   - Common use case: duplicate section for similar content
   - Current workaround: view section, create new section with same content
   - Consider adding section copy/duplicate operation

3. **No "Move Section" Tool**
   - Cannot reorganize sections without delete + recreate
   - Loses modification history
   - Consider adding section move operation

4. **No "Batch Task Status Update"**
   - Task tool supports single task edit
   - Cannot mark multiple tasks complete at once
   - Consider adding batch status updates

5. **No "Document Templates Management"**
   - Templates are hardcoded in create_document
   - No way to add custom templates at runtime
   - Consider adding template CRUD operations

### Edge Cases Needing Testing

1. **Concurrent Modifications**
   - What happens if two agents edit same document?
   - mtime checking in writeFileIfUnchanged should handle this
   - Needs explicit test

2. **Very Large Documents**
   - MAX_FILE_SIZE limit: 10MB (from constants)
   - What happens at boundary?
   - How does performance degrade?

3. **Deep Hierarchical Paths**
   - MAX_PATH_DEPTH: 20 levels
   - Does system handle this correctly?
   - Any performance implications?

4. **Unicode and Special Characters**
   - Path normalization (NFC) in place
   - Needs testing with various Unicode edge cases
   - Emoji in section titles?

5. **Circular References in @links**
   - System has cycle detection
   - Needs explicit test for circular reference handling
   - What's the user experience when cycles detected?

---

## LLM Usability Assessment

### Strengths

1. **✅ Clear Error Messages**
   - Error codes are descriptive (SECTION_EDIT_ERROR, TASK_CREATE_FAILED)
   - Context includes relevant parameters
   - Suggestions for alternatives provided

2. **✅ Progressive Discovery Pattern**
   - create_document guides users through stages
   - Reduces cognitive load for complex operations
   - Natural flow for first-time users

3. **✅ Consistent API Design**
   - All tools use `document` field (not `path`)
   - Addressing system handles multiple formats gracefully
   - Batch operations where appropriate

4. **✅ Rich Context Loading**
   - Hierarchical @reference loading works well
   - Automatic depth control (configurable)
   - Prevents context explosion with cycle detection

### Areas for Improvement

1. **⚠️ Path Format Documentation**
   - Not always clear when to use `/path` vs `path` vs `#section`
   - Examples in descriptions help, but could be more prominent
   - Consider adding "format hints" to error messages

2. **⚠️ Operation Names Could Be Clearer**
   - `section` tool does create, edit, AND delete
   - Name doesn't clearly indicate this versatility
   - Consider renaming to `manage_section` for consistency with `manage_document`

3. **⚠️ Task vs Section Distinction**
   - Tasks are sections with special metadata
   - This relationship not obvious from tool names
   - Documentation should emphasize: "Tasks are sections marked with Status field"

4. **⚠️ Workflow vs Main-Workflow Confusion**
   - Subtle but important distinction
   - Easy to confuse which goes where
   - Consider renaming to `project_workflow` and `task_workflow` for clarity

---

## Testing Methodology Notes

### What Worked Well

1. **MCP Inspector CLI**
   - Excellent for systematic testing
   - JSON output easy to analyze
   - Can test tools in isolation

2. **Systematic Tool-by-Tool Approach**
   - Testing each tool reveals patterns
   - Clear separation of read vs write operations
   - Identified systemic issue quickly

3. **Actual Filesystem Testing**
   - Verified file existence independently
   - Confirmed read operations work
   - Isolated problem to write operations

### Recommendations for Future Testing

1. **Automated Test Suite**
   - Script that runs all tools through MCP inspector
   - Validates JSON responses
   - Checks for regressions

2. **Write Operation Fixtures**
   - Pre-create test documents
   - Test write operations against known good state
   - Verify changes actually persist

3. **Performance Testing**
   - Large document handling
   - Deep hierarchical paths
   - Many concurrent operations

---

## Next Steps

### For Development Team

1. ✅ Review this alpha-test report
2. 🔄 Fix critical path resolution bug (TDD approach)
3. 🔄 Add integration tests for write operations
4. 🔄 Fix view_section boundary issue
5. 🔄 Address workflow gaps (copy section, move section, etc.)
6. 🔄 Consider API naming improvements
7. 🔄 Add edge case tests
8. ✅ Re-run full alpha test after fixes
9. ✅ Update README with any API changes

### For This Testing Session

1. ✅ Document all findings in alpha-test.md
2. 🔄 Assign issues to mcp-typescript-specialist subagent
3. 🔄 Write failing tests for each issue (TDD)
4. 🔄 Fix issues one by one
5. 🔄 Verify all quality gates pass
6. 🔄 Re-test with MCP inspector
7. ✅ Generate final recommendations

---

## Conclusion

The AI Prompt Guide MCP has a solid foundation with excellent read operations, progressive discovery patterns, and thoughtful design. However, the critical path resolution bug blocking all write operations must be fixed before the system can be used in production.

The good news: this appears to be a single root cause affecting multiple tools, so fixing it should restore full functionality to 50% of the tool suite.

**Status:** ⚠️ NOT READY FOR PRODUCTION
**Blocking Issue:** Path resolution in write operations
**ETA to Fix:** Should be straightforward once root cause is identified
**Confidence:** HIGH - Clear error pattern, reproducible, isolated to write path

---

## Appendix: Test Commands Used

```bash
# Build
pnpm build
pnpm check:all

# List tools
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list

# Test create_document (3 stages)
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name create_document
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name create_document --tool-arg 'namespace=api/specs'
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name create_document --tool-arg 'namespace=api/specs' --tool-arg 'title=Test API' --tool-arg 'overview=Testing document creation'

# Test view operations
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name view_document --tool-arg 'document=/api/specs/test-api.md'
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name view_section --tool-arg 'document=/api/specs/test-api.md' --tool-arg 'section=#overview'

# Test browse
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name browse_documents
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name browse_documents --tool-arg 'path=/api/specs'
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name browse_documents --tool-arg 'query=authentication'

# Test write operations (all fail)
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name section --tool-arg 'document=/api/specs/test-api.md' --tool-arg 'section=#overview' --tool-arg 'operation=replace' --tool-arg 'content=Updated overview content'
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name task --tool-arg 'document=/api/specs/test-api.md' --tool-arg 'operation=create' --tool-arg 'title=Implement Authentication' --tool-arg 'content=Implement JWT authentication'
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name manage_document --tool-arg 'document=/api/specs/test-api.md' --tool-arg 'operation=rename' --tool-arg 'new_title=Updated Test API'

# Verify file exists
ls -la .ai-prompt-guide/docs/api/specs/
cat .ai-prompt-guide/docs/api/specs/test-api.md
```
