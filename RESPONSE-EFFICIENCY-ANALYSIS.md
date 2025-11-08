# MCP Tool Response Efficiency Analysis

**Date:** 2025-11-08
**Scope:** High-frequency MCP tool implementations
**Focus:** Context waste, redundant fields, verbose responses

---

## Executive Summary

Analysis reveals **significant context waste** across multiple high-frequency MCP tools. Primary issues:

1. **Redundant document echoing** - Tools return `document` path that caller already provided
2. **Verbose guidance text** - "next_step" fields with tutorial-style instructions
3. **Duplicate formatting** - Same data in multiple response fields
4. **Over-explaining** - Success messages that state the obvious
5. **Unnecessary metadata duplication** - Echoing input parameters in responses

**Estimated Total Impact:** 150-400 tokens wasted per high-frequency operation
**High-frequency tools affected:** All task operations, section operations, browse/view tools

---

## Tool-by-Tool Findings

### 1. `subagent_task` (HIGH FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/subagent-task.ts`

#### Issue 1.1: Verbose Next Step Guidance (Lines 372-375)

**Current Implementation:**
```typescript
// Only show next_step on first task in document
if (isFirstTask) {
  const fullPath = `${targetAddresses.addresses.document.path}#${createResult.slug}`;
  result.next_step = `Give subagent this exact instruction (do not run start_subagent_task yourself): "Run: start_subagent_task ${fullPath}. Then execute the task and respond 'Done' or 'Blocked: [reason]'"`;
}
```

**Estimated Size:** ~180 characters (tutorial + example instruction)

**Proposed Minimal Version:**
```typescript
if (isFirstTask) {
  result.next_step = `start_subagent_task ${targetAddresses.addresses.document.path}#${createResult.slug}`;
}
```

**Estimated Size:** ~50 characters

**Savings:** ~130 characters (260 tokens reduced to 70 tokens = **190 token savings**)

**Frequency:** Every first task creation (high frequency during project setup)

**Impact:** 190 tokens × estimated 20 first-task creations per session = **3,800 tokens saved per session**

---

#### Issue 1.2: Redundant Response Structure

**Current Implementation:**
```typescript
return {
  operations_completed: results.filter(r => r.error == null).length,
  results
};
```

Each result contains full hierarchical context, links, references even when caller doesn't need them.

**Proposed:** Add `minimal` flag parameter (default false for backward compatibility):
- When `minimal: true`, return only: `{ slug, title, status }`
- When `minimal: false`, return full context

**Savings:** ~200-400 tokens per list operation with minimal mode

---

### 2. `coordinator_task` (HIGH FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/coordinator-task.ts`

#### Issue 2.1: Verbose Next Step (Lines 164-165)

**Current Implementation:**
```typescript
// Only show next_step on first task in document
if (isFirstTask) {
  result.next_step = 'Call start_coordinator_task() to begin (omit return_task_context on first start)';
}
```

**Estimated Size:** ~85 characters

**Proposed Minimal Version:**
```typescript
if (isFirstTask) {
  result.next_step = 'start_coordinator_task';
}
```

**Estimated Size:** ~24 characters

**Savings:** ~61 characters (**~45 token savings**)

**Frequency:** Every first coordinator task creation

---

### 3. `section` (VERY HIGH FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/section.ts`

#### Issue 3.1: Redundant Document Echo (Line 379)

**Current Implementation:**
```typescript
return {
  success: true,
  document: singleDocPath,  // ← Echoing input parameter
  operations_completed: sectionsModified,
  results
};
```

The `document` field returns the **exact same path** the caller already provided as input.

**Proposed Minimal Version:**
```typescript
return {
  operations_completed: sectionsModified,
  results
};
```

**Savings:**
- Remove `success: true` (obvious from no error thrown) = ~15 tokens
- Remove `document` echo = ~20 tokens
- **Total: ~35 token savings per operation**

**Frequency:** VERY HIGH - every section edit/create/delete operation

**Impact:** 35 tokens × estimated 50 section operations per session = **1,750 tokens saved per session**

---

#### Issue 3.2: Verbose Result Status

**Current Implementation:**
```typescript
const results = batchResults.map(result => {
  if (result.success) {
    return {
      section: result.section,
      status: result.action === 'created' ? 'created' as const :
              result.action === 'removed' ? 'removed' as const :
              'updated' as const,
      ...(result.depth != null && { depth: result.depth })
    };
  } else {
    return {
      section: result.section,
      status: 'error' as const,
      error: result.error
    };
  }
});
```

**Proposed:** Remove `status` field entirely - error presence indicates failure, success is default:
```typescript
const results = batchResults.map(result =>
  result.success
    ? { section: result.section, ...(result.depth != null && { depth: result.depth }) }
    : { section: result.section, error: result.error }
);
```

