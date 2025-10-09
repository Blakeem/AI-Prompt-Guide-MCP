---
title: "Evidence-Based Experiment Protocol"
description: "🔬 DATA-DRIVEN DECISION: Run structured experiment to learn with data instead of debate"
tags: ["experiment", "ab-test", "data", "metrics", "validation"]
whenToUse:
  - "Selecting between algorithm or threshold options"
  - "Tuning cache TTLs, retry policies, or timeout values"
  - "Making UI/API behavior trade-offs"
  - "Validating performance optimization assumptions"
  - "Choosing between multiple implementation approaches with unclear winner"
---

# Evidence-Based Experiment Protocol (EBE)

**USE THIS WHEN:** You can learn with data instead of debate.

## Process

1. **Hypothesis → Measurable prediction:**
   - State hypothesis clearly
   - Define specific prediction:
     * Direction (increase/decrease/no change)
     * Magnitude (how much change)
     * Timeframe (when observable)
   - Example: "Changing retry timeout from 5s to 10s will reduce error rate by 15-25% within 24 hours"

2. **Metrics & Minimum Detectable Effect (MDE):**
   - Pick **one** primary outcome metric
   - Define 2-3 guardrail metrics (must not regress)
   - Calculate MDE: smallest effect worth detecting
   - Estimate sample size needed for statistical power
   - Typical: 80% power, 5% significance level

3. **Assignment & control:**
   - Randomization strategy:
     * User-level random assignment (consistent per user)
     * Time-based segmentation (A/B weeks)
     * Geographic segmentation
   - Control group size (typically 50/50 split)
   - Predefine stop rules:
     * Early stop if huge effect detected
     * Max duration if no effect
     * Abort if guardrails violated

4. **Run & monitor quality:**
   - Sanity checks before analyzing:
     * Sample ratio check (50/50 split maintained)
     * Instrumentation health (no missing data)
     * Novelty effects (first day outliers)
   - Daily monitoring of guardrails
   - No peeking at primary metric until planned analysis

5. **Analyze:**
   - Effect size (point estimate + confidence interval)
   - Statistical significance (p-value)
   - Heterogeneity (does effect vary by segment?)
   - Update decision:
     * Significant positive → ship
     * Significant negative → don't ship
     * Inconclusive → needs more data or redesign

## Example Experiment

**Hypothesis:** Increasing search result limit from 10 to 20 will improve user engagement

**Primary metric:** Click-through rate (CTR)

**Guardrails:** Latency p99 < 200ms, Error rate < 0.1%

**MDE:** 2% relative increase in CTR

**Sample size:** 100K users per variant (based on power calculation)

**Assignment:** User ID hash mod 2 (consistent, balanced)

**Duration:** 7 days (1 week of stable traffic)

**Result:** CTR increased by 3.2% ± 0.8% (p=0.003), latency unchanged → **Ship**
