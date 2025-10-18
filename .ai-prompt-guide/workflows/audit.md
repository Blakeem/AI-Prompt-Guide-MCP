---
title: "Audit"
description: "🔍 AUDIT: Comprehensive quality audit with parallel agents, each focusing on specific issue types"
whenToUse: "Deep quality analysis across codebase dimensions before production or when needing specialized expert review"
---

# Workflow: Comprehensive Codebase Audit

1. [Coordinator] Select 5-10 issue types from standard categories
2. [Coordinator] Prioritize essential three: Security Vulnerabilities, Error Handling, Data Validation

**LOOP: For each selected issue_type**
├─ 3. [Coordinator] Create review document → review_doc_{issue_type}
├─ 4. [Coordinator] Launch specialist agent for issue_type
├─ 5. [Specialist] Analyze entire codebase for issue_type violations
├─ 6. [Specialist] Create task for each finding (location, severity, impact, recommendation)
└─ 7. IF remaining_issue_types: Continue to step 3

8. [Coordinator] Collect all review documents
9. [Coordinator] Identify files flagged by multiple agents → hot_spots
10. [Coordinator] Identify patterns across dimensions
11. [Coordinator] Generate prioritized action plan by severity
12. [Coordinator] Generate executive summary with counts and recommendations

## Issue Type Categories

**Essential:**
- Security Vulnerabilities
- Error Handling & Edge Cases
- Data Handling & Validation

**Common:**
- Performance & Efficiency
- Code Complexity
- Test Coverage & Quality
- Maintainability & Readability
- Resource Management
- Concurrency & Race Conditions
- Anti-Patterns

## Severity Levels

- Critical: security vulnerabilities, data loss, crashes
- High: performance issues, major bugs, missing critical tests
- Medium: code smells, moderate improvements
- Low: style issues, minor optimizations