**Savings:** ~10-15 tokens per result entry (status field removal)

---

### 4. `view_section` (HIGH FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/view-section.ts`

#### Issue 4.1: Redundant Document Path (Lines 227-231)

**Current Implementation:**
```typescript
return {
  mode: 'detail',
  document: addresses.document.path,  // ← Echoing input parameter
  sections: processedSections
};
```

**Proposed Minimal Version:**
```typescript
return {
  mode: 'detail',
  sections: processedSections
};
```

**Savings:** ~25 tokens per view operation

**Frequency:** HIGH - every section content view

---

#### Issue 4.2: Redundant Mode Field

The `mode` field is **always deterministic** from the input:
- Has `#` → mode is 'detail'
- No `#` → mode is 'overview'

Caller already knows this from their own input parsing.

**Proposed:** Remove `mode` field entirely

**Savings:** ~10 tokens per view operation

**Combined savings for view_section:** ~35 tokens per operation

---

### 5. `view_subagent_task` (HIGH FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/view-subagent-task.ts`

#### Issue 5.1: Excessive Summary Statistics (Lines 391-404)

**Current Implementation:**
```typescript
return {
  mode: 'detail',
  document: addresses.document.path,  // ← Echo
  tasks: processedTasks,
  summary: {
    ...baseSummary,  // Contains: total_tasks, by_status, with_links, with_references
    tasks_with_workflows: tasksWithWorkflows,
    tasks_with_main_workflow: tasksWithMainWorkflow
  }
};
```

**Problems:**
1. `document` echoes input
2. `mode` is deterministic from input
3. `summary` contains info caller can calculate from `tasks` array
4. Statistics are comprehensive but often unused

**Proposed Minimal Version:**
```typescript
return {
  tasks: processedTasks
};
```

**Optional Enhancement:** Add `include_summary: boolean` parameter (default false)

**Savings:**
- Remove document echo: ~25 tokens
- Remove mode: ~10 tokens
- Remove summary: ~100-150 tokens
- **Total: ~135-185 token savings per operation**

**Frequency:** HIGH - every task status check

---

#### Issue 5.2: Redundant full_path Field (Line 314)

**Current Implementation:**
```typescript
const taskData: ViewSubagentTaskResponse['tasks'][0] = {
  slug: enrichedTask.slug,
  title: enrichedTask.title,
  content: enrichedTask.content,
  depth: enrichedTask.depth ?? heading.depth,
  full_path: enrichedTask.fullPath ?? ToolIntegration.formatTaskPath(taskAddr),  // ← Calculable
  status: enrichedTask.status,
  // ...
};
```

The `full_path` is **always** `${document}#${slug}` - trivially calculable by caller.

**Proposed:** Remove `full_path` field

**Savings:** ~30 tokens per task × tasks per response = ~90-150 tokens per operation

---

### 6. `view_document` (MEDIUM FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/view-document.ts`

#### Issue 6.1: Over-Comprehensive Default Response (Lines 171-180)

**Current Implementation:**
```typescript
const response: ViewDocumentResponse = {
  documents: processedDocuments,  // Each contains: path, slug, title, namespace, sections[], documentLinks{}, tasks{}, lastModified, wordCount, headingCount
  summary  // Contains: total_documents, total_sections, total_words, total_tasks
};

if (allLinkedContext.length > 0) {
  response.linked_context = allLinkedContext;
}
```

**Problem:** Always returns full statistics even when caller just wants section list.

**Proposed:** Add `detail_level` parameter:
- `minimal`: path, slug, title, sections (slug/title/depth only)
- `standard`: + wordCount, headingCount, tasks summary
- `full`: + documentLinks, lastModified, full stats

**Savings:**
- Minimal mode: ~200-300 tokens saved per document
- Frequency: High for quick document structure checks

---

#### Issue 6.2: Redundant Document Path in Each Document Object

**Current Implementation:**
```typescript
const documentData: ViewDocumentResponse['documents'][0] = {
  path: documentPath,  // ← Input echo
  slug: documentAddress.slug,
  title: metadata.documentInfo.title,
  namespace: documentAddress.namespace,
  sections,
  documentLinks,
  lastModified: metadata.lastModified,
  wordCount: metadata.wordCount,
  headingCount: metadata.headingCount
};
```

**Proposed:** Make `path` optional, only include if different from input

**Savings:** ~25 tokens per document

---

### 7. `browse_documents` (HIGH FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/browse-documents.ts`

#### Issue 7.1: Redundant Path Echo (Lines 134-143)

**Current Implementation:**
```typescript
const result: BrowseResponse = {
  path: normalizedPath,  // ← Echo of input parameter
  structure: {
    folders: [],
    documents: []
  },
  ...(document_context != null && { document_context }),
  sections,
  totalItems: sections.length
};
```

