---
title: "TDD Incremental Orchestration"
description: "🎯 COORDINATION: Orchestrate multi-agent development with TDD, quality gates, and staged integration"
whenToUse:
  - "Managing complex features requiring multiple specialized agents"
  - "When quality gates and testing are critical to success"
  - "Projects requiring test-driven development discipline"
---

# TDD Incremental Orchestration

## Core Flow

### 1. Plan & Decompose (Coordinator)
- Use `coordinator_task` to create sequential task list in `/coordinator/active.md`
- Break requirement into logical, independent work units
- Identify dependencies and sequence accordingly
- Define specific, testable acceptance criteria for each unit
- Add Main-Workflow metadata to first task only (`tdd-incremental-orchestration`)
- Add task-specific Workflow metadata as needed (e.g., `spec-first-integration`)

**Tool Selection:**
- **coordinator_task**: Create sequential project tasks (auto-archives when all complete)
- **subagent_task**: Optional - for detailed subtasks within larger implementation units

### 2. Assign to Agent (Silent Execution)

**Subagent Selection:**
Choose the most specialized subagent for the work type:
- Code implementation/debugging → code-focused subagents
- Code quality/review → review-focused subagents
- Backend/API work → API-focused subagents
- Infrastructure/environment → appropriate specialized subagents
- Refer to available subagent types in your context

**Assignment Pattern:**
Provide subagent with:
1. **start_coordinator_task() instruction** - Retrieves first pending task with full context
2. **Non-overlapping guidance** - Only TDD requirements, quality gates, response format (not task details)
3. **Completion requirements** - Must add detailed notes via complete_coordinator_task()

**Agent Response Format:**
- "Done" or "Blocked: [reason]"
- No summaries or progress updates

**Context Conservation:**
- Task context lives in coordinator system (retrieved via start_coordinator_task)
- Coordinator provides only non-overlapping instructions
- Eliminates duplication, maximizes token efficiency

### 3. Review Code Changes (Coordinator)

**Primary Review - CODE:**
- Run quality gates to verify all pass
- Review actual changes (diffs, new files, modifications)
- Verify TDD followed (tests before implementation)
- Check test quality (coverage, edge cases, assertions)
- Check for regressions (existing functionality intact)
- Review code quality (maintainability, patterns, clarity)
- Manual verification as appropriate

**Secondary Review - Task Completion Notes:**
Check notes in coordinator task system (added via complete_coordinator_task):
- Verify what was implemented
- Check for warnings or issues
- Audit only if code review raises questions

**Use Notes For:**
- Understanding blockers
- Clarifying unexpected changes
- Debugging quality gate failures
- Tracking implementation decisions

### 4. Stage Completed Work (Coordinator)
- Stage changes using version control
- Verify staged files correct and complete
- Ensure no unintended files staged

### 5. Repeat Until Complete (Coordinator)
- Task marked complete by subagent via complete_coordinator_task
- System automatically provides next task or archives if all complete
- Assign next task to new agent (already queued from completion)
- Update context based on observed changes
- Adjust plan if blockers discovered

**Note:** When all tasks are complete, `/coordinator/active.md` automatically archives to `/archived/coordinator/` with timestamp.

### 6. Final Integration & Report (Coordinator)
- Run full test suite
- Integration/system testing as appropriate
- Verify all acceptance criteria met
- Report to user: terse completion signal

**Report Format:**
- [Feature/Task] complete. Ready for review.
- Optional: Issues encountered (only if unexpected)
- Optional: Review guidance (only if specific attention needed)

**Exclude:**
- Files changed (visible in version control)
- Tests passed (expected quality gate)
- Implementation details (visible in code review)
- Subagent information (internal orchestration)

## Why This Works

**Context Conservation:**
- Task details stored once in coordinator system
- Subagents retrieve via `start_coordinator_task()` - no duplication
- Coordinator provides only non-overlapping guidance
- Massive token savings on complex features
- Reduces context pollution from repeated requirements

**Silent Execution:**
- Eliminates bias in coordinator review
- Forces self-documenting code quality
- Minimizes unnecessary communication

**Terse Reporting:**
- Completion signal only
- Surface issues if present
- No duplication of observable information
- Respects user autonomy

**Explicit Step Separation:**
- Review → Stage split prevents forgetting verification
- One action per step ensures attention
- Quality gates first catches issues early

**Auto-Archive:**
- Completed projects automatically archive to `/archived/coordinator/`
- Preserves full task history with timestamps
- Keeps workspace clean for new projects

**Tool Role Clarity:**
- **coordinator_task**: Sequential project orchestration (auto-archives when complete)
- **start_coordinator_task**: Load first pending task with full context
- **complete_coordinator_task**: Mark task done, get next task or archive
- **subagent_task**: Optional detailed subtasks for complex implementations
- Clear separation prevents confusion

## Key Considerations

**Test-Driven Development:**
- Tests MUST be written before implementation
- Follow project test patterns and quality gates
- Refactor while keeping tests green
- Never skip TDD discipline

**Sequencing:**
- Never parallelize dependent components
- Sequence strictly when dependencies exist
- Parallel only for truly independent work

**Quality Gates:**
- Define project-specific quality gates (tests, linting, type checking, etc.)
- All gates must pass before completion
- Run gates during review, not during implementation
