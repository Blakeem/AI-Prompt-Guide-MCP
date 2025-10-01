/**
 * Workflow prompts for autonomous agents
 *
 * These prompts provide structured decision-making and problem-solving
 * frameworks for agents working on documentation, tasks, and development.
 */

/**
 * Prompt definition interface
 */
export interface WorkflowPrompt {
  /** Unique identifier for the prompt */
  name: string;
  /** Short, attention-grabbing description */
  description: string;
  /** Full prompt content with instructions */
  content: string;
  /** Keywords for discoverability */
  tags: string[];
  /** When agents should consider using this prompt */
  whenToUse: string[];
}

/**
 * Multi-Option Trade-off Protocol
 * For decision-making when choosing between multiple viable approaches
 */
export const MULTI_OPTION_TRADEOFF: WorkflowPrompt = {
  name: 'multi_option_tradeoff',
  description: '⚖️ DECISION NEEDED: Choose between multiple approaches with structured trade-off analysis',
  content: `# Multi-Option Trade-off Protocol

**USE THIS WHEN:** You face multiple plausible paths and need to justify your choice systematically.

## Process

1. **Generate 2-4 viable options**
   - Be specific about what each approach entails
   - Include both obvious and creative alternatives

2. **For each option, document:**
   - **Description** (1-2 sentences)
   - **Assumptions/Preconditions** (what must be true)
   - **Pros** (benefits, advantages, strengths)
   - **Cons** (drawbacks, risks, limitations)
   - **Effort/Complexity** (Small/Medium/Large)
   - **Evidence/References** (docs, prior art, examples)

3. **Compare quantitatively:**
   - Choose 4-6 criteria: correctness, risk, cost/time, maintainability, performance, simplicity
   - Score each option on each criterion (0-10 scale)
   - Apply weights to criteria based on context
   - Calculate: Score(option) = Σ w_i · normalized(criterion_i)

4. **Decide and justify:**
   - Select the highest-scoring option
   - **State why NOT the others** (key disqualifiers and trade-offs)
   - Document the decision rationale

## Example Decision Matrix

| Option | Correctness | Risk | Time | Maintainability | Score |
|--------|------------|------|------|-----------------|-------|
| A      | 9          | 7    | 8    | 6               | 7.5   |
| B      | 8          | 9    | 6    | 9               | 8.0 ✓ |
| C      | 7          | 6    | 9    | 5               | 6.8   |

**Decision: Option B** - Higher maintainability and lower risk outweigh slightly slower implementation time.
`,
  tags: ['decision', 'tradeoff', 'comparison', 'architecture', 'design'],
  whenToUse: [
    'Choosing between multiple refactoring approaches (extract function vs Strategy pattern vs module split)',
    'Selecting performance optimizations (caching strategies, algorithm selection, data structures)',
    'Making architecture decisions (sync vs async, monolith vs service, singleton vs DI)',
    'Determining test strategies (property-based vs example-based vs snapshot)',
    'Evaluating implementation patterns when multiple valid approaches exist'
  ]
};

/**
 * Spec-First Integration Protocol
 * For adding features or integrating with external systems/APIs
 */
export const SPEC_FIRST_INTEGRATION: WorkflowPrompt = {
  name: 'spec_first_integration',
  description: '📋 INTEGRATION TASK: Ensure correctness before implementing new features or API integrations',
  content: `# Spec-First Integration Protocol (SFI)

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
`,
  tags: ['integration', 'api', 'spec', 'design', 'compliance'],
  whenToUse: [
    'Integrating new SDKs, webhooks, or authentication flows',
    'Implementing features that touch persistence or concurrency',
    'Adopting new framework capabilities (router, streaming, workers)',
    'Building API clients or wrappers for external services',
    'Implementing protocol handlers or data format parsers'
  ]
};

/**
 * Causal Flow Mapping Protocol
 * For debugging complex issues and understanding system dynamics
 */
