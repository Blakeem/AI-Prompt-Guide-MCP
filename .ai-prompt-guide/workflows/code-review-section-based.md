---
title: "Code Review: Section-Based Parallel"
description: "👥 REVIEW: Parallel code review with multiple agents, each reviewing specific sections"
whenToUse:
  - "Reviewing large codebases or feature branches"
  - "When sections are logically independent (different files, modules, components)"
  - "Need comprehensive coverage across entire codebase quickly"
  - "Pre-merge review or periodic code health checks"
---

# Code Review: Section-Based Parallel

## Purpose

Leverage multiple AI agents in parallel to review different sections of code simultaneously, providing comprehensive coverage of the entire codebase quickly. Each agent becomes a specialist in their assigned section, providing deep, focused analysis.

## Core Principles

1. **Divide by Boundaries** - Assign agents to logically separate sections
2. **Deep Focus** - Each agent provides thorough analysis of their section
3. **Parallel Execution** - All agents work simultaneously for speed
4. **Comprehensive Coverage** - No code goes unreviewed
5. **Consolidated Report** - Coordinator synthesizes findings

## Process

### Phase 1: Section Identification

**Coordinator Actions:**

1. **Analyze Codebase Structure**
   - Identify logical boundaries (directories, modules, components)
   - Map files to sections
   - Estimate review scope per section

2. **Assign Sections to Agents** (10 agents recommended)
   - Aim for roughly equal review load
   - Keep related code together
   - Consider dependencies between sections

**Example Section Division (Web App):**
```
Agent 1:  Frontend - Components (src/components/)
Agent 2:  Frontend - Pages (src/pages/)
Agent 3:  Frontend - Utilities (src/utils/)
Agent 4:  Backend - API Routes (api/)
Agent 5:  Backend - Database (db/, models/)
Agent 6:  Backend - Services (services/)
Agent 7:  Configuration & Build (config/, build scripts)
Agent 8:  Tests - Frontend (tests/frontend/)
Agent 9:  Tests - Backend (tests/backend/)
Agent 10: Documentation & Types (docs/, types/)
```

### Phase 2: Agent Instructions (Template)

**Standard Instructions for Each Agent:**

```
SECTION REVIEW ASSIGNMENT: [Section Name]

Files to Review:
- [List of files/directories]

Review Objectives:
1. Identify code quality issues
2. Find potential bugs or edge cases
3. Suggest improvements for maintainability
4. Flag security concerns
5. Check adherence to project patterns

Focus Areas for ALL Agents:
- Code clarity and readability
- Error handling completeness
- Edge case coverage
- Potential performance issues
- Security vulnerabilities
- Documentation quality
- Test coverage (if applicable to section)

Section-Specific Focus:
[Custom focus areas for this section, if any]

Output Format:
For each file reviewed, provide:
- File: [filename]
- Issues Found: [count]
- Critical: [list critical issues with line numbers]
- Moderate: [list moderate issues with line numbers]
- Minor: [list minor suggestions with line numbers]
- Strengths: [what's done well]

Summary:
- Overall quality rating: [1-10]
- Top 3 concerns for this section
- Top 3 strengths for this section
```

### Phase 3: Parallel Execution

**Coordinator Actions:**

1. **Launch All Agents Simultaneously**
   ```bash
   # Launch agents in parallel (example with Claude Code)
   # In practice, send all agent tasks at once
   ```

2. **Monitor Progress**
   - Track which agents have completed
   - Note any agents that need clarification
   - Be prepared to answer questions

3. **Collect Reports**
   - Gather completed reviews as they arrive
   - Keep organized by agent/section

### Phase 4: Synthesis & Prioritization

**Coordinator Actions:**

1. **Categorize All Findings**
   - **Critical**: Security, bugs, data loss potential
   - **High**: Performance issues, major maintainability problems
   - **Medium**: Code smells, moderate improvements
   - **Low**: Style, minor optimizations, suggestions

2. **Identify Patterns**
   - Issues appearing across multiple sections
   - Systemic problems vs. isolated issues
   - Common strengths to leverage

3. **Create Prioritized Action List**
   ```
   CRITICAL (Address Immediately):
   - [Issue with location and impact]

   HIGH PRIORITY (Address Soon):
   - [Issue with location and impact]

   MEDIUM PRIORITY (Plan to Address):
   - [Issue with location and impact]

   LOW PRIORITY (Consider for Future):
   - [Issue with location and impact]

   POSITIVE PATTERNS (Leverage):
   - [Strength to apply elsewhere]
   ```

