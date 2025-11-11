---
title: "Review"
description: "🔍 REVIEW: Targeted review of specific changes, PRs, or components"
whenToUse: "Reviewing pull requests, specific changes, or individual modules before merge"
---

# Workflow: Code Review

1. **Define scope**: PR/commit range, specific files/modules, or focused component

2. **Assess quality dimensions** (prioritize changed code):
   • Correctness: logic, edge cases, error handling
   • Security: validation, auth, sensitive data
   • Testing: coverage, assertions, edge cases
   • Code Quality: readability, maintainability, patterns
   • Performance: efficiency, resource usage
   • Simplicity: minimal complexity for requirements

3. **Categorize by severity**:
   • **Critical**: security vulnerabilities, data loss, breaking changes
   • **High**: performance issues, logic errors, missing critical tests
   • **Medium**: code smells, moderate improvements, minor bugs
   • **Low**: style inconsistencies, optimizations, naming

4. **Document findings** (file:line):
   • Impact and root cause
   • Concrete fix recommendation
   • Code example when helpful

5. **Summarize**: Decision (approve/changes/comment) • Severity counts • Blocking items • Acknowledge good practices
