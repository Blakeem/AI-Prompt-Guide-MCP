---
title: "Failure Triage & Minimal Repro Protocol"
description: "🐛 BUG REPORT: Convert symptoms into minimal reproduction and actionable fix"
tags: ["debugging", "bug", "reproduce", "triage", "fix"]
whenToUse:
  - "Bug reports without clear reproduction steps"
  - "Flaky tests that fail inconsistently"
  - "Incidents requiring quick root cause identification"
  - "Production issues that work fine in development"
  - "Edge cases that are hard to trigger manually"
---

# Failure Triage & Minimal Repro Protocol (FTR)

**USE THIS TO:** Convert a symptom into an actionable fix fast.

## Process

1. **Capture context:**
   - Inputs (data, parameters, state)
   - Environment (OS, runtime, versions)
   - Config (settings, feature flags)
   - Timing (when did it start, frequency)
   - Artifacts (logs, screenshots, dumps)
   - Commit/version where issue occurs

2. **Reproduce locally:**
   - Set up identical environment
   - Follow exact reproduction steps
   - Confirm failure occurs consistently

3. **Minimize iteratively:**
   - Remove one input/condition at a time
   - Keep removing until failure disappears
   - Add back last removed element
   - Result: **minimal failing case**

4. **Localize by bisection:**
   - Binary search through:
     * Git commits (git bisect)
     * Feature flags (toggle on/off)
     * Input data (halve dataset)
     * Configuration options
   - Isolate responsible change/component

5. **Classify the failure:**
   - Logic error (wrong algorithm, off-by-one)
   - Data contract violation (type mismatch, null)
   - Concurrency issue (race, deadlock)
   - Resource exhaustion (memory, connections)
   - Environment difference (config, dependencies)
   - **Note the violated invariant**

6. **Design discriminating test:**
   - Write test that fails on bad path
   - Passes on correct path
   - Choose test type:
     * Unit test (isolated function)
     * Property test (random inputs)
     * Integration test (full flow)

7. **Fix → Validate → Harden:**
   - Implement fix
   - Verify test passes
   - Add assertions to catch earlier
   - Add metrics/logging to detect in production

## Example Workflow

**Symptom:** "Search sometimes returns empty results"

**Context:** Last 3 days, ~5% of queries, production only

**Reproduce:** Use production DB snapshot → consistent repro

**Minimize:** Reduce to single query type → pagination edge case

**Localize:** Git bisect → commit that changed page size calc

**Classify:** Logic error (off-by-one in offset calculation)

**Test:** Unit test for pagination boundary conditions

**Fix:** Correct offset math + add assertion for valid range
