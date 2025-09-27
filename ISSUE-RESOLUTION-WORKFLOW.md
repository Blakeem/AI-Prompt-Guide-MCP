# Claude Agent Workflow — Issue Refinement & Resolution

Currently working on resolving issues in `CODE-REVIEW-PLAN.md`.

> Goal: Fix issues found during testing or code review by structuring work into clear, per-tool milestones with acceptance criteria, using subagents that follow our MCP best practices and shared patterns. Track outcomes in `ISSUE-RESOLUTION-AGENT-MEMORY.md`.

## Decision-Making Workflow

Use this when faced with uncertainty during issue resolution:

1. When faced with a new problem or multiple solution approaches, generate **2–4 possible approaches**.
2. For each approach, provide:
   - **Description**: A concise explanation of the option.
   - **Pros**: Benefits, advantages, or strengths.
   - **Cons**: Drawbacks, risks, or limitations.
3. After laying out the options, perform a **comparative analysis** to weigh trade-offs.
4. **Recommend the best option**, clearly stating the reasoning behind the choice.
5. **Document the decision in AGENT-MEMORY** for future reference.

**When to Use This Workflow:**
- Multiple refactoring approaches possible (extract function vs Strategy pattern vs other patterns)
- Performance optimization choices (caching strategy, algorithm selection)
- Architecture decisions (singleton vs DI, sync vs async)
- Uncertainty about best practice application
- Trade-offs between maintainability, performance, and complexity

---

## 0) Scope & Principles

- **One tool at a time** to avoid issues with agents working on the same code.
- **Gather ALL issues** and break each problem into **milestones with acceptance criteria**.
- **Use all our existing tools in the code base**, follow **modern best practice**, and **shared MCP patterns**.
- **Hybrid classification approach**: Main agent suggests issue type, subagent confirms or adjusts after code examination.
- Enforce an **[edit – build – test] repeat** loop until resolved (adapted to issue type).
- **No new issues introduced**: test all functions of the tool each iteration.
- **Continuous knowledge sharing** via consistent notes appended to `ISSUE-RESOLUTION-AGENT-MEMORY.md`.

---

## 0.5) Issue Type Classification

Understanding issue types ensures correct workflow application. Main agent provides initial classification; subagent confirms or adjusts after code examination.

### Type A: Runtime/Functional Issues
**Characteristics:**
- Observable behavior is incorrect
- Produces wrong results, errors, or unexpected behavior
- Has functional impact on users or system operation

**Workflow Requirements:**
- Requires MCP inspector replication
- Needs new functional tests (TDD approach)
- Test-driven: write failing test → fix → verify pass

**Examples from CODE-REVIEW-PLAN.md:**
- Cache invalidation race conditions
- Incorrect section boundary handling
- MCP error handling violations
- Missing resource cleanup causing leaks
- Path validation security issues

**Indicators in Issue Descriptions:**
- "bug", "race condition", "incorrect", "fails when"
- "causes", "breaks", "corrupts", "leaks"
- "security vulnerability", "data loss"

---

### Type B: Code Quality/Architecture Issues
**Characteristics:**
- Code works functionally but structure is problematic
- Affects maintainability, readability, or future development
- Violates design principles or best practices

**Workflow Requirements:**
- Requires code examination and metrics
- Relies on regression tests (existing tests prove refactor safe)
- Refactor with existing test suite as safety net
- Measure improvement (complexity, LOC, duplication)

**Examples from CODE-REVIEW-PLAN.md:**
- High cyclomatic complexity
- God Object anti-patterns
- Large functions (>50 lines)
- SOLID principle violations
- Code duplication patterns
- Architectural anti-patterns (Shotgun Surgery, Feature Envy)

**Indicators in Issue Descriptions:**
- "complexity", "anti-pattern", "duplication", "violates"
- "too large", "too many responsibilities"
- "hard to maintain", "difficult to understand"
- References to design principles (SOLID, DRY, KISS)

---

### Type C: Documentation/Style Issues
**Characteristics:**
- No code behavior change
- Improves clarity, consistency, or documentation
- Cosmetic or organizational improvements

