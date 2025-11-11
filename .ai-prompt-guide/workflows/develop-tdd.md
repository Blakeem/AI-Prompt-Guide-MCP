---
title: "Develop (TDD)"
description: "🎯 DEVELOP: Orchestrate multi-agent development with TDD and quality gates"
whenToUse: "Features or fixes requiring test-driven development and quality gates"
---

# Workflow: Multi-Agent Development with TDD

## Rules

**COORDINATOR:** Use coordinator_task (NOT TodoWrite). Delegate via literal instructions—never run start_subagent_task yourself.

**SUBAGENTS:** Execute TDD cycle (Red→Green→Refactor), report "Done" or "Blocked: [reason]".

## [Setup]

1. Analyze requirements, decompose into work units
2. Create coordinator tasks (Main-Workflow on first task)
3. Create subagent tasks in /docs/ with:
   - @references: `@/docs/specs/auth-api` or `@/docs/specs/db-schema#users-table`
   - Workflow metadata (if task-specific protocol needed)
   - Testable acceptance criteria
4. Call `start_coordinator_task()` (omit return_task_context initially)

## [Execution Loop]

**Per Task:**
1. Select specialized subagent
2. Instruct: "Run: start_subagent_task /docs/path.md#slug → Execute via TDD → Report status"
3. Subagent loads context, implements TDD cycle, responds
4. Review code against acceptance criteria (ignore commentary)
5. Run quality gates → if fail: create fix task, return to [Execution Loop]
6. Stage changes: `git add <modified_files>`
7. Call `complete_coordinator_task()` → next_task
8. If tasks remain: return to [Execution Loop]

## [Finalization]

1. Run full test suite + project testing procedures
2. Verify all acceptance criteria met
3. Report: "Development complete. Ready for review."

## Tool Reference

**Coordinator:** coordinator_task (create/edit/list), start_coordinator_task(), complete_coordinator_task()

**Subagent:** subagent_task (create in /docs/), start_subagent_task("/docs/path.md#slug"), complete_subagent_task()

**Context Injection:** @references and Workflow metadata auto-load via start_subagent_task

## Quality Standards

**TDD:** Red (failing test) → Green (minimal implementation) → Refactor (improve while passing)

**Gates:** All tests pass + project-specific gates (lint, types, coverage). Enforce during coordinator review.
