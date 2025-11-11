---
title: "Develop"
description: "🔨 DEVELOP: Simple development with anti-pattern detection and regression prevention"
whenToUse: "Single-file or small scope features without needing multi-agent coordination, especially frontend work"
---

# Workflow: Simple Development with Best Practices

⚠️ **CRITICAL:** Use `coordinator_task` tool for TODO tracking (NOT TodoWrite)

## [ANALYZE]

1. **Understand Requirements**
   - Goal, expected behavior, affected files, unchanged scope

2. **Define Boundaries**
   - Files to change vs observe-only
   - Dependencies and scope limits

3. **Anti-Pattern Scan**
   - Check: magic values, duplication, deep nesting, state mismanagement, silent failures, resource leaks, tight coupling
   - Flag problematic patterns for refactoring if in scope

4. **Select Approach**
   - IF multiple viable approaches: use decide workflow
   - Prioritize: correctness > best practices > simplicity
   - Align with existing patterns

## [IMPLEMENT]

5. **Create TODO List**
   - Use `coordinator_task` with specific, verifiable steps
   - Align with scope boundaries from step 2

6. **Execute Changes**
   - Follow existing conventions
   - Avoid anti-patterns (named constants, DRY, single responsibility, defensive programming, proper cleanup)
   - Comment complex logic and design rationale
   - Maintain minimal scope

## [VERIFY]

7. **Test Implementation**
   - Primary: Changed functionality
   - Secondary: Related functionality (regression)
   - Boundary: Edge cases and error handling
   - Verify unchanged areas untouched

8. **Document Findings**
   - Anti-patterns discovered/addressed
   - Technical debt created/removed
   - Suggested improvements (out of scope)

9. **Report Completion**
   - Changes summary, files modified, anti-patterns handled, regression results, future recommendations

## Impact Checkpoints

**Scope Control:**
- Change only what's necessary
- Document (don't implement) broader improvements

**Regression Prevention:**
- Test dependencies: what uses modified functionality?
- Anticipate side effects
- Validate edge cases
