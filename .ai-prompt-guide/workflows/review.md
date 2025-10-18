---
title: "Review"
description: "🔍 REVIEW: Targeted review of specific changes, PRs, or components"
whenToUse: "Reviewing pull requests, specific changes, or individual modules before merge"
---

# Workflow: Code Review

1. [Reviewer] Define review scope:
   • Pull request or commit range
   • Specific files or modules
   • Focused area or component

2. [Reviewer] Review across quality dimensions:
   • Correctness: logic accuracy, edge cases, error handling
   • Code Quality: readability, maintainability, naming
   • Testing: coverage, assertions, edge cases
   • Security: validation, auth, sensitive data handling
   • Performance: efficiency, resource usage
   • Pattern Consistency: aligns with codebase conventions

3. [Reviewer] Identify issues by severity:
   • Critical: security vulnerabilities, data loss risks, breaking changes
   • High: performance issues, major logic errors, missing critical tests
   • Medium: code smells, moderate improvements, minor bugs
   • Low: style inconsistencies, minor optimizations, naming

4. [Reviewer] Provide actionable feedback per finding:
   • Location (file:line)
   • Clear description and impact
   • Concrete recommendation
   • Code examples (if applicable)

5. [Reviewer] Summarize findings:
   • Overall assessment (approve/request changes/comment)
   • Count by severity
   • Priority recommendations
   • Blocking vs non-blocking items

## Review Focus

**Prioritize:**
- Correctness and security
- Maintainability impact
- Changed code (not unchanged)

**Provide:**
- Specific, actionable feedback
- Explain "why" behind suggestions
- Acknowledge good practices
- Timely feedback
