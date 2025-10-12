---
title: "Incremental Orchestration"
description: "🎯 COORDINATION: Orchestrate multi-agent development with quality gates and staged integration"
whenToUse:
  - "Managing complex features requiring multiple specialized agents"
  - "When quality verification is important but TDD is not required"
  - "Coordinating work that must integrate incrementally with verification"
---

# Incremental Orchestration

## Core Flow

### 1. Plan & Decompose
- Break requirement into logical, independent work units
- Identify dependencies and sequence accordingly
- Define specific acceptance criteria for each unit
- Prepare agent instructions with context and quality requirements

### 2. Assign to Agent
Provide each agent:
- Specific, atomic task description
- Functional requirements
- Quality gates to pass (tests, lint, typecheck, build)
- Testing guidance (add tests where complexity warrants)
- Context (relevant files, patterns, constraints)

### 3. Coordinator Review (After Each Agent)
- **Verify quality gates passed** (all tests, lint, typecheck, build)
- **Manual verification** - test functionality directly
- **Check for regressions** - ensure no breaking changes
- **Review code quality** - maintainability, pattern consistency
- **Stage changes** - `git add` completed work

### 4. Repeat Until Complete
- Assign next unit to new agent
- Update context based on previous completions
- Adjust plan if blockers discovered

### 5. Final Integration
- Run full test suite on complete codebase
- Manual end-to-end testing
- Verify all acceptance criteria met
- Commit staged changes

## Key Considerations

**Sequencing:**
- Never parallelize dependent components
- Sequence strictly when dependencies exist
- Parallel only for truly independent work

**Quality Standards:**
- All existing tests must pass
- Zero lint/type errors
- Build succeeds
- Manual verification confirms functionality works
- Critical paths have test coverage

**Testing Approach:**
- Add tests for complex business logic and critical paths
- Update existing tests when modifying tested code
- Manual testing supplements automated checks
- Production features need test coverage before deployment

**Watch Out For:**
- Starting next agent before staging current work
- Skipping manual verification
- Vague task descriptions to agents
- Assuming functionality works without verification
