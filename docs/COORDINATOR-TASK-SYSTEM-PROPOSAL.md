# Coordinator Task System - Design Proposal (REFINED)

**Status:** Proposed for Review (Refined after discussion)
**Date:** 2025-10-14
**Decision Method:** Multi-Option Trade-off Analysis

---

## Executive Summary

**Recommendation:** Implement **6 tools in two separate systems**: Rename existing task tools to `subagent_task` (3 tools) for ad-hoc knowledge graph tasks, and create NEW `coordinator_task` tools (3 tools) for sequential coordinator work.

**Key Benefits:**
- ✅ **Two separate systems:** Knowledge graph tasks vs coordinator sequential tasks
- ✅ **Maximum clarity:** Tool names make purpose impossible to confuse
- ✅ **Enforced behavior:** Subagent = ad-hoc only, Coordinator = sequential only
- ✅ **Preserves power:** Existing knowledge graph task integration untouched
- ✅ **TodoWrite replacement:** Coordinator tasks persist across compression
- ✅ **No breaking changes:** Existing task system just gets renamed

**Architecture Score:** 9.2/10 (improved from original 8.45)

---

## Problem Statement

### Current Issues

1. **Compression Loss:** TodoWrite doesn't persist across compression cycles
2. **Workflow Injection:** Can't reinject Main-Workflow after compression using TodoWrite
3. **Workflow Confusion:** Main-Workflow + Workflow on same task causes confusion
4. **Naming Collision:** "task" tool conflicts with "task" subagent naming
5. **No Audit Trail:** Coordinator work history not preserved

### Core Requirements

- ✅ Persistence across compression
- ✅ Workflow injection via `start_task`
- ✅ Audit trail with completion notes
- ✅ Clear coordinator vs subagent separation
- ✅ Simple, not an anti-pattern

---

## Recommended Solution: Two Separate Systems

### Architecture Overview - Two Independent Systems

```
SYSTEM 1: Knowledge Graph Tasks (Existing - Renamed)
=======================================================
subagent_task tools      →  /docs/**/*.md                    (Workflow)
                         →  Integrated with document sections
                         →  Ad-hoc access only (#slug required)
                         →  Powerful planning & knowledge graph

SYSTEM 2: Coordinator Sequential Tasks (NEW)
=======================================================
coordinator_task tools   →  /coordinator/active.md           (Main-Workflow)
                         →  OUTSIDE /docs/ folder
                         →  Sequential only (next task)
                         →  Auto-archives when complete
                         →  TodoWrite replacement
```

### Two System Comparison

