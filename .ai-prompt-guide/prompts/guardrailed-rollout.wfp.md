---
title: "Guardrailed Rollout Protocol"
description: "🚀 RISKY DEPLOYMENT: Deploy changes safely with automatic rollback criteria"
whenToUse:
  - "Schema changes, index changes, or database migrations"
  - "Dependency upgrades in critical paths"
  - "Changes to authentication, payment, or permission systems"
  - "Caching layer changes or index rebuilds"
  - "Infrastructure capacity or configuration changes"
---

# Guardrailed Rollout Protocol (GRP)

## Process

1. **Pre-mortem:**
   - List top 5 failure modes
   - For each, define detection signals:
     * What metric changes?
     * What logs appear?
     * What user impact?

2. **Define guardrails:**
   - Choose 3-5 key metrics:
     * Error rate (< threshold)
     * Latency p99 (< threshold)
     * Success rate (> threshold)
     * Cost/usage (< threshold)
   - Set **objective thresholds** (not subjective)
   - Define evaluation windows (e.g., "5 min average")

3. **Plan staging:**
   - Canary percentage: 1% → 5% → 25% → 100%
   - Sample sizes per stage
   - **Automatic rollback rules:**
     * If any guardrail violated → automatic rollback
     * If P-value > 0.05 for critical metric → pause
   - Ramp timing (e.g., 30 min per stage)

4. **Observability check:**
   - Dashboards showing all guardrail metrics
   - Alerts configured for threshold violations
   - On-call ownership assigned
   - Verify signals visible BEFORE starting rollout

5. **Execute & gate:**
   - Deploy to canary
   - Monitor for full evaluation window
   - **Only advance if ALL guardrails hold**
   - If guardrails violated:
     * Automatic rollback immediately
     * Analyze logs/metrics
     * Fix or adjust guardrails
     * Restart from stage 1

## Example Guardrails

**Change:** New caching layer

**Failure modes:**
- Cache stampede → DB overload
- Stale data served → incorrect results
- Memory exhaustion → crashes

**Guardrails:**
| Metric | Threshold | Window |
|--------|-----------|--------|
| Error rate | < 0.5% | 5 min |
| DB query rate | < 1.2x baseline | 10 min |
| Memory usage | < 80% | continuous |
| Cache hit rate | > 70% | 15 min |

**Rollout:** 1% → 10% → 50% → 100%, 30 min per stage

**Rollback trigger:** ANY metric outside threshold for > 2 min