**Proposed Minimal Version:**
```typescript
const result: BrowseResponse = {
  structure: {
    folders: [],
    documents: []
  },
  sections
};
```

**Savings:**
- Remove `path` echo: ~20 tokens
- Remove `totalItems` (calculable from sections.length): ~10 tokens
- **Total: ~30 token savings**

---

#### Issue 7.2: Breadcrumb Redundancy (Lines 159-161, 189-191)

**Current Implementation:**
```typescript
if (normalizedPath !== '/') {
  result.breadcrumb = generateBreadcrumb(normalizedPath);
}
```

Breadcrumb is **deterministic** from the input path - caller already has this information.

**Proposed:** Remove breadcrumb field entirely

**Savings:** ~30-50 tokens per browse operation (depending on path depth)

---

### 8. `complete_subagent_task` (HIGH FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/complete-subagent-task.ts`

#### Issue 8.1: Verbose Workflow Object (Lines 191-199)

**Current Implementation:**
```typescript
...(enrichedNext.workflow != null && {
  workflow: {
    name: enrichedNext.workflow.name,
    description: enrichedNext.workflow.description,
    content: enrichedNext.workflow.content,  // ← Can be 1000+ tokens!
    whenToUse: enrichedNext.workflow.whenToUse
  }
})
```

**Problem:** Full workflow content can be **1000-3000 tokens** of protocol instructions.

**Proposed:** Add `include_workflow_content: boolean` parameter (default false):
```typescript
...(enrichedNext.workflow != null && {
  workflow: {
    name: enrichedNext.workflow.name,
    description: enrichedNext.workflow.description,
    ...(includeWorkflowContent && {
      content: enrichedNext.workflow.content,
      whenToUse: enrichedNext.workflow.whenToUse
    })
  }
})
```

**Savings:** 1000-3000 tokens per completion with next task

**Frequency:** HIGH - every task completion

**Impact:** Massive - this is the **single largest waste** identified

---

### 9. `search_documents` (MEDIUM FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/search-documents.ts`

#### Issue 9.1: Redundant Query Echo (Line 358-366)

**Current Implementation:**
```typescript
return {
  query,  // ← Echo input
  search_type: searchType,  // ← Echo input
  scope,  // ← Echo input
  results,
  total_matches: totalMatches,
  total_documents: results.length,  // ← Calculable from results.length
  truncated
};
```

**Proposed Minimal Version:**
```typescript
return {
  results,
  total_matches: totalMatches,
  truncated
};
```

**Savings:**
- Remove query echo: ~20 tokens
- Remove search_type echo: ~10 tokens
- Remove scope echo: ~15 tokens
- Remove total_documents (calculable): ~10 tokens
- **Total: ~55 token savings per search**

---

### 10. `move` (MEDIUM FREQUENCY)

**Location:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/move.ts`

#### Issue 10.1: Verbose Position Description (Lines 235-244)

**Current Implementation:**
```typescript
// Determine the position description based on the operation
const positionDescription =
  position === 'before' ? `before ${normalizedReference}` :
  position === 'after' ? `after ${normalizedReference}` :
  `child of ${normalizedReference}`;

