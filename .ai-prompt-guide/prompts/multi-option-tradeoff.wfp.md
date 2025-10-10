---
title: "Multi-Option Trade-off Protocol"
description: "⚖️ DECISION NEEDED: Choose between multiple approaches with structured trade-off analysis"
whenToUse:
  - "Choosing between multiple refactoring approaches (extract function vs Strategy pattern vs module split)"
  - "Selecting performance optimizations (caching strategies, algorithm selection, data structures)"
  - "Making architecture decisions (sync vs async, monolith vs service, singleton vs DI)"
  - "Determining test strategies (property-based vs example-based vs snapshot)"
  - "Evaluating implementation patterns when multiple valid approaches exist"
---

# Multi-Option Trade-off Protocol

## Process

1. **Generate 2-4 viable options**
   - Be specific about what each approach entails
   - Include both obvious and creative alternatives

2. **For each option, document:**
   - **Description** (1-2 sentences)
   - **Assumptions/Preconditions** (what must be true)
   - **Pros** (benefits, advantages, strengths)
   - **Cons** (drawbacks, risks, limitations)
   - **Effort/Complexity** (Small/Medium/Large)
   - **Evidence/References** (docs, prior art, examples)

3. **Compare quantitatively:**
   - Choose 4-6 criteria: correctness, risk, cost/time, maintainability, performance, simplicity
   - Score each option on each criterion (0-10 scale)
   - Apply weights to criteria based on context
   - Calculate: Score(option) = Σ w_i · normalized(criterion_i)

4. **Decide and justify:**
   - Select the highest-scoring option
   - **State why NOT the others** (key disqualifiers and trade-offs)
   - Document the decision rationale

## Example Decision Matrix

| Option | Correctness | Risk | Time | Maintainability | Score |
|--------|------------|------|------|-----------------|-------|
| A      | 9          | 7    | 8    | 6               | 7.5   |
| B      | 8          | 9    | 6    | 9               | 8.0 ✓ |
| C      | 7          | 6    | 9    | 5               | 6.8   |

**Decision: Option B** - Higher maintainability and lower risk outweigh slightly slower implementation time.
