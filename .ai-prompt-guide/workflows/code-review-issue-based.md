---
title: "Code Review: Issue-Based Parallel"
description: "🔍 REVIEW: Parallel code review with multiple agents, each focusing on specific issue types"
whenToUse:
  - "Deep analysis of specific quality dimensions across entire codebase"
  - "Comprehensive audit of code health before production"
  - "When you want specialized experts for each concern type"
---

# Code Review: Issue-Based Parallel

## Process

### 1. Define Issue Types (Choose 5-10)
Select from standard types, customize for your domain:

**Essential:**
- Security Vulnerabilities (injection, auth flaws, data exposure)
- Error Handling & Edge Cases (missing checks, unhandled exceptions)
- Data Handling & Validation (input validation, type safety)

**Common:**
- Performance & Efficiency (N+1 queries, memory leaks, inefficient algorithms)
- Code Complexity (high cyclomatic complexity, deep nesting, god objects)
- Test Coverage & Quality (missing tests, brittle tests, edge case gaps)
- Maintainability & Readability (naming, documentation, style)
- Resource Management (memory/file/connection leaks)
- Concurrency & Race Conditions (thread safety, deadlocks)
- Anti-Patterns (language/framework misuse, code smells)

### 2. Assign Agents (One Per Issue Type)
For each agent, provide:
- Issue type specialization
- Files to review (exclude vendored/generated code)
- Output format requirements:
  * File: [filename:line]
  * Severity: Critical | High | Medium | Low
  * Issue: [description]
  * Impact: [what could happen]
  * Recommendation: [how to fix]

### 3. Launch All Agents in Parallel
- Send all agents simultaneously
- Each reviews entire codebase for their specific issue type
- Agents provide findings organized by severity

### 4. Synthesis & Prioritization
**Cross-Reference Findings:**
- Identify files flagged by multiple agents (hot spots)
- Look for patterns across dimensions
- Create file-level risk assessment

**Prioritize Actions:**
```
CRITICAL (Before Release):
- [file:line] - [issue type] - [description]

HIGH (Soon):
- [file:line] - [issue type] - [description]

MEDIUM/LOW (Future):
- [grouped by file or type for efficiency]
```

**Generate Report:**
- Executive summary
- Hot spot files (multiple issues)
- Issue counts by severity and type
- Recommended action plan

## Agent Instructions Template

```
SPECIALIZED REVIEW: [Issue Type]

Scope: [Files to review, excluding vendored/generated]

Mission: Find ALL instances of [issue type] across codebase.

Focus: [Specific concerns for this issue type]

Output Format:
For each issue:
- File: [filename:line]
- Severity: Critical | High | Medium | Low
- Issue: [clear description]
- Impact: [potential consequences]
- Recommendation: [how to fix]

Summary:
- Total issues: [count by severity]
- Most critical file: [filename]
- Common patterns: [if any]
- Quick wins: [high-impact, easy fixes]
```

## Key Considerations

**Issue Type Selection:**
- Avoid overlap between types (clear boundaries)
- 5-10 agents optimal (fewer for small codebases, more for large)
- Essential three: Security, Error Handling, Data Validation
- Add project-specific types as needed

**Severity Guidelines:**
- Critical: Security vulnerabilities, data loss, crashes
- High: Performance issues, major bugs, missing critical tests
- Medium: Code smells, moderate improvements
- Low: Style issues, minor optimizations

**Synthesis Best Practices:**
- Weight findings by business impact (security > style)
- Cross-reference to find hot spot files
- Create actionable plan, not just issue list
- Group related fixes for efficiency
