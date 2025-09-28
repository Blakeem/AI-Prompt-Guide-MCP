# Workflow Library for Autonomous Agents

> Each workflow is **general-purpose** at its core with optional **code-specific “When to Use”** notes. Names are distinct so you can call them explicitly. All workflows assume: record outcomes in **AGENT-MEMORY**.

---

## Multi-Option Trade-off Protocol (Decision-Making under Uncertainty) — *Refined*
Use this when you must choose among several plausible paths and justify the choice.

1. **Generate 2–4 candidate options.**
2. For each option, capture:
   - **Description** (one sentence), **Assumptions/Preconditions**, **Pros**, **Cons**, **Effort/Complexity** (S/M/L), **Evidence/References**.
3. **Comparative analysis:** score on 4–6 criteria (e.g., correctness, risk, cost/time, maintainability, performance).  
   - *Simple rule:* `TotalScore = Σ w_i · normalized(criterion_i)` with weights `w_i` documented.
4. **Recommend one option** and **explain why not the others** (dominant trade-offs and disqualifiers).
5. **Record decision** (+ rejected options, assumptions, review/rollback criteria) in **AGENT-MEMORY**.

**When to Use This Workflow (Code)**
- Refactors (extract function vs strategy vs module split)
- Perf choices (caching tiers, data structures, algorithm family)
- Architecture (sync vs async, monolith vs service)
- Test strategy (property-based vs example-based vs snapshot)

---

## Spec-First Integration Protocol (SFI)
Use this before adding a feature or integrating with external components to ensure correctness and currency.

1. **Identify authorities:** list canonical specs/API docs/RFCs + versions; note supported features for your runtime/env.
2. **Extract constraints:** version gates, capability matrix, invariants, and failure modes.
3. **Define acceptance criteria:** observable behaviors/tests that prove spec conformance (happy path + edge cases).
4. **Map entry points:** candidate integration surfaces; decide **sync vs async** via latency/throughput/ordering needs.
5. **Propose 2–4 compliant designs;** pick the solution that **meets all constraints** and **minimizes complexity/size**.  
   - Apply **Occam’s Razor** only **after** compliance/compatibility/safety are satisfied.
6. **Create a compliance checklist** and link to sources; **record version bounds** and migration notes in **AGENT-MEMORY**.

**When to Use This Workflow (Code)**
- Adding SDKs, webhooks, or auth flows
- Feature flags touching persistence or concurrency
- Adopting new framework capabilities (router, streaming, workers)

---

## Causal Flow Mapping Protocol (CFM)
Use this to understand **cause → effect** chains, debug issues, or communicate system dynamics.

1. **Define the effect:** what changed, where, and when (include timeline & scope).
2. **Draft a causal graph (DAG):** nodes = states/events; edges = hypothesized influence.
   - *Minimal syntax (Mermaid):*
     ```
     graph TD
       A[User Action] --> B[Service Call]
       B --> C[Cache Miss]
       C --> D[DB Load ↑]
     ```
3. **Annotate evidence:** logs, metrics, traces, experiments; mark **unknowns** and **confounders**.
4. **Plan discriminating tests/interventions:** toggles, tracepoints, controlled inputs, time-boxing.
5. **Instrument & run probes;** update the graph until the minimal sufficient causal path explains the effect.
6. **Record root cause, disconfirmed hypotheses, and guards** in **AGENT-MEMORY**.

**When to Use This Workflow (Code)**
- Intermittent failures, races, resource pressure
- Behavior regressions across deployments
- Complex feature interactions (cache → queue → DB)

---

## Failure Triage & Minimal Repro Protocol (FTR)
Use this to move from symptom → actionable fix fast.

