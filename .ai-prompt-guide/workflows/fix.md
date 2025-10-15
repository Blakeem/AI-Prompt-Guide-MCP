---
title: "Fix"
description: "🐛 FIX: Convert bug symptoms into minimal reproduction and actionable fix"
whenToUse:
  - "Bug reports without clear reproduction steps"
  - "Flaky tests that fail inconsistently"
  - "Production issues that work fine in development"
---

# Fix

## Process

### 1. Capture Complete Context
Gather all environmental information for exact environment match:
- Inputs: data, parameters, state
- Environment: OS, runtime, versions, dependencies
- Configuration: settings, feature flags
- Timing: when started, frequency, patterns
- Artifacts: logs, screenshots, stack traces
- Commit/version where issue occurs

Use production snapshots when possible. Document every detail.

### 2. Reproduce Locally
- Set up identical environment matching captured context
- Follow exact reproduction steps
- Confirm failure occurs consistently
- If inconsistent, note conditions when it fails vs succeeds

### 3. Minimize Iteratively
Create smallest possible failing case:
- Remove one input/condition at a time (single-factor changes only)
- Keep removing until failure disappears
- Add back last removed element
- Smaller test case enables faster debugging

### 4. Localize by Bisection
Use binary search to isolate root cause:
- Git commits: `git bisect` to find breaking commit
- Feature flags: toggle on/off
- Input data: halve dataset repeatedly
- Configuration options: disable half at a time

### 5. Classify Failure Type
Identify root cause category to guide fix approach:
- Logic error: algorithm bug, off-by-one
- Data contract violation: type mismatch, null handling
- Concurrency issue: race condition, deadlock
- Resource exhaustion: memory, connections
- Environment difference: config, dependencies

Document the violated invariant explicitly. Consider multiple potential causes.

### 6. Create Discriminating Test
Write test that demonstrates the fix:
- Fails on bad path (reproduces bug)
- Passes on correct path (verifies fix)
- Choose appropriate level: unit/integration/property-based

### 7. Fix & Harden
- Implement fix addressing root cause, not just symptoms
- Verify test passes
- Add assertions to catch earlier in execution
- Add logging/metrics for production detection
- Improve observability for early detection of similar issues

## Key Practices

**Reproduction:**
- Exact environment match is critical for consistency
- Systematic minimization prevents wasted debugging effort
- Document all steps for team knowledge

**Classification:**
- Accurate classification guides fix strategy
- Multiple causes may contribute
- Note all violated invariants

**Hardening:**
- Add guardrails to prevent recurrence
- Make similar bugs easier to detect
- Consider root cause category when adding protections
