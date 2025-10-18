---
title: "Decide (Iterate)"
description: "⚖️ DECISION: Multi-perspective decision analysis with parallel specialist agents"
whenToUse: "Complex decisions requiring multiple viewpoints or when trade-offs span different quality dimensions"
---

# Workflow: Multi-Perspective Decision Making

1. [Coordinator] Define decision specification:
   • Problem statement and context
   • Non-negotiable constraints
   • Evaluation criteria (4-6) with project weights
   • Evidence requirements

2. [Coordinator] Select 3-5 analysis lenses from standard set
3. [Coordinator] Use subagent_task to create analysis task for each lens:
   • Specify lens focus (performance, UX, maintainability, etc.)
   • Add @references to codebase patterns, constraints, requirements
   • Define evidence requirements for this lens

4. [Coordinator] Launch all lens specialist agents simultaneously in parallel

5. [Specialists - Parallel Execution] Each specialist independently:
   • Generate 2-4 viable options optimized for lens priority
   • Document each option: description, assumptions, pros/cons, evidence, pattern alignment
   • Create decision matrix with lens-specific weights
   • Select best option for this lens → recommended_option
   • Document rationale and key trade-offs
   • Return recommendation to coordinator

6. [Coordinator] Collect all lens recommendations
7. [Coordinator] Verify options are meaningfully distinct (interface, structure, approach)
8. [Coordinator] Enforce non-negotiables → drop violators
9. [Coordinator] Identify hybridization opportunities (combine strengths from multiple lenses)
10. [Coordinator] Create global decision matrix with project-level weights
11. [Coordinator] Select final option (highest score or reasoned choice)
12. [Coordinator] Document decision:
    • Why this option wins
    • Why NOT other options (key discriminators)
    • Trade-offs and follow-up actions
13. [Coordinator] Record rationale with matrix, evidence, disqualifiers

## Analysis Lenses

**Performance:**
- Runtime efficiency, memory usage, throughput
- Focus: algorithmic complexity, resource optimization

**UX/Ergonomics:**
- API clarity, cognitive load, sensible defaults
- Focus: developer experience, ease of use

**Maintainability:**
- Readability, long-term health, minimal churn
- Focus: code longevity, team velocity

**Pattern Consistency:**
- Alignment with existing idioms, error handling, conventions
- Focus: cognitive load reduction, team familiarity

**Risk/Security:**
- Failure modes, dependency risks, attack surface
- Focus: robustness, safety, production readiness

**Simplicity Baseline:**
- Minimal moving parts, boring solutions, proven approaches
- Focus: lowest viable complexity

## Evaluation Guidelines

**Per-Lens Analysis:**
- Generate options optimized for lens priority
- Score 0-10 per criterion with lens-specific weights
- Select single best option for that perspective

**Global Synthesis:**
- Use project-level weights across all criteria
- Consider hybrid solutions combining lens strengths
- Disqualify any option failing non-negotiables
- Explicitly justify why complex option beats simple baseline
