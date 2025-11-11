---
title: "Decide (Iterate)"
description: "⚖️ DECISION: Multi-perspective decision analysis with parallel specialist agents"
whenToUse: "Complex decisions requiring multiple viewpoints or when trade-offs span different quality dimensions"
---

# Workflow: Multi-Perspective Decision Making

**CRITICAL:** Use `subagent_task` tool for task creation (NOT TodoWrite). Coordinator delegates to subagents who run `start_subagent_task` themselves.

## [SETUP]

**[Coordinator] Define decision specification:**
- Problem statement and non-negotiable constraints
- Evaluation criteria (4-6) with project-level weights
- Evidence requirements

**[Coordinator] Create lens analysis tasks:**
1. Select 3-5 lenses from standard set below
2. Use `subagent_task` to create task per lens with:
   - Lens focus area
   - @references to patterns/constraints (format: `@/docs/path` or `@/docs/path#section`)
   - Evidence requirements

3. Launch all specialist agents in parallel

## [PARALLEL ANALYSIS]

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
