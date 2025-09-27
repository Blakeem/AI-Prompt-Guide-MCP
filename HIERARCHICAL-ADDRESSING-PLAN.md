# HIERARCHICAL-ADDRESSING-IMPLEMENTATION.md
> Goal: Add a **hierarchical addressing feature** across all tools without breaking existing behavior. Use **TDD-first**, MCP best practices, and shared patterns. Work is divided by tool and by phase, with clear milestones and acceptance criteria. Track outcomes in this file.

---

## 0) Scope & Principles

- **Feature-first, no regressions**: Add hierarchical addressing across the stack while ensuring nothing else breaks in each tool.
- **One tool at a time** to avoid issues with agents working on the same code.
- **TDD-first**: Write unit tests before implementation; keep, extend, and harden tests instead of discarding them.
- **Use all our existing tools in the code base**, follow **modern best practice**, and **shared MCP patterns**.
- Enforce an **[edit – build – test] repeat** loop per milestone until resolved.
- **No new issues introduced**: test **all functions** of the tool each iteration.
- **Continuous knowledge sharing**: Append progress notes and technical summaries to the bottom of this file.

---

## 1) Inputs & Artifacts

- **Design & Patterns:** Our **MCP tool spec**, **shared best practice patterns**, and **codebase tooling**.
- **Inspector:** **MCP inspector** (must be built and used by each subagent to replicate and validate behavior).
- **This File:** `HIERARCHICAL-ADDRESSING-IMPLEMENTATION.md` (read at the start of every task; append outcome notes at the end).

---

## 2) Roles

- **Coordinator Agent (you):**
  - Slices feature work **per tool** and **per phase**.
  - Defines milestones & **acceptance criteria**.
  - Assigns tasks to subagents with replication and validation steps.
  - Reviews completion notes and flags bad practices.

- **Subagent (per tool / per phase milestone):**
  - Reads this file to understand goals, overlap, and prior lessons.
  - Starts with **tests first** (TDD): author failing tests that encode desired hierarchical behavior.
  - Replicates and validates using **MCP inspector**.
  - Executes **[edit – build – test] repeat** until all acceptance criteria pass.
  - Verifies **no regressions** across all functions of the tool.
  - Appends a **technical summary** + notes (including any bad-practice flags) to this file.

---

## 3) High-Level Process (TDD-First)

1. **Plan & Normalize Work**
   - Group work **by tool**, then sequence by **Phase** (see Implementation Checklist).
   - For each tool+phase unit, define **milestones** with explicit **acceptance criteria** (DoD).

2. **Author Tests Before Code**
   - Write **unit tests** (and integration tests where relevant) that **fail initially**, describing the target hierarchical behavior.
   - Ensure tests are **minimal, deterministic, and non-flaky**.

3. **Implement with Guardrails**
   - Implement only what is required to pass the current milestone’s tests.
   - Reuse **existing best practice patterns** in the codebase; prefer shared utilities where applicable.

4. **Execute & Verify**
   - Run **pnpm test:run**, **pnpm lint**, **pnpm typecheck**, **pnpm check:dead-code**.
   - Validate with **MCP inspector** (functional behavior & UX expectations).
   - Perform **full-function regression checks** on the tool.

5. **Record Outcomes**
   - Append a **note to the bottom of this file**:
     - Technical summary, key details, tests created/updated, evidence.
     - Any **bad practice** observed (flag + reason).
     - Tips that can help future agents.

---

## 4) Implementation Checklist (Phased, With TDD Hooks)

> Each agent will execute parts of these phases. **Always write/extend tests first** for the exact behavior being implemented. Keep original wording, enhance with test-first items.

### **Phase 1: Core Enhancement (TDD-first)**
- [ ] **Add/extend unit tests** for:
  - `matchHeadingBySlug()` behavior with hierarchical input
  - New helpers `matchHierarchicalSlug()` and `verifyHierarchicalContext()`
  - Section functions passing **heading context**
- [ ] Update `matchHeadingBySlug()` in `src/sections.ts`
- [ ] Add `matchHierarchicalSlug()` and `verifyHierarchicalContext()` helper functions
- [ ] Update all section functions to pass heading context
- [ ] Ensure **comprehensive unit tests** for section matching remain and pass (do not delete)

