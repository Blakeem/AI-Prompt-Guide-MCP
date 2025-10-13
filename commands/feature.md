---
description: Build new feature with incremental workflow
---

# Build New Feature

## User Request

$ARGUMENTS

## Task Overview

Build a new feature using incremental orchestration with quality gates and staged integration.

## Workflow Selection (**REQUIRED** MCP Prompts)

Choose based on your specific environment's testing requirements:

### Standard Approach (Flexible Testing)
- **Prompt:** **workflow_incremental-orchestration**
- **When:** Tests added where complexity warrants, not rigidly required everywhere
- **Best for:** Most features, pragmatic approach, and for manual testing features

### TDD Approach (Test-First Required)
- **Prompt:** **workflow_tdd-incremental-orchestration**
- **When:** Tests MUST be written before implementation
- **Best for:** Critical features, complex business logic, safety-critical code

Access via your ai-prompt-guide MCP (prompts/list).

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

**Planning Phase:**

**create_document** - Create task tracking document:
```typescript
create_document({
  namespace: "project",  // or "features", "implementation"
  title: "User Dashboard Feature Tasks",
  overview: "Implementation tasks for user dashboard...",
  includeTasks: true  // Auto-creates Tasks section
})
```

**task** - Create work units with workflows and references:
```typescript
task({
  document: "/project/dashboard-tasks.md",
  operations: [
    {
      operation: "create",
      title: "Build API Endpoints",
      content: "Implement REST endpoints.\n\nWorkflow: spec-first-integration\n\n@/specs/dashboard-api.md"
    },
    {
      operation: "create",
      title: "Create UI Components",
      content: "Build React components.\n\n@/specs/dashboard-ui.md#components"
    }
  ]
})
```

**Execution Phase:**

**start_task** - Begin work with full context injection:
```typescript
// Sequential mode (first pending task):
start_task({ document: "/project/dashboard-tasks.md" })

// Ad-hoc mode (specific task):
start_task({ document: "/project/dashboard-tasks.md#build-api-endpoints" })
```
- Automatically injects workflow prompts
- Loads all @references hierarchically
- Provides complete context for implementation

**complete_task** - Mark done and get next task:
```typescript
complete_task({
  document: "/project/dashboard-tasks.md",
  note: "API endpoints implemented with full test coverage"
})
```
- Returns next task with workflow injection
- Builds audit trail of work completed

**Documentation Updates:**

**section** - Update related documentation:
```typescript
section({
  document: "/docs/api.md",
  operations: [{
    section: "endpoints",
    operation: "append",
    content: "\n\n### Dashboard Endpoints\n..."
  }]
})
```

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
