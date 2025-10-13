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
- Use TodoWrite for high-level milestones and coordinator tracking
- Create MCP task document for subagent work queue
- Break requirement into logical, independent work units
- Identify dependencies and sequence accordingly
- Define specific, testable acceptance criteria for each unit

**Tool Selection:**
- TodoWrite: Coordinator planning (milestones like "Design API", "Implement Auth")
- MCP Tasks: Subagent work queue (implementation units)

### 2. Assign to Agent (Silent Execution)
Provide agent with:
- Specific, atomic task description
- Functional requirements
- TDD mandate: write failing tests BEFORE implementation
- Quality gates: tests, lint, typecheck, build must pass
- Context: relevant files, patterns, constraints

**Agent Instruction:**
Work on [task]. Respond: "Done" or "Blocked: [reason]". No summaries.

Agent completes work silently without progress updates or explanations.

### 3. Review Code Changes (Coordinator)
Review CODE first, not agent notes:
- Run quality gates to verify all pass
- Review actual code changes (diffs, new files, modifications)
- Verify TDD followed (test files created before implementation)
- Check test quality (coverage, edge cases, assertions)
- Check for regressions (existing functionality intact)
- Review code quality (maintainability, patterns, clarity)
- Manual verification (feature works as expected)

Read agent notes only if:
- Quality gates fail
- Code changes unclear
- Unexpected behavior found
- Need to understand blocking issues

### 4. Stage Completed Work (Coordinator)
- Stage changes: `git add <files>`
- Verify staged files correct and complete
- Ensure no unintended files staged

### 5. Repeat Until Complete (Coordinator)
- Mark TodoWrite item complete
- Assign next unit to new agent
- Update context based on observed code changes
- Adjust plan if blockers discovered

### 6. Final Integration & Report (Coordinator)
- Run full test suite on complete codebase
- End-to-end system testing
- Verify all acceptance criteria met
- Report to user: terse completion signal

**Report Format:**
[Feature/Task] complete. Ready for your review.

[Optional: Issues encountered - only if unexpected]
[Optional: Review guidance - only if specific attention needed]

**Exclude from report:**
- Files changed (visible in git status)
- Tests passed (expected quality gate)
- Implementation details (code review shows this)
- Subagent information (internal orchestration)

## Why This Works

**Silent Execution:**
- Reduces context pollution from repeated requirements
- Eliminates bias in coordinator review
- Forces self-documenting code quality
- Minimizes token usage

**Terse Reporting:**
- Completion signal only
- Surface issues if present
- No duplication of observable information
- Respects user autonomy

**Explicit Step Separation:**
- Review → Stage split prevents forgetting verification
- One action per step ensures attention
- Quality gates first catches issues early

**Tool Role Clarity:**
- TodoWrite: Coordinator's planning
- MCP Tasks: Subagent work queue
- Clear separation prevents confusion

## Key Considerations

**Test-Driven Development:**
- Tests MUST be written before implementation
- Follow project test patterns
- Refactor while keeping tests green
- Never skip TDD discipline

**Sequencing:**
- Never parallelize dependent components
- Sequence strictly when dependencies exist
- Parallel only for truly independent work
