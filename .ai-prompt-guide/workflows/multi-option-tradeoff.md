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
   - **Evidence/References** (docs, prior art, examples)
   - **Pattern Analysis** (how well does it match existing codebase patterns?)

3. **Compare quantitatively:**
   - Choose 4-6 criteria from:
     * **Correctness** - Solves the problem accurately
     * **Risk** - Failure modes and likelihood
     * **Pattern Consistency** - Aligns with existing codebase patterns (reduces cognitive load)
     * **Maintainability** - Long-term code health
     * **Testability** - Ease of verification and validation
     * **Simplicity** - Minimal complexity for the requirements
     * **Performance** - Runtime/memory efficiency (if applicable)
   - Score each option on each criterion (0-10 scale)
   - Apply weights to criteria based on context
   - Calculate: Score(option) = Σ w_i · normalized(criterion_i)

4. **Decide and justify:**
   - Select the highest-scoring option
   - **State why NOT the others** (key disqualifiers and trade-offs)
   - Document the decision rationale

## Example Decision Matrix

**Scenario:** Choosing caching strategy for document loading

| Option | Correctness | Risk | Pattern Consistency | Testability | Simplicity | Score |
|--------|------------|------|---------------------|-------------|------------|-------|
| A: LRU Cache | 9 | 8 | 9 | 8 | 7 | 8.2 ✓ |
| B: Redis | 9 | 6 | 5 | 7 | 4 | 6.2 |
| C: No Cache | 10 | 9 | 10 | 9 | 10 | 9.6* |

**Decision: Option A (LRU Cache)** - Best balance of performance and simplicity. Option C scores highest but doesn't meet performance requirements. Option B adds external dependency and breaks from existing in-memory patterns.

*Option C disqualified despite high score because it fails to meet performance requirements (non-functional requirement).
