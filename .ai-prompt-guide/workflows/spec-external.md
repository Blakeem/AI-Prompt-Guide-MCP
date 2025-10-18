---
title: "Spec External"
description: "📋 SPEC: Document 3rd party APIs/components from official sources"
whenToUse: "Integrating SDKs, webhooks, auth flows, or documenting external service contracts"
---

# Workflow: Document External API Specification

1. [Agent] Identify authoritative sources:
   • Official documentation, API references, RFCs
   • Versions relevant to runtime/environment
   • Verify current and accurate (not third-party tutorials)

2. [Agent] Extract complete API contract:
   • Capabilities: supported features, limitations
   • Invariants: must-hold conditions
   • Limits: rate limits, size limits, timeouts
   • Error semantics: codes, formats, retry policies
   • Version gates: feature availability per version
   • Authentication/authorization requirements

3. [Agent] Use create_document to create specification document

4. [Agent] Use section tool to add specification sections:
   • Endpoints/methods with full signatures
   • Request/response formats with examples
   • Error conditions and handling
   • Rate limits and quotas
   • Authentication flows
   • Version compatibility matrix

5. [Agent] Document integration acceptance criteria:
   • Happy path: normal expected behavior
   • Edge cases: boundaries, limits, unusual inputs
   • Error handling: all specified error conditions
   • Performance boundaries: latency/throughput requirements

## Specification Principles

**Correctness Priority:**
- Official documentation is source of truth
- Spec compliance before simplicity
- Test against specification, not assumptions
- Verify examples from official docs

**Documentation Quality:**
- Complete API surface coverage
- Clear examples for common use cases
- Comprehensive error documentation
- Version-specific notes where applicable
