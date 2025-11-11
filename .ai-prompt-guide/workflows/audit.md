---
title: "Audit"
description: "🔍 AUDIT: Comprehensive quality audit with parallel agents per issue type"
whenToUse: "Production readiness review or specialized quality analysis"
---

# Workflow: Comprehensive Codebase Audit

1. [Coordinator] Select 5-10 issue types (must include Essential three)
2. [Coordinator] FOR EACH issue_type:
   - Create review document
   - Assign specialist agent
3. [Specialist] Scan codebase, document findings with location/severity/impact/fix
4. [Coordinator] Consolidate findings:
   - Flag multi-agent hot_spots
   - Identify cross-cutting patterns
   - Generate prioritized action plan
   - Summarize by severity with recommendations

## Issue Types

**Essential (required):**
Security Vulnerabilities · Error Handling & Edge Cases · Data Validation

**Common (select as needed):**
Performance · Complexity · Test Coverage · Maintainability · Resource Management · Concurrency · Anti-Patterns

## Severity: Critical · High · Medium · Low
