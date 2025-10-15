---
title: "Review Codebase"
description: "🔍 REVIEW: Comprehensive codebase review with parallel agents for multiple quality dimensions"
whenToUse:
  - "Deep analysis of entire codebase across quality dimensions"
  - "Comprehensive audit of code health before major releases"
  - "System-wide quality assessment with specialized experts"
---

# Review Codebase

## Process

### 1. Select Issue Types (5-10)
Choose from standard quality dimensions:

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

### 2. Launch Parallel Agents
For each issue type:
- Create dedicated review document using create_document
- Launch agent specializing in that issue type
- Agent reviews entire codebase for their specific concern
- Agent creates tasks for each issue found using task tool

### 3. Agent Task Creation
Each agent documents findings as tasks:
- Use create_document to create review document
- Use task tool to add each issue as a task
- Include: file location, severity, description, impact, recommendation
- Organize tasks by severity

Severity levels:
- Critical: security vulnerabilities, data loss, crashes
- High: performance issues, major bugs, missing critical tests
- Medium: code smells, moderate improvements
- Low: style issues, minor optimizations

### 4. Synthesis & Prioritization
After all agents complete:
- Identify files flagged by multiple agents (hot spots)
- Look for patterns across dimensions
- Create prioritized action plan by severity
- Generate executive summary with counts and recommendations

## Key Practices

**Issue Type Selection:**
- Avoid overlap between types (clear boundaries)
- 5-10 agents optimal
- Always include essential three
- Customize for project domain

**Task Documentation:**
- Each issue becomes a task in review document
- Tasks can be assigned and tracked
- Clear severity and actionable recommendations
- File location with line numbers where applicable

**Parallel Efficiency:**
- Agents work independently
- No coordination overhead
- Comprehensive coverage through specialization
- Faster than sequential review

**Synthesis:**
- Hot spots indicate systemic issues
- Patterns across dimensions reveal architectural problems
- Prioritize by severity and impact
- Create actionable improvement roadmap
