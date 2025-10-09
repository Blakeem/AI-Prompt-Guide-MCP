---
title: "Interface Diff & Adaptation Protocol"
description: "🔄 DEPENDENCY UPGRADE: Safely adapt to API/contract changes"
tags: ["upgrade", "migration", "api", "dependency", "compatibility"]
whenToUse:
  - "Major framework or library upgrades"
  - "Protocol or contract changes between services"
  - "Vendor API migrations or sunset scenarios"
  - "Language version upgrades with breaking changes"
  - "Database schema or ORM version changes"
---

# Interface Diff & Adaptation Protocol (IDAP)

**USE THIS WHEN:** Upgrading dependencies or crossing API/contract boundaries.

## Process

1. **Collect deltas:**
   - Release notes (all versions between current and target)
   - Migration guides (official and community)
   - Deprecation warnings (what's going away)
   - Security notices (CVEs addressed)
   - Breaking changes (incompatible APIs)
   - Map to your call sites (grep/IDE search)

2. **Classify changes:**
   - **Additive:** New features, no existing code affected
   - **Behavioral:** Same API, different behavior
   - **Breaking:** Incompatible API changes
   - Tag each call site with risk level:
     * 🟢 Safe (unaffected)
     * 🟡 Behavioral (may need validation)
     * 🔴 Breaking (must change)

3. **Draft 2-3 adaptation paths:**

   **Path A: Shim**
   - Wrap new API in old interface
   - Pros: Minimal changes, gradual migration
   - Cons: Maintains old patterns, shim overhead

   **Path B: Refactor**
   - Update all call sites to new API
   - Pros: Clean break, uses new idioms
   - Cons: Larger surface area, more testing

   **Path C: Remove capability**
   - Don't use deprecated feature
   - Pros: Simplest, most future-proof
   - Cons: May require alternative approach

   Estimate surface area and test impact for each

4. **Select minimal-risk path:**
   - Consider:
     * Number of call sites affected
     * Test coverage at call sites
     * Rollback difficulty
     * Forward compatibility
   - Prefer path that:
     * Preserves invariants
     * Maintains test coverage
     * Allows incremental rollout

5. **Stage behind feature flag:**
   - Implement change behind toggle
   - Run both old and new in parallel (if possible)
   - Verify with targeted tests:
     * Unit tests for changed functions
     * Integration tests for affected flows
     * Smoke tests in staging
   - Keep rollback ready (flag off)

## Example Upgrade

**Change:** ORM library v2 → v3

**Breaking changes found:**
- `findOne()` → `findFirst()` (rename)
- `include` → `relations` (API change)
- Query builder syntax changed

**Call site analysis:**
- 47 uses of `findOne()` (must change all)
- 23 uses of `include` (must change all)
- 8 uses of query builder (must rewrite)

**Adaptation paths:**

**Path A (Shim):** Wrap v3 in v2-compatible layer
- Effort: 2 days to write shim + tests
- Risk: Medium (shim bugs possible)
- Future: Must migrate off shim eventually

**Path B (Refactor):** Update all 78 call sites
- Effort: 3 days + extensive testing
- Risk: High (many changes, more bugs)
- Future: Clean, idiomatic v3 usage

**Path C (Gradual):** Shim + incremental migration
- Effort: 2 days shim + 1 week gradual migration
- Risk: Low (incremental, well-tested)
- Future: Clean migration with safety

**Decision: Path C** - Balance safety and cleanliness
