---
title: "Code Review: Issue-Based Parallel"
description: "🔍 REVIEW: Parallel code review with multiple agents, each focusing on specific issue types"
whenToUse:
  - "Deep analysis of specific quality dimensions across entire codebase"
  - "When you want specialized experts for each concern type"
  - "Comprehensive audit of code health"
  - "Preparing for production deployment or major release"
---

# Code Review: Issue-Based Parallel

## Purpose

Leverage multiple AI agents in parallel, with each agent specializing in detecting a specific type of issue across the entire codebase. This provides deep, expert-level analysis of different quality dimensions simultaneously.

## Core Principles

1. **Specialized Focus** - Each agent becomes an expert in one issue type
2. **Comprehensive Coverage** - Every file reviewed from multiple perspectives
3. **Parallel Execution** - All agents work simultaneously for speed
4. **Deep Analysis** - Specialist agents catch subtle issues
5. **Multi-Dimensional Quality** - View code health from all angles

## Process

### Phase 1: Issue Type Assignment

**Coordinator Actions:**

1. **Define Issue Types** (10 recommended)
   - Select from standard types below
   - Add custom types for your domain
   - Ensure no major overlaps

2. **Prepare Codebase Scope**
   - Define which files to review
   - Exclude vendored/generated code
   - Provide context about project patterns

**Standard Issue Types (Choose 10):**

1. **Security Vulnerabilities**
   - SQL injection, XSS, CSRF
   - Authentication/authorization flaws
   - Sensitive data exposure
   - Insecure dependencies

2. **Error Handling & Edge Cases**
   - Missing error checks
   - Unhandled exceptions
   - Edge case handling gaps
   - Null/undefined safety

3. **Performance & Efficiency**
   - N+1 queries
   - Inefficient algorithms
   - Memory leaks
   - Unnecessary computations

4. **Code Complexity**
   - High cyclomatic complexity
   - Deep nesting
   - Long functions/classes
   - God objects/functions

5. **Anti-Patterns**
   - Language-specific anti-patterns
   - Framework misuse
   - Design pattern violations
   - Code smells

6. **Maintainability & Readability**
   - Poor naming conventions
   - Unclear logic
   - Missing documentation
   - Inconsistent style

7. **Test Coverage & Quality**
   - Missing critical tests
   - Brittle tests
   - Insufficient edge case coverage
   - Test maintainability issues

8. **Data Handling & Validation**
   - Input validation gaps
   - Data transformation errors
   - Type safety issues
   - Data integrity concerns

9. **Concurrency & Race Conditions**
   - Thread safety issues
   - Race conditions
   - Deadlock potential
   - Shared state problems

10. **Resource Management**
    - Memory leaks
    - File handle leaks
    - Connection pool issues
    - Cleanup in error paths

### Phase 2: Agent Instructions (Template)

**Standard Instructions for Each Agent:**

```
SPECIALIZED REVIEW: [Issue Type Name]

Codebase Scope:
- Files: [All files or specific subset]
- Exclude: [Vendored, generated code]

Your Expertise:
You are a specialist in identifying [issue type]. Your mission is to find ALL instances of this issue type across the entire codebase, no matter how subtle.

Focus Areas:
[Detailed list of what to look for, specific to issue type]

Review Guidelines:
1. Review EVERY file in scope for this issue type
2. Look for patterns, not just obvious instances
3. Consider both direct issues and potential future issues
4. Flag false positives as "needs human judgment"
5. Provide actionable recommendations

Output Format:
For each issue found:
- File: [filename:line]
- Severity: Critical | High | Medium | Low
- Issue: [Clear description of the problem]
- Impact: [What could happen]
- Recommendation: [How to fix]
- Example: [If applicable, show better approach]

Summary:
- Total issues found: [count by severity]
- Most critical file: [filename with most issues]
- Common pattern: [If issues follow a pattern]
- Quick wins: [Easy fixes with high impact]
```

### Phase 3: Parallel Execution

**Coordinator Actions:**

1. **Launch All Agents Simultaneously**
   - Send all 10 agents at once
   - Provide identical codebase access
   - Each agent has different focus

2. **Monitor Progress**
   - Track completion status
   - Note which issue types are taking longest
   - Be ready to answer clarifying questions

3. **Collect Specialized Reports**
   - Gather reviews as completed
   - Keep organized by issue type

### Phase 4: Multi-Dimensional Synthesis

**Coordinator Actions:**

1. **Cross-Reference Findings**
   - Files flagged by multiple agents (hot spots)
   - Related issues across dimensions
   - Patterns appearing in multiple categories

2. **Create Heat Map**
   ```
   FILE-LEVEL RISK ASSESSMENT:

   Critical Risk (multiple severe issues):
   - auth/login.js (Security: Critical, Error Handling: High, Performance: Medium)
   - db/queries.js (Security: Critical, Performance: Critical)

   High Risk (one critical or multiple high):
   - api/users.js (Error Handling: High, Validation: High)
   - utils/cache.js (Performance: High, Resource Management: High)

   Medium Risk:
   - [List files with medium priority issues]
   ```

