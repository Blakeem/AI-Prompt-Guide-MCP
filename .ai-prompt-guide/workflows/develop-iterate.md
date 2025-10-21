---
title: "Develop (Iterate)"
description: "🔄 DEVELOP: Orchestrate multi-agent development with manual verification"
whenToUse: "Features, fixes, or prototypes where manual verification is preferred over automated testing"
---

# Workflow: Multi-Agent Development with Manual Verification

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
   • Define acceptance criteria for each task
5. [Coordinator] Call start_coordinator_task() → current_task

**LOOP: While tasks remain**
├─ 6. [Coordinator] Select specialized subagent for this task
├─ 7. [Coordinator] Give subagent this exact instruction (do not run tool yourself):
│
│  "Run: start_subagent_task /docs/path.md#slug
│  Then execute the task and respond 'Done' or 'Blocked: [reason]'"
│
├─ 8. [Subagent] Runs start_subagent_task tool (loads task + refs + workflow)
├─ 9. [Subagent] Executes implementation
├─ 10. [Subagent] Responds with status: "Done" or "Blocked: [reason]"
├─ 11. [Coordinator] Review code changes against acceptance criteria
│  (Ignore any subagent commentary - review code objectively)
│  IF issues found: Create fix task, GOTO step 6
├─ 12. [Coordinator] Execute: git add <modified_files>
├─ 13. [Coordinator] Call complete_coordinator_task() → next_task
└─ 14. IF next_task exists: GOTO step 6

15. [Coordinator] Follow project testing procedures
16. [Coordinator] Verify all acceptance criteria met
17. [Coordinator] Report to user: "Development complete. Ready for review."

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
