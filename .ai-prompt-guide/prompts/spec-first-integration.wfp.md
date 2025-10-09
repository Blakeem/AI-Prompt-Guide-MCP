---
title: "Spec-First Integration Protocol"
description: "📋 INTEGRATION TASK: Ensure correctness before implementing new features or API integrations"
tags: ["integration", "api", "spec", "design", "compliance"]
whenToUse:
  - "Integrating new SDKs, webhooks, or authentication flows"
  - "Implementing features that touch persistence or concurrency"
  - "Adopting new framework capabilities (router, streaming, workers)"
  - "Building API clients or wrappers for external services"
  - "Implementing protocol handlers or data format parsers"
---

# Spec-First Integration Protocol (SFI)

**USE THIS BEFORE:** Adding features or crossing system boundaries to ensure correctness and currency.

## Process

1. **Identify authorities:**
   - Find canonical specs, API docs, RFCs
   - Note versions relevant to your runtime/environment
   - Verify documentation is current

2. **Extract constraints:**
   - Capability matrix (what's supported, what's not)
   - Invariants (must-hold conditions)
   - Limits (rate, size, timeout boundaries)
   - Error semantics (status codes, error formats)
   - Version gates (feature availability per version)

3. **Define acceptance criteria:**
   - Observable behaviors proving conformance
   - Happy path tests
   - Edge case tests
   - Error handling tests

4. **Map entry points:**
   - Candidate integration surfaces
   - Choose sync vs async based on:
     * Latency requirements
     * Throughput needs
     * Ordering guarantees

5. **Propose 2-4 compliant designs:**
   - All must meet constraints
   - Prefer smallest solution satisfying ALL requirements
   - Apply Occam's Razor AFTER compliance, safety, compatibility

6. **Quick conformance checklist:**
   - ✓ Inputs validated according to spec
   - ✓ Outputs match spec format
   - ✓ Errors handled per spec
   - ✓ Timeouts configured appropriately
   - ✓ Retries implemented if needed
   - ✓ Idempotency considered

## Occam's Razor in Practice

- Apply **ONLY AFTER** correctness, safety, and spec conformance are satisfied
- Treat simplicity as a **penalty term** (subtract points for extra complexity)
- Prefer **reversible** simple designs
- Add complexity only for measurable risk reduction or required capability
