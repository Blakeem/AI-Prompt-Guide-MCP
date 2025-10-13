---
description: Fix bug with systematic triage workflow
---

# Fix Bug

## User Request

$ARGUMENTS

## Task Overview

Debug and fix a reported issue using systematic failure triage and minimal reproduction.

## Workflow

Use the **failure-triage-repro** workflow via the `get_workflow` tool:
```typescript
get_workflow({ workflow: "failure-triage-repro" })
```

This workflow systematically isolates root cause through minimal reproduction and bisection.

## Process

### 1. Capture Complete Context
Gather all environmental information:
- Inputs (data, parameters, state)
- Environment (OS, runtime, versions, dependencies)
- Configuration (settings, feature flags)
- Timing (when started, frequency, patterns)
- Artifacts (logs, screenshots, stack traces)
- Commit/version where issue occurs

### 2. Reproduce Locally
- Set up identical environment
- Follow exact reproduction steps
- Confirm failure occurs consistently

### 3. Minimize to Smallest Failing Case
- Remove one input/condition at a time
- Keep removing until failure disappears
- Add back last removed element
- **Goal:** Smallest possible test case that reproduces bug

### 4. Localize by Bisection
Use binary search to isolate root cause:
- Git commits (`git bisect`)
- Feature flags (toggle on/off)
- Input data (halve dataset)
- Configuration options

### 5. Classify Failure Type
Identify the category:
- Logic error (algorithm bug, off-by-one)
- Data contract violation (type mismatch, null handling)
- Concurrency issue (race condition, deadlock)
- Resource exhaustion (memory, connections)
- Environment difference (config, dependencies)

Document the violated invariant.

### 6. Create Discriminating Test
Write test that:
- Fails on the bad path (reproduces bug)
- Passes after fix (verifies solution)
- Choose appropriate level (unit/integration/property-based)

### 7. Fix & Harden
- Implement fix
- Verify test passes
- Add assertions to catch earlier
- Add logging/metrics for production detection
- Document root cause

## MCP Tools

**Investigation Phase:**

**search_documents** - Find related code patterns:
```typescript
search_documents({
  query: "authentication error handling",
  output_mode: "content",
  type: "js"  // or "ts", "py", etc.
})
```

**browse_documents** - Understand codebase structure:
```typescript
browse_documents({
  path: "/api",
  depth: 2
})
```

**view_section** - Examine specific implementations:
```typescript
view_section({
  document: "/api/auth.md#error-handling"
})
```

**Tracking Phase:**

**task** - Document bug investigation and fix:
```typescript
task({
  document: "/bugs/auth-error.md",
  operations: [{
    operation: "create",
    title: "Fix Token Validation Bug",
    content: "Root cause: JWT validation not checking expiry.\n\nWorkflow: failure-triage-repro\n\n@/specs/auth-api.md#jwt-validation"
  }]
})
```

**Documentation Updates:**

**section** - Update specifications or notes:
```typescript
section({
  document: "/specs/auth-api.md",
  operations: [{
    section: "known-issues",
    operation: "append",
    content: "\n\n### Fixed: JWT Expiry Validation\nFixed in commit abc123..."
  }]
})
```

## Deliverables

- Root cause identified and documented
- Fix implemented with test
- Test reproduces bug before fix
- Test passes after fix
- Added guardrails (assertions, logging)
- No regressions introduced
