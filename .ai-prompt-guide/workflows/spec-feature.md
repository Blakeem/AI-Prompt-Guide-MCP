---
title: "Spec Feature"
description: "📋 SPEC: Document internal feature specification"
whenToUse: "Defining requirements, API contracts, or acceptance criteria for new internal features"
---

# Workflow: Document Internal Feature Specification

## [Requirements Phase]
1. [Agent] Gather requirements: purpose, user behavior, use cases, priorities
2. [Agent] Systematically analyze for gaps: UX details, edge cases, scope boundaries

## [Clarification Loop]
**WHILE gaps exist:**
├─ 3. [Agent] Ask user: UX interactions, requirements, edge cases, priorities
├─ 4. [Agent] Use decide workflow for technical choices (apply independently)
├─ 5. [Agent] Update requirements
└─ 6. IF gaps remain: GOTO step 3

## [Specification Creation]
7. [Agent] Use create_document for specification
8. [Agent] Use section tool to structure specification:
   • Overview & rationale
   • Functionality with API signatures
   • Request/response formats with examples
   • Error conditions & edge cases
   • Performance & security requirements
   • @references to external APIs: @/docs/specs/api-name or @/docs/specs/api#endpoint

## [Acceptance Criteria]
9. [Agent] Document criteria: happy path, edge cases, error handling, performance/security boundaries
10. [Agent] Document implementation approach from decide workflow

## Principles

**Decision Boundaries:**
- User: UX, scope, priorities, business rules
- Agent: Implementation, technical trade-offs (use decide workflow)

**Quality Standards:**
Apply standard specification practices: unambiguous requirements, complete coverage, measurable criteria, validated assumptions
