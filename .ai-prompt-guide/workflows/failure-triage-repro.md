---
title: "Failure Triage & Minimal Repro Protocol"
description: "🐛 BUG REPORT: Convert symptoms into minimal reproduction and actionable fix"
whenToUse:
  - "Bug reports without clear reproduction steps"
  - "Flaky tests that fail inconsistently"
  - "Production issues that work fine in development"
---

# Failure Triage & Minimal Repro Protocol

## Process

### 1. Capture Context
Gather complete environmental information:
- Inputs (data, parameters, state)
- Environment (OS, runtime, versions, dependencies)
- Configuration (settings, feature flags)
- Timing (when started, frequency, patterns)
- Artifacts (logs, screenshots, stack traces)
- Commit/version where issue occurs

### 2. Reproduce Locally
- Set up identical environment
- Follow exact reproduction steps
- Confirm failure occurs consistently

### 3. Minimize Iteratively
- Remove one input/condition at a time
- Keep removing until failure disappears
- Add back last removed element
- **Goal:** Smallest possible failing case

### 4. Localize by Bisection
Use binary search to isolate:
- Git commits (`git bisect`)
- Feature flags (toggle on/off)
- Input data (halve dataset)
- Configuration options

### 5. Classify Failure Type
Identify root cause category:
- Logic error (algorithm bug, off-by-one)
- Data contract violation (type mismatch, null handling)
- Concurrency issue (race condition, deadlock)
- Resource exhaustion (memory, connections)
- Environment difference (config, dependencies)

Document the violated invariant.

### 6. Create Discriminating Test
Write test that:
- Fails on the bad path (reproduces bug)
- Passes on correct path (verifies fix)
- Choose appropriate level (unit/integration/property-based)

### 7. Fix & Harden
- Implement fix
- Verify test passes
- Add assertions to catch earlier
- Add logging/metrics for production detection

## Key Considerations

**Reproduction:**
- Exact environment match critical for consistency
- Use production snapshots when possible
- Document every reproduction step

**Minimization:**
- Smaller test case = faster debugging
- Remove complexity systematically
- Single-factor changes only

**Classification:**
- Accurate classification guides fix approach
- Note violated invariants explicitly
- Consider multiple potential causes

**Hardening:**
- Fix symptoms AND root cause
- Add guardrails to prevent recurrence
- Improve observability for early detection
