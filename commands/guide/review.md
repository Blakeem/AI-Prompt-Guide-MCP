---
description: Review specific code changes or components
---

# Code Review

## User Request

$ARGUMENTS

## Task Overview

Perform targeted code review of specific changes, pull requests, or components.

## Scope

This is for **targeted, focused review**:
- Specific pull request changes
- Individual module or component
- Recent commits
- Specific file or function

For **system-wide quality audit**, use `/guide-audit` instead.

## Review Dimensions

Evaluate code across these dimensions:

### 1. Correctness
- Does it solve the intended problem?
- Are there logic errors?
- Edge cases handled?
- Error handling complete?

### 2. Code Quality
- Readable and maintainable?
- Follows project patterns?
- Appropriate complexity?
- Well-structured?

### 3. Testing
- Critical paths tested?
- Edge cases covered?
- Tests are clear and maintainable?
- Test quality adequate?

### 4. Security
- Input validation present?
- Authentication/authorization correct?
- No obvious vulnerabilities?
- Sensitive data handled properly?

### 5. Performance
- No obvious inefficiencies?
- Appropriate algorithms?
- Resource usage reasonable?

### 6. Pattern Consistency
- Matches existing codebase patterns?
- Consistent with team conventions?
- Uses established libraries/utilities?

## Process

### 1. Understand Context
- What problem does this solve?
- What files/functions changed?
- What's the intended behavior?

### 2. Review Systematically
- Read code carefully
- Note issues by severity
- Consider each dimension above
- Manual verification if possible

### 3. Categorize Findings
- **Critical:** Security, data loss, crashes
- **High:** Bugs, performance issues, missing tests
- **Medium:** Code quality, moderate improvements
- **Low:** Style, minor suggestions

### 4. Provide Actionable Feedback
For each issue:
- Location (file:line)
- Description of problem
- Why it matters (impact)
- Suggested fix

## MCP Tools

- `view_document` - Examine code structure
- `view_section` - View specific sections
- `search_documents` - Find patterns across codebase

## Deliverables

- Review findings organized by severity
- Specific, actionable recommendations
- Pattern consistency feedback
- Test coverage assessment
- Overall assessment (approve/request changes)
