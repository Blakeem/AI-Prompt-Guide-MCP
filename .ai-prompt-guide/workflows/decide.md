---
title: "Decide"
description: "⚖️ DECISION: Choose between multiple approaches with structured trade-off analysis"
whenToUse: "Multiple valid implementation approaches or architecture/optimization decisions with trade-offs to evaluate"
---

# Workflow: Structured Decision Making

1. [Agent] Identify decision point and constraints
2. [Agent] Generate 2-4 viable options (include simple baseline)
3. [Agent] Document each option:
   • Description: 1-2 sentence summary
   • Assumptions: what must be true for this to work
   • Pros: benefits, advantages, strengths
   • Cons: drawbacks, risks, limitations
   • Evidence: documentation, prior art, examples
   • Pattern alignment: fits existing codebase patterns

4. [Agent] Select 4-6 evaluation criteria:
   • Correctness: solves problem accurately
   • Risk: failure modes and likelihood
   • Pattern Consistency: aligns with codebase conventions
   • Maintainability: long-term code health
   • Testability: ease of verification
   • Simplicity: minimal complexity for requirements
   • Performance: efficiency

5. [Agent] Create decision matrix:
   • Score each option per criterion (0-10 scale)
   • Apply weights based on project priorities
   • Calculate: Score = Σ (weight × normalized_criterion)

6. [Agent] Select highest-scoring option
7. [Agent] Document why NOT the other options (key disqualifiers)
8. [Agent] Record decision rationale for future reference

## Scoring Guidelines

**Weights:**
- High weight (3-5): Critical project priorities
- Medium weight (2): Important but negotiable
- Low weight (1): Nice-to-have considerations

**Disqualification:**
- Options failing non-negotiable requirements score 0 regardless of other merits
- Simple option losing to complex requires explicit justification
