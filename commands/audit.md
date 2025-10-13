---
description: Comprehensive quality audit with parallel agents
---

# Quality Audit (Comprehensive)

## User Request

$ARGUMENTS

## Task Overview

Perform comprehensive, system-wide quality audit using multiple parallel agents, each specializing in specific issue types.

## Scope Distinction

**Use /guide-audit for:**
- Entire codebase analysis
- Multiple quality dimensions
- Deep, specialized analysis with parallel agents
- Pre-production readiness check
- Finding systemic issues

**Use /guide-review for:**
- Specific pull request changes
- Individual module review
- Pre-merge review
- Targeted feedback on specific code

## Workflow

Use the **code-review-issue-based** workflow via the `get_workflow` tool:
```typescript
get_workflow({ workflow: "code-review-issue-based" })
```

This workflow orchestrates parallel agents, each specializing in one issue type for comprehensive analysis.

## Process

### 1. Select Issue Types (5-10)

**Essential (Always Include):**
- Security Vulnerabilities
- Error Handling & Edge Cases
- Data Handling & Validation

**Common (Choose Based on Project):**
- Performance & Efficiency
- Code Complexity
- Test Coverage & Quality
- Maintainability & Readability
- Resource Management
- Concurrency & Race Conditions
- Anti-Patterns

### 2. Launch Parallel Agents

For each issue type:
- One specialized agent reviews entire codebase
- Focus ONLY on that issue type
- Report findings by severity (Critical/High/Medium/Low)

Each agent provides:
- File: [filename:line]
- Severity: Critical | High | Medium | Low
- Issue: [clear description]
- Impact: [potential consequences]
- Recommendation: [how to fix]

### 3. Synthesize Findings

**Cross-Reference:**
- Identify hot spot files (flagged by multiple agents)
- Find patterns across dimensions
- Create file-level risk assessment

**Prioritize Actions:**
```
CRITICAL (Before Release):
- [file:line] - [issue type] - [description]

HIGH (Soon):
- [file:line] - [issue type] - [description]

MEDIUM/LOW (Future):
- [grouped for efficiency]
```

### 4. Generate Report

Include:
- Executive summary
- Hot spot files (multiple issues)
- Issue counts by severity and type
- Prioritized action plan
- Recommended improvements

## MCP Tools

**Structure Analysis:**

**browse_documents** - Understand codebase organization:
```typescript
browse_documents({
  path: "/",
  depth: 3
})
```

**Pattern Discovery:**

**search_documents** - Find issues across entire codebase:
```typescript
search_documents({
  query: "TODO|FIXME|XXX",
  output_mode: "content"
})
```

**Deep Inspection:**

**view_document** - Examine flagged files:
```typescript
view_document({
  document: "/api/high-risk-module.md"
})
```

**view_section** - Review specific problem areas:
```typescript
view_section({
  document: "/api/high-risk-module.md#authentication,validation,error-handling"
})
```

## Severity Guidelines

- **Critical:** Security vulnerabilities, data loss, crashes
- **High:** Performance issues, major bugs, missing critical tests
- **Medium:** Code smells, moderate improvements
- **Low:** Style issues, minor optimizations

## Deliverables

- Comprehensive quality report
- Findings organized by severity
- Hot spot file analysis
- Cross-dimensional insights
- Prioritized action plan with specific recommendations
- Risk assessment per file/module