**Workflow Requirements:**
- Quality gates verify safety (no behavior change)
- No tests needed (unless adding missing examples)
- Focus on clarity and consistency

**Examples from CODE-REVIEW-PLAN.md:**
- Missing JSDoc coverage
- Inconsistent naming patterns
- Incomplete API documentation
- Comment style inconsistency
- Missing inline documentation

**Indicators in Issue Descriptions:**
- "missing JSDoc", "lacks documentation"
- "inconsistent naming", "unclear"
- "no comments", "documentation gap"

---

### Edge Cases & Special Situations

**Multi-Type Issues:**
- Issue spans multiple types → classify as highest priority type (A > B > C)
- Document all aspects in milestone definition

**Discovered Issues:**
- Architectural issue reveals functional bug → Adjust to Type A
- Documentation work reveals missing tests → Add Type A milestone
- Refactoring uncovers race condition → Escalate to Type A

**Classification Uncertainty:**
- Main agent sets confidence level (High/Medium/Low)
- Low confidence → subagent carefully examines and decides
- Document reasoning for classification decision in AGENT-MEMORY

---

## 1) Inputs & Artifacts

- **Issue Source:** Existing `.md` document we use to track issues discovered during testing.
- **Spec & Patterns:** Our **MCP tool spec**, **shared best practice patterns**, and **codebase tooling**.
- **Inspector:** **MCP inspector** (must be built and used by each subagent to replicate and understand bugs).
- **Logbook:** `ISSUE-RESOLUTION-AGENT-MEMORY.md` (read at the start of each agent task; append outcome notes at the end).

---

## 2) Roles

- **Coordinator Agent (Main Agent):**
  - Consolidates issues from CODE-REVIEW-PLAN.md
  - Slices work **per tool** to avoid concurrent conflicts
  - **Suggests initial issue classification** (Type A/B/C) with rationale and confidence level
  - Defines milestones & acceptance criteria appropriate to issue type
  - Assigns tasks to subagents with classification guidance and workflow framework
  - Reviews completion notes, classification decisions, and flags bad practices
  - Learns from subagent classification adjustments to improve future suggestions

- **Subagent (per tool / per issue cluster):**
  - Reads `ISSUE-RESOLUTION-AGENT-MEMORY.md` to understand goals, overlap, and prior lessons
  - Reviews main agent's **suggested classification** and rationale
  - **Examines actual code** to confirm or adjust classification
  - **Documents classification decision** with reasoning in AGENT-MEMORY
  - Follows appropriate workflow for confirmed issue type:
    - **Type A**: MCP inspector replication → TDD → functional fix
    - **Type B**: Code examination → refactoring → regression testing
    - **Type C**: Documentation/style improvements → quality gates
  - Executes **[edit – build – test] repeat** until acceptance criteria met
  - Verifies **no regressions** across all functions of the tool
  - Appends **technical summary** + classification decision + notes to AGENT-MEMORY

---

## 3) High-Level Process

1. **Gather & Normalize Issues**
   - Parse CODE-REVIEW-PLAN.md issue list
   - **Group by tool** → then **cluster by related symptoms**
   - For each cluster, **suggest initial classification** (Type A/B/C) with rationale
   - Define **milestones** with **explicit acceptance criteria** appropriate to issue type

2. **Prioritize & Sequence**
   - Order by **blocking impact**, **cross-tool dependencies**, and **risk of regression**
   - Ensure **no two subagents** touch the **same tool** concurrently
   - Consider classification when sequencing (Type A issues may block Type B refactoring)

3. **Create Subagent Task Packets (Per Tool)**
   - Clear problem statement from CODE-REVIEW-PLAN.md
   - **Suggested classification** with rationale and confidence level
   - **Classification guide** for subagent to confirm or adjust
   - **Workflow framework** for each issue type (A/B/C)
   - Reference to **existing tools**, **MCP spec**, and **shared patterns**
   - **Milestones** and **acceptance criteria** (DoD) appropriate to confirmed type
   - **Quality verification requirements** (gates, inspector, tests)

