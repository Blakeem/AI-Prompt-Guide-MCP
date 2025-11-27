---
title: "Decide"
description: "⚖️ DECISION: Choose between multiple approaches with structured trade-off analysis"
whenToUse: "Multiple valid implementation approaches or architecture/optimization decisions with trade-offs to evaluate"
---

# Workflow: Structured Decision Making

**Prerequisite:** Consider using the `plan` workflow first to assess information gaps and map consequences before generating options.

1. Identify decision point and constraints
2. Generate 2-4 viable options (include simple baseline)
3. Document each option: Description | Assumptions | Pros | Cons | Evidence | Pattern alignment
4. Select 4-6 evaluation criteria (correctness, risk, maintainability, testability, simplicity, performance, pattern consistency)
5. Create decision matrix: Score 0-10 per criterion, apply weights (critical: 3-5, important: 2, nice-to-have: 1), calculate weighted sum
6. Select highest-scoring option
7. Document disqualifiers for rejected options
8. Record decision rationale

**Rules:**
- Non-negotiable failures score 0
- Simple losing to complex requires explicit justification