1. **Capture state:** inputs, env, seed, commit, config, feature flags, timestamps; save artifacts.
2. **Reproduce locally;** iteratively **minimize** input/state until the smallest failing case remains.
3. **Localize** via **bisection** (code/flags/data) to isolate the responsible change or component.
4. **Classify** (logic, data contract, concurrency, resource, environment). Attach likely invariants violated.
5. **Design a discriminating test** (unit/property/integration) that fails on bad path and passes otherwise.
6. **Fix → validate → harden:** assertions/metrics to prevent recurrence; **document** in **AGENT-MEMORY**.

**When to Use This Workflow (Code)**
- Bug reports without clear steps
- Flaky tests or timeouts
- Production incidents needing RCAs

---

## Guardrailed Rollout Protocol (GRP)
Use this to deploy risky changes safely with pre-defined exit criteria.

1. **Pre-mortem:** list top failure modes and detection signals.
2. **Guardrails:** pick a few metrics (SLOs, error rate, latency, cost) + thresholds + evaluation windows.
3. **Staging plan:** canary/percent rollout schedule, sample sizes, and **automatic rollback** rules.
4. **Observability:** dashboards, alerts, and on-call ownership; verify signals before ramp.
5. **Execute & gate:** advance only if guardrails hold; otherwise **rollback** and record findings.
6. **Post-verify:** confirm no slow burns; write a short post-deployment note to **AGENT-MEMORY**.

**When to Use This Workflow (Code)**
- Schema changes, dependency upgrades, hot paths
- Feature flags crossing trust boundaries (auth/payment)
- Caching/indexing or infra capacity changes

---

## Evidence-Based Experiment Protocol (EBE)
Use this when you can learn with data rather than debate.

1. **Hypothesis → measurable prediction** (direction + magnitude + timeframe).
2. **Metrics & MDE:** pick primary outcome + guardrails; estimate sample size/power.
3. **Assignment & control:** randomization/segmentation; predefine stop rules and analysis plan.
4. **Run & monitor quality:** sanity checks, sample ratio mismatch, instrumentation health.
5. **Analyze:** effect size, confidence/uncertainty, heterogeneity; update priors.
6. **Decision:** ship/iterate/stop; **record** conclusions and caveats in **AGENT-MEMORY**.

**When to Use This Workflow (Code)**
- Choosing algorithms/thresholds
- Tuning cache TTLs or retry policies
- UI or API behavior trade-offs

---

## Simplicity Gate & Complexity Budget (SGC)
Use this to keep solutions simple once they meet non-negotiable constraints.

1. **Set a budget:** max LoC/change, dependency additions, API surface, cyclomatic complexity, latency/cost bound.
2. **Measure each option** against the budget after correctness/security/compliance are satisfied.
3. **Prefer the smallest adequate solution;** justify any budget overage explicitly (risk pay-down, future leverage).
4. **Add a “deletion plan”** (how to remove/merge/retire) to avoid barnacles.
5. **Record budget, rationale, and follow-up** in **AGENT-MEMORY**.

**When to Use This Workflow (Code)**
- Introducing new third-party libs
- Pattern choices (framework feature vs hand-rolled)
- “Quick wins” that risk long-term drag

---

## Interface Diff & Adaptation Protocol (IDAP)
Use this when upgrading dependencies or crossing API boundaries.

1. **Collect deltas:** release notes, migration guides, deprecations, security notices; map to your usage.
2. **Classify changes:** additive, behavioral, breaking; tag risky call sites.
3. **Draft 2–3 adaptation paths:** shim, refactor, or feature removal; estimate impact and test surface.
4. **Select minimal-risk path** that preserves invariants and forward-compatibility.
5. **Stage & verify** behind flags; **rollback plan** in place; **record** in **AGENT-MEMORY**.

**When to Use This Workflow (Code)**
- Major framework/library upgrades
- Protocol/contract changes across services
- Vendor/API sunset pathways

---

# Notes on Occam’s Razor in Practice
- Use **only after** correctness, safety, and spec conformance are proven feasible.  
- Treat it as a **penalty term** in your scoring (e.g., subtract points for added moving parts/dependencies/state).  
- Prefer **reversible** simple designs; complexity must buy measurable risk reduction or capability.

---
