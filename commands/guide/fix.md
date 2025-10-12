---
description: Fix bug with systematic triage workflow
---

# Fix Bug

## User Request

$ARGUMENTS

## Task Overview

Debug and fix a reported issue using systematic failure triage and minimal reproduction.

## Workflow

Use the **Failure Triage & Minimal Repro** workflow:
- Read: `.ai-prompt-guide/workflows/failure-triage-repro.md`

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

- `search_documents` - Find related code across codebase
- `view_section` - Examine specific code sections
- `task` - Track fix progress and notes
- `section` - Update documentation if needed

## Deliverables

- Root cause identified and documented
- Fix implemented with test
- Test reproduces bug before fix
- Test passes after fix
- Added guardrails (assertions, logging)
- No regressions introduced
