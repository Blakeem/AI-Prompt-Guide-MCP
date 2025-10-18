---
title: "Develop (TDD)"
description: "🎯 DEVELOP: Orchestrate multi-agent development with TDD and quality gates"
whenToUse: "Features or fixes requiring test-driven development and quality gates"
---

# Workflow: Multi-Agent Development with TDD

1. [Coordinator] Analyze requirements and break into logical work units
2. [Coordinator] Use coordinator_task to create sequential task list
3. [Coordinator] Add Main-Workflow to first coordinator task
4. [Coordinator] Use subagent_task to create all implementation tasks
   • Add @references to API specs, component designs, documentation
   • Add Workflow: metadata for task-specific protocols (if needed)
   • Define testable acceptance criteria for each task
5. [Coordinator] Call start_coordinator_task() → current_task

**LOOP: While tasks remain**
├─ 6. [Coordinator] Select specialized subagent for task type
├─ 7. [Coordinator] Assign: "start_subagent_task /docs/path.md#slug, follow TDD, respond Done/Blocked"
├─ 8. [Subagent] Call start_subagent_task → loads task + @references + workflows
├─ 9. [Subagent] Execute task using TDD cycle:
│  • Write failing tests first (Red)
│  • Implement minimal code to pass (Green)
│  • Refactor while keeping tests green
│  • Respond "Done" or "Blocked: [reason]"
├─ 10. [Coordinator] Run quality gates → verify all pass
├─ 11. [Coordinator] Review code changes and test quality
│  IF issues found: Create fix task, GOTO step 6
├─ 12. [Coordinator] Execute: git add <modified_files>
├─ 13. [Coordinator] Call complete_coordinator_task() → next_task
└─ 14. IF next_task exists: GOTO step 6

15. [Coordinator] Run full test suite
16. [Coordinator] Follow project testing procedures
17. [Coordinator] Verify all acceptance criteria met
18. [Coordinator] Report to user: "Development complete. Ready for review."

## Task System

**Coordinator Tasks** (your TODO list):
- Tool: `coordinator_task` for create/edit/list
- Tool: `start_coordinator_task()` to load first pending task
- Tool: `complete_coordinator_task()` to mark done and get next
- Metadata: Main-Workflow on first task, optional Workflow on specific tasks

**Subagent Tasks** (delegated work packages):
- Tool: `subagent_task` to create/edit tasks in /docs/ namespace
- Tool: `start_subagent_task("/docs/path.md#slug")` to load task context
- Tool: `complete_subagent_task()` to mark done
- Content: @references to specs, docs, components (auto-injected as context)
- Metadata: Workflow for task-specific protocols (auto-injected)

## TDD Requirements

**Red-Green-Refactor Cycle:**
- Red: Write failing test (reproduces bug or defines desired behavior)
- Green: Implement minimal code to make test pass
- Refactor: Improve code while keeping tests green

**Quality Gates:**
- All tests must pass
- Follow project-specific quality gates (linting, type checking, coverage)
- Gates enforced during coordinator review, not during implementation

**Bug Fixes:**
- Write test that reproduces the bug (fails)
- Implement fix to make test pass (green)
- Natural fit for TDD workflow
