---
title: "Spec-First Integration Protocol"
description: "📋 INTEGRATION TASK: Ensure correctness before implementing new features or API integrations"
whenToUse:
  - "Integrating new SDKs, webhooks, or authentication flows"
  - "Implementing features that touch persistence or concurrency"
  - "Building API clients or wrappers for external services"
---

# Spec-First Integration Protocol

## Process

### 1. Identify Authorities
- Find canonical specifications, API docs, RFCs
- Note versions relevant to runtime/environment
- Verify documentation current and accurate

### 2. Extract All Constraints
Document complete requirements:
- Capabilities: what's supported, what's not
- Invariants: must-hold conditions
- Limits: rate limits, size limits, timeout boundaries
- Error Semantics: status codes, error formats, retry policies
- Version Gates: feature availability per version

### 3. Define Acceptance Criteria
Create verifiable tests proving conformance:
- Happy path: normal, expected behavior
- Edge cases: boundaries, limits, unusual inputs
- Error handling: all error conditions specified
- Performance boundaries: meets latency/throughput requirements

### 4. Design Integration
**Map entry points:**
- Identify candidate integration surfaces
- Choose sync vs async based on latency/throughput/ordering needs

**Propose 2-4 compliant designs:**
- All must meet spec constraints (compliance non-negotiable)
- Prefer smallest solution satisfying ALL requirements
- Add complexity only for measurable risk reduction
- Prefer reversible designs (easy to change later)

### 5. Verify Conformance Before Implementation
Check all requirements met:
- Inputs: validated according to spec
- Outputs: match spec format exactly
- Errors: handled per spec requirements
- Timeouts: configured appropriately
- Retries: implemented if needed
- Idempotency: considered where required

## Key Practices

**Correctness Priority:**
- Spec compliance always comes first
- Simplicity comes AFTER correctness and safety
- Test against specification, not assumptions
- Common integration points: authentication flows, webhooks, external APIs, data parsers

**Design Selection:**
- Smallest adequate solution wins after meeting requirements
- Justify complexity with explicit benefits
- Document when choosing complex over simple and why
