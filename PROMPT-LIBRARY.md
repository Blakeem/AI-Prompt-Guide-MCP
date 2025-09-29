# Workflow Library for Autonomous Agents (On-the-Spot)

> General-purpose workflows with optional **Code: When to Use** notes. Designed for **single-pass decisions**.

---

## Multi-Option Trade-off Protocol (Decision-Making under Uncertainty)
Use this when you must choose among plausible paths and justify the choice quickly.

1. **Generate 2–4 options.**
2. For each option, capture:
   - **Description** (1 sentence), **Assumptions/Preconditions**, **Pros**, **Cons**, **Effort/Complexity** (S/M/L), **Evidence/References**.
3. **Compare quantitatively:** choose 4–6 criteria (e.g., correctness, risk, cost/time, maintainability, performance) and compute  
   `Score(option) = Σ w_i · normalized(criterion_i)` (document weights `w_i` briefly).
4. **Decide and justify:** select the winner and state **why not the others** (key disqualifiers/trade-offs).

**Code: When to Use**
- Refactors (extract fn vs strategy vs module split)
- Performance choices (caching tiers, DS/algorithm family)
- Architecture (sync vs async, monolith vs service)
- Test strategy (property vs example vs snapshot)

---

## Spec-First Integration Protocol (SFI)
Use this before adding a feature or crossing system boundaries to ensure correctness and currency.

1. **Identify authorities:** canonical specs/API docs/RFCs + versions relevant to your runtime/env.
2. **Extract constraints:** capability matrix, invariants, limits, error semantics, version gates.
3. **Define acceptance criteria:** observable behaviors/tests proving conformance (happy + edge cases).
4. **Map entry points:** candidate integration surfaces; choose **sync vs async** by latency/throughput/ordering needs.
5. **Propose 2–4 compliant designs;** prefer the smallest solution that meets **all constraints**.
   - Apply **Occam’s Razor** **after** compliance, safety, and compatibility are satisfied.
6. **Quick conformance checklist:** inputs, outputs, errors, timeouts, retries, idempotency.

**Code: When to Use**
- New SDKs, webhooks, auth flows
- Feature flags touching persistence or concurrency
- Adopting new framework capabilities (router, streaming, workers)

---

## Causal Flow Mapping Protocol (CFM)
Use this to unpack **cause → effect** chains, debug issues, or explain system dynamics.

1. **Pin the effect:** what changed, where, when (timeline + scope).
2. **Sketch a causal DAG:** nodes = states/events; edges = hypothesized influence. Minimal Mermaid example (indent as code in your tool):
    
        graph TD
          A[User Action] --> B[Service Call]
          B --> C[Cache Miss]
          C --> D[DB Load ↑]
    
3. **Annotate evidence:** logs, metrics, traces, experiments; mark **unknowns** and **confounders**.
4. **Plan discriminating tests:** toggles, tracepoints, controlled inputs, time-boxed probes.
5. **Run probes & prune:** keep only edges supported by evidence until a minimal sufficient path explains the effect.

**Code: When to Use**
- Intermittent failures, races, resource pressure
- Behavior regressions across deployments
- Complex interactions (cache → queue → DB)

---

## Failure Triage & Minimal Repro Protocol (FTR)
Use this to convert a symptom into an actionable fix fast.

1. **Capture context:** inputs, env, seed, commit, config, feature flags, timestamps; snapshot artifacts if possible.
2. **Reproduce locally;** iteratively **minimize** input/state to the smallest failing case.
3. **Localize by bisection** (code/flags/data) to isolate the responsible change or component.
4. **Classify** (logic, data contract, concurrency, resource, environment); note the violated invariant.
5. **Design a discriminating test** (unit/property/integration) that fails on the bad path and passes otherwise.
6. **Fix → validate → harden** with assertions/metrics to prevent recurrence.

**Code: When to Use**
- Bug reports without clear steps
- Flaky tests or timeouts
- Incidents requiring quick root cause

---

## Guardrailed Rollout Protocol (GRP)
Use this to deploy risky changes safely with pre-defined exit criteria.

1. **Pre-mortem:** list top failure modes and detection signals.
2. **Guardrails:** choose a few metrics (SLOs, error rate, latency, cost) + thresholds + evaluation windows.
3. **Staging:** canary/percent rollout schedule, sample sizes, and **automatic rollback** rules.
4. **Observability check:** dashboards, alerts, on-call ownership; verify signals before ramp.
5. **Execute & gate:** advance only if guardrails hold; otherwise **rollback** and analyze briefly.

**Code: When to Use**
- Schema/index changes, dependency upgrades, hot paths
- Auth/payment/permission surfaces
- Caching/indexing or infra capacity changes

---

## Evidence-Based Experiment Protocol (EBE)
Use this when you can learn with data instead of debate.

1. **Hypothesis → measurable prediction** (direction, magnitude, timeframe).
2. **Metrics & MDE:** pick a primary outcome + guardrails; estimate sample size/power.
3. **Assignment & control:** randomization/segmentation; predefine stop rules and analysis plan.
4. **Run & monitor quality:** sanity checks (sample ratio, instrumentation health).
5. **Analyze:** effect size, uncertainty, heterogeneity; update the decision accordingly.

**Code: When to Use**
- Algorithm/threshold selection
- Tuning cache TTLs or retry policies
- UI/API behavior trade-offs

---

## Simplicity Gate & Complexity Budget (SGC)
Use this to keep solutions simple once non-negotiables are met.

1. **Set a budget:** max LoC/change, deps, API surface, cyclomatic complexity, latency/cost bound.
2. **Check options against the budget** after correctness/security/compliance are satisfied.
3. **Prefer the smallest adequate solution;** justify any overage with explicit risk/capability payoff.
4. **Add a “deletion plan”** (how to remove/merge/retire) to avoid long-term drag.

**Code: When to Use**
- Introducing third-party libraries
- Choosing patterns (framework feature vs hand-rolled)
- “Quick wins” that could accrete debt

---

## Interface Diff & Adaptation Protocol (IDAP)
Use this when upgrading dependencies or crossing API/contract boundaries.

1. **Collect deltas:** release notes, migration guides, deprecations, security notices; map to your call sites.
2. **Classify changes:** additive, behavioral, breaking; tag risky usages.
3. **Draft 2–3 adaptation paths:** shim, refactor, or capability removal; estimate surface area and test impact.
4. **Select minimal-risk path** that preserves invariants and forward-compatibility.
5. **Stage behind a flag** and verify with targeted tests; keep a rollback ready.

**Code: When to Use**
- Major framework/library upgrades
- Protocol/contract changes among services
- Vendor/API sunset pathways

---

# Notes on Occam’s Razor in Practice
- Use **only after** correctness, safety, and spec conformance are feasible.  
- Treat simplicity as a **penalty term** in scoring (subtract points for extra moving parts/dependencies/state).  
- Prefer **reversible** simple designs; add complexity only for measurable risk reduction or capability.