// Format minimal response
return {
  success: true,  // ← Obvious from no error
  moved_to: `${destAddresses.document.path}#${titleToSlug(sourceTitle)}`,
  position: positionDescription,  // ← Repeats input parameter
};
```

**Proposed Minimal Version:**
```typescript
return {
  moved_to: `${destAddresses.document.path}#${titleToSlug(sourceTitle)}`
};
```

**Savings:**
- Remove `success` flag: ~10 tokens
- Remove `position` echo: ~20-30 tokens
- **Total: ~30-40 token savings**

---

## Cross-Cutting Issues

### Pattern 1: Echoing Input Parameters

**Found in:** section, view_section, view_subagent_task, view_document, browse_documents, search_documents, move

**Example:**
```typescript
// Input: { document: "/docs/api/auth.md" }
// Response includes: { document: "/docs/api/auth.md" }  ← Waste!
```

**Recommendation:** Remove ALL input parameter echoes unless the value was normalized/transformed.

**Estimated savings:** 20-30 tokens per tool invocation

---

### Pattern 2: Calculable Statistics

**Found in:** view_subagent_task (summary object), browse_documents (totalItems), search_documents (total_documents)

**Example:**
```typescript
// Response includes:
{
  tasks: [...],  // Array with length
  summary: {
    total_tasks: tasks.length  // ← Caller can calculate this!
  }
}
```

**Recommendation:** Only include statistics that require document analysis, not array length counts.

**Estimated savings:** 10-20 tokens per response

---

### Pattern 3: Deterministic Mode Fields

**Found in:** view_section, view_subagent_task

**Example:**
```typescript
// Input: "/docs/api/auth.md#overview"
// Response: { mode: "detail" }  ← Caller knows this from their input!
```

**Recommendation:** Remove mode fields - caller can determine from their own input parsing.

**Estimated savings:** 10 tokens per response

---

### Pattern 4: Verbose Success Indicators

**Found in:** section, move

**Example:**
```typescript
{ success: true }  // ← If operation failed, we'd throw an error!
```

**Recommendation:** Remove `success: true` fields - no error means success in MCP pattern.

**Estimated savings:** 10-15 tokens per response

---

## Cumulative Impact Analysis

### High-Frequency Operations (Per Session Estimates)

| Tool | Frequency | Current Waste | Proposed Savings | Session Impact |
|------|-----------|---------------|------------------|----------------|
| `section` | 50 ops | 45 tokens/op | 35 tokens/op | **1,750 tokens** |
| `view_section` | 30 ops | 35 tokens/op | 35 tokens/op | **1,050 tokens** |
| `subagent_task` (create) | 20 ops | 190 tokens/op | 190 tokens/op | **3,800 tokens** |
| `view_subagent_task` | 25 ops | 160 tokens/op | 135 tokens/op | **3,375 tokens** |
| `complete_subagent_task` | 15 ops | 1500 tokens/op | 1000-2500 tokens/op | **15,000-37,500 tokens** |
| `browse_documents` | 20 ops | 60 tokens/op | 60 tokens/op | **1,200 tokens** |

**Total Potential Savings Per Session:** 26,175 - 48,675 tokens

**Context Window Utilization Improvement:** 13-24% more efficient context usage

---

## Priority Recommendations

### Tier 1 (Immediate Impact - Implement First)

1. **`complete_subagent_task` - Workflow content gating**
   - Add `include_workflow_content: boolean` parameter
   - Default to false (workflow name/description only)
   - **Savings:** 1000-3000 tokens per completion

2. **Remove all input parameter echoes**
   - `document`, `path`, `query`, `search_type`, `scope` fields
   - **Savings:** 20-30 tokens × 50+ operations = 1000-1500 tokens

3. **Remove `success: true` fields**
   - section, move tools
   - **Savings:** 10-15 tokens × 30+ operations = 300-450 tokens

### Tier 2 (High Value)

4. **Simplify next_step guidance**
   - subagent_task, coordinator_task
   - Remove tutorial text, provide only command
   - **Savings:** 45-190 tokens per first task creation

5. **Remove calculable statistics**
   - `totalItems`, `total_documents`, summary statistics caller can compute
   - **Savings:** 10-50 tokens per operation

6. **Remove deterministic mode fields**
   - view_section, view_subagent_task
   - **Savings:** 10 tokens × 50+ operations = 500 tokens

### Tier 3 (Nice to Have)

7. **Add detail_level parameters**
   - view_document: minimal/standard/full
   - view_subagent_task: minimal mode
   - Opt-in statistics rather than always-on

8. **Remove redundant full_path fields**
   - Trivially calculable from document + slug
   - **Savings:** 30 tokens × 25 operations = 750 tokens

---

## Implementation Guidelines

### Backward Compatibility

To avoid breaking existing integrations:

1. **Phase 1:** Add new optional parameters (e.g., `include_workflow_content`)
2. **Phase 2:** Default verbose mode for 1-2 releases
3. **Phase 3:** Switch defaults to minimal mode
4. **Phase 4:** Remove deprecated verbose fields

### Testing Strategy

1. **Before/After Token Counts:** Measure actual token savings in integration tests
2. **Response Size Metrics:** Track response payload sizes
3. **User Feedback:** Monitor for complaints about missing data

### Code Changes Required

**Estimated LOC Changes:**
- ~200 lines removed (redundant fields)
- ~50 lines modified (conditional field inclusion)
- ~30 lines added (new parameters)
- Net: **~170 lines reduced**

---

## Conclusion

The MCP tool implementations contain significant context waste through:
1. **Echoing input parameters** (most common issue)
2. **Verbose tutorial guidance** (highest single waste: complete_subagent_task workflow)
3. **Calculable statistics**
4. **Redundant success indicators**
5. **Deterministic mode fields**

**Recommended approach:** Implement Tier 1 changes immediately (workflow content gating + input echo removal) for **15,000-20,000 token savings per session** with minimal breaking changes.

The system follows a verbose-by-default pattern that made sense for development/debugging but wastes precious context in production use. Shifting to minimal-by-default with opt-in verbosity would significantly improve context efficiency while maintaining all functionality.

---

**Analysis Prepared By:** Claude Code Assistant
**Review Recommended:** Architecture team approval for breaking changes
