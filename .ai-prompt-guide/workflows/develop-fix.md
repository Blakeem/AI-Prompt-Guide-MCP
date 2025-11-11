---
title: "Fix"
description: "🐛 FIX: Systematic bug fixing with root cause analysis and regression prevention"
whenToUse: "Debugging issues, fixing bugs, resolving errors with minimal scope and anti-pattern detection"
---

# Workflow: Bug Fix with Root Cause Analysis

⚠️ **CRITICAL:** Use `coordinator_task` tool for task management (NOT TodoWrite)

## [REPRODUCE & ANALYZE]

1. **Reproduce and document:** Expected vs actual behavior, reproduction steps, error messages, observations

2. **Map data flow:** Input → Processing → Output; identify all components involved

3. **Locate failure point:** Pinpoint function/line, capture state at failure, apply root cause analysis (Five Whys technique)
   - WHY does bug occur? What assumption violated? What condition unhandled?
   - Is this symptomatic of deeper issue? Could it recur elsewhere?

## [SCOPE & PLAN]

4. **Define minimal scope:** SMALLEST effective change; list files that MUST/MIGHT/SHOULD-NOT change

5. **Scan for anti-patterns:** Check bug vicinity for common patterns (see Anti-Pattern Detection below)

6. **Evaluate approaches:** IF multiple fixes exist, use decide workflow prioritizing: correctness > root cause > minimal scope > no regression

7. **Create task plan:** Use `coordinator_task` with specific testable steps, verification, regression tests

## [IMPLEMENT & VERIFY]

8. **Implement minimal fix:** Necessary changes only, follow conventions, add WHY comments, avoid unrelated refactoring

9. **Verify comprehensively:** Reproduce steps pass, edge cases handled, related functionality intact, no new issues

10. **Document and report:** Code comments (WHY/root cause/constraints), findings summary, anti-patterns flagged, architecture suggestions if design flaw detected

## Root Cause Analysis

**Five Whys Technique:** Ask "Why?" iteratively until reaching root cause (not symptom)

**Common Root Causes:**
- Assumption violations (unguaranteed data/state)
- Edge case gaps (boundary condition failures)
- Race conditions (async ordering)
- State inconsistency (sync failures)
- Missing error handling (broken error paths)
- Design flaws (architectural mismatch)

## Anti-Pattern Detection

**Null/Undefined/Type:** Unchecked access, missing guards, type coercion → Use defensive checks, strict comparisons

**State & Data:** Stale data, direct mutation, duplicate state → Immutable patterns, single source of truth

**Async & Timing:** Unhandled errors, missing states, resource leaks → Proper error handling, cleanup, cancellation

**Logic:** Off-by-one, wrong operators, missing conditions → Boundary checks, comprehensive conditionals

## Minimal Fix Scope

**Must Change:** Bug-causing code + related tests
**Might Change:** Dependent code (signature changes), related error handling
**Should Not Change:** Unrelated functionality, style/formatting, performance, refactoring
**Document Separately:** Technical debt, refactoring opportunities, architecture improvements

## Regression Prevention

**Test Coverage:**
1. **Bug verification:** Reproduction steps + edge cases
2. **Related functionality:** Callers + callees + dependent components
3. **Adjacent features:** Shared data/state, same file, similar patterns
4. **Boundary conditions:** null/undefined, min/max values, invalid input

**Verification Checklist:**
- [ ] Bug fixed (reproduction passes)
- [ ] Edge cases handled
- [ ] Related features intact
- [ ] No new errors/warnings
- [ ] Minimal scope maintained

## Architecture Improvement Suggestions

**Design Flaw Patterns:**
- **Repeated similar bugs** → Missing abstraction (create shared utility)
- **Complex conditional logic** → Simplify with state machine/lookup table/strategy pattern
- **State synchronization bugs** → Single source of truth, derived state
- **Prop drilling bugs** → Context, composition, state management
- **Missing error handling** → Error boundaries, consistent pattern

**User Presentation Format:**
```
**Issue:** [Design flaw]
**Impact:** [Bug/debt consequences]
**Suggested Improvement:** [Architectural change]
**Benefits:** [Prevention mechanism]
**Scope:** Out of scope - address separately?
```

## Decision Points

**Use Decide Workflow When:** Multiple approaches, quick vs proper fix, symptom vs root cause, local vs architectural, side effect uncertainty

**Fix Criteria (Prioritized):** Correctness > Root Cause > Minimal Scope > No Regression > Maintainability > Prevention

## Code Comments for Regression Prevention

**Document:** WHY bug occurred, violated assumption, unhandled edge case, prevention mechanism

**Patterns:**
- "Fix: handles [case] because [root cause]"
- "Previously failed when [condition] - now checks [guard]"
- "Root cause: assumed [X] but [Y] can occur when [condition]"
- "Maintain this pattern to prevent [bug type]"
