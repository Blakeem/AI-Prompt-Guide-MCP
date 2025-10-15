---
title: "Spec External"
description: "📋 SPEC: Document 3rd party APIs/components from official sources"
whenToUse:
  - "Integrating new SDKs, webhooks, or authentication flows"
  - "Building API clients or wrappers for external services"
  - "Documenting external dependencies and their contracts"
---

# Spec External

## Process

### 1. Identify Authorities
- Find official documentation, API references, RFCs
- Note versions relevant to runtime/environment
- Verify documentation is current and accurate
- Identify authoritative sources (not third-party tutorials)

### 2. Extract All Constraints
Document complete API contract:
- Capabilities: what's supported, what's not
- Invariants: must-hold conditions
- Limits: rate limits, size limits, timeout boundaries
- Error Semantics: status codes, error formats, retry policies
- Version Gates: feature availability per version
- Authentication/Authorization requirements

### 3. Document API Contract
Create comprehensive specification document:
- Endpoints/methods with full signatures
- Request/response formats with examples
- Error conditions and handling
- Rate limits and quotas
- Authentication flows
- Version compatibility matrix

Use create_document, section, and view_document tools for documentation creation.

### 4. Define Integration Acceptance Criteria
Create verifiable criteria proving conformance:
- Happy path: normal, expected behavior
- Edge cases: boundaries, limits, unusual inputs
- Error handling: all error conditions specified
- Performance boundaries: meets latency/throughput requirements

### 5. Design Integration Approach
**Map entry points:**
- Identify candidate integration surfaces
- Choose sync vs async based on latency/throughput/ordering needs

**Propose 2-4 compliant designs:**
- All must meet spec constraints (compliance non-negotiable)
- Prefer smallest solution satisfying ALL requirements
- Add complexity only for measurable risk reduction
- Prefer reversible designs (easy to change later)

## Key Practices

**Research Guidelines:**
- Access research best practices via get_guide:
  ```typescript
  get_guide({ guide: "research-guide" })
  get_guide({ guide: "specification-writing" })
  get_guide({ guide: "writing-standards" })
  ```

**Correctness Priority:**
- Official documentation is the source of truth
- Spec compliance always comes first
- Simplicity comes AFTER correctness and safety
- Test against specification, not assumptions
- Verify examples and code samples from official docs

**Documentation Quality:**
- Complete API surface coverage
- Clear examples for common use cases
- Comprehensive error documentation
- Version-specific notes where applicable
