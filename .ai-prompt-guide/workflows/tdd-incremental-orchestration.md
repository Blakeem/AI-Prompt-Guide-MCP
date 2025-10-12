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

### 1. Plan & Decompose
- Break requirement into logical, independent work units
- Identify dependencies and sequence accordingly
- Define specific, testable acceptance criteria for each unit
- Prepare agent instructions with context and quality requirements

### 2. Assign to Agent (TDD Required)
Provide each agent:
- Specific, atomic task description
- Functional requirements
- **TDD mandate:** Write failing tests BEFORE implementation
- Quality gates to pass (all tests, lint, typecheck, build)
- Context (relevant files, patterns, constraints)

### 3. Coordinator Review (After Each Agent)
- **Verify TDD followed** (tests written first, implementation second)
- **Verify quality gates passed** (all tests, lint, typecheck, build)
- **Check test quality** - comprehensive coverage, edge cases
- **Check for regressions** - ensure no breaking changes
- **Review code quality** - maintainability, pattern consistency
- **Stage changes** - `git add` completed work

### 4. Repeat Until Complete
- Assign next unit to new agent
- Update context based on previous completions
- Adjust plan if blockers discovered

### 5. Final Integration
- Run full test suite on complete codebase
- End-to-end system testing
- Verify all acceptance criteria met
- Commit staged changes

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

**Quality Standards:**
- 100% of tests pass (existing + new)
- Zero lint/type errors
- Build succeeds
- Test coverage maintained or improved
- Critical paths fully tested

**Watch Out For:**
- Implementation written before tests (TDD violation)
- Skipping quality gates to move faster
- Starting next agent before staging current work
- Vague task descriptions to agents
- No final integration test
