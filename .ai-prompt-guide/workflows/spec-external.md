---
title: "Spec External"
description: "📋 SPEC: Document 3rd party APIs/components from official sources"
whenToUse: "Integrating SDKs, webhooks, auth flows, or documenting external service contracts"
---

# Workflow: Document External API Specification

1. Identify authoritative sources (official docs, RFCs) matching runtime/environment versions

2. Extract API contract from source documentation:
   • Capabilities, invariants, limits (rate/size/timeout)
   • Error semantics (codes, retry policies, version gates)
   • Auth requirements

3. Use create_document, then section tool to structure:
   • Endpoints with signatures
   • Request/response formats + examples
   • Error conditions + handling
   • Rate limits, quotas, auth flows
   • Version compatibility

4. Define acceptance criteria:
   • Happy path + edge cases (boundaries, limits)
   • Error handling per specification
   • Performance requirements (latency/throughput)

**Principle:** Official docs are truth. Spec compliance before simplicity. Test against specification, not assumptions.
