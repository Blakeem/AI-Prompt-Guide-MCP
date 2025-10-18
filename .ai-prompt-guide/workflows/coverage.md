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
5. [Coordinator] Call start_coordinator_task() → current_task

**LOOP: While tasks remain**
├─ 6. [Coordinator] Select testing specialist subagent
├─ 7. [Coordinator] Assign: "start_subagent_task /docs/path.md#slug, write passing tests, respond Done/Blocked"
├─ 8. [Subagent] Call start_subagent_task → loads task + @references
├─ 9. [Subagent] Write tests following Arrange-Act-Assert:
│  • Arrange: Set up inputs and mocks
│  • Act: Execute function under test
│  • Assert: Verify outputs and side effects
│  • Run tests → verify all pass
│  • Respond "Done" or "Blocked: [reason]"
├─ 10. [Coordinator] Review test quality:
│  • Tests stable contracts, not implementation
│  • Proper use of mocks for external dependencies
│  • Clear assertions on behavior
│  IF issues found: Create fix task, GOTO step 6
├─ 11. [Coordinator] Execute: git add <test_files>
├─ 12. [Coordinator] Call complete_coordinator_task() → next_task
└─ 13. IF next_task exists: GOTO step 6

14. [Coordinator] Run full test suite → verify no regressions
15. [Coordinator] Verify coverage improvement
16. [Coordinator] Report to user: "Test coverage improved. Ready for review."

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
