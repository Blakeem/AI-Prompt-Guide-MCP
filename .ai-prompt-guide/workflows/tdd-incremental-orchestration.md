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
- **Use TodoWrite** for high-level milestones and coordinator tracking
- **Create MCP task document** for subagent work queue (list of tasks OR single ad-hoc)
- Break requirement into logical, independent work units
- Identify and link dependencies and sequence accordingly
- Define specific, testable acceptance criteria for each unit

**Tool Choice:**
- **TodoWrite**: Your planning/tracking (e.g., "Design API", "Implement Auth", "Integration Testing")
- **MCP Tasks**: Subagent work queue (e.g., create_document + task operations for implementation units)

### 2. Assign to Agent (Silent Execution)
Provide agent with:
- Specific, atomic task description
- Functional requirements
- **TDD mandate:** Write failing tests BEFORE implementation
- Quality gates to pass (all tests, lint, typecheck, build)
- Context (relevant files, patterns, constraints)

**Critical Instruction to Agent:**
> "Work on [task]. Respond only: 'Done' or 'Blocked: [reason]'. No summaries, no explanations."

Agent completes work silently. No progress updates. No explanations of what was done.

### 3. Review Code Changes (Coordinator)
**Review CODE first, NOT agent notes:**
- Run quality gates to verify all pass (tests, lint, typecheck, build)
- Review actual code changes (diffs, new files, modifications)
- Verify TDD followed (test files created before implementation files)
- Check test quality (coverage, edge cases, assertions)
- Check for regressions (existing functionality still works)
- Review code quality (maintainability, patterns, clarity)
- Manual verification (test the feature works as expected)

**Only read agent notes if:**
- Quality gates fail
- Code changes unclear
- Unexpected behavior found
- Need to understand blocking issues

### 4. Stage Completed Work (Coordinator)
- Stage changes: `git add <files>`
- Verify staged files are correct and complete
- Ensure no unintended files staged

### 5. Repeat Until Complete (Coordinator)
- Mark TodoWrite item complete
- Assign next unit to new agent (or continue with next task)
- Update context based on code changes observed
- Adjust plan if blockers discovered

### 6. Final Integration & Report (Coordinator)
- Run full test suite on complete codebase
- End-to-end system testing
- Verify all acceptance criteria met
- Report to user (terse completion signal):

**Report Format:**
```
[Feature/Task] complete. Ready for your review.

[Optional: Issues encountered:]
- [Only if something unexpected happened]

[Optional: Review guidance:]
- [Only if specific attention needed on something]
```

**What NOT to include:**
- Files changed (user will see `git status`)
- Tests passed (expected quality gate)
- Implementation details (code review shows this)
- Subagent information (internal orchestration detail)

**Examples:**

✅ **Good (clean completion):**
> "User authentication feature complete. Ready for your review."

✅ **Good (with issue):**
> "API integration complete. Ready for your review.
>
> Note: External API rate limit encountered during testing. Implemented exponential backoff—please verify behavior meets requirements."

## Why This Pattern Works

**Silent Execution Benefits:**
- **Reduces context pollution** - Agent summaries repeat requirements and create noise
- **Eliminates bias** - Coordinator forms independent opinion from code review
- **Forces code quality** - Code must be self-documenting since no explanation provided
- **Minimizes tokens** - Agents produce only completion signal, not verbose reports

**Terse Reporting Pattern:**
- **Completion signal only** - User knows work is done, can review when ready
- **Issues if present** - Only surface blockers or unexpected situations
- **No duplication** - Files/tests/details visible through git and code review
- **Respects user autonomy** - Trusts user to review and commit on their schedule

**Explicit Step Separation:**
- **Review → Stage** split prevents forgetting to verify before committing
- **One action per step** ensures each critical task gets attention
- **Quality gates first** catches issues before manual review begins

**Tool Role Clarity:**
- **TodoWrite** = Coordinator's planning brain (visible to coordinator only)
- **MCP Tasks** = Subagent work queue (shareable, trackable, auditable)
- Separation prevents confusion about what tool to use when

## Key Considerations

**Test-Driven Development:**
- Tests MUST be written before implementation
- Follow project test patterns and conventions
- Refactor while keeping tests green
- Never skip TDD discipline

**Sequencing:**
- Never parallelize dependent components
- Sequence strictly when dependencies exist
- Parallel only for truly independent work