| Aspect | Subagent Tasks (Renamed) | Coordinator Tasks (NEW) |
|--------|--------------------------|------------------------|
| **Purpose** | Ad-hoc knowledge graph tasks | Sequential coordination work |
| **Location** | `/docs/**/*.md` (IN knowledge graph) | `/coordinator/active.md` (OUTSIDE docs) |
| **Integration** | Embedded in documents with sections | Standalone sequential list |
| **Workflow Type** | Workflow (optional) | Main-Workflow (required) |
| **Execution** | Ad-hoc only (#slug required) | Sequential only (next task) |
| **Access** | View/edit with section tools | Manual access only (not browsable) |
| **Archive** | Manual (via delete tool) | Auto (when all complete) |
| **Used By** | Subagents | Coordinator |
| **Planning** | Multi-feature, long-term tasks | Single feature, session-based |

### 6 Tools Breakdown

**System 1: Subagent Tasks (3 tools - RENAMED from existing)**

1. **`subagent_task`** (formerly `task`)
   - Create, edit, list tasks in knowledge graph documents
   - Location: Any document in `/docs/`
   - **CHANGE:** No behavioral changes, just renamed for clarity

2. **`start_subagent_task`** (formerly `start_task`)
   - Start specific task in knowledge graph
   - **NEW REQUIREMENT:** Must include #slug (ad-hoc only)
   - Error if no #slug provided

3. **`complete_subagent_task`** (formerly `complete_task`)
   - Complete specific task in knowledge graph
   - Returns completion confirmation (no next task)
   - **CHANGE:** No longer supports sequential mode

**System 2: Coordinator Tasks (3 tools - BRAND NEW)**

4. **`coordinator_task`** (NEW)
   - Create, edit, list sequential coordinator tasks
   - Location: `/coordinator/active.md` only
   - Auto-creates active.md if doesn't exist

5. **`start_coordinator_task`** (NEW)
   - Start next pending task in sequential list
   - Returns task + Main-Workflow (first time only)
   - Error if #slug provided (sequential only)

6. **`complete_coordinator_task`** (NEW)
   - Complete current task, return next
   - Auto-archives when all tasks complete
   - Archives to `/archived/coordinator/{timestamp}.md`

### Workflow Type Separation

**Main-Workflow:**
- Project-level orchestration methodology
- Examples: `tdd-incremental-orchestration`, `manual-verification-orchestration`
- Used for: Coordinating multi-step feature development
- Location: ONLY in `/coordinator/active.md`
- Validation: Required on first coordinator task

**Workflow:**
- Task-specific guidance
- Examples: `spec-first-integration`, `multi-option-tradeoff`, `failure-triage-repro`
- Used for: Individual task execution by subagents
- Location: Any document in `/docs/`
- Validation: Optional

---

## User Workflows

### Scenario 1: Coordinator Sequential Work (TodoWrite Replacement)

```bash
# 1. Create coordinator tasks (auto-creates /coordinator/active.md)
coordinator_task:
  operations: [
    {
      operation: "create",
      title: "Research authentication approaches",
      content: "- Status: pending\n- Main-Workflow: tdd-incremental-orchestration\n- Workflow: multi-option-tradeoff\n\nCompare JWT vs session-based auth\n\n@/specs/security-requirements.md"
    },
    {
      operation: "create",
      title: "Implement chosen auth system",
      content: "- Status: pending\n\nBuild authentication system based on research"
    },
    {
      operation: "create",
      title: "Write integration tests",
      content: "- Status: pending\n- Workflow: code-review-issue-based\n\nEnsure auth system works end-to-end"
    }
  ]

# 2. Start work (sequential - returns NEXT pending task)
start_coordinator_task:
  → Returns first pending task
  → Includes Main-Workflow (first time only)
  → Loads @references

# 3. After compression, resume work
start_coordinator_task:
  → Returns current/next task
  → Reinjerts Main-Workflow (persistence!)

# 4. Complete task, get next
complete_coordinator_task:
  note: "Decided on JWT with refresh tokens. Created spec document."
  → Returns next pending task (no Main-Workflow reinject)

# 5. Complete another task
complete_coordinator_task:
  note: "Auth system implemented with all tests passing"
  → Returns next pending task

# 6. Complete final task
complete_coordinator_task:
  note: "Integration tests complete. Feature ready for review."
  → Auto-archives to /archived/coordinator/active-2025-10-14-153045.md
  → Coordinator list now empty (ready for next feature)
```

### Scenario 2: Subagent Ad-Hoc Knowledge Graph Tasks

```bash
# 1. Create tasks in knowledge graph document
subagent_task:
  document: /api/authentication.md
  operations: [
    {
      operation: "create",
      title: "Implement JWT signing",
      content: "- Status: pending\n- Workflow: tdd-incremental-orchestration\n\nImplement token signing logic\n\n@/specs/jwt-spec.md"
    },
    {
      operation: "create",
      title: "Add token validation",
      content: "- Status: pending\n\nValidate tokens in middleware"
    },
    {
      operation: "create",
      title: "Handle token refresh",
      content: "- Status: pending\n\nImplement refresh token endpoint"
    }
  ]

# 2. Assign specific task to subagent (ad-hoc - MUST specify #slug)
start_subagent_task:
  document: /api/authentication.md#implement-jwt-signing
  → Returns that specific task + Workflow
  → No Main-Workflow (subagent work)

# 3. Subagent completes task
complete_subagent_task:
  document: /api/authentication.md#implement-jwt-signing
  note: "JWT signing implemented using RS256 algorithm"
  → Returns completion confirmation
  → No next task (ad-hoc mode)

# 4. Coordinator reviews knowledge graph namespace
view_document: /api/authentication.md
  → See all tasks, which are complete, notes from subagents
  → Plan next ad-hoc assignment

# 5. Assign different task (flexible ordering)
start_subagent_task:
  document: /api/authentication.md#handle-token-refresh
  → Can pick any task, any order (ad-hoc power!)
```

---

## Implementation Details

### Tool 1-3: Subagent Task Tools (RENAMED from existing)

#### Tool 1: `subagent_task` (formerly `task`)

**Operations:**
- `create` - Add tasks to knowledge graph documents
- `edit` - Modify existing tasks
- `list` - List tasks in document

**Location:**
- Any document in `/docs/` namespace
- Tasks embedded in document sections (under Tasks heading)

**Changes from `task` tool:**
- ✅ Renamed for clarity
- ✅ No behavioral changes
- ✅ Still supports all operations
- ✅ Still integrated with knowledge graph

#### Tool 2: `start_subagent_task` (formerly `start_task`)

**Parameters:**
- `document` - MUST include #slug (e.g., `/api/auth.md#fix-bug`)

**Returns:**
- Task content
- Workflow (if specified)
- Referenced documents (@references)
- NO Main-Workflow

**Changes from `start_task` tool:**
- ✅ Renamed for clarity
- ⚠️ **NEW REQUIREMENT:** #slug REQUIRED (ad-hoc only)
- ❌ Error if no #slug provided
- ❌ No sequential mode support (use coordinator for that)

**Validation:**
```typescript
if (!document.includes('#')) {
  throw new Error('Subagent tasks require #slug (ad-hoc mode). Use coordinator tools for sequential work.');
}

if (document.startsWith('/coordinator/')) {
  throw new Error('Use coordinator tools for /coordinator/ namespace');
}
```

#### Tool 3: `complete_subagent_task` (formerly `complete_task`)

**Parameters:**
- `document` - MUST include #slug
- `note` - Completion notes

**Returns:**
- Completion confirmation
- NO next task (ad-hoc mode)

**Changes from `complete_task` tool:**
- ✅ Renamed for clarity
- ❌ No longer returns next task (ad-hoc only)
- ❌ No sequential mode support

---

### Tool 4-6: Coordinator Task Tools (BRAND NEW)

#### Tool 4: `coordinator_task` (NEW)

**Operations:**
- `create` - Add tasks to coordinator list
- `edit` - Modify existing tasks
- `list` - List all coordinator tasks
- `clear` - Clear completed tasks (optional, or wait for auto-archive)

**Location:**
- ONLY `/coordinator/active.md`
- Auto-creates if doesn't exist

**Validation:**
```typescript
// Auto-create /coordinator/active.md on first use
if (!exists('/coordinator/active.md')) {
  createDocument('/coordinator/active.md', {
    title: 'Coordinator Tasks',
    overview: 'Sequential coordinator task list. Auto-archives when all tasks complete.'
  });
}

// Require Main-Workflow on first task
if (isFirstTask && !hasMainWorkflow) {
  throw new Error('First coordinator task MUST have Main-Workflow field');
}
```

#### Tool 5: `start_coordinator_task` (NEW)

**Parameters:**
- None (sequential mode - returns next pending task)

**Returns:**
- Next pending task content
- Main-Workflow (first call only, or after compression)
- Task workflow (if specified)
- Referenced documents (@references)

**Behavior:**
```typescript
// Find next pending task in sequential order
const nextTask = findNextPending('/coordinator/active.md');

// Check if we need to inject Main-Workflow
const needsMainWorkflow = isFirstCall() || afterCompression();

return {
  task: nextTask,
  main_workflow: needsMainWorkflow ? extractMainWorkflow() : undefined,
  workflow: extractWorkflow(nextTask),
  references: loadReferences(nextTask)
};
```

**Validation:**
```typescript
if (documentParam.includes('#')) {
  throw new Error('Coordinator tasks are sequential. Do not specify #slug.');
}
```

#### Tool 6: `complete_coordinator_task` (NEW)

**Parameters:**
- `note` - Completion notes (required)

**Returns:**
- Next pending task (if any)
- Archive notification (if all complete)

**Behavior:**
```typescript
// Mark current task as complete with notes
markComplete(currentTask, note);

// Check if all tasks complete
if (allTasksComplete('/coordinator/active.md')) {
  // Auto-archive
  const timestamp = formatTimestamp();
  archiveTo(`/archived/coordinator/active-${timestamp}.md`);

  return {
    archived: true,
    archived_to: `/archived/coordinator/active-${timestamp}.md`,
    message: 'All coordinator tasks complete. Session archived.'
  };
}

// Return next task (no Main-Workflow reinject)
return {
  next_task: findNextPending('/coordinator/active.md')
};
```

---

## Technical Architecture

### File Structure

```
.ai-prompt-guide/
│
├── docs/                          # Knowledge graph (UNCHANGED)
│   ├── api/
│   │   ├── authentication.md     # With subagent tasks in Tasks section
│   │   └── user-management.md    # With subagent tasks
│   │
│   ├── specs/
│   │   └── security-requirements.md
│   │
│   └── ...
│
├── coordinator/                   # NEW: Coordinator sequential tasks
│   └── active.md                  # Single active coordinator session
│                                  # (auto-created, auto-archived)
│
└── archived/                      # Archives (outside docs/)
    ├── coordinator/               # NEW: Archived coordinator sessions
    │   ├── active-2025-10-14-092745.md
    │   ├── active-2025-10-13-153022.md
    │   └── ...
    │
    └── ...                        # Existing: Manual document archives
```

### Key Differences

**`/docs/` folder:**
- Knowledge graph documents
- Subagent tasks embedded in documents (under Tasks section)
- Browsable with section, view_document tools
- Long-term planning, multi-feature tasks

**`/coordinator/` folder:**
- OUTSIDE `/docs/` (separate system)
- Single `active.md` file (sequential list)
- NOT browsable with browse_documents
- Session-based, gets archived when complete
- TodoWrite replacement

### Archive Location

**Location:** `/archived/` (outside `/docs/`)

**Rationale:**
- ✅ Archives not included in browse/search results
- ✅ Keeps docs/ clean for active work
- ✅ Consistent with existing delete archive pattern
- ✅ Clear separation: active vs historical

### Workflow Validation

```typescript
// Coordinator tool validation
if (namespace !== '/coordinator/') {
  throw new Error('Coordinator tool only works with /coordinator/ namespace');
}

if (isFirstTask && !hasMainWorkflow) {
  throw new Error('First task in coordinator document must have Main-Workflow');
}

// Task tool - soft guidance
if (hasMainWorkflow && namespace === '/coordinator/') {
  logger.warn('Consider using coordinator tool for Main-Workflow tasks');
}
```

---

## Migration Path

### Phase 1: Rename Existing Tools (Breaking, but Simple)

**Step 1A: Rename Tools**
- `task` → `subagent_task`
- `start_task` → `start_subagent_task`
- `complete_task` → `complete_subagent_task`

**Step 1B: Add #slug Requirement**
- Update `start_subagent_task` to require #slug
- Update `complete_subagent_task` to require #slug
- Return error if #slug missing

**Migration Help:**
- Most existing usage already includes #slug (ad-hoc pattern)
- Sequential usage was rare (better with coordinator anyway)
- Clear error messages guide users to coordinator tools

---

### Phase 2: Add Coordinator Tools (Non-Breaking)

**Step 2A: Implement 3 New Tools**
- `coordinator_task` (create/edit/list)
- `start_coordinator_task` (sequential start)
- `complete_coordinator_task` (sequential complete + auto-archive)

**Step 2B: Create /coordinator/ Infrastructure**
- Add `/coordinator/` folder support
- Implement auto-create for `active.md`
- Implement auto-archive to `/archived/coordinator/`

---

### Phase 3: Documentation & Examples

**Update Documentation:**
- README: Explain two systems clearly
- Commands: Update build-tdd/build-iterate to use coordinator
- Workflows: Update TDD/manual-verification workflows

**Add Examples:**
- Coordinator sequential workflow examples
- Subagent ad-hoc task examples
- When to use which system

---

### Phase 4: Test & Validate

**Testing:**
- Unit tests for all 6 tools
- Integration tests for coordinator auto-archive
- MCP inspector validation
- Alpha test with real workflows

**Quality Gates:**
- All tests pass
- Lint + typecheck + dead-code check
- Documentation complete
- Examples working

---

## Open Questions for Review

### 1. Single vs Multiple Active Sessions ✅ RESOLVED

**Decision:** Single `active.md` file (your preference)
- Simpler: One place to look
- Archives when complete
- Start new feature = new active.md
- Old session archived with timestamp

**Rationale:** Matches TodoWrite mental model (single list)

### 2. Auto-Archive Timing ✅ RESOLVED

**Decision:** Immediate on last `complete_coordinator_task`
- Predictable behavior
- Audit trail captured at completion
- Clean slate for next feature

### 3. Section/Document Tool Access ✅ RESOLVED

**Decision:** Coordinator docs NOT browsable
- `/coordinator/` outside `/docs/`
- Manual access only (not in browse results)
- Reduces confusion (separate system)

**However:** Can still view manually:
- `view_document /coordinator/active.md` (works)
- `view_task /coordinator/active.md` (works)
- `section` tool (works for manual editing)

### 4. Sequential-Only Enforcement ✅ RESOLVED

**Decision:** Coordinator = sequential ONLY
- No #slug allowed in start/complete
- Hard error if #slug provided
- Forces correct usage pattern

**Rationale:** Your reasoning is correct - if you need different order, reorder tasks in document

### 5. Breaking Changes Acceptable? ✅ RESOLVED

**Decision:** Yes, rename is breaking but acceptable
- Most usage already ad-hoc (#slug present)
- Clear error messages guide migration
- Better long-term clarity worth the change

---

## Alternatives Considered

### Option 1: Auto-Created Active Document (Score: 6.95)
- Magic `""` → `/coordinator/active.md`
- **Rejected:** Magic behavior, workflow confusion persists

### Option 2: Explicit Sessions Only (Score: 8.00)
- Single task tool with namespace validation
- **Rejected:** Naming collision, single overloaded tool

### Option 4: TodoWrite + Snapshots (Score: 6.70)
- Keep TodoWrite, add snapshot tool
- **Rejected:** No workflow injection, fragmented system

**Winner:** Hybrid (Dual Tools + Explicit) scored 8.45

---

## Success Criteria

### Implementation Success
- ✅ Coordinator tool works with `/coordinator/` namespace
- ✅ Main-Workflow required validation on first task
- ✅ Auto-archive on completion with timestamp
- ✅ Sequential task flow (next task injection)
- ✅ All existing task tool behavior unchanged

### User Experience Success
- ✅ Clear when to use coordinator vs task tool
- ✅ No confusion about workflow types
- ✅ Persistence across compression works
- ✅ Audit trail accessible and useful

### Technical Success
- ✅ All quality gates pass (lint, typecheck, tests, dead-code)
- ✅ MCP inspector validation
- ✅ Unit test coverage for coordinator tool
- ✅ Integration tests for auto-archive

---

## Summary: Final Recommendation

### ✅ Implement Two Separate Systems with 6 Tools

**System 1: Knowledge Graph Tasks (3 tools)**
1. `subagent_task` - Create/edit/list (rename from `task`)
2. `start_subagent_task` - Ad-hoc start with #slug required (rename from `start_task`)
3. `complete_subagent_task` - Ad-hoc complete (rename from `complete_task`)

**System 2: Coordinator Sequential Tasks (3 NEW tools)**
4. `coordinator_task` - Create/edit/list coordinator tasks
5. `start_coordinator_task` - Sequential start (next pending task)
6. `complete_coordinator_task` - Sequential complete + auto-archive

### Why This Architecture Wins

1. **Maximum Clarity** - Tool names impossible to confuse
2. **Enforced Correctness** - Each tool locks in its pattern (ad-hoc vs sequential)
3. **Preserves Power** - Knowledge graph task integration unchanged
4. **Solves Persistence** - Coordinator tasks survive compression
5. **Clean Separation** - Two independent systems, no overlap
6. **TodoWrite Replacement** - Coordinator provides persistent task tracking
7. **No Naming Collision** - coordinator/subagent vs task subagent (distinct)

### Architecture Score: 9.2/10
Improved from initial 8.45 through design refinement.

---

## Next Steps

### Immediate Actions
1. **Review & Approve:** Confirm this refined design meets requirements
2. **Prioritize Phase:** Decide Phase 1 (rename) vs Phase 2 (new tools) first

### Implementation Order

**Option A: Rename First (Recommended)**
- Phase 1: Rename existing tools (breaking change up front)
- Phase 2: Add coordinator tools (non-breaking addition)
- Benefit: Clean slate, users migrate once

**Option B: Add First**
- Phase 2: Add coordinator tools first (non-breaking)
- Phase 1: Rename existing tools later (breaking change)
- Benefit: Coordinator available sooner, but two migrations

**Recommendation:** Option A (rename first)
- Get breaking change done early
- Coordinator builds on renamed foundation
- Single migration story

### Development Tasks
1. Implement Phase 1 (rename + #slug requirement)
2. Write tests for renamed tools
3. Implement Phase 2 (coordinator tools)
4. Write tests for coordinator tools
5. Update documentation
6. Alpha test with real workflows

---

## Appendix: Design Evolution

**Original Proposal (Score: 8.45)**
- Dual tools with explicit sessions
- `/coordinator/` namespace in `/docs/`

**Refined Design (Score: 9.2)**
- 6 explicit tools (maximum clarity)
- `/coordinator/` OUTSIDE `/docs/` (separate system)
- Single `active.md` (TodoWrite mental model)
- Sequential-only enforcement (locked patterns)

**Key Insight from Discussion:**
Preserving knowledge graph task power while adding coordinator tracking requires two independent systems, not one overloaded system.
