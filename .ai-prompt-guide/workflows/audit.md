---
title: "Audit"
description: "🔍 AUDIT: Comprehensive code audit with parallel specialist agents"
whenToUse: "Production readiness review, PR review, or targeted quality analysis of specific components"
---

# Workflow: Code Audit

## [SETUP]

**Define scope:**
- **Full codebase:** Default - audit entire project
- **Targeted:** Specific files, directories, PR diff, or component
- User provides scope or defaults to full

**Select issue types (3-6 recommended):**
- Must include at least one from Essential
- Add Common types based on scope/concerns

## [PARALLEL ANALYSIS]

Launch parallel agents, one per issue type. For each agent, provide:
- Assigned issue type and focus areas
- Scope (files/directories to analyze)
- Severity criteria

**Each specialist scans and documents findings with:**
- Location (file:line)
- Severity (Critical/High/Medium/Low)
- Impact description
- Concrete fix recommendation

## [SYNTHESIS]

Coordinator consolidates:
1. Flag hot spots (issues found by multiple specialists)
2. Identify cross-cutting patterns
3. Generate prioritized action plan by severity
4. Summarize: severity counts, blocking items, recommendations

## Issue Types

**Essential (include at least one):**
- **Security Vulnerabilities:** injection, auth flaws, data exposure, OWASP top 10
- **Error Handling:** uncaught exceptions, missing guards, silent failures
- **Data Validation:** input sanitization, type coercion, boundary checks

**Common (select as needed):**
- **Performance:** Big O complexity, unnecessary iterations, memory leaks, resource usage
- **Complexity:** deep nesting, long functions, cyclomatic complexity
- **Test Coverage:** missing tests, untested edge cases, brittle tests
- **Maintainability:** readability, documentation, code organization
- **Resource Management:** unclosed handles, memory allocation, connection pooling
- **Concurrency:** race conditions, deadlocks, thread safety
- **Anti-Patterns:** magic numbers, duplication, tight coupling, god objects

## Quality Dimensions (per finding)

| Dimension | Check For |
|-----------|-----------|
| **Correctness** | Logic errors, edge cases, off-by-one, null handling |
| **Security** | Validation, auth, sensitive data, injection vectors |
| **Performance** | Big O complexity, unnecessary work, resource efficiency |
| **Patterns** | Consistency with codebase idioms, SOLID principles |
| **Simplicity** | Over-engineering, unnecessary abstraction, clarity |

## Severity Levels

- **Critical:** Security vulnerabilities, data loss risk, breaking changes - must fix
- **High:** Logic errors, performance issues, missing critical tests - should fix
- **Medium:** Code smells, moderate improvements, minor bugs - consider fixing
- **Low:** Style inconsistencies, optimizations, naming - nice to have