4. **Execute & Verify**
   - Subagent examines code and **confirms or adjusts classification**
   - Documents classification decision with reasoning
   - Works through milestones following appropriate workflow for type
   - Coordinator verifies acceptance criteria with type-appropriate evidence
   - If gaps found or classification disputed, return to subagent with feedback

5. **Record Outcomes**
   - Subagent appends comprehensive note to `ISSUE-RESOLUTION-AGENT-MEMORY.md`:
     - **Classification decision** (confirmed/adjusted) with reasoning
     - Technical summary, key details, lessons learned
     - Any **bad practice** observed (flag + reason)
     - Links to related fixes that could help future agents
   - Coordinator reviews and incorporates learning for future classifications

---

## 4) Per-Tool Workflow (Subagent Checklist)

### Phase 1: Classification & Setup
- [ ] **Read `ISSUE-RESOLUTION-AGENT-MEMORY.md`** to understand overall goal, progress, and prior lessons
- [ ] **Review suggested classification** from main agent (Type A/B/C) and rationale
- [ ] **Examine actual code** at issue location:
  - Read files and surrounding context
  - Check existing test coverage
  - Identify actual vs expected behavior/structure
- [ ] **Confirm or adjust classification**:
  - If confirming: document why you agree
  - If adjusting: document why and what you discovered
  - Use Decision-Making Workflow if uncertain
- [ ] **Survey codebase for existing best practice patterns** (reuse before creating new)

### Phase 2: Type-Specific Workflow

#### If Type A (Runtime/Functional):
- [ ] **Build & run MCP inspector**
- [ ] **Replicate the issue** using provided or discovered steps
- [ ] **Capture evidence**: logs, screenshots, CLI output showing bug
- [ ] **Write failing test** (TDD) that demonstrates the issue
- [ ] **Plan fix** aligned with MCP spec and modern best practices
- [ ] **Implement fix** following [edit – build – test] repeat
- [ ] **Verify test passes** and issue resolved
- [ ] **Regression test**: Run all tool functions via MCP inspector

#### If Type B (Code Quality/Architecture):
- [ ] **Measure current state**: LOC, complexity, duplication metrics
- [ ] **Plan refactoring approach**:
  - Use Decision-Making Workflow if multiple approaches viable
  - Document approach with pros/cons
- [ ] **Verify existing test coverage** (tests act as safety net)
- [ ] **Refactor code** following [edit – build – test] repeat
- [ ] **Verify all existing tests pass** (regression check)
- [ ] **Measure improvement**: compare metrics before/after
- [ ] **Test all tool functions**: ensure no behavior changes

#### If Type C (Documentation/Style):
- [ ] **Examine current state** of documentation/style
- [ ] **Add documentation or fix style issues**
- [ ] **Run quality gates**: verify no behavior changes
- [ ] **No tests needed** (unless adding missing code examples)
- [ ] **Review for completeness and clarity**

### Phase 3: Quality Verification (All Types)
- [ ] **Run quality gates** (REQUIRED for all types):
  - `pnpm test:run` - All tests pass
  - `pnpm lint` - Zero errors/warnings
  - `pnpm typecheck` - Zero type errors
  - `pnpm check:dead-code` - Zero unused exports
  - `pnpm check:all` - Combined validation
- [ ] **MCP inspector verification** (Type A only, optional for B):
  - Test all tool functions
  - Verify no new issues introduced
  - Capture evidence of success

### Phase 4: Documentation
- [ ] **Document in AGENT-MEMORY**:
  - Classification decision (confirmed/adjusted) with reasoning
  - Technical summary of root cause + solution
  - Metrics/evidence appropriate to issue type
  - Any **bad practice** encountered (flag + rationale)
  - Reusable patterns or notes for future agents
  - Follow-ups or open items
- [ ] **Append results to `ISSUE-RESOLUTION-AGENT-MEMORY.md`** using template

---

## 5) Milestone & Acceptance Criteria Templates

