---
description: Build new feature with incremental workflow
---

# Build New Feature

## User Request

$ARGUMENTS

## Task Overview

Build a new feature using incremental orchestration with quality gates and staged integration.

## Workflow Selection

Choose based on testing requirements:

### Standard Approach (Flexible Testing)
- **Workflow:** `.ai-prompt-guide/workflows/incremental-orchestration.md`
- **When:** Tests added where complexity warrants, not rigidly required everywhere
- **Best for:** Most features, pragmatic approach

### TDD Approach (Test-First Required)
- **Workflow:** `.ai-prompt-guide/workflows/tdd-incremental-orchestration.md`
- **When:** Tests MUST be written before implementation
- **Best for:** Critical features, complex business logic, safety-critical code

## Core Process

### 1. Plan & Decompose
- Break feature into logical, independent work units
- Identify dependencies and sequence accordingly
- Define specific acceptance criteria for each unit
- Prepare instructions with context and quality requirements

### 2. Execute Incrementally
For each work unit:
- Assign to specialized subagent
- Implement with appropriate testing
- Verify quality gates (tests, lint, typecheck, build)
- Manual verification
- Stage changes before next unit

### 3. Integration & Verification
- Run full test suite
- Manual end-to-end testing
- Verify all acceptance criteria met
- Commit staged changes

## MCP Tools

- `create_document` - Create implementation task document (use `includeTasks: true`)
- `task` - Create tasks for each work unit
- `start_task` - Begin work (injects workflows and context)
- `complete_task` - Mark done and get next task
- `section` - Update documentation as needed

## Quality Standards

**Every Unit Must:**
- Pass all existing tests
- Have zero lint/type errors
- Build successfully
- Work when manually verified
- Have test coverage for critical paths

## Watch Out For

- Starting next unit before staging current work
- Skipping manual verification
- Vague task descriptions
- Parallelizing dependent work
- Assuming functionality works without testing

## Deliverables

- Working feature
- Appropriate test coverage
- All quality gates passed
- Updated documentation
- No regressions
