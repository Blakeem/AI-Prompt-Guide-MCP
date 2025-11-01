---
title: "Fix"
description: "🐛 FIX: Systematic bug fixing with root cause analysis and regression prevention"
whenToUse: "Debugging issues, fixing bugs, resolving errors with minimal scope and anti-pattern detection"
---

# Workflow: Bug Fix with Root Cause Analysis

⚠️ **CRITICAL REQUIREMENTS - You MUST follow these instructions:**

**Task Management:**
- ✅ **REQUIRED:** Use `coordinator_task` tool for your TODO list
- 🚫 **FORBIDDEN:** DO NOT use TodoWrite tool (this workflow replaces it)

1. [Agent] Reproduce the bug and document current behavior:
   • What is the expected behavior?
   • What is the actual (buggy) behavior?
   • How to reproduce it (steps, inputs, conditions)?
   • What error messages or symptoms appear?
   • Write out your observations

2. [Agent] Map the complete data flow:
   • **Input:** What data enters the system? (user input, API data, props, etc.)
   • **Processing:** What transformations/logic occur? (step by step)
   • **Output:** What is produced? (UI update, API call, state change, etc.)
   • Draw out or write the flow path
   • Identify all components/functions involved

3. [Agent] Identify the exact failure point:
   • Where in the flow does the bug occur?
   • Which function/component/line is responsible?
   • What is the state/data at the failure point?
   • Write out what you discovered

4. [Agent] Perform root cause analysis (write this out):
   • WHY does the bug occur? (not just WHERE)
   • What assumption is violated?
   • What condition is not handled?
   • Is this a symptom of a deeper issue?
   • Could this bug occur elsewhere with the same root cause?

5. [Agent] Define minimal fix scope:
   • What is the SMALLEST change that fixes the bug?
   • List files that MUST change
   • List files that might be affected (test these)
   • List files that should NOT change
   • Document scope boundaries

6. [Agent] Scan for anti-patterns in bug area:
   • Check code around bug for anti-patterns (see below)
   • Note patterns that may have caused/contributed to bug
   • Identify if bug is symptom of design flaw
   • Flag anti-patterns for documentation

7. [Agent] IF multiple fix approaches exist:
   • Use decide workflow to evaluate approaches
   • Prioritize: correctness > minimal scope > best practices
   • Consider: Does fix address root cause or just symptom?
   • Select approach that prevents recurrence
   ELSE:
   • Proceed with single clear fix

8. [Agent] Use coordinator_task to create fix plan:
   • Break fix into specific, testable steps
   • Include verification steps
   • Include regression test steps
   • Keep scope minimal

9. [Agent] Implement the minimal fix:
   • Make ONLY necessary changes
   • Follow existing code conventions
   • Add comments explaining the fix (especially WHY)
   • Avoid refactoring unrelated code (note it separately)

10. [Agent] Verify the fix:
    • Test that bug is resolved (use reproduction steps from step 1)
    • Test edge cases related to the bug
    • Test related functionality (regression prevention)
    • Test error handling and boundary conditions
    • Verify no new issues introduced

11. [Agent] Add clarifying comments to code:
    • Explain WHY this fix works (not just what it does)
    • Document the root cause that was addressed
    • Note any edge cases or constraints
    • Help prevent similar bugs or regression

12. [Agent] Document findings:
    • Anti-patterns discovered in bug area
    • Root cause of the bug
    • Why this fix addresses the root cause
    • Potential recurrence in other areas
    • Related technical debt

13. [Agent] Suggest architecture improvements (if applicable):
    • IF bug indicates design flaw:
      • Describe the design issue
      • Suggest architectural improvement
      • Explain how it prevents similar bugs
      • Note this as out-of-scope for current fix
    • ELSE:
      • Note that fix is complete and localized

14. [Agent] Report completion:
    • Summary of bug and fix
    • Files modified
    • Root cause explanation
    • Anti-patterns addressed/flagged
    • Regression test results
    • Architecture improvement suggestions (if any)

## Root Cause Analysis

**The Five Whys Technique:**

Ask "Why?" repeatedly to get to root cause:

**Example:**
- Bug: Form submission fails
- Why? → Validation function returns undefined
- Why? → Missing return statement in error case
- Why? → Error case was added later without considering return
- Why? → No test coverage for error cases
- **Root Cause:** Insufficient test coverage allows gaps

**Common Root Causes:**
- **Assumption Violations:** Code assumes data/state that isn't guaranteed
- **Edge Case Gaps:** Normal cases work, boundary conditions fail
- **Race Conditions:** Async operations complete in unexpected order
- **State Inconsistency:** Component state out of sync with reality
- **Missing Error Handling:** Happy path works, error path broken
- **Design Flaws:** Architecture doesn't support the requirement

## Anti-Pattern Detection in Bug Areas

**Common Patterns That Cause Bugs:**

