---
title: "Brainstorm"
description: "💡 IDEATE: Generate multiple distinct design variations for user review"
whenToUse: "Need multiple creative approaches to a design problem - test strategies, API designs, architecture options, implementation approaches"
---

# Workflow: Parallel Ideation

**Purpose:** Generate N distinct design variations, each with a different theme/approach. User reviews and selects.

## [SETUP]

1. Clarify the design problem/goal
2. Determine themes (to create variety):
   - **User-provided:** User specifies themes (e.g., "minimalist", "feature-rich", "performance-focused")
   - **Coordinator-generated:** If not provided, create 3-5 distinct themes based on the problem
3. Define constraints all variations must satisfy

## [PARALLEL GENERATION]

Launch parallel agents, one per theme. Each agent:
- Generates ONE complete design optimized for their assigned theme
- Documents: approach, key decisions, trade-offs, why this theme led to these choices
- Does NOT evaluate or compare - pure creative generation

## [COLLECTION]

Coordinator presents all variations:
- Summary of each variation with its theme focus
- Key differentiators between variations
- User reviews and selects (or requests hybrid)

## Example Themes

Themes should create meaningful variety. Examples by problem type:

| Problem | Example Themes |
|---------|---------------|
| Test design | coverage-focused, edge-case-hunter, integration-heavy, performance-oriented, security-first |
| API design | RESTful-minimal, GraphQL-flexible, RPC-performant, event-driven |
| Architecture | monolith-simple, microservices-scalable, serverless-elastic, modular-monolith |
| Implementation | imperative-clear, functional-composable, OOP-extensible |
