---
title: "Simplicity Gate & Complexity Budget"
description: "✂️ COMPLEXITY CHECK: Keep solutions simple once requirements are met"
whenToUse:
  - "Introducing new third-party libraries"
  - "Choosing between framework features vs hand-rolled solutions"
  - "Evaluating \"quick wins\" that could accumulate tech debt"
  - "Reviewing implementation before merge"
  - "Architectural decisions where simpler alternatives exist"
---

# Simplicity Gate & Complexity Budget (SGC)

## Process

1. **Set a complexity budget:**
   - Max lines of code/change (e.g., +200 LoC for feature)
   - Max dependencies (e.g., +1 new library)
   - Max API surface (e.g., 3 new public methods)
   - Max cyclomatic complexity (e.g., <10 per function)
   - Max latency/cost increase (e.g., +10ms p99)
   - **Document these limits before starting**

2. **Check options against budget:**
   - First ensure correctness/security/compliance
   - Then evaluate each option:
     * Does it fit within budget?
     * Is overage justified?

3. **Prefer smallest adequate solution:**
   - "Adequate" = meets all requirements
   - "Smallest" = minimal code/deps/complexity
   - Justify any budget overages with:
     * Explicit risk reduction (quantified)
     * Required capability (cannot be achieved simpler)
     * Future flexibility (concrete scenarios)

4. **Add deletion plan:**
   - How to remove this later? (steps)
   - How to merge with existing code? (opportunities)
   - When to retire this? (conditions)
   - Prevents long-term drag and tech debt

## Complexity Budget Example

**Feature:** Add rate limiting to API

**Budget:**
- Code: +150 LoC
- Dependencies: 0 new (use existing libs)
- API surface: +1 middleware
- Complexity: <8 per function
- Latency: +5ms p99

**Option A: Redis-based (256 LoC, +1 dependency, +15ms)**
- ❌ Over budget on all metrics
- Justification needed

**Option B: In-memory LRU (127 LoC, 0 dependencies, +2ms)**
- ✅ Within budget
- Adequate for single-instance deployment
- **CHOOSE THIS**

**Deletion plan:**
- When to upgrade: Multi-instance deployment
- How to remove: Replace middleware, keep interface
- Migration path: Redis implementation ready if needed

## Red Flags

- "We might need it later" (YAGNI violation)
- "Industry standard" (not a requirement)
- "More flexible" (unneeded flexibility adds complexity)
- "Best practice" (without context of trade-offs)
