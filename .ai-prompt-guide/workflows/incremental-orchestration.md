---
title: "Incremental Orchestration"
description: "🎯 COORDINATION: Orchestrate multi-agent development with quality gates and staged integration"
whenToUse:
  - "Managing complex features requiring multiple specialized agents"
  - "When quality verification is important but TDD is not required"
  - "Coordinating work that must integrate incrementally with verification"
  - "Projects with flexible testing approaches"
---

# Incremental Orchestration

## Purpose

Coordinate multiple specialized agents to build complex features incrementally with quality verification and staged integration. This workflow ensures each piece is reviewed before moving forward, preventing integration failures and maintaining code quality throughout development.

## Core Principles

1. **One Component at a Time** - Never parallelize work on interdependent components
2. **Quality Gates Between Stages** - Verification must pass before proceeding
3. **Staged Integration** - Review and stage each completion before next agent starts
4. **Evidence-Based Progress** - Verify functionality, don't assume
5. **Flexible Testing** - Add tests where valuable, not rigidly required everywhere

## Process

### Phase 1: Planning & Decomposition

**Coordinator Actions:**
1. **Analyze the requirement** into logical, independent work units
2. **Identify dependencies** and sequence work accordingly
3. **Define acceptance criteria** for each unit (specific, verifiable)
4. **Choose appropriate agents** based on work unit needs
5. **Prepare agent instructions** with complete context and quality requirements

**Decision Points:**
- Can units work in parallel? → If yes, use parallel agents
- Are there dependencies? → If yes, sequence strictly
- What quality gates apply? → Define upfront
- Where are tests most valuable? → Prioritize those areas

### Phase 2: Agent Execution (Per Unit)

**Agent Instructions (Standard Template):**
```
Task: [Specific, atomic work unit]

Requirements:
- [Functional requirement 1]
- [Functional requirement 2]

Testing Approach:
- Add tests where complexity warrants verification
- Update existing tests if modifying tested code
- Ensure any test failures are addressed

Quality Gates (Must Pass):
- Existing tests pass (if project has tests)
- Zero linting errors (if project uses linting)
- Zero type errors (if project uses types)
- Build succeeds
- Manual verification of functionality
- [Project-specific gates]

Deliverables:
- Working code (with tests where appropriate)
- Evidence of quality gate passage
- Manual testing results if applicable
- Summary of changes made

Context:
[Relevant files, patterns, constraints]
```

**Agent Responsibilities:**
- Implement functionality
- Add or update tests as appropriate
- Run all quality gates
- Manually verify functionality works
- Provide evidence of success
- Report blockers immediately

### Phase 3: Coordinator Review & Integration

**For Each Completed Unit:**

1. **Review Code Quality**
   - Does it meet requirements?
   - Is code maintainable?
   - Are critical paths tested?
   - Does it follow project patterns?

2. **Verify Quality Gates**
   ```bash
   # Example gates (adjust to your project)
   npm test           # If tests exist
   npm run lint       # If linting configured
   npm run typecheck  # If types used
   npm run build      # Build succeeds
   # Manual testing as needed
   ```

3. **Manual Verification**
   - Test the functionality directly
   - Verify it meets acceptance criteria
   - Check for obvious issues

4. **Stage Changes**
   ```bash
   git add [changed files]
   git status  # Verify staging
   ```

5. **Document Progress**
   - What was completed?
   - Any issues encountered?
   - What's next?

6. **Prepare for Next Unit**
   - Update context for next agent
   - Identify any new blockers
   - Adjust plan if needed

### Phase 4: Final Integration & Verification

**After All Units Complete:**

1. **Full System Verification**
   - Run complete test suite (if exists)
   - Test integration points manually
   - Verify acceptance criteria met

2. **Final Quality Check**
   - All gates pass on full codebase
   - No regressions introduced
   - Critical functionality verified

3. **Create Deliverable**
   - Commit staged changes
   - Create PR if needed
   - Document what was built

## Example Workflow

