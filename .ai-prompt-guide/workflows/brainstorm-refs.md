---
title: "Brainstorm (Refs)"
description: "💡 IDEATE: Generate multiple distinct design variations with document references"
whenToUse: "Need multiple creative approaches that must incorporate existing specs, constraints, or project documentation"
---

# Workflow: Parallel Ideation with References

**Purpose:** Generate N distinct design variations, each with a different theme/approach, incorporating referenced documentation. User reviews and selects.

## [SETUP]

1. Clarify the design problem/goal
2. Identify relevant documents to reference:
   - Specs: `/docs/specs/api-spec.md`
   - Constraints: `/docs/specs/constraints.md#performance`
   - Patterns: `/docs/patterns/auth-patterns.md`
3. Determine themes (to create variety):
   - **User-provided:** User specifies themes
   - **Coordinator-generated:** If not provided, create 3-5 distinct themes based on the problem
4. Define constraints all variations must satisfy

## [PARALLEL GENERATION]

Launch parallel agents, one per theme. For each agent, provide:
- Assigned theme/lens
- Document paths to read (agent uses `view_section` or `view_document` to load)
- Constraints from referenced documents

Each agent:
- Reads referenced documents using view tools
- Generates ONE complete design optimized for their assigned theme
- Incorporates constraints from referenced specs
- Documents: approach, key decisions, trade-offs, how references informed choices

## [COLLECTION]

Coordinator presents all variations:
- Summary of each variation with its theme focus
- Key differentiators between variations
- How each addressed the referenced constraints
- User reviews and selects (or requests hybrid)

## Example Themes

Themes should create meaningful variety. Examples by problem type:

| Problem | Example Themes |
|---------|---------------|
| Test design | coverage-focused, edge-case-hunter, integration-heavy, performance-oriented, security-first |
| API design | RESTful-minimal, GraphQL-flexible, RPC-performant, event-driven |
| Architecture | monolith-simple, microservices-scalable, serverless-elastic, modular-monolith |
| Implementation | imperative-clear, functional-composable, OOP-extensible |