### 5.1 Milestone Definition (Per Issue or Cluster)
- **Milestone ID:** `<tool>-<issue-type>-M#` (e.g., `sections-complexity-M1`, `cache-race-M1`)
- **Problem Summary:** (from CODE-REVIEW-PLAN.md, keep original wording)
- **Suggested Classification:**
  - **Type:** [A/B/C]
  - **Rationale:** [Why this type based on issue description]
  - **Confidence:** [High/Medium/Low]
  - **⚠️ Subagent Action Required:** Confirm or adjust after code examination
- **User/Agent Impact:** (what breaks / misbehaves / is hard to maintain)
- **Current State Metrics** (Type B only):
  - Lines of code, complexity score, duplication instances
- **Change Scope:** Files / modules / interfaces affected
- **Testing Approach:**
  - [ ] Type A: New functional tests required (TDD)
  - [ ] Type B: Regression tests only (existing tests prove refactor safe)
  - [ ] Type C: No tests needed (quality gates sufficient)
- **Constraints:**
  - Must use existing tools in the code base
  - Follow MCP spec and shared best practices
  - Avoid cross-tool changes unless explicitly approved
- **Acceptance Criteria (DoD):**
  - AC1: [Classification confirmed/adjusted with reasoning documented]
  - AC2: [Type-specific criteria - see §5.2]
  - AC3: [Quality gates pass]
  - AC4: [No regressions - all tool functions verified]
- **Evidence Required:**
  - Classification decision document
  - Type-specific evidence (see §5.2)
  - Quality gate outputs
  - Before/after comparison (metrics for Type B, behavior for Type A)
- **Risk Notes / Rollback Plan:** (if applicable)

### 5.2 Type-Specific Acceptance Criteria

#### Type A (Runtime/Functional) — Acceptance Criteria Examples:
- ✅ **Classification Confirmed**: Type A verified after code examination; reasoning documented
- ✅ **Replication**: Issue reproduced in MCP inspector with captured evidence
- ✅ **Test Written**: Failing test demonstrates the bug (TDD approach)
- ✅ **Functional Fix**: Specific behavior now meets spec; test passes
- ✅ **Error Handling**: Edge cases handled per MCP tool spec
- ✅ **Compatibility**: No breaking changes to public interfaces unless documented
- ✅ **Performance**: No measurable regression (>10% runtime/memory)
- ✅ **Security/Robustness**: Input validation and failure modes conform to best practice
- ✅ **Regression Suite**: All tool functions pass tests (automated + MCP inspector)
- ✅ **Quality Gates**: `pnpm check:all` passes with zero issues
- ✅ **Documentation**: AGENT-MEMORY updated with fix details and evidence

#### Type B (Code Quality/Architecture) — Acceptance Criteria Examples:
- ✅ **Classification Confirmed**: Type B verified after code examination; reasoning documented
- ✅ **Metrics Captured**: Before metrics documented (LOC, complexity, duplication)
- ✅ **Refactoring Planned**: Approach documented with pros/cons (Decision-Making Workflow if needed)
- ✅ **Code Improved**: Structure refactored per plan; best practices applied
- ✅ **Metrics Improved**: After metrics show measurable improvement:
  - Functions reduced to ≤50 lines (or target specified)
  - Cyclomatic complexity ≤5 (or target specified)
  - Duplication eliminated or minimized
- ✅ **Behavior Preserved**: All existing tests pass (regression check)
- ✅ **Compatibility**: Public interfaces unchanged; internal structure improved
- ✅ **No New Issues**: All tool functions tested; no new bugs introduced
- ✅ **Quality Gates**: `pnpm check:all` passes with zero issues
- ✅ **Documentation**: AGENT-MEMORY updated with before/after comparison

#### Type C (Documentation/Style) — Acceptance Criteria Examples:
- ✅ **Classification Confirmed**: Type C verified after examination; reasoning documented
- ✅ **Documentation Added**: JSDoc, inline comments, or API docs added per requirements
- ✅ **Style Improved**: Naming, formatting, or organization corrected
- ✅ **Completeness**: All public functions/interfaces documented with:
  - `@param` descriptions
  - `@returns` descriptions
  - `@example` usage demonstrations
  - Edge cases and constraints noted