*Null/Undefined/Type Issues:*
- ❌ Unchecked access, missing guards, type coercion, truthy/falsy confusion
- ✅ Defensive checks, explicit conversions, strict comparisons

*State & Data Issues:*
- ❌ Stale data, direct mutation, race conditions, duplicate state
- ✅ Proper updates, immutable patterns, synchronization, single source of truth

*Async & Timing Issues:*
- ❌ Unhandled errors, missing states, race conditions, resource leaks
- ✅ Error handling, loading/error states, cleanup, cancellation

*Logic Issues:*
- ❌ Off-by-one, wrong operators, order of operations, missing conditions
- ✅ Boundary checks, explicit grouping, comprehensive conditionals

## Minimal Fix Scope

**Scope Definition:**
- **Fix Only:** Code directly responsible for the bug
- **Necessary Updates:** Code that depends on the fix
- **Test Verification:** Related code that might be affected
- **Out of Scope:** Refactoring, optimization, unrelated improvements

**Change Boundaries:**

**Must Change:**
- Code causing the bug
- Tests for the fixed functionality

**Might Change:**
- Code that calls the fixed code (if signature changes)
- Related error handling (if error cases improved)

**Should Not Change:**
- Unrelated functionality
- Code style/formatting (unless critical)
- Performance optimizations (unless bug-related)
- Refactoring for cleanliness

**Document Separately:**
- Technical debt discovered
- Refactoring opportunities
- Architecture improvements
- Related anti-patterns not in fix scope

## Regression Prevention

**Test Levels:**

1. **Bug Verification:**
   - Use exact reproduction steps from step 1
   - Verify bug no longer occurs
   - Test with edge cases that might trigger similar bug

2. **Related Functionality:**
   - Functions that call the fixed code
   - Functions the fixed code calls
   - Components using the fixed functionality

3. **Adjacent Features:**
   - Features sharing the same data/state
   - Features in the same file/component
   - Features using similar patterns

4. **Boundary Conditions:**
   - Empty data, null, undefined
   - Maximum values, minimum values
   - Invalid input handling

**Regression Checklist:**
- [ ] Original bug is fixed (reproduction steps pass)
- [ ] Edge cases handled correctly
- [ ] Related features still work
- [ ] Error handling still works
- [ ] No new console errors/warnings
- [ ] No new bugs introduced
- [ ] Minimal scope maintained

## Architecture Improvement Suggestions

**When Bug Indicates Design Flaw:**

*Pattern: Repeated similar bugs in different areas*
- Suggests: Missing abstraction or reusable pattern
- Improvement: Create shared utility/component

*Pattern: Complex conditional logic causing bugs*
- Suggests: Logic should be simplified or restructured
- Improvement: State machine, lookup table, or strategy pattern

*Pattern: State synchronization bugs*
- Suggests: State management issue
- Improvement: Single source of truth, derived state, state management library

*Pattern: Prop drilling causing bugs*
- Suggests: Component structure issue
- Improvement: Context, composition, state management

*Pattern: Missing error handling throughout*
- Suggests: No error handling strategy
- Improvement: Error boundaries, consistent error handling pattern

**Present to User (if design flaw found):**

Present architecture improvements to the user using this format:
```
## Architecture Improvement Suggestion

**Issue:** [Describe the design flaw]
**Impact:** [How it causes bugs or technical debt]
**Suggested Improvement:** [Architectural change]
**Benefits:** [How it prevents similar bugs]
**Scope:** Out of scope for this fix - would you like me to address this separately?
```

This allows users to decide whether to address root architectural issues that contribute to recurring bugs.

## Decision Points

**When to Use Decide Workflow:**
- Multiple valid fix approaches exist
- Trade-off between quick fix vs proper fix
- Symptom fix vs root cause fix
- Local fix vs architectural change
- Uncertainty about side effects

**Decision Criteria for Fixes (prioritized):**
1. **Correctness:** Does it actually fix the bug?
2. **Root Cause:** Does it address cause, not just symptom?
3. **Minimal Scope:** Is it the smallest effective change?
4. **No Regression:** Does it avoid breaking other things?
5. **Maintainability:** Is it clear why the fix works?
6. **Prevention:** Does it prevent recurrence?

## Code Comments for Regression Prevention

**Document the Fix:**
- Explain WHY the bug occurred (root cause)
- Note what assumption was violated
- Highlight the edge case that wasn't handled
- Explain why this fix prevents recurrence

**Example Comment Patterns:**
- "Bug fix: handles [case] because [root cause]"
- "Previously failed when [condition] - now checks [guard]"
- "Root cause: assumed [X] but [Y] can occur when [condition]"
- "This pattern prevents [bug type] - maintain when modifying"

**Purpose:**
- Prevents reintroducing the same bug
- Documents lessons learned
- Helps future developers understand constraints
- Preserves fix rationale over time
