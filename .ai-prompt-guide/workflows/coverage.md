---
title: "Coverage"
description: "🧪 TEST: Add comprehensive test coverage to existing code"
whenToUse: "Adding tests to legacy code or improving coverage for critical code paths"
---

# Workflow: Add Test Coverage

## [CRITICAL RULES]
- **Coordinator:** Use `coordinator_task` (NOT TodoWrite) - persists across sessions
- **Delegation:** Instruct subagent to run `start_subagent_task` - never run it yourself

## [SETUP] Analysis & Task Creation
1. Analyze code → identify coverage gaps, prioritize by regression risk
2. Create coordinator_task list (concise, focused)
3. Create subagent_task for each target:
   - Specify scope: public APIs, business logic, error paths
   - Add @references: @/docs/codebase/module or @/docs/test-patterns#unit-tests
4. Call start_coordinator_task() (omit return_task_context initially)

## [EXECUTION] Per-Task Loop
**Delegate to subagent:**
"Run: start_subagent_task /docs/path.md#slug
Write passing tests using AAA pattern, respond 'Done' or 'Blocked: [reason]'"

**Subagent executes:**
- Runs start_subagent_task (loads context)
- Writes tests: Arrange inputs/mocks → Act (execute) → Assert outputs/behavior
- Runs test suite → verifies pass

**Coordinator reviews against [TEST STANDARDS]:**
- IF issues: create fix task, repeat
- git add <test_files>
- Call complete_coordinator_task() → next_task
- IF next_task: continue loop

## [VERIFICATION] Final Quality Gate
- Run full test suite → no regressions
- Verify coverage improvement
- Report: "Test coverage improved. Ready for review."

## [TEST STANDARDS] Quality Criteria

**Test Stable Contracts (regression prevention):**
- Public APIs, I/O transformations, business rules, critical workflows
- Avoid: private details, library internals, trivial code, volatile code

**Mock External Dependencies:**
- APIs, databases, file system, time/randomness

**Quality Gates:**
- Assert behavior (not internal state)
- Deterministic, order-independent
- One concept per test with clear names
- Minimal setup complexity

## [TOOL REFERENCE]
**Coordinator:** `coordinator_task`, `start_coordinator_task()`, `complete_coordinator_task()`
**Subagent:** `subagent_task`, `start_subagent_task("/docs/path.md#slug")`, `complete_subagent_task()`
