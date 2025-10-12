---
description: Write tests for existing code
---

# Write Tests

## User Request

$ARGUMENTS

## Task Overview

Add test coverage for existing code, focusing on critical paths, edge cases, and ensuring long-term maintainability.

## When to Use

- Adding tests to untested code
- Increasing coverage for critical paths
- Testing after bug fixes
- Improving test quality

**Note:** For new features with TDD, use `/guide-feature` with TDD workflow instead.

## Process

### 1. Analyze Code
Understand what to test:
- Code purpose and functionality
- Inputs, outputs, side effects
- Critical paths vs. nice-to-haves
- Existing test coverage
- Edge cases and error conditions

### 2. Prioritize Test Cases

**High Priority:**
- Complex business logic
- Critical user flows
- Data validation and transformation
- API contracts and interfaces
- Security-sensitive operations
- Known bug areas

**Medium Priority:**
- Standard CRUD operations
- Utility functions
- Configuration handling

**Lower Priority:**
- Simple getters/setters
- Straightforward UI layouts
- Well-tested framework features

### 3. Write Tests

Follow project test patterns:
- Match existing test style and structure
- Use project's test framework conventions
- Clear test names (describe what's being tested)
- Arrange-Act-Assert pattern
- Test one thing per test

### 4. Cover Key Scenarios

For each function/component:
- **Happy path** - Normal, expected usage
- **Edge cases** - Boundaries, empty inputs, max values
- **Error conditions** - Invalid inputs, failures, exceptions
- **Integration points** - How it interacts with other code

### 5. Verify Quality

Tests should be:
- **Fast** - Run quickly
- **Isolated** - Independent of each other
- **Repeatable** - Same result every time
- **Maintainable** - Easy to update when code changes
- **Clear** - Obvious what's being tested and why

## MCP Tools

- `view_document` - Examine code to test
- `view_section` - View specific functions/components
- `search_documents` - Find similar test patterns

## Quality Standards

**Tests Must:**
- Pass consistently
- Test actual functionality (not implementation details)
- Have clear, descriptive names
- Follow project conventions
- Not be flaky

**Coverage Goals:**
- Critical paths: 100% coverage
- Business logic: 80%+ coverage
- Overall: Improvement over baseline

## Watch Out For

- Testing implementation details (brittle tests)
- Overly complex test setup
- Tests that don't actually verify behavior
- Flaky tests (inconsistent results)
- Tests that are harder to maintain than the code

## Deliverables

- Comprehensive test coverage for target code
- Tests passing consistently
- Clear test names and structure
- Edge cases and error conditions covered
- Increased confidence in code correctness
