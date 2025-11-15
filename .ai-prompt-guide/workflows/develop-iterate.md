---
title: "Develop (Iterate)"
description: "🔄 DEVELOP: Orchestrate multi-agent development with manual verification"
whenToUse: "Features, fixes, or prototypes where manual verification is preferred over automated testing"
---

# Workflow: Multi-Agent Development with Manual Verification

## [CRITICAL RULES]
- Use `coordinator_task` (NOT TodoWrite) for your TODO list
- [DELEGATION RULE]: Coordinator delegates by instructing subagent to run `start_subagent_task` - never run it yourself

## [SETUP]
1. Analyze requirements, break into work units
2. Create coordinator tasks (`coordinator_task`) with Main-Workflow on first task
3. Create subagent tasks (`subagent_task`) in /docs/ namespace:
   - Add @references: `@/docs/specs/auth-api` or `@/docs/specs/db#section`
   - Add acceptance criteria
   - Optional: Workflow metadata for task-specific protocols
4. Call `start_coordinator_task()` (omit `return_task_context` on first start)

## [TASK LOOP]
**While tasks remain:**

5. Select specialized subagent for current task
6. Instruct subagent: "Run: `start_subagent_task /docs/path.md#slug` then execute and respond 'Done' or 'Blocked: [reason]'"
7. [Subagent executes] Runs tool (loads task+refs+workflow), implements, responds with status only
8. **[CLEAN SLATE REVIEW]**: Review code changes directly (examine actual changes first, only consult notes if needed)
9. Verify against acceptance criteria
   - If issues: create fix task, return to step 5
10. Stage changes: `git add <modified_files>`
11. Call `complete_coordinator_task()` → next_task
12. If next_task exists: return to step 5

## [COMPLETION]
12. Execute project testing procedures
13. Verify all acceptance criteria met
14. Report: "Development complete. Ready for review."

## [TOOL REFERENCE]
**Coordinator:** `coordinator_task`, `start_coordinator_task()`, `complete_coordinator_task()`
**Subagent:** `subagent_task`, `start_subagent_task("/docs/path.md#slug")`, `complete_subagent_task()`
