---
title: "Develop"
description: "🔨 DEVELOP: Simple development with anti-pattern detection and regression prevention"
whenToUse: "Single-file or small scope features without needing multi-agent coordination, especially frontend work"
---

# Workflow: Simple Development with Best Practices

⚠️ **CRITICAL REQUIREMENTS - You MUST follow these instructions:**

**Task Management:**
- ✅ **REQUIRED:** Use `coordinator_task` tool for your TODO list
- 🚫 **FORBIDDEN:** DO NOT use TodoWrite tool (this workflow replaces it)

1. [Agent] Analyze requirements and write out your understanding:
   • What is the goal? (feature, enhancement, modification)
   • What is the expected behavior?
   • What files/components will be affected?
   • What should NOT change?

2. [Agent] Define scope boundaries explicitly:
   • List files that WILL change
   • List files that will NOT change (but might be related)
   • Identify dependencies between components
   • Document change scope limits

3. [Agent] Scan existing code in change area for anti-patterns:
   • Check against anti-pattern categories (see below)
   • Note any problematic patterns found
   • Flag for potential refactoring (if in scope)

4. [Agent] IF multiple implementation approaches exist:
   • Use decide workflow to evaluate approaches
   • Prioritize: correctness > best practices > simplicity
   • Select approach that aligns with existing patterns
   ELSE:
   • Proceed with single clear approach

5. [Agent] Use coordinator_task to create TODO list:
   • Break work into specific, testable steps
   • Each task should be verifiable
   • Keep scope aligned with step 2 boundaries

6. [Agent] Implement changes following best practices:
   • Follow existing code conventions
   • Apply anti-pattern avoidance (see below)
   • Add clear comments for complex logic
   • Keep changes minimal and focused

7. [Agent] Verify implementation:
   • Test the new/changed functionality works correctly
   • Test related functionality still works (regression check)
   • Verify unchanged areas remain unchanged
   • Check for edge cases and error handling

8. [Agent] Add clarifying comments to code:
   • Document non-obvious patterns or logic
   • Explain WHY certain approaches were chosen
   • Note edge cases or constraints
   • Help prevent future regression when code is modified

9. [Agent] Document findings:
   • List any anti-patterns discovered
   • Note any technical debt created/removed
   • Suggest architecture improvements if design issues found
   • Recommend follow-up improvements (outside current scope)

10. [Agent] Report completion:
   • Summary of changes made
   • Files modified
   • Anti-patterns addressed/flagged
   • Regression test results
   • Suggested improvements for future

## Anti-Pattern Detection

**Common Anti-Patterns:**

*Code Organization:*
- ❌ Magic numbers/strings, copy-paste code, deep nesting (>3 levels), multi-purpose functions
- ✅ Named constants, DRY principle, flat logic, single responsibility

*State & Data:*
- ❌ State in wrong location, duplicate state, mutable shared state, implicit dependencies
- ✅ State at appropriate level, single source of truth, immutable updates, explicit dependencies

*Error Handling:*
- ❌ Silent failures, generic messages, missing edge case handling, unchecked null/undefined
- ✅ Explicit handling, clear messages, defensive programming

*Side Effects & Timing:*
- ❌ Side effects in wrong places, missing cleanup, race conditions, resource leaks
- ✅ Proper lifecycle management, cleanup, synchronization handling

*Component/Module Design:*
- ❌ God objects, tight coupling, mixed responsibilities, unclear boundaries
- ✅ Single responsibility, loose coupling, clear separation of concerns

## Regression Prevention

**Test Scope:**
1. **Primary:** Changed functionality works as expected
2. **Secondary:** Related functionality still works
3. **Tertiary:** Adjacent features unaffected
4. **Boundary:** Edge cases and error conditions handled

**Verification Checklist:**
- [ ] New/changed functionality works correctly
- [ ] Related features still work (no regression)
- [ ] Error cases handled properly
- [ ] Edge cases considered
- [ ] No console errors or warnings
- [ ] Unchanged files remain unchanged
- [ ] No new anti-patterns introduced

## Decision Points

**When to Use Decide Workflow:**
- Multiple valid implementation approaches exist
- Trade-offs between different patterns
- Architectural decisions (state management, component structure)
- Performance vs. readability choices
- Uncertainty about best practice for this context

**Decision Criteria (prioritized):**
1. **Correctness:** Does it solve the problem accurately?
2. **Best Practices:** Does it follow established patterns?
3. **Maintainability:** Is it easy to understand and modify?
4. **Consistency:** Does it match existing code patterns?
5. **Simplicity:** Is it the simplest solution that works?
6. **Performance:** Is it efficient enough? (usually last priority)

## Scope Management

**Minimal Change Principle:**
- Only modify what's necessary to achieve the goal
- Resist urge to refactor unrelated code
- Keep changes focused and verifiable
- Document broader improvements for future work

**Change Boundary Definition:**
- **In Scope:** Direct requirements, related fixes, necessary updates
- **Out of Scope:** Nice-to-have improvements, unrelated refactoring, performance optimizations (unless required)
- **Adjacent:** Closely related code that may need updates for consistency

**Impact Analysis:**
- What depends on what you're changing?
- What uses the modified functionality?
- What side effects might occur?
- What tests/validations are needed?

## Code Comments for Regression Prevention

**Document Non-Obvious Patterns:**
- Explain WHY a particular approach was chosen
- Note constraints or requirements that led to the design
- Flag edge cases that must be preserved
- Highlight patterns that should be maintained

**Example Comment Patterns:**
- "Uses X pattern to prevent Y issue - do not change to Z"
- "Edge case: handles null/empty/zero values due to [reason]"
- "Must process in this order because [dependency/timing reason]"
- "Optimization: intentionally trades [X] for [Y] performance"

**Purpose:**
- Prevents future developers from "fixing" intentional patterns
- Documents lessons learned from past bugs
- Reduces regression when code is modified
- Preserves important context over time
