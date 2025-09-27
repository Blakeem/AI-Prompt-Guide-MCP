# ISSUE-RESOLUTION-AGENT-MEMORY.md

This file tracks all issue resolution work performed by subagents. Each agent appends their work summary using the template below.

## Purpose

- **Knowledge Sharing:** Capture lessons learned, patterns discovered, and bad practices identified
- **Classification Learning:** Track main agent classification accuracy and subagent adjustments
- **Reusable Solutions:** Document approaches that can be reused for similar issues
- **Workflow Improvement:** Identify opportunities to enhance the resolution process

---

## Template for Agents (Copy and fill in at bottom of file)

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

---

<!-- Agents will append their findings below this line -->
