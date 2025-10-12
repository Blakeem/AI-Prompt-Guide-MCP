---
description: Multi-option decision making with structured analysis
---

# Make Design Decision

## User Request

$ARGUMENTS

## Task Overview

Evaluate multiple implementation approaches and choose the best one using structured, quantitative analysis.

## Workflow

Use the **Multi-Option Trade-off Protocol**:
- Read: `.ai-prompt-guide/workflows/multi-option-tradeoff.md`

This is one of the most powerful decision-making tools available. Use it whenever you face uncertainty about implementation approaches.

## Process

### 1. Generate 2-4 Viable Options
- Be specific about what each approach entails
- Include both obvious and creative alternatives
- Ensure all options actually solve the problem

### 2. Document Each Option

For each approach, analyze:

**Description** (1-2 sentences)
- What is this approach?

**Assumptions/Preconditions**
- What must be true for this to work?

**Pros**
- Benefits, advantages, strengths

**Cons**
- Drawbacks, risks, limitations

**Evidence/References**
- Documentation, prior art, examples supporting this approach

**Pattern Analysis**
- How well does it match existing codebase patterns?

### 3. Score Quantitatively

Choose 4-6 criteria from:
- **Correctness** - Solves the problem accurately
- **Risk** - Failure modes and likelihood
- **Pattern Consistency** - Aligns with existing codebase patterns (reduces cognitive load)
- **Maintainability** - Long-term code health
- **Testability** - Ease of verification and validation
- **Simplicity** - Minimal complexity for the requirements
- **Performance** - Runtime/memory efficiency (if applicable)

Score each option on each criterion (0-10 scale).

### 4. Create Comparison Matrix

Example:
```
| Option | Correctness | Risk | Pattern Consistency | Testability | Simplicity | Score |
|--------|-------------|------|---------------------|-------------|------------|-------|
| A      | 9           | 8    | 9                   | 8           | 7          | 8.2 ✓ |
| B      | 9           | 6    | 5                   | 7           | 4          | 6.2   |
| C      | 10          | 9    | 10                  | 9           | 10         | 9.6*  |

*Option C disqualified: doesn't meet performance requirements
```

### 5. Decide and Justify

- Select the highest-scoring viable option
- **State why NOT the others** (key disqualifiers and trade-offs)
- Document the decision rationale
- Note any non-negotiable requirements that disqualify options

## Key Principles

**Pattern Consistency Matters:**
- LLMs (and developers) work better with familiar patterns
- Consistency reduces cognitive load
- Easier to maintain and extend

**Testability is Critical:**
- Can you verify it works?
- Clear success criteria?
- Easy to test edge cases?

**Simplicity After Requirements:**
- Meet all requirements first
- Then choose simplest approach
- Don't sacrifice correctness for simplicity

## MCP Tools

- `browse_documents` - Understand existing patterns
- `view_document` - Review related code
- `search_documents` - Find similar implementations

## Deliverables

- 2-4 documented options with full analysis
- Quantitative comparison matrix
- Clear decision with justification
- Explanation of why other options were rejected
- Documented trade-offs and assumptions
