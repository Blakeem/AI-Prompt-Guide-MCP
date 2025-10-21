---
title: "Coverage"
description: "🧪 TEST: Add comprehensive test coverage to existing code"
whenToUse: "Adding tests to legacy code or improving coverage for critical code paths"
---

# Workflow: Add Test Coverage

1. [Coordinator] Analyze code to identify coverage gaps and test targets
2. [Coordinator] Prioritize targets by regression risk and stability
3. [Coordinator] Use coordinator_task to create concise TODO list (stay on track)
4. [Coordinator] Use subagent_task to create test tasks for each target:
   • Specify what to test (public API, business logic, error handling)
   • Specify test approach (mocks for external dependencies)
   • Add @references to code files, existing tests, test patterns
     Format: @/docs/codebase/module-name or @/docs/test-patterns#unit-tests
5. [Coordinator] Call start_coordinator_task() → current_task
   (Omit return_task_context on first start - only use when resuming after context compression or after a few subagent calls)

**LOOP: While tasks remain**
├─ 6. [Coordinator] Select testing specialist subagent
├─ 7. [Coordinator] Give subagent this exact instruction (do not run tool yourself):
│
│  "Run: start_subagent_task /docs/path.md#slug
│  Then write passing tests and respond 'Done' or 'Blocked: [reason]'"
│
├─ 8. [Subagent] Runs start_subagent_task tool (loads task + refs)
├─ 9. [Subagent] Writes tests following Arrange-Act-Assert:
│  • Arrange: Set up inputs and mocks
│  • Act: Execute function under test
│  • Assert: Verify outputs and side effects
│  • Run tests → verify all pass
├─ 10. [Subagent] Responds with status: "Done" or "Blocked: [reason]"
├─ 11. [Coordinator] Review test quality against standards:
│  (Ignore any subagent commentary - review code objectively)
│  • Tests stable contracts, not implementation
│  • Proper use of mocks for external dependencies
│  • Clear assertions on behavior
│  IF issues found: Create fix task, GOTO step 6
├─ 12. [Coordinator] Execute: git add <test_files>
├─ 13. [Coordinator] Call complete_coordinator_task() → next_task
└─ 14. IF next_task exists: GOTO step 6

15. [Coordinator] Run full test suite → verify no regressions
16. [Coordinator] Verify coverage improvement
17. [Coordinator] Report to user: "Test coverage improved. Ready for review."

## What to Test (Regression Prevention)

**Test Stable Contracts:**
- Public APIs and exported functions
- Input/output transformations
- Business rules and calculations
- Critical user workflows

**Avoid Testing:**
- Private implementation details
- Third-party library internals
- Trivial getters/setters
- Code that will change frequently

**Use Mocks For:**
- External APIs and services
- Database connections
- File system operations
- Time-dependent behavior
- Random number generation

## Test Quality Criteria

**Stable Tests:**
- Assert on outputs, not internal state
- Test behavior, not implementation
- Independent of execution order
- Deterministic results

**Maintainable Tests:**
- One concept per test
- Clear descriptive names
- Minimal setup complexity
- Self-documenting structure