3. **Prioritized Action Plan**
   ```
   PHASE 1 (Critical - Address Before Release):
   1. [Issue from agent X] - [file:line] - [brief description]
   2. [Issue from agent Y] - [file:line] - [brief description]

   PHASE 2 (High - Address Soon):
   1. [Issue from agent Z] - [file:line] - [brief description]

   PHASE 3 (Medium - Plan to Address):
   [Grouped by type or by file for efficiency]

   PHASE 4 (Low - Consider for Future):
   [Long-term improvements]
   ```

4. **Generate Multi-Dimensional Report**
   - Executive summary
   - Heat map of risky files
   - Issue type breakdown
   - Quality score per dimension
   - Recommended action plan

## Example Workflow

```
SCENARIO: Pre-production audit of payment processing system

AGENT ASSIGNMENTS:

→ Agent 1: Security Vulnerabilities
  Found: 3 Critical, 5 High, 12 Medium
  Top issue: SQL injection in payment query (payment.js:145)

→ Agent 2: Error Handling & Edge Cases
  Found: 2 Critical, 8 High, 15 Medium
  Top issue: No error handling in payment callback (webhook.js:78)

→ Agent 3: Performance & Efficiency
  Found: 1 Critical, 4 High, 8 Medium
  Top issue: N+1 query in transaction history (history.js:34)

→ Agent 4: Code Complexity
  Found: 0 Critical, 3 High, 20 Medium
  Top issue: 500-line god function (processor.js:100-600)

→ Agent 5: Anti-Patterns
  Found: 0 Critical, 2 High, 10 Medium
  Top issue: Callback hell in async flow (flow.js:45-120)

→ Agent 6: Maintainability & Readability
  Found: 0 Critical, 5 High, 25 Medium
  Top issue: No documentation for refund logic

→ Agent 7: Test Coverage & Quality
  Found: 1 Critical, 6 High, 8 Medium
  Top issue: No tests for refund edge cases

→ Agent 8: Data Handling & Validation
  Found: 2 Critical, 7 High, 10 Medium
  Top issue: Amount validation missing (amounts.js:23)

→ Agent 9: Concurrency & Race Conditions
  Found: 1 Critical, 2 High, 3 Medium
  Top issue: Race condition in payment status update

→ Agent 10: Resource Management
  Found: 0 Critical, 3 High, 5 Medium
  Top issue: DB connections not always closed

SYNTHESIS:

CRITICAL RISK FILES (Address Immediately):
1. payment.js - Security (Critical), Validation (Critical), Concurrency (Critical)
   → SQL injection + missing validation + race condition
2. webhook.js - Error Handling (Critical)
   → Payment callbacks fail silently
3. history.js - Performance (Critical)
   → N+1 query causes timeout under load

HIGH PRIORITY ACTIONS:
1. Fix SQL injection in payment query (Agent 1)
2. Add error handling to webhook (Agent 2)
3. Fix amount validation (Agent 8)
4. Resolve payment status race condition (Agent 9)
5. Optimize transaction history query (Agent 3)

MEDIUM PRIORITY (Post-Launch):
- Refactor god function into smaller pieces
- Add comprehensive test coverage
- Improve documentation
- Fix remaining validation gaps

LOW PRIORITY (Ongoing):
- Readability improvements
- Style consistency
- Minor optimizations
```

## Issue Type Selection Guide

**Essential for All Projects:**
1. Security Vulnerabilities
2. Error Handling & Edge Cases
3. Data Handling & Validation

**Add Based on Project Type:**

**Web Applications:**
4. Performance & Efficiency
5. Security (additional agent)
6. Test Coverage & Quality

**Systems/Backend:**
4. Concurrency & Race Conditions
5. Resource Management
6. Performance & Efficiency

**Frontend Applications:**
4. Performance & Efficiency
5. Maintainability & Readability
6. Test Coverage & Quality

**All Projects (Round Out to 10):**
7. Code Complexity
8. Anti-Patterns
9. Maintainability & Readability
10. Test Coverage & Quality

## Common Pitfalls

❌ **Pitfall 1: Issue types overlap too much**
- **Why it's wrong**: Duplicate findings, wasted effort
- ✅ **Instead**: Define clear boundaries between issue types

❌ **Pitfall 2: Too many agents (>15)**
- **Why it's wrong**: Synthesis becomes overwhelming
- ✅ **Instead**: Stick to 10-12 agents, choose most relevant types

❌ **Pitfall 3: No severity categorization**
- **Why it's wrong**: Can't prioritize effectively
- ✅ **Instead**: Require severity levels in all findings

❌ **Pitfall 4: Treating all dimensions equally**
- **Why it's wrong**: Security critical, readability not
- ✅ **Instead**: Weight findings by business impact

❌ **Pitfall 5: No cross-referencing**
- **Why it's wrong**: Miss files with multiple issues (hot spots)
- ✅ **Instead**: Create file-level heat map

## Adaptation Tips

**For Your Domain:**
- Add domain-specific issue types (e.g., "HIPAA Compliance" for healthcare)
- Customize severity definitions for your risk tolerance
- Define what's critical vs. medium in your context

**For Different Languages:**
- Add language-specific patterns (e.g., "Go: Goroutine Leaks")
- Adjust issue types (e.g., memory management more critical in C++)
- Consider framework-specific issues

**For Ongoing Reviews:**
- Rotate issue types to focus on (5 at a time instead of 10)
- Track improvements over time per dimension
- Use same agents for consistency

**For Smaller Codebases:**
- Use fewer agents (5-7)
- Combine related issue types
- Focus on highest-risk categories
