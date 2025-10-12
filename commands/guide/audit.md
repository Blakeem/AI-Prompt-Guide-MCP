---
description: System-wide quality audit with parallel agents
---

# Comprehensive Quality Audit

## User Request

$ARGUMENTS

## Task Overview

Perform comprehensive, system-wide quality audit using multiple parallel agents, each specializing in specific issue types.

## Scope

This is for **comprehensive, system-wide audit**:
- Entire codebase analysis
- Multiple quality dimensions
- Deep, specialized analysis
- Pre-production readiness check

For **targeted review of specific changes**, use `/guide-review` instead.

## Workflow

Use the **Issue-Based Parallel Review** workflow:
- Read: `.ai-prompt-guide/workflows/code-review-issue-based.md`

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

- `browse_documents` - Understand codebase structure
- `search_documents` - Find patterns across files
- `view_document` - Examine specific files

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
