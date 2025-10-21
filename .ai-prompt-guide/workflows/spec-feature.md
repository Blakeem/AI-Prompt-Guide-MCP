---
title: "Spec Feature"
description: "📋 SPEC: Document internal feature specification"
whenToUse: "Defining requirements, API contracts, or acceptance criteria for new internal features"
---

# Workflow: Document Internal Feature Specification

1. [Agent] Gather initial requirements from user:
   • Feature purpose and goals
   • User-facing behavior expectations
   • Key use cases
   • Priorities

2. [Agent] Analyze requirements for gaps and ambiguities:
   • Unclear user flows or interactions
   • Missing UX details (inputs, outputs, feedback)
   • Undefined edge cases or error scenarios
   • Ambiguous feature scope or boundaries

**LOOP: While gaps or ambiguities exist**
├─ 3. [Agent] Ask user clarifying questions:
│  • UX details: How should users interact with this?
│  • Requirements: What happens when X occurs?
│  • Edge cases: How should system handle Y?
│  • Priorities: Which aspects are most critical?
├─ 4. [Agent] Use decide workflow for technical decisions:
│  • Implementation approach
│  • Data structures and storage
│  • Integration patterns
│  • Performance and security requirements
│  • Technical trade-offs
├─ 5. [Agent] Update requirements understanding
└─ 6. IF gaps remain: GOTO step 3

7. [Agent] Use create_document to create specification document

8. [Agent] Use section tool to add complete specification:
   • Feature overview and rationale
   • Detailed functionality description
   • API endpoints/methods with signatures
   • Request/response formats with examples
   • Error conditions and messages
   • Edge cases and boundary conditions
   • Performance and security requirements
   • Add @references to external API specs (if integrating third-party services)
     Format: @/docs/specs/external-api-name or @/docs/specs/external-api#endpoint

9. [Agent] Document acceptance criteria:
   • Happy path: normal expected behavior
   • Edge cases: boundaries, limits, unusual inputs
   • Error handling: all error conditions
   • Performance boundaries: latency/throughput requirements
   • Security requirements: authentication, authorization, validation

10. [Agent] Document selected implementation approach from decide workflow

## Specification Principles

**Gap Analysis:**
- Identify unclear or missing requirements early
- Ask questions to avoid assumptions
- Clarify UX and user expectations with user
- Make technical decisions independently using decide workflow

**User vs Agent Decisions:**
- User decides: UX, feature scope, priorities, business rules
- Agent decides: Implementation, data structures, patterns, performance, security, technical trade-offs

**Clarity:**
- Clear, unambiguous requirements
- Complete coverage of functionality
- Specific, measurable acceptance criteria
- No assumptions without validation