4. **Generate Summary Report**
   - Executive summary of findings
   - Section-by-section quality scores
   - Overall codebase health assessment
   - Recommended action plan

## Example Workflow

```
SCENARIO: Review new authentication feature branch before merge

SECTION ASSIGNMENTS:

→ Agent 1: Auth UI Components (3 files)
  Focus: Form validation, error handling, UX

→ Agent 2: Auth API Endpoints (2 files)
  Focus: Security, input validation, error responses

→ Agent 3: JWT Token Logic (1 file)
  Focus: Encryption, expiration, security best practices

→ Agent 4: Database Schema (1 file)
  Focus: Data integrity, indexes, migrations

→ Agent 5: Auth Middleware (1 file)
  Focus: Request validation, token verification, performance

→ Agent 6: Password Hashing (1 file)
  Focus: Security, salt generation, algorithm choice

→ Agent 7: Auth Tests - Backend (2 files)
  Focus: Coverage, edge cases, security scenarios

→ Agent 8: Auth Tests - Frontend (2 files)
  Focus: User flow coverage, error state testing

→ Agent 9: Type Definitions (1 file)
  Focus: Type safety, completeness, consistency

→ Agent 10: Auth Documentation (1 file)
  Focus: Completeness, accuracy, examples

PARALLEL EXECUTION → All agents work simultaneously

SYNTHESIS:
Critical:
- Agent 2: SQL injection vulnerability in login endpoint (api/auth.js:45)
- Agent 6: Weak password hashing algorithm (utils/hash.js:12)

High Priority:
- Agent 5: Missing rate limiting on auth endpoints (middleware/auth.js)
- Agent 7: Insufficient test coverage for token expiration (50% coverage)

Medium Priority:
- Agent 1: Inconsistent error messages across forms
- Agent 9: Some auth types incomplete

Low Priority:
- Agent 10: Missing example for refresh token flow

Positive Patterns:
- Consistent validation patterns across all API endpoints
- Good separation of concerns in middleware
- Clear component structure in frontend

RECOMMENDED ACTION PLAN:
1. Fix SQL injection immediately (Agent 2 finding)
2. Upgrade password hashing (Agent 6 finding)
3. Add rate limiting before merge (Agent 5 finding)
4. Increase auth test coverage to 80%+ (Agent 7 finding)
5. Medium/Low priority: Create issues for post-merge cleanup
```

## Agent Selection Strategy

**10 Agents Recommended:**
- Provides good parallelization
- Manageable synthesis workload
- Sufficient for most codebases

**Scale Based on Codebase Size:**
- **Small** (<5,000 LoC): 5 agents
- **Medium** (5k-20k LoC): 10 agents
- **Large** (20k-100k LoC): 15-20 agents
- **Very Large** (>100k LoC): Multiple rounds of review

**Agent Types:**
- Use `code-quality-auditor` if available for specialized review
- Use `general-purpose` for broad code review
- Mix agent types for diverse perspectives

## Common Pitfalls

❌ **Pitfall 1: Uneven section sizes**
- **Why it's wrong**: Some agents finish early, others overloaded
- ✅ **Instead**: Balance review load across agents

❌ **Pitfall 2: Overlapping sections**
- **Why it's wrong**: Duplicate reviews, wasted effort
- ✅ **Instead**: Clear boundaries, no overlap

❌ **Pitfall 3: Ignoring cross-section issues**
- **Why it's wrong**: Integration problems missed
- ✅ **Instead**: Look for patterns across multiple agent reports

❌ **Pitfall 4: No prioritization**
- **Why it's wrong**: Everything feels urgent, nothing gets fixed
- ✅ **Instead**: Categorize by severity, create action plan

❌ **Pitfall 5: Reviewing too much at once**
- **Why it's wrong**: Overwhelming, low-quality reviews
- ✅ **Instead**: Review in digestible chunks (feature branches, not 6 months of work)

## Adaptation Tips

**For Your Project:**
- Define section boundaries based on your architecture
- Add project-specific review criteria
- Customize focus areas per section
- Define what "critical" means in your context

**For Different Languages/Frameworks:**
- Adjust section divisions (e.g., Django apps, React modules, microservices)
- Add language-specific concerns (memory management, concurrency)
- Consider framework-specific patterns

**For Smaller Reviews:**
- Use fewer agents (5 instead of 10)
- Focus only on changed files
- Skip documentation review if not changed

**For Ongoing Reviews:**
- Review incrementally as PRs come in
- Use consistent section assignments for pattern recognition
- Track improvements over time