### **Phase 2: Document Cache (TDD-first)**
- [ ] **Add/extend unit tests** that specify hierarchical caching keys, invalidation, and lookup paths
- [ ] Update `getSectionContent()` in `src/document-cache.ts`
- [ ] Implement **hierarchical caching strategy**
- [ ] Add **cache invalidation** for hierarchical keys
- [ ] **Test cache performance** with hierarchical lookups (include measurable thresholds if feasible)

### **Phase 3: Addressing System (TDD-first)**
- [ ] **Add/extend unit tests** for hierarchical parsing/normalization and keying
- [ ] Update `parseSectionAddress()` in `src/shared/addressing-system.ts`
- [ ] Add `normalizeHierarchicalSlug()` function
- [ ] Update caching keys for hierarchical support
- [ ] Add addressing system **unit tests** (keep and evolve, not discard)

### **Phase 4: MCP Tools (TDD-first)**
- [ ] **Add/extend unit tests** for hierarchical operations and views across tools
- [ ] Update `section.ts` for hierarchical operations
- [ ] Update `view-section.ts` for hierarchical viewing
- [ ] Update `task.ts` for hierarchical task management
- [ ] Update `complete-task.ts` for hierarchical task completion
- [ ] Update `view-task.ts` for hierarchical task viewing
- [ ] Update `manage-document.ts` if needed
- [ ] Update `create-document.ts` if needed
- [ ] Update `browse-documents.ts` if needed

### **Phase 5: Response Enhancement (TDD-first)**
- [ ] **Add/extend unit tests** verifying response objects include hierarchical info and formatted paths
- [ ] Add `formatHierarchicalContext()` to ToolIntegration
- [ ] Update response objects to include hierarchical information
- [ ] Add hierarchical path indicators to formatted responses
- [ ] Update error messages for hierarchical context

### **Phase 6: Testing & Validation (Finalization)**
- [ ] Run `pnpm test:run` — **all tests pass**
- [ ] Run `pnpm lint` — **zero errors/warnings**
- [ ] Run `pnpm typecheck` — **zero type errors**
- [ ] Run `pnpm check:dead-code` — **zero unused exports**
- [ ] Test with **MCP inspector** — all hierarchical patterns work
- [ ] **Integration test** — full hierarchical workflow
- [ ] **Performance test** — hierarchical caching efficiency

---

## 5) Per-Tool Workflow (Subagent Checklist)

- [ ] **Read this file** to understand overall goals, progress, and overlapping changes.
- [ ] **Build & run MCP inspector**.
- [ ] **TDD-first**: Write/extend failing tests that encode the target hierarchical behavior for the current milestone.
- [ ] **Replicate and validate** interactions via MCP inspector; capture logs/screens/CLI output as evidence.
- [ ] **Survey codebase for best practice patterns** (reuse before creating new).
- [ ] **Implement** minimal changes to pass the new tests while following MCP spec and modern best practice.
- [ ] **[edit – build – test] repeat** until **acceptance criteria** pass for the milestone.
- [ ] **Regression test**: Run **all functions of the tool**; verify no new issues introduced.
- [ ] **Document**:
  - Technical summary of root cause + solution.
  - Tests added/updated and why.
  - Any **bad practice** encountered (flag + rationale).
  - Reusable patterns or notes that may help future agents.
- [ ] **Append results to this file** (see template below).

---

## 6) Milestone & Acceptance Criteria Templates

### 6.1 Milestone Definition (Per Tool + Phase Cluster)
- **Milestone ID:** `<tool>-<phase>-<short-name>-M#`
- **Problem/Goal Summary:** (brief; keep original wording where possible)
- **User/Agent Impact:** (what behavior must emerge)
- **Replication & Validation (MCP inspector):** (exact sequence + expected outcomes)
- **Change Scope:** Files / modules / interfaces
- **Constraints:**
  - Must use existing tools in the code base.
  - Follow MCP spec and shared best practices.
  - Avoid cross-tool changes unless explicitly approved.