```
REQUIREMENT: Add user profile editing feature

DECOMPOSITION:
1. Backend endpoint for profile updates (Agent 1 - Backend)
2. Frontend profile form component (Agent 2 - Frontend)
3. Avatar upload handling (Agent 3 - Full-stack)
4. Profile validation logic (Agent 4 - Backend)

EXECUTION:

→ Agent 1: Profile Update Endpoint
  • Implement PUT /api/profile endpoint
  • Add tests for critical validation cases
  • Quality gates: ✓ All pass
  • Manual test with curl: ✓ Works
  ✓ Coordinator reviews & stages

→ Agent 2: Profile Form UI
  • Implement form component
  • Add basic rendering tests
  • Quality gates: ✓ All pass
  • Manual test in browser: ✓ Works
  ✓ Coordinator reviews & stages

→ Agent 3: Avatar Upload
  • Implement file upload + storage
  • Add test for file type validation
  • Quality gates: ✓ All pass
  • Manual test upload: ✓ Works
  ✓ Coordinator reviews & stages

→ Agent 4: Validation Logic
  • Implement field validators
  • Add tests for edge cases
  • Quality gates: ✓ All pass
  • Manual test invalid inputs: ✓ Works
  ✓ Coordinator reviews & stages

→ Final Integration:
  • Full test suite: ✓ Pass
  • Manual e2e test: ✓ Edit profile works
  • Create PR with all staged changes
```

## Quality Gate Standards

**Minimum Required:**
- ✅ No obvious errors when running
- ✅ Functionality works as specified
- ✅ No breaking changes to existing features

**Recommended (If Available):**
- ✅ Tests pass (existing + new where valuable)
- ✅ Linting passes (if configured)
- ✅ Type checking passes (if used)
- ✅ Build succeeds

**Project-Specific:**
- Define additional gates based on your needs
- Document in project README or CONTRIBUTING

## Agent Selection Guide

**Choose agent based on work unit type:**
- **Backend API** → backend-api-builder, general-purpose
- **Frontend Components** → general-purpose
- **Database Changes** → backend-api-builder
- **Code Review** → code-quality-auditor
- **TypeScript MCP** → mcp-typescript-specialist
- **Testing Focus** → backend-test-builder (if needed)

**Parallel vs. Sequential:**
- ✅ **Parallel**: Independent components (different services, separate modules)
- ❌ **Sequential**: Dependent components (API before client, schema before endpoints)

## Common Pitfalls

❌ **Pitfall 1: Starting next agent before staging**
- **Why it's wrong**: Risk of conflicts, can't track what's complete
- ✅ **Instead**: Review → Stage → Then start next agent

❌ **Pitfall 2: Skipping quality verification**
- **Why it's wrong**: Issues compound, breaks downstream work
- ✅ **Instead**: Always verify functionality before proceeding

❌ **Pitfall 3: No manual testing**
- **Why it's wrong**: Automated checks miss real-world issues
- ✅ **Instead**: Always manually verify functionality works

❌ **Pitfall 4: Vague agent instructions**
- **Why it's wrong**: Agent delivers wrong thing, wastes time
- ✅ **Instead**: Specific requirements, clear acceptance criteria, examples

❌ **Pitfall 5: Parallelizing dependent work**
- **Why it's wrong**: Integration failures, rework, wasted effort
- ✅ **Instead**: Identify dependencies upfront, sequence strictly

❌ **Pitfall 6: Assuming it works without verification**
- **Why it's wrong**: Discover issues too late, harder to fix
- ✅ **Instead**: Verify each piece before moving forward

## Testing Strategy

**Where Tests Are Most Valuable:**
- ✅ Complex business logic
- ✅ Critical user flows
- ✅ Data validation and transformation
- ✅ API contracts and interfaces
- ✅ Security-sensitive operations

**Where Tests May Be Optional:**
- Simple CRUD operations with framework validation
- Straightforward UI layout changes
- Configuration files
- One-time migrations or scripts

**Let Context Guide:**
- Mission-critical code → comprehensive tests
- Frequently changing code → targeted tests
- Experimental features → manual testing may suffice
- Production features → add tests before deployment

## Adaptation Tips

**For Your Project:**
- Replace quality gate commands with your project's scripts
- Add project-specific acceptance criteria
- Define when tests are required vs. optional
- Document your agent selection preferences

**Scaling:**
- Small features: 1-3 agents, simple sequence
- Medium features: 3-7 agents, some parallelization
- Large features: 7+ agents, careful dependency management

**Without Specialized Agents:**
- Use general-purpose agent for all work
- Focus on clear instructions and quality gates
- Still follow incremental + staged integration pattern

**Adding TDD Later:**
- This workflow can upgrade to TDD (see tdd-incremental-orchestration.md)
- Start requiring tests first once team is comfortable
- Gradually increase test coverage over time