- ✅ **Behavior Unchanged**: No code logic modified; pure documentation/style
- ✅ **Quality Gates**: `pnpm check:all` passes (verifies no behavior change)
- ✅ **Clarity**: Documentation reviewed for accuracy and helpfulness
- ✅ **Documentation**: AGENT-MEMORY updated with documentation scope

---

## 6) Subagent Task Packet Template (Per Tool)

**Tool:** `<tool-name>`
**Owner (Subagent):** `<agent-id>`
**Related Issues:** `<list from CODE-REVIEW-PLAN.md with line numbers>`

---

### 1) Problem Statement
**From CODE-REVIEW-PLAN.md:**
```
[Keep original wording - optimized for Claude Code comprehension]
**Description:** ...
**Impact:** ...
**Recommendation:** ...
**Files Affected:** ...
```

---

### 2) Suggested Issue Classification

**⚠️ IMPORTANT: You must confirm or adjust this classification after examining the code**

- **Suggested Type:** [A/B/C]
- **Rationale:** [Why main agent suggests this type based on issue description]
- **Confidence Level:** [High/Medium/Low]
- **Key Indicators:** [Specific phrases or patterns that led to this classification]

**Your Action Required:**
1. Read the classification guide below
2. Examine the actual code and context
3. Confirm or adjust the classification with documented reasoning
4. Document your decision in AGENT-MEMORY

---

### 3) Issue Type Classification Guide

#### Type A: Runtime/Functional Issues
**When to Classify as Type A:**
- Observable behavior is incorrect or produces errors
- Functional impact on users or system operation
- Security vulnerabilities or data corruption risks
- Race conditions, deadlocks, or concurrency issues

**Workflow for Type A:**
1. Build & run MCP inspector
2. Replicate issue with captured evidence
3. Write failing test (TDD approach)
4. Implement fix
5. Verify test passes
6. Regression test all tool functions

**Evidence Required:**
- MCP inspector session showing bug
- Test code demonstrating issue
- Fix validation with passing tests

**Examples:** Cache race conditions, incorrect boundary handling, MCP error violations

---

#### Type B: Code Quality/Architecture Issues
**When to Classify as Type B:**
- Code works but structure is problematic
- Maintainability, readability, or extensibility concerns
- Design principle violations (SOLID, DRY, etc.)
- Complexity, duplication, or anti-patterns

**Workflow for Type B:**
1. Examine code and measure metrics (LOC, complexity)
2. Plan refactoring (use Decision-Making Workflow if multiple approaches)
3. Verify existing test coverage (safety net)
4. Refactor with continuous test verification
5. Measure improvement
6. Test all tool functions (no behavior changes)

**Evidence Required:**
- Before/after metrics comparison
- Refactoring plan with rationale
- Regression test results

**Examples:** High complexity, God Object patterns, large functions, SOLID violations

---

#### Type C: Documentation/Style Issues
**When to Classify as Type C:**
- No code behavior change
- Documentation gaps or inconsistencies
- Style, naming, or organizational improvements
- Comments or API documentation

**Workflow for Type C:**
1. Examine current documentation state
2. Add/improve documentation or style
3. Run quality gates (verify no behavior change)
4. No tests needed (unless adding code examples)

**Evidence Required:**
- Before/after documentation comparison
- Quality gate results
- Clarity/completeness verification

**Examples:** Missing JSDoc, inconsistent naming, incomplete API docs

---

#### Edge Cases
- **Multi-type issues:** Classify as highest priority (A > B > C), document all aspects
- **Discovered during work:** If architectural issue (Type B) reveals functional bug → adjust to Type A
- **Classification uncertainty:** Use Decision-Making Workflow; document reasoning thoroughly

---

### 4) Requirements & Constraints

**Must Follow:**
- Use all existing tools in the codebase (reuse before creating new)
- Follow modern best practices for TypeScript/Node.js
- Follow our MCP spec and shared patterns
- Maintain backward compatibility unless explicitly approved
- Do **not** introduce new issues; test all tool functions

