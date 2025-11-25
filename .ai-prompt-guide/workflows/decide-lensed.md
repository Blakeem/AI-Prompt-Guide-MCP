---
title: "Decide (Lensed)"
description: "⚖️ DECISION: Multi-perspective decision analysis with parallel specialist agents"
whenToUse: "Complex decisions requiring multiple viewpoints or when trade-offs span different quality dimensions"
---

# Workflow: Multi-Perspective Decision Making

**Purpose:** Analyze a decision from multiple quality perspectives, then synthesize into a recommendation.

## [SETUP]

**[Coordinator] Define decision specification:**
- Problem statement and non-negotiable constraints
- Evaluation criteria (4-6) with project-level weights
- Evidence requirements
- Document paths for context (if any): `/docs/specs/api.md`, `/docs/constraints.md#performance`

**[Coordinator] Select lenses:**
- Choose 3-5 lenses from standard set below
- Each lens will analyze the problem from its perspective

## [PARALLEL ANALYSIS]

Launch parallel agents, one per lens. For each agent, provide:
- Assigned lens and focus areas
- Document paths to read (if needed)
- Non-negotiable constraints

**[Each Specialist] Execute lens analysis:**
- Generate 2-4 options optimized for assigned lens
- Document: description, assumptions, pros/cons, evidence, pattern alignment
- Build decision matrix with lens-specific weights (score 0-10)
- Recommend best option with rationale and trade-offs

## [SYNTHESIS]

**[Coordinator] Integrate recommendations:**
1. Verify options are meaningfully distinct
2. Enforce non-negotiables, drop violators
3. Identify hybridization opportunities
4. Build global decision matrix with project weights
5. Select winner (highest score or justified choice)
6. Document: why this wins, why NOT others (discriminators), trade-offs, follow-up actions

## Standard Lenses

| Lens | Focus Areas |
|------|-------------|
| **Performance** | Runtime efficiency, memory, throughput, algorithmic complexity |
| **UX/Ergonomics** | API clarity, cognitive load, sensible defaults, developer experience |
| **Maintainability** | Readability, minimal churn, code longevity, team velocity |
| **Pattern Consistency** | Alignment with existing idioms, error handling, conventions |
| **Risk/Security** | Failure modes, dependency risks, attack surface, production readiness |
| **Simplicity Baseline** | Minimal complexity, boring solutions, proven approaches |

## Evaluation Standards

**Per-Lens:** Optimize for lens priority, score with lens weights, recommend single best option.

**Global:** Apply project weights, consider hybrids, enforce non-negotiables, justify complexity over simplicity.
