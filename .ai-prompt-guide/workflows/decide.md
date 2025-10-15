---
title: "Decide"
description: "⚖️ DECISION: Choose between multiple approaches with structured trade-off analysis"
whenToUse:
  - "Choosing between multiple implementation approaches"
  - "Selecting performance optimizations (caching strategies, algorithm selection, data structures)"
  - "Making architecture decisions (sync vs async, monolith vs service, singleton vs DI)"
  - "Determining test strategies (property-based vs example-based vs snapshot)"
  - "Evaluating implementation patterns when multiple valid approaches exist"
---

# Decide

## Process

### 1. Generate 2-4 Viable Options
- Be specific about what each approach entails
- Include both obvious and creative alternatives
- Ensure all options could reasonably work

### 2. Document Each Option
For each option:
- Description: 1-2 sentence summary
- Assumptions/Preconditions: what must be true
- Pros: benefits, advantages, strengths
- Cons: drawbacks, risks, limitations
- Evidence/References: documentation, prior art, examples
- Pattern Analysis: alignment with existing codebase patterns

### 3. Compare Quantitatively
**Select 4-6 criteria from:**
- Correctness: solves problem accurately
- Risk: failure modes and likelihood
- Pattern Consistency: aligns with codebase (reduces cognitive load)
- Maintainability: long-term code health
- Testability: ease of verification
- Simplicity: minimal complexity for requirements
- Performance: runtime/memory efficiency (if applicable)

**Create decision matrix:**
- Score each option on each criterion (0-10 scale)
- Apply weights to criteria based on context
- Calculate: Score(option) = Σ weight × normalized(criterion)

### 4. Decide and Justify
- Select highest-scoring option
- State why NOT the others (key disqualifiers and trade-offs)
- Document decision rationale
- Note any options disqualified for non-negotiable requirements

## Key Considerations

**Option Generation:**
- Don't prematurely eliminate possibilities
- Include at least one simple baseline option
- Consider both incremental and radical approaches

**Scoring:**
- Use consistent scale (0-10 recommended)
- Weight criteria based on project priorities
- Disqualify options that fail non-negotiable requirements regardless of score

**Decision:**
- Highest score usually wins unless disqualified
- Document trade-offs clearly
- Note when simple option loses to complex option and justify why