**Quality Gates (ALL types must pass):**
```bash
pnpm test:run        # All tests pass
pnpm lint            # Zero errors/warnings
pnpm typecheck       # Zero type errors
pnpm check:dead-code # Zero unused exports
pnpm check:all       # Combined validation
```

---

### 5) Type-Specific Investigation Steps

**If You Confirm Type A:**
```
1. Build MCP inspector: `pnpm inspector:dev`
2. Launch and connect using provided URL
3. Replicate issue:
   - Step 1: [specific steps]
   - Step 2: [specific steps]
   - Expected: [expected behavior]
   - Actual: [actual behavior]
4. Capture evidence: logs, screenshots, error messages
5. Examine code for root cause
```

**If You Confirm Type B:**
```
1. Measure current state:
   - Count lines: `wc -l <file>`
   - Identify complexity: examine decision points, nesting
   - Find duplication: search for similar patterns
2. Examine existing tests:
   - What test coverage exists?
   - Will tests catch behavior changes?
3. Survey codebase for patterns:
   - How do other modules handle this?
   - What existing utilities can be reused?
```

**If You Confirm Type C:**
```
1. Examine current documentation:
   - What's missing?
   - What's unclear or incomplete?
2. Review public API surface:
   - Which functions need JSDoc?
   - What examples would help users?
3. Check style consistency:
   - Compare with other modules
   - Identify inconsistent patterns
```

---

### 6) Milestones & Acceptance Criteria

**M1: Classification Confirmation**
- **AC1:** Code examined at issue location
- **AC2:** Classification confirmed or adjusted with documented reasoning
- **AC3:** Appropriate workflow selected based on confirmed type
- **Evidence:** Classification decision in AGENT-MEMORY

**M2-M#:** [Issue-specific milestones using §5.1 template]
- [Tailored to confirmed issue type]
- [Type-specific acceptance criteria from §5.2]

---

### 7) Execution Loop

**Type A (Functional):**
```
[replicate → write test → fix → verify test passes → regression test] repeat
```

**Type B (Architectural):**
```
[measure → plan → refactor → verify tests pass → measure improvement] repeat
```

**Type C (Documentation):**
```
[examine → document → verify quality gates] repeat
```

**All Types:**
- Run quality gates after every change
- Test all tool functions before milestone completion
- Document progress and decisions continuously

---

### 8) Deliverables

**Required for All Types:**
- [ ] Classification decision documented with reasoning
- [ ] Patches/diffs for all changes
- [ ] Quality gate outputs (all passing)
- [ ] AGENT-MEMORY note appended (see §7 template)

**Type-Specific Deliverables:**
- **Type A:** Test code, MCP inspector evidence, functional verification
- **Type B:** Metrics comparison, refactoring plan, regression test results
- **Type C:** Documentation comparison, completeness verification

---

### 9) References

- **Issue Source:** CODE-REVIEW-PLAN.md (lines X-Y)
- **Classification Guide:** See §3 above and §0.5 in main workflow
- **Acceptance Criteria:** See §5.2 for type-specific examples
- **AGENT-MEMORY Template:** See §7 for documentation format
- **Decision-Making Workflow:** See top of document for uncertainty resolution

---

## 7) `ISSUE-RESOLUTION-AGENT-MEMORY.md` Note Template (Append at Bottom)