- **Tests (TDD-first):**
  - T1: Unit test asserting `<behavior>`
  - T2: Unit test asserting `<edge case>`
  - T3: Integration test (if applicable)
- **Acceptance Criteria (DoD):**
  - AC1: Tests written first and now **pass** (reference T1/T2/T3).
  - AC2: Functional behavior meets spec in MCP inspector (evidence).
  - AC3: No API/contract regressions; docs/comments updated as needed.
  - AC4: Performance within thresholds (if applicable).
- **Non-Regression Checks (all functions):**
  - NR1: Pre-existing test suite remains green.
  - NR2: Manual/automated checks for unaffected pathways.
- **Evidence Required:**
  - Test diffs, test output, build logs, screenshots, MCP inspector session.
- **Risk Notes / Rollback Plan:** (if applicable)

### 6.2 Acceptance Criteria Examples (edit as needed)
- ✅ **TDD**: Failing tests exist before implementation; pass after implementation; tests retained and expanded.
- ✅ **Functional Fix**: Behavior now meets spec (explicit observable checks).
- ✅ **Error Handling**: Edge cases handled per MCP tool spec.
- ✅ **Compatibility**: No breaking changes to public interfaces without approval.
- ✅ **Performance**: No measurable regression (>X% runtime/memory).
- ✅ **Regression Suite**: All tool functions pass tests (manual/automated).
- ✅ **Documentation**: This file updated with technical summary and notes.

---

## 7) Subagent Task Packet Template (Per Tool)

**Tool:** `<name>`  
**Owner (Subagent):** `<agent-id>`  
**Phase(s):** `<Phase N items>`  
**Related Components:** `<sections.ts | document-cache.ts | addressing-system.ts | MCP tools | ToolIntegration>`

**1) Goal Statement**
- Keep the original wording that works well with Claude code.

**2) Tests First (TDD)**
- New/updated tests to author (IDs + brief intent):
  - T1:
  - T2:
  - T3 (integration, if needed):
- Expected failure state before implementation:
- Success criteria after implementation:

**3) Steps to Replicate & Validate (MCP inspector)**
1. Build MCP inspector.
2. Launch with `<command/params>`.
3. Execute steps:
   - Step 1:
   - Step 2:
   - Expected vs. actual:
4. Capture logs/screens.

**4) Requirements**
- Use all existing tools in the code base.
- Follow modern best practice.
- Follow our MCP spec and shared patterns.
- Do **not** introduce new issues; test all functions of the tool.

**5) Milestones & Acceptance Criteria**
- M1 … (use §6.1)
- M2 …
- M3 …

**6) Execution Loop**
- **[edit – build – test] repeat** until all acceptance criteria pass.
- Full-function **regression test** after each milestone.

**7) Deliverables**
- Patches/diffs.
- Test artifacts (new/updated tests + outputs).
- Evidence bundle (logs, test runs, screenshots).
- **Note appended to this file** (see §8 template).

---

## 8) Progress Note Template (Append at Bottom)

```md
## <DATE> — <Tool> — <Phase/Milestone IDs> — <Subagent>

**Summary (Technical):**
- Goal / behavior targeted:
- Root cause (if applicable):
- Implementation details:
- Interfaces touched:

**Tests (TDD-first):**
- New/updated tests: T1/T2/T3 (refs/paths)
- Pre-implementation: failing as designed (evidence)
- Post-implementation: passing (evidence)

**Acceptance Criteria Results:**
- AC1 (TDD): Pass/Fail (evidence ref)
- AC2 (Functional via MCP inspector): Pass/Fail
- AC3 (Compatibility/Contracts): Pass/Fail
- AC4 (Performance): Pass/Fail

**Non-Regression Checks (All Functions):**
- NR1: Pass/Fail
- NR2: Pass/Fail
- Summary: No new issues introduced / (list any found & resolutions)

**Shared Patterns / Tips for Future Agents:**
- Reusable snippet/pattern:
- Gotchas:
- Performance or stability notes:

**Bad Practice Observed (Flag + Reason):**
- Pattern: `<describe>`
- Reason: `<why it’s problematic>`
- Suggested replacement: `<best practice>`

**Follow-ups / Open Items:**
- …