export const CAUSAL_FLOW_MAPPING: WorkflowPrompt = {
  name: 'causal_flow_mapping',
  description: '🔍 DEBUGGING COMPLEX ISSUE: Map cause-effect chains to understand system behavior',
  content: `# Causal Flow Mapping Protocol (CFM)

**USE THIS TO:** Unpack cause → effect chains, debug issues, explain system dynamics.

## Process

1. **Pin the effect:**
   - What changed? (behavior, metric, output)
   - Where? (component, service, function)
   - When? (timeline, trigger events)
   - Scope? (all users, specific conditions)

2. **Sketch a causal DAG:**
   - Nodes = states, events, conditions
   - Edges = hypothesized causal influence
   - Use Mermaid diagram for visualization:

\`\`\`mermaid
graph TD
  A[User Action] --> B[Service Call]
  B --> C[Cache Miss]
  C --> D[DB Load Increase]
  D --> E[Timeout]
\`\`\`

3. **Annotate evidence:**
   - Mark each edge with evidence type:
     * 🟢 Strong (logs, traces, metrics)
     * 🟡 Weak (correlation, timing)
     * 🔴 Unknown (hypothesis)
   - Note confounders (alternative explanations)

4. **Plan discriminating tests:**
   - Feature toggles to isolate components
   - Tracepoints to capture state
   - Controlled inputs to reproduce
   - Time-boxed probes (max 30 min each)

5. **Run probes & prune:**
   - Execute tests in order of expected information gain
   - Keep only edges supported by evidence
   - Iterate until minimal sufficient explanation found

## Example Investigation

**Effect:** API latency increased from 50ms to 500ms

**Initial DAG:**
- Deployment → Cache invalidation → DB queries ↑ → Latency ↑
- Deployment → Query plan change → Full scans → Latency ↑

**Evidence gathering:**
- Check cache hit rates (logs) 🟢
- Check query execution plans (database) 🟢
- Check deployment timing (git history) 🟢

**Result:** Query plan regression confirmed, cache unaffected.
`,
  tags: ['debugging', 'analysis', 'causality', 'investigation', 'troubleshooting'],
  whenToUse: [
    'Investigating intermittent failures, race conditions, or resource pressure',
    'Understanding behavior regressions across deployments',
    'Analyzing complex interactions (cache → queue → database)',
    'Performance degradations without obvious cause',
    'System behavior that differs between environments'
  ]
};

/**
 * Failure Triage & Minimal Repro Protocol
 * For converting vague symptoms into actionable fixes
 */
export const FAILURE_TRIAGE_REPRO: WorkflowPrompt = {
  name: 'failure_triage_repro',
  description: '🐛 BUG REPORT: Convert symptoms into minimal reproduction and actionable fix',
  content: `# Failure Triage & Minimal Repro Protocol (FTR)

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
`,
  tags: ['debugging', 'bug', 'reproduce', 'triage', 'fix'],
  whenToUse: [
    'Bug reports without clear reproduction steps',
    'Flaky tests that fail inconsistently',
    'Incidents requiring quick root cause identification',
    'Production issues that work fine in development',
    'Edge cases that are hard to trigger manually'
  ]
};

/**
 * Guardrailed Rollout Protocol
 * For deploying risky changes safely
 */
export const GUARDRAILED_ROLLOUT: WorkflowPrompt = {
  name: 'guardrailed_rollout',
  description: '🚀 RISKY DEPLOYMENT: Deploy changes safely with automatic rollback criteria',
  content: `# Guardrailed Rollout Protocol (GRP)

**USE THIS TO:** Deploy risky changes safely with pre-defined exit criteria.

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
`,
  tags: ['deployment', 'rollout', 'safety', 'monitoring', 'production'],
  whenToUse: [
    'Schema changes, index changes, or database migrations',
    'Dependency upgrades in critical paths',
    'Changes to authentication, payment, or permission systems',
    'Caching layer changes or index rebuilds',
    'Infrastructure capacity or configuration changes'
  ]
};

/**
 * Evidence-Based Experiment Protocol
 * For making data-driven decisions through experimentation
 */