```md
---

## <DATE> — <Tool> — <Milestone IDs> — <Subagent>

### Classification Decision
**Main Agent Suggested:** Type [A/B/C] — [rationale]
**Subagent Decision:** [Confirmed Type A/B/C] or [Adjusted to Type A/B/C]
**Reasoning:**
- Code examination revealed: [what you found]
- Key factors that influenced decision: [list factors]
- Confidence in decision: [High/Medium/Low]
- [If adjusted] Why main agent classification was incorrect: [explain]

---

### Summary (Technical)

**Issue Type:** [A: Runtime/Functional | B: Architecture/Quality | C: Documentation/Style]

**Root Cause:**
- [For Type A] Functional problem: [describe bug/issue]
- [For Type B] Structural problem: [describe complexity/anti-pattern]
- [For Type C] Documentation gap: [describe missing/incorrect docs]

**Solution Approach:**
- [For Type A] Fix description and test strategy:
- [For Type B] Refactoring approach (with Decision-Making Workflow if used):
- [For Type C] Documentation improvements:

**Files Modified:**
- [list files with brief description of changes]

**Interfaces Touched:**
- Public API changes: [list or state "none"]
- Internal structure changes: [list]

---

### Evidence & Verification

**Type-Specific Evidence:**
- [For Type A] MCP inspector session: [describe replication and fix verification]
- [For Type A] Test code: [file paths and test descriptions]
- [For Type B] Metrics before/after:
  - Lines of code: X → Y
  - Cyclomatic complexity: X → Y
  - Duplication instances: X → Y
- [For Type B] Refactoring plan: [summarize or link to Decision-Making doc]
- [For Type C] Documentation before/after: [describe additions/improvements]

**Quality Gates:**
```bash
pnpm test:run        ✅ [X tests passed]
pnpm lint            ✅ [0 errors, 0 warnings]
pnpm typecheck       ✅ [0 type errors]
pnpm check:dead-code ✅ [0 unused exports]
pnpm check:all       ✅ [all checks passed]
```

---

### Acceptance Criteria Results

**M1: Classification Confirmation**
- AC1: ✅ Code examined — [file paths]
- AC2: ✅ Classification [confirmed/adjusted] — see decision above
- AC3: ✅ Workflow selected — Type [A/B/C] workflow followed

**M2: [Issue-Specific Milestone]**
- AC1: [✅/❌] [specific criterion] — [evidence]
- AC2: [✅/❌] [specific criterion] — [evidence]
- AC3: [✅/❌] [specific criterion] — [evidence]

[Continue for all milestones]

---

### Non-Regression Checks (All Tool Functions)

**Functions Tested:**
1. [Function 1]: ✅ Pass — [brief test description]
2. [Function 2]: ✅ Pass — [brief test description]
3. [Function 3]: ✅ Pass — [brief test description]

**Automated Tests:**
- Unit tests: [X/Y passed]
- Integration tests: [X/Y passed]

**Manual Testing (Type A):**
- MCP inspector verification: [describe all functions tested]

**Summary:**
- ✅ No new issues introduced
- ❌ [If any issues found] List issues and resolutions

---

### Shared Patterns / Tips for Future Agents

**Reusable Patterns:**
- [Pattern name]: [description and usage]
- [Code snippet if applicable]

**Gotchas Discovered:**
- [Issue/trap]: [how to avoid]
- [Dependency/constraint]: [what to watch for]

**Decision-Making Notes:**
- [If Decision-Making Workflow used] Approaches considered: [list]
- Selected approach: [name] because [rationale]
- Rejected approaches and why: [list with reasons]

**Performance/Stability Notes:**
- [Any performance implications of changes]
- [Stability considerations]

---

### Bad Practice Observed (Flag + Reason)

**Pattern Found:** `[describe the bad pattern/code]`
**Why Problematic:** [explain impact on maintainability/performance/security]
**Suggested Replacement:** `[describe best practice approach]`
**Reference:** [if applicable, link to documentation or examples]

[Repeat for additional bad practices found]

---

### Learning & Improvement

**What Worked Well:**
- [Technique/approach that was effective]
- [Tool/method that helped]

**What Was Challenging:**
- [Difficulty encountered]
- [How it was overcome]

**Recommendations for Workflow Improvement:**
- [Suggested enhancement to this workflow]
- [Classification guidance that could be clearer]

---

### Follow-ups / Open Items

**Completed:**
- ✅ [Item completed during this work]

**Remaining:**
- [ ] [Item that needs future attention]
- [ ] [Related issue discovered but out of scope]

**Blocked:**
- [Item blocked by external dependency] — [reason]

---

**Completion Status:** [✅ Complete | ⚠️ Partially Complete | ❌ Blocked]
**Time Invested:** [approximate time spent]
**Coordination Notes:** [any cross-tool dependencies or handoffs needed]

```
