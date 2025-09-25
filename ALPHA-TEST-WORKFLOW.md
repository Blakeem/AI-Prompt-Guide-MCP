# Claude Agent Workflow — Issue Refinement & Resolution (ALPHA TEST TRACKING)

> Goal: Fix issues found during testing by structuring work into clear, per-tool milestones with acceptance criteria, using subagents that follow our MCP best practices and shared patterns. Track outcomes in `ALPHA-TEST-3.md`.

---

## 0) Scope & Principles

- **One tool at a time** to avoid issues with agents working on the same code.
- **Gather ALL issues** and break each problem into **milestones with acceptance criteria**.
- **Use all our existing tools in the code base**, follow **modern best practice**, and **shared MCP patterns**.
- Enforce an **[edit – build – test] repeat** loop until resolved.
- **No new issues introduced**: test all functions of the tool each iteration.
- **Continuous knowledge sharing** via consistent notes appended to `ALPHA-TEST-3.md`.

---

## 1) Inputs & Artifacts

- **Issue Source:** Existing `.md` document we use to track issues discovered during testing.
- **Spec & Patterns:** Our **MCP tool spec**, **shared best practice patterns**, and **codebase tooling**.
- **Inspector:** **MCP inspector** (must be built and used by each subagent to replicate and understand bugs).
- **Logbook:** `ALPHA-TEST-3.md` (read at the start of each agent task; append outcome notes at the end).

---

## 2) Roles

- **Coordinator Agent (you):**
  - Consolidates issues.
  - Slices work **per tool**.
  - Defines milestones & acceptance criteria.
  - Assigns tasks to subagents with replication steps.
  - Reviews completion notes and flags bad practices.

- **Subagent (per tool / per issue cluster):**
  - Reads `ALPHA-TEST-3.md` to understand goals, overlap, and prior lessons.
  - Replicates issue using **MCP inspector**.
  - Executes **[edit – build – test] repeat** until acceptance criteria met.
  - Verifies **no regressions** across all functions of the tool.
  - Appends a **technical summary** + notes (including any bad-practice flags) to `ALPHA-TEST-3.md`.

---

## 3) High-Level Process

1. **Gather & Normalize Issues**
   - Parse the testing `.md` issue list.
   - **Group by tool** → then **cluster by related symptoms**.
   - For each cluster, define **milestones** with **explicit acceptance criteria**.

2. **Prioritize & Sequence**
   - Order by **blocking impact**, **cross-tool dependencies**, and **risk of regression**.
   - Ensure **no two subagents** touch the **same tool** concurrently.

3. **Create Subagent Task Packets (Per Tool)**
   - Clear problem statement + **steps to replicate**.
   - Reference to **existing tools**, **MCP spec**, and **shared patterns** to follow.
   - **Milestones** and **acceptance criteria** (DoD) for each.
   - Mandate **MCP inspector build & usage** first.
   - Mandate **[edit – build – test] repeat** with **full-function regression checks**.

4. **Execute & Verify**
   - Subagent works through milestones.
   - Coordinator verifies acceptance criteria (evidence required).
   - If gaps found, return to subagent with deltas; repeat.

5. **Record Outcomes**
   - Subagent appends a **note to the bottom of `ALPHA-TEST-3.md`**:
     - Technical summary, key details, lessons learned.
     - Any **bad practice** observed (flag + reason).
     - Links to related fixes that could help future agents.

---

## 4) Per-Tool Workflow (Subagent Checklist)

- [ ] **Read `ALPHA-TEST-3.md`** to understand the overall goal, progress, and overlapping changes.
- [ ] **Build & run MCP inspector**.
- [ ] **Replicate the issue(s)** using provided steps; capture logs/screens/CLI output as evidence.
- [ ] **Survey codebase for existing best practice patterns** (reuse before creating new).
- [ ] **Plan fix** aligned with **MCP spec** and **modern best practice**.
- [ ] **[edit – build – test] repeat** until **acceptance criteria** pass for each milestone.
- [ ] **Regression test**: Run **all functions of the tool**; verify no new issues introduced.
- [ ] **Document**:
  - Technical summary of root cause + solution.
  - Any **bad practice** encountered (flag + rationale).
  - Reusable patterns or notes that may help future agents.
- [ ] **Append results to `ALPHA-TEST-3.md`** (see template).

---

## 5) Milestone & Acceptance Criteria Templates

### 5.1 Milestone Definition (Per Issue or Cluster)
- **Milestone ID:** `<tool>-<short-name>-M#`
- **Problem Summary:** (brief, keep original wording where possible)
- **User/Agent Impact:** (what breaks / misbehaves)
- **Replication Steps:** (exact sequence using MCP inspector + commands)
- **Change Scope:** Files / modules / interfaces
- **Constraints:**
  - Must use existing tools in the code base.
  - Follow MCP spec and shared best practices.
  - Avoid cross-tool changes unless explicitly approved.
- **Acceptance Criteria (DoD):**
  - AC1:
  - AC2:
  - AC3:
- **Non-Regression Checks (all functions):**
  - NR1:
  - NR2:
- **Evidence Required:**
  - Build logs, test outputs, screenshots, diffs.
  - MCP inspector session demonstrating pass.
- **Risk Notes / Rollback Plan:** (if applicable)

### 5.2 Acceptance Criteria Examples (edit as needed)
- ✅ **Replication**: Issue reproduced in MCP inspector with given steps.
- ✅ **Functional Fix**: Specific behavior now meets spec (describe observable check).
- ✅ **Error Handling**: Edge cases handled per MCP tool spec.
- ✅ **Compatibility**: No changes to public interfaces unless documented and approved.
- ✅ **Performance**: No measurable regression (>X% runtime/memory).
- ✅ **Security/Robustness**: Input validation and failure modes conform to best practice.
- ✅ **Regression Suite**: All tool functions pass tests (manual/automated).
- ✅ **Documentation**: `ALPHA-TEST-3.md` updated with technical summary and notes.

---

## 6) Subagent Task Packet Template (Per Tool)

**Tool:** `<name>`
**Owner (Subagent):** `<agent-id>`
**Related Issues:** `<list from testing .md>`

**1) Problem Statement**
- Keep the original wording that works well with Claude code.

**2) Steps to Replicate (MCP inspector)**
1. Build MCP inspector.
2. Launch with `<command/params>`.
3. Execute:
   - Step 1:
   - Step 2:
   - Expected vs. actual:
4. Capture logs/screens.

**3) Requirements**
- Use all existing tools in the code base.
- Follow modern best practice.
- Follow our MCP spec and shared patterns.
- Do **not** introduce new issues; test all functions of the tool.

**4) Milestones & Acceptance Criteria**
- M1 … (use §5.1)
- M2 …
- M3 …

**5) Execution Loop**
- **[edit – build – test] repeat** until all acceptance criteria pass.
- Full-function **regression test** after each milestone.

**6) Deliverables**
- Patches/diffs.
- Evidence bundle (logs, test runs, screenshots).
- `ALPHA-TEST-3.md` note appended (see §7 template).

---

## 7) `ALPHA-TEST-3.md` Note Template (Append at Bottom)

```md
## <DATE> — <Tool> — <Milestone IDs> — <Subagent>

**Summary (Technical):**
- Root cause:
- Fix description:
- Interfaces touched:
- Key tests & outcomes (incl. MCP inspector evidence):

**Acceptance Criteria Results:**
- AC1: Pass/Fail (evidence ref)
- AC2: Pass/Fail (evidence ref)
- AC3: Pass/Fail (evidence ref)

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
