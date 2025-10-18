---
title: "Refactor"
description: "🔧 REFACTOR: Improve code quality through structured refactoring analysis"
whenToUse: "Improving code structure, reducing complexity, or planning safe incremental refactoring"
---

# Refactor

## Process

### 1. Identify Refactoring Goals
Define what to improve:
- Reduce complexity
- Improve readability
- Enhance maintainability
- Better separation of concerns
- Eliminate duplication
- Improve testability

### 2. Analyze Current State
Understand existing code:
- Current structure and organization
- Dependencies and coupling
- Complexity metrics
- Test coverage
- Pain points and issues

### 3. Generate Refactoring Options (2-4)
Consider multiple approaches:
- Extract function/method
- Extract class or module
- Apply design patterns (Strategy, Factory, etc.)
- Simplify conditionals
- Reduce nesting
- Split responsibilities
- Inline unnecessary abstractions

Be specific about what each approach entails.

### 4. Evaluate Each Option

For each refactoring approach:
- **Description**: What changes and how
- **Assumptions/Preconditions**: What must be true
- **Pros**: Benefits (readability, maintainability, testability)
- **Cons**: Drawbacks (complexity, effort, risk)
- **Pattern Analysis**: Alignment with existing codebase patterns
- **Evidence/References**: Similar patterns in codebase or literature

### 5. Compare Quantitatively

**Select 4-6 criteria:**
- Maintainability: Long-term code health improvement
- Simplicity: Minimal complexity for requirements
- Pattern Consistency: Aligns with codebase conventions
- Testability: Ease of verification
- Risk: Failure modes and likelihood
- Effort: Time and complexity to implement

**Create decision matrix:**
- Score each option on each criterion (0-10 scale)
- Apply weights based on refactoring goals
- Calculate: Score(option) = Σ weight × normalized(criterion)

### 6. Plan Safe Refactoring

**Test-Driven Safety:**
- Ensure tests exist before refactoring
- Run tests after each small change
- Maintain green tests throughout
- Add tests for uncovered areas first

**Incremental Approach:**
- Break refactoring into small, safe steps
- Commit after each successful step
- Verify functionality preserved at each step
- Can roll back easily if issues arise

**Preserve Behavior:**
- Refactoring changes structure, not behavior
- All existing tests should still pass
- No functional changes mixed with refactoring
- Behavior preservation is non-negotiable

### 7. Execute and Validate

**Implementation:**
- Follow the selected refactoring approach
- Make changes incrementally
- Run tests continuously
- Verify at each step

**Validation:**
- All tests pass
- Code quality improved
- Complexity reduced (measurable)
- Team review and approval

## Key Practices

**Decision Making:**
- Highest-scoring option usually wins
- Document trade-offs clearly
- Justify when choosing complex over simple
- Consider team familiarity with patterns

**Safety First:**
- Never refactor without tests
- Small steps, continuous validation
- Separate refactoring from feature work
- Easy rollback if issues found

**Measurable Improvement:**
- Quantify complexity reduction if possible
- Track maintainability metrics
- Verify readability improved (team feedback)
- Confirm goals achieved

**Common Refactoring Patterns:**
- Extract Method: Pull out reusable code
- Extract Class: Separate responsibilities
- Simplify Conditionals: Reduce complexity
- Reduce Nesting: Flatten structure
- Remove Duplication: DRY principle
- Clarify Naming: Improve understanding
