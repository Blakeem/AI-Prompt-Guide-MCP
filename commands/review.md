---
description: Review specific changes, PRs, or components
---

# Code Review (Targeted)

## User Request

$ARGUMENTS

## Task Overview

Perform targeted code review of specific changes, pull requests, or components.

## Scope Distinction

**Use /guide-review for:**
- Specific pull request changes
- Individual module or component
- Recent commits
- Specific file or function
- Pre-merge review

**Use /guide-audit for:**
- Entire codebase analysis
- Multiple quality dimensions with parallel agents
- Pre-production readiness check
- Comprehensive quality assessment

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

**Examination:**

**view_document** - Examine code structure:
```typescript
view_document({
  document: "/api/user-service.md"
})
```

**view_section** - View specific sections:
```typescript
view_section({
  document: "/api/user-service.md#authentication,validation"
})
```

**Pattern Analysis:**

**search_documents** - Find similar patterns:
```typescript
search_documents({
  query: "input validation pattern",
  output_mode: "content",
  scope: "/api/"
})
```

**browse_documents** - Understand module context:
```typescript
browse_documents({
  path: "/api",
  depth: 2
})
```

## Deliverables

- Review findings organized by severity
- Specific, actionable recommendations
- Pattern consistency feedback
- Test coverage assessment
- Overall assessment (approve/request changes)