export const EVIDENCE_BASED_EXPERIMENT: WorkflowPrompt = {
  name: 'evidence_based_experiment',
  description: '🔬 DATA-DRIVEN DECISION: Run structured experiment to learn with data instead of debate',
  content: `# Evidence-Based Experiment Protocol (EBE)

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
`,
  tags: ['experiment', 'ab-test', 'data', 'metrics', 'validation'],
  whenToUse: [
    'Selecting between algorithm or threshold options',
    'Tuning cache TTLs, retry policies, or timeout values',
    'Making UI/API behavior trade-offs',
    'Validating performance optimization assumptions',
    'Choosing between multiple implementation approaches with unclear winner'
  ]
};

/**
 * Simplicity Gate & Complexity Budget
 * For keeping solutions simple and avoiding over-engineering
 */
export const SIMPLICITY_GATE: WorkflowPrompt = {
  name: 'simplicity_gate',
  description: '✂️ COMPLEXITY CHECK: Keep solutions simple once requirements are met',
  content: `# Simplicity Gate & Complexity Budget (SGC)

**USE THIS TO:** Keep solutions simple once non-negotiables are met.

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
`,
  tags: ['simplicity', 'complexity', 'design', 'yagni', 'refactoring'],
  whenToUse: [
    'Introducing new third-party libraries',
    'Choosing between framework features vs hand-rolled solutions',
    'Evaluating "quick wins" that could accumulate tech debt',
    'Reviewing implementation before merge',
    'Architectural decisions where simpler alternatives exist'
  ]
};

/**
 * Interface Diff & Adaptation Protocol
 * For handling dependency upgrades and API changes
 */
export const INTERFACE_DIFF_ADAPTATION: WorkflowPrompt = {
  name: 'interface_diff_adaptation',
  description: '🔄 DEPENDENCY UPGRADE: Safely adapt to API/contract changes',
  content: `# Interface Diff & Adaptation Protocol (IDAP)

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
- \`findOne()\` → \`findFirst()\` (rename)
- \`include\` → \`relations\` (API change)
- Query builder syntax changed

**Call site analysis:**
- 47 uses of \`findOne()\` (must change all)
- 23 uses of \`include\` (must change all)
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
`,
  tags: ['upgrade', 'migration', 'api', 'dependency', 'compatibility'],
  whenToUse: [
    'Major framework or library upgrades',
    'Protocol or contract changes between services',
    'Vendor API migrations or sunset scenarios',
    'Language version upgrades with breaking changes',
    'Database schema or ORM version changes'
  ]
};

/**
 * All workflow prompts registry
 */
export const WORKFLOW_PROMPTS: WorkflowPrompt[] = [
  MULTI_OPTION_TRADEOFF,
  SPEC_FIRST_INTEGRATION,
  CAUSAL_FLOW_MAPPING,
  FAILURE_TRIAGE_REPRO,
  GUARDRAILED_ROLLOUT,
  EVIDENCE_BASED_EXPERIMENT,
  SIMPLICITY_GATE,
  INTERFACE_DIFF_ADAPTATION
];

/**
 * Get prompt by name
 */
export function getWorkflowPrompt(name: string): WorkflowPrompt | undefined {
  return WORKFLOW_PROMPTS.find(p => p.name === name);
}

/**
 * Find prompts by tag
 */
export function findPromptsByTag(tag: string): WorkflowPrompt[] {
  return WORKFLOW_PROMPTS.filter(p => p.tags.includes(tag.toLowerCase()));
}

/**
 * Search prompts by situation/context
 */
export function findPromptsForSituation(situation: string): WorkflowPrompt[] {
  const searchTerms = situation.toLowerCase();
  return WORKFLOW_PROMPTS.filter(p =>
    p.whenToUse.some(use => use.toLowerCase().includes(searchTerms)) ||
    p.description.toLowerCase().includes(searchTerms) ||
    p.tags.some(tag => searchTerms.includes(tag))
  );
}