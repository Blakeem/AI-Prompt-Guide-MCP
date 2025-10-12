---
description: Refactor code for improved quality
---

# Refactor Code

## User Request

$ARGUMENTS

## Task Overview

Improve code structure, readability, and maintainability while preserving existing functionality.

## Workflow

Use the **workflow_multi-option-tradeoff** MCP prompt (available in your prompts/list) for design decisions.

This workflow helps evaluate multiple refactoring approaches quantitatively before choosing the best one.

## Process

### 1. Identify Refactoring Goals
What needs improvement:
- Code complexity (simplify logic, reduce nesting)
- Naming (clarity, consistency)
- Structure (organization, modularity)
- Duplication (DRY principle)
- Pattern consistency (align with codebase patterns)
- Testability (easier to test)

### 2. Evaluate Approaches
For each potential refactoring, use the decision workflow:
- Generate 2-4 viable approaches
- Score on criteria:
  * **Correctness** - Preserves existing behavior
  * **Risk** - Chance of breaking functionality
  * **Pattern Consistency** - Aligns with codebase
  * **Maintainability** - Improves long-term health
  * **Testability** - Easier to verify
  * **Simplicity** - Reduces complexity
- Choose best approach with justification

### 3. Refactor with Safety
- **Preserve tests** - All existing tests must pass
- **Refactor incrementally** - Small, verifiable steps
- **Verify continuously** - Run tests after each change
- **Manual verification** - Test functionality directly
- **No behavior changes** - Refactoring ≠ new features

### 4. Update Documentation
- Update comments if public APIs changed
- Document any pattern changes
- Update related documentation

## MCP Tools

**Analysis Phase:**

**view_document** - Understand current code structure:
```typescript
view_document({
  document: "/api/authentication.md"
})
```

**search_documents** - Find similar patterns to align with:
```typescript
search_documents({
  query: "error handling pattern",
  output_mode: "content",
  scope: "/api/"
})
```

**Planning Phase:**

**task** - Track refactoring steps:
```typescript
task({
  document: "/refactoring/auth-cleanup.md",
  operations: [{
    operation: "create",
    title: "Extract Validation Logic",
    content: "Extract token validation to separate module.\n\nWorkflow: multi-option-tradeoff\n\n@/api/authentication.md#validation"
  }]
})
```

**Documentation Updates:**

**section** - Update related documentation:
```typescript
section({
  document: "/api/authentication.md",
  operations: [{
    section: "architecture",
    operation: "replace",
    content: "## Architecture\n\nRefactored to separate validation concerns..."
  }]
})
```

## Quality Standards

**Must Maintain:**
- All tests pass (no failures introduced)
- Functionality unchanged
- Zero lint/type errors
- Build succeeds
- Manual verification confirms same behavior

**Should Improve:**
- Code readability
- Maintainability
- Pattern consistency
- Simplicity

## Watch Out For

- Changing behavior (refactoring should preserve functionality)
- Breaking tests
- Adding features while refactoring
- Large, risky changes (prefer incremental)
- Inconsistent with codebase patterns

## Deliverables

- Improved code structure
- All tests passing
- No behavior changes
- Better maintainability
- Updated documentation
