---
title: "TDD Incremental Orchestration"
description: "🎯 COORDINATION: Orchestrate multi-agent development with TDD, quality gates, and staged integration"
whenToUse:
  - "Managing complex features requiring multiple specialized agents"
  - "When quality gates and testing are critical to success"
  - "Coordinating work that must integrate incrementally with verification"
  - "Projects requiring test-driven development discipline"
---

# TDD Incremental Orchestration

## Purpose

Coordinate multiple specialized agents to build complex features incrementally with test-driven development, quality verification, and staged integration. This workflow ensures each piece works before moving forward, preventing integration failures and maintaining code quality throughout development.

## Core Principles

1. **One Component at a Time** - Never parallelize work on interdependent components
2. **Test First, Then Implement** - Write failing tests before implementation
3. **Quality Gates Between Stages** - All gates must pass before proceeding
4. **Staged Integration** - Review and stage each completion before next agent starts
5. **Evidence-Based Progress** - Verify functionality, don't assume

## Process

### Phase 1: Planning & Decomposition

**Coordinator Actions:**
1. **Analyze the requirement** into logical, independent work units
2. **Identify dependencies** and sequence work accordingly
3. **Define acceptance criteria** for each unit (specific, testable)
4. **Choose appropriate agents** based on work unit needs
5. **Prepare agent instructions** with complete context and quality requirements

**Decision Points:**
- Can units work in parallel? → If yes, use parallel agents
- Are there dependencies? → If yes, sequence strictly
- What quality gates apply? → Define upfront

### Phase 2: Agent Execution (Per Unit)

**Agent Instructions (Standard Template):**
```
Task: [Specific, atomic work unit]

Requirements:
- [Functional requirement 1]
- [Functional requirement 2]

Test-Driven Development:
1. Write failing unit tests first (following project test patterns)
2. Implement functionality to make tests pass
3. Refactor if needed while keeping tests green

Quality Gates (Must Pass):
- All tests pass (npm test / pytest / etc.)
- Zero linting errors
- Zero type errors
- Build succeeds
- [Project-specific gates]

Deliverables:
- Working code with tests
- Evidence of quality gate passage
- Summary of changes made

Context:
[Relevant files, patterns, constraints]
```

**Agent Responsibilities:**
- Write tests first (TDD)
- Implement to pass tests
- Run all quality gates
- Provide evidence of success
- Report blockers immediately

### Phase 3: Coordinator Review & Integration

**For Each Completed Unit:**

1. **Review Code Quality**
   - Does it meet requirements?
   - Are tests comprehensive?
   - Is code maintainable?
   - Does it follow project patterns?

2. **Verify Quality Gates**
   ```bash
   # Example gates (adjust to your project)
   npm test           # All tests pass
   npm run lint       # Zero errors
   npm run typecheck  # Zero type errors
   npm run build      # Build succeeds
   ```

3. **Stage Changes**
   ```bash
   git add [changed files]
   git status  # Verify staging
   ```

4. **Document Progress**
   - What was completed?
   - What tests were added?
   - Any issues encountered?
   - What's next?

5. **Prepare for Next Unit**
   - Update context for next agent
   - Identify any new blockers
   - Adjust plan if needed

### Phase 4: Final Integration & Verification

**After All Units Complete:**

1. **Full System Test**
   - Run complete test suite
   - Test integration points
   - Verify acceptance criteria

2. **Final Quality Check**
   - All gates pass on full codebase
   - No regressions introduced
   - Documentation updated

3. **Create Deliverable**
   - Commit staged changes
   - Create PR if needed
   - Document what was built

## Example Workflow

```
REQUIREMENT: Add authentication system with JWT tokens

DECOMPOSITION:
1. Database schema for users (Agent 1 - Backend)
2. JWT token generation/validation (Agent 2 - Security)
3. Login endpoint (Agent 3 - Backend)
4. Auth middleware (Agent 4 - Backend)
5. Frontend login form (Agent 5 - Frontend)

EXECUTION:

→ Agent 1: Database Schema
  • Write tests for user model
  • Implement user schema
  • Quality gates: ✓ All pass
  ✓ Coordinator reviews & stages

→ Agent 2: JWT Utilities
  • Write tests for token generation/validation
  • Implement JWT functions
  • Quality gates: ✓ All pass
  ✓ Coordinator reviews & stages

→ Agent 3: Login Endpoint
  • Write tests for login API
  • Implement login endpoint
  • Quality gates: ✓ All pass
  ✓ Coordinator reviews & stages

→ Agent 4: Auth Middleware
  • Write tests for middleware
  • Implement auth checks
  • Quality gates: ✓ All pass
  ✓ Coordinator reviews & stages

→ Agent 5: Frontend Form
  • Write tests for login UI
  • Implement form component
  • Quality gates: ✓ All pass
  ✓ Coordinator reviews & stages

→ Final Integration:
  • Full test suite: ✓ Pass
  • System test login flow: ✓ Works
  • Create PR with all staged changes
```

## Quality Gate Standards

**Required for All Projects:**
- ✅ Tests pass (100% of existing + new tests)
- ✅ No linting errors
- ✅ Build succeeds

**Recommended (If Available):**
- ✅ Type checking passes
- ✅ Code coverage maintained or improved
- ✅ Performance benchmarks met
- ✅ Security scans clean

**Project-Specific:**
- Define additional gates based on your needs
- Document in project README or CONTRIBUTING

## Agent Selection Guide

**Choose agent based on work unit type:**
- **Backend API** → backend-api-builder, general-purpose
- **Frontend Components** → general-purpose
- **Database Changes** → backend-api-builder
- **Testing Focus** → backend-test-builder (after implementation)
- **Code Quality** → code-quality-auditor (review phase)
- **TypeScript MCP** → mcp-typescript-specialist

**Parallel vs. Sequential:**
- ✅ **Parallel**: Independent components (different services, separate modules)
- ❌ **Sequential**: Dependent components (API before client, schema before endpoints)

## Common Pitfalls

❌ **Pitfall 1: Starting next agent before staging**
- **Why it's wrong**: Risk of conflicts, can't track what's complete
- ✅ **Instead**: Review → Stage → Then start next agent

❌ **Pitfall 2: Skipping quality gates "just this once"**
- **Why it's wrong**: Technical debt accumulates, breaks downstream work
- ✅ **Instead**: Fix issues immediately, never proceed with failures

❌ **Pitfall 3: Writing implementation before tests**
- **Why it's wrong**: Violates TDD, tests may be biased toward implementation
- ✅ **Instead**: Tests first, even if it feels slower (it's not)

❌ **Pitfall 4: Vague agent instructions**
- **Why it's wrong**: Agent delivers wrong thing, wastes time
- ✅ **Instead**: Specific requirements, clear acceptance criteria, examples

❌ **Pitfall 5: Parallelizing dependent work**
- **Why it's wrong**: Integration failures, rework, wasted effort
- ✅ **Instead**: Identify dependencies upfront, sequence strictly

❌ **Pitfall 6: No final integration test**
- **Why it's wrong**: Individual pieces work but system doesn't
- ✅ **Instead**: Always test the complete feature end-to-end

## Adaptation Tips

**For Your Project:**
- Replace quality gate commands with your project's scripts
- Add project-specific acceptance criteria
- Define your test framework conventions
- Document your agent selection preferences

**Scaling:**
- Small features: 1-3 agents, simple sequence
- Medium features: 3-7 agents, some parallelization
- Large features: 7+ agents, careful dependency management

**Without Specialized Agents:**
- Use general-purpose agent for all work
- Focus on clear instructions and quality gates
- Still follow incremental + staged integration pattern
