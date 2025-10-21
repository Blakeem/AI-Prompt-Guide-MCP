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
     Format: @/docs/specs/auth-api or @/docs/specs/db-schema#users-table
     Example:
     """
     Implement user authentication endpoint.

     @/docs/specs/auth-api-specification
     @/docs/specs/security-requirements#password-hashing

     Create POST /auth/login endpoint with email/password validation.
     """
   • Add Workflow: metadata for task-specific protocols (if needed)
   • Define testable acceptance criteria for each task
5. [Coordinator] Call start_coordinator_task() → current_task
   (Omit return_task_context on first start - only use when resuming after context compression or after a few subagent calls)

**LOOP: While tasks remain**
├─ 6. [Coordinator] Select specialized subagent for this task
├─ 7. [Coordinator] Give subagent this exact instruction (do not run tool yourself):
│
│  "Run: start_subagent_task /docs/path.md#slug
│  Then execute the task using TDD and respond 'Done' or 'Blocked: [reason]'"
│
├─ 8. [Subagent] Runs start_subagent_task tool (loads task + refs + workflow)
├─ 9. [Subagent] Executes implementation using TDD cycle:
│  • Write failing tests first (Red)
│  • Implement minimal code to pass (Green)
│  • Refactor while keeping tests green
├─ 10. [Subagent] Responds with status: "Done" or "Blocked: [reason]"
├─ 11. [Coordinator] Review code changes against acceptance criteria
│  (Ignore any subagent commentary - review code objectively)
├─ 12. [Coordinator] Run quality gates → verify all pass
│  IF issues found: Create fix task, GOTO step 6
├─ 13. [Coordinator] Execute: git add <modified_files>
├─ 14. [Coordinator] Call complete_coordinator_task() → next_task
└─ 15. IF next_task exists: GOTO step 6

16. [Coordinator] Run full test suite
17. [Coordinator] Follow project testing procedures
18. [Coordinator] Verify all acceptance criteria met
19. [Coordinator] Report to user: "Development complete. Ready for review."

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
