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
- Find canonical specs, API docs, RFCs
- Note versions relevant to your runtime/environment
- Verify documentation is current and accurate

### 2. Extract Constraints
Document all requirements:
- **Capabilities:** What's supported, what's not
- **Invariants:** Must-hold conditions
- **Limits:** Rate limits, size limits, timeout boundaries
- **Error Semantics:** Status codes, error formats, retry policies
- **Version Gates:** Feature availability per version

### 3. Define Acceptance Criteria
Create verifiable tests for:
- Happy path behavior
- Edge cases
- Error handling
- Performance boundaries

### 4. Design Integration
**Map Entry Points:**
- Identify candidate integration surfaces
- Choose sync vs async based on latency/throughput/ordering needs

**Propose 2-4 Compliant Designs:**
- All must meet spec constraints
- Prefer smallest solution satisfying ALL requirements
- Add complexity only for measurable risk reduction

### 5. Conformance Checklist
Before implementation:
- ✓ Inputs validated according to spec
- ✓ Outputs match spec format exactly
- ✓ Errors handled per spec requirements
- ✓ Timeouts configured appropriately
- ✓ Retries implemented if needed
- ✓ Idempotency considered

## Key Considerations

**Correctness First:**
- Spec compliance is non-negotiable
- Simplicity comes AFTER correctness and safety
- Test against spec, not assumptions

**Design Selection:**
- Prefer reversible designs (easy to change later)
- Smallest adequate solution wins
- Justify any complexity with explicit benefits

**Common Integration Points:**
- Authentication flows (OAuth, JWT, API keys)
- Webhooks (signature verification, retry logic)
- External APIs (rate limiting, error handling)
- Data format parsers (schema validation, error recovery)
