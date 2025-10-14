# Coordinator Task System - Integration Analysis & Implementation Plan

**Date:** 2025-10-14
**Status:** Ready for Implementation
**Assessment:** ✅ Existing architecture is well-suited for clean integration

---

## Executive Summary

### Integration Readiness: ✅ EXCELLENT (9/10)

Your existing task system architecture is **remarkably well-designed** for this dual-system approach. Key strengths:

1. **Mode detection already exists** - Both `start_task` and `complete_task` distinguish sequential vs ad-hoc
2. **Workflow enrichment is separated** - `enrichTaskWithWorkflow()` and `enrichTaskWithMainWorkflow()` are reusable
3. **Shared utilities are clean** - Task operations are already modular and well-organized
4. **Type safety is strong** - AddressingError system makes validation consistent

**Bottom Line:** This can be implemented cleanly WITHOUT major refactoring. Method sharing is straightforward.

---

## Current Architecture Analysis

### ✅ What's Already Perfect

#### 1. Mode Detection Pattern (Already Exists!)

**Current Implementation** (start-task.ts:72-96, complete-task.ts:54-80):

```typescript
// Parse document parameter to detect mode
const documentParam = args['document'];

if (documentParam.includes('#')) {
  // Ad-hoc mode: "/doc.md#task-slug"
  mode = 'adhoc';
  docPath = parts[0];
  taskSlug = parts[1];
} else {
  // Sequential mode: "/doc.md"
  mode = 'sequential';
  docPath = documentParam;
  taskSlug = undefined;
}
```

**What This Means:**
- ✅ Mode detection logic is already implemented
- ✅ Works for both start and complete operations
- ✅ Just need to ADD validation rules per tool type

#### 2. Workflow Enrichment System (Ready to Reuse!)

**Current Functions** (workflow-prompt-utilities.ts):

```typescript
// Task-specific workflow (both systems can use)
enrichTaskWithWorkflow(taskData, taskContent)
  → Returns: taskData with { workflow?: WorkflowPrompt }

// Main workflow from first task (coordinator ONLY)
enrichTaskWithMainWorkflow(manager, document, taskData)
  → Returns: taskData with { mainWorkflow?: WorkflowPrompt }
```

**What This Means:**
- ✅ Subagent tools: Call `enrichTaskWithWorkflow()` only
- ✅ Coordinator tools: Call both functions
- ✅ Zero duplication needed

#### 3. Shared Task Utilities (Perfect for Both Systems)

**Current Shared Functions:**

```typescript
// Task identification (both systems)
getTaskHeadings(document, tasksSection)

// Sequential mode (coordinator only)
findNextAvailableTask(manager, document, excludeTaskSlug)

// Reference loading (both systems)
enrichTaskWithReferences(manager, docPath, taskSlug, content)

// Metadata extraction (both systems)
extractTaskMetadata(content)
```

**What This Means:**
- ✅ Core operations already abstracted
- ✅ Can be called by both tool sets
- ✅ No code duplication

---

## Integration Strategy: Shared Methods with Validation Wrappers

### Recommended Approach: **Validation Layer Pattern**

**Philosophy:**
- Share ALL core methods between systems
- Add **thin validation wrappers** for each tool type
- Different validation rules, same underlying operations

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOOL LAYER (6 Tools)                        │
├─────────────────────────┬───────────────────────────────────────┤
│   Subagent Tools (3)    │     Coordinator Tools (3)             │
│  - subagent_task        │  - coordinator_task                   │
│  - start_subagent_task  │  - start_coordinator_task             │
│  - complete_subagent_task│ - complete_coordinator_task          │
│                         │                                       │
│  Validation Rules:      │  Validation Rules:                    │
│  • REQUIRE #slug        │  • PROHIBIT #slug                     │
│  • MUST be /docs/**     │  • MUST be /coordinator/active.md     │
│  • Ad-hoc only          │  • Sequential only                    │
│  • Workflow optional    │  • Main-Workflow required (first task)│
└─────────────────────────┴───────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              SHARED VALIDATION LAYER (NEW)                      │
│  src/shared/task-validation.ts                                  │
│                                                                 │
│  validateSubagentTaskAccess(documentPath, taskSlug?)            │
│  validateCoordinatorTaskAccess(documentPath, taskSlug?)         │
│  validateMainWorkflowRequired(isFirstTask, hasMainWorkflow)     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              CORE OPERATIONS LAYER (REUSE 100%)                 │
│  src/shared/task-operations.ts (NEW - extract from current)    │
│  src/shared/task-view-utilities.ts (EXISTING)                  │
│  src/shared/workflow-prompt-utilities.ts (EXISTING)            │
│                                                                 │
│  Shared Methods (both systems call these):                     │
│  • createTaskOperation(manager, addresses, title, content)      │
│  • editTaskOperation(manager, addresses, content)               │
│  • listTasksOperation(manager, addresses, statusFilter)         │
│  • findNextAvailableTask(manager, document, excludeTaskSlug)    │
│  • enrichTaskWithWorkflow(taskData, content)                    │
│  • enrichTaskWithMainWorkflow(manager, document, taskData)      │
│  • enrichTaskWithReferences(manager, path, slug, content)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Extract Shared Core Operations (Refactoring)

**Goal:** Pull out reusable logic from current `task.ts`, `start-task.ts`, `complete-task.ts`

**Create:** `src/shared/task-operations.ts`

```typescript
/**
 * Core task operations shared between subagent and coordinator systems
 * These functions are system-agnostic and called by both tool sets
 */

// Shared create operation
export async function createTaskOperation(
  manager: DocumentManager,
  documentPath: string,
  title: string,
  content: string,
  referenceSlug?: string
): Promise<{ slug: string; title: string }> {
  const taskSlug = titleToSlug(title);
  const taskContent = `### ${title}\n${content}`;

  const operation = referenceSlug != null ? 'insert_after' : 'append_child';
  const targetSection = referenceSlug ?? 'tasks';

  await ensureTasksSection(manager, documentPath);
  await performSectionEdit(manager, documentPath, targetSection, taskContent, operation, title);

  return { slug: taskSlug, title };
}

// Shared edit operation
export async function editTaskOperation(
  manager: DocumentManager,
  documentPath: string,
  taskSlug: string,
  content: string
): Promise<void> {
  await performSectionEdit(manager, documentPath, taskSlug, content, 'replace');
}

// Shared list operation
export async function listTasksOperation(
  manager: DocumentManager,
  documentPath: string,
  statusFilter?: string
): Promise<{
  tasks: TaskViewData[];
  next_task?: { slug: string; title: string; link?: string };
}> {
  // Implementation extracted from current task.ts listTasks()
  // ... existing logic ...
}

// Shared complete operation
export async function completeTaskOperation(
  manager: DocumentManager,
  documentPath: string,
  taskSlug: string,
  note: string
): Promise<{
  completed: { slug: string; title: string; note: string; completed_date: string };
}> {
  // Implementation extracted from current complete-task.ts
  // ... existing logic ...
}
```

**Effort:** Medium (1-2 hours) - Extraction, not rewrite
**Risk:** Low - Tests already exist for current behavior

---

### Phase 2: Create Validation Layer

**Create:** `src/shared/task-validation.ts`

```typescript
/**
 * Validation rules specific to subagent vs coordinator task systems
 */

import { AddressingError } from './addressing-system.js';

/**
 * Validate subagent task access (ad-hoc only)
 * Rules:
 * - MUST include #slug (ad-hoc mode required)
 * - MUST be within /docs/ namespace
 * - ERROR if sequential mode attempted
 */
export function validateSubagentTaskAccess(
  documentPath: string,
  taskSlug?: string
): void {
  // Rule 1: Must have task slug (ad-hoc only)
  if (taskSlug == null || taskSlug === '') {
    throw new AddressingError(
      'Subagent tasks require #slug (ad-hoc mode). Use coordinator tools for sequential work.',
      'SUBAGENT_REQUIRES_SLUG',
      {
        suggestion: 'Format: /docs/path.md#task-slug',
        coordinator_alternative: 'Use start_coordinator_task for sequential work'
      }
    );
  }

  // Rule 2: Must be in /docs/ namespace
  if (documentPath.startsWith('/coordinator/')) {
    throw new AddressingError(
      'Subagent tools cannot access /coordinator/ namespace. Use coordinator tools.',
      'INVALID_NAMESPACE_FOR_SUBAGENT',
      { documentPath }
    );
  }

  // Additional validation: Ensure within /docs/ (could be relaxed if needed)
  // if (!documentPath.startsWith('/docs/')) {
  //   throw new AddressingError('Subagent tasks must be in /docs/ namespace', ...);
  // }
}

/**
 * Validate coordinator task access (sequential only)
 * Rules:
 * - MUST NOT include #slug (sequential mode required)
 * - MUST be /coordinator/active.md specifically
 * - ERROR if ad-hoc mode attempted
 */
export function validateCoordinatorTaskAccess(
  documentPath: string,
  taskSlug?: string
): void {
  // Rule 1: Must NOT have task slug (sequential only)
  if (taskSlug != null && taskSlug !== '') {
    throw new AddressingError(
      'Coordinator tasks are sequential only. Do not specify #slug.',
      'COORDINATOR_NO_SLUG_ALLOWED',
      {
        suggestion: 'Format: /coordinator/active.md (no #slug)',
        task_reordering: 'To change task order, reorder tasks in the document'
      }
    );
  }

  // Rule 2: Must be /coordinator/active.md specifically
  if (documentPath !== '/coordinator/active.md') {
    throw new AddressingError(
      'Coordinator tools only work with /coordinator/active.md',
      'INVALID_COORDINATOR_PATH',
      {
        documentPath,
        expected: '/coordinator/active.md'
      }
    );
  }
}

/**
 * Validate Main-Workflow requirement for coordinator first task
 */
export function validateMainWorkflowRequired(
  isFirstTask: boolean,
  hasMainWorkflow: boolean,
  taskTitle: string
): void {
  if (isFirstTask && !hasMainWorkflow) {
    throw new AddressingError(
      'First coordinator task MUST have Main-Workflow field',
      'MAIN_WORKFLOW_REQUIRED',
      {
        task: taskTitle,
        suggestion: 'Add "Main-Workflow: workflow-name" to task metadata',
        available_workflows: [
          'tdd-incremental-orchestration',
          'manual-verification-orchestration',
          // ... list others
        ]
      }
    );
  }
}
```

**Effort:** Small (30 minutes)
**Risk:** Very Low - Just validation, no data operations

---

### Phase 3: Implement Coordinator Tools (New)

**Create:**
1. `src/tools/implementations/coordinator-task.ts`
2. `src/tools/implementations/start-coordinator-task.ts`
3. `src/tools/implementations/complete-coordinator-task.ts`
4. `src/tools/schemas/coordinator-task-schemas.ts`

**Example:** `start-coordinator-task.ts`

```typescript
/**
 * Start work on coordinator task (sequential mode ONLY)
 *
 * Restrictions:
 * - Must be /coordinator/active.md
 * - No #slug allowed (sequential only)
 * - Injects Main-Workflow from first task
 *
 * Shares core operations with subagent_task system via task-operations.ts
 */

import { validateCoordinatorTaskAccess } from '../../shared/task-validation.js';
import { enrichTaskWithWorkflow, enrichTaskWithMainWorkflow } from '../../shared/workflow-prompt-utilities.js';
import { enrichTaskWithReferences, findNextAvailableTask } from '../../shared/task-view-utilities.js';

export async function startCoordinatorTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<StartTaskResponse> {
  try {
    // INPUT VALIDATION
    const documentPath = ToolIntegration.validateStringParameter(args['document'], 'document');

    // Parse for #slug detection
    let docPath: string;
    let taskSlug: string | undefined;

    if (documentPath.includes('#')) {
      const parts = documentPath.split('#');
      docPath = parts[0] ?? documentPath;
      taskSlug = parts[1];
    } else {
      docPath = documentPath;
      taskSlug = undefined;
    }

    // COORDINATOR-SPECIFIC VALIDATION
    validateCoordinatorTaskAccess(docPath, taskSlug);

    // CORE OPERATION (shared with subagent)
    const document = await manager.getDocument(docPath);
    if (document == null) {
      throw new DocumentNotFoundError(docPath);
    }

    // Find next task (sequential mode - SHARED utility)
    const nextTask = await findNextAvailableTask(manager, document, undefined);
    if (nextTask == null) {
      throw new AddressingError('No available tasks in coordinator document', 'NO_TASKS');
    }

    const targetTaskSlug = nextTask.slug;
    const taskContent = await manager.getSectionContent(docPath, targetTaskSlug);

    // WORKFLOW ENRICHMENT (shared utilities)
    const baseTaskData = { slug: targetTaskSlug, title: nextTask.title, content: taskContent, status: nextTask.status };

    // Task-specific workflow (SHARED)
    const withWorkflow = enrichTaskWithWorkflow(baseTaskData, taskContent);

    // Main workflow (COORDINATOR ONLY)
    const withMainWorkflow = await enrichTaskWithMainWorkflow(manager, document, withWorkflow);

    // Reference loading (SHARED)
    const enriched = await enrichTaskWithReferences(manager, docPath, targetTaskSlug, taskContent);

    // RESPONSE
    return {
      mode: 'sequential',
      document: docPath,
      task: {
        ...enriched,
        ...(withMainWorkflow.workflow && { workflow: withMainWorkflow.workflow }),
        ...(withMainWorkflow.mainWorkflow && { main_workflow: withMainWorkflow.mainWorkflow })
      }
    };

  } catch (error) {
    // Standard error handling
    throw error;
  }
}
```

**Effort:** Medium (2-3 hours for all 3 tools)
**Risk:** Low - Reusing proven patterns

---

### Phase 4: Rename & Restrict Subagent Tools (Breaking Change)

**Rename:**
1. `task.ts` → `subagent-task.ts` (tool name: `subagent_task`)
2. `start-task.ts` → `start-subagent-task.ts` (tool name: `start_subagent_task`)
3. `complete-task.ts` → `complete-subagent-task.ts` (tool name: `complete_subagent_task`)

**Add Validation to Each:**

```typescript
// Example: start-subagent-task.ts
export async function startSubagentTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<StartTaskResponse> {
  try {
    // INPUT VALIDATION (same as before)
    const documentParam = args['document'];

    // Parse for mode detection
    let docPath: string;
    let taskSlug: string | undefined;

    if (documentParam.includes('#')) {
      const parts = documentParam.split('#');
      docPath = parts[0];
      taskSlug = parts[1];
    } else {
      docPath = documentParam;
      taskSlug = undefined;
    }

    // ⭐ NEW: SUBAGENT-SPECIFIC VALIDATION
    validateSubagentTaskAccess(docPath, taskSlug);

    // REST OF LOGIC UNCHANGED (existing code)
    // ... current start-task.ts logic ...

  } catch (error) {
    throw error;
  }
}
```

**Effort:** Small (30 minutes)
**Risk:** Medium - Breaking change for users, but clear error messages

---

### Phase 5: Add Auto-Archive for Coordinator

**Create:** `src/shared/coordinator-archive.ts`

```typescript
/**
 * Auto-archive coordinator tasks when all complete
 */

import { DocumentManager } from '../document-manager.js';

export async function checkAndArchiveIfComplete(
  manager: DocumentManager,
  documentPath: string
): Promise<{ archived: boolean; archived_to?: string } | null> {
  // Get all tasks
  const document = await manager.getDocument(documentPath);
  if (document == null) return null;

  const tasksSection = document.headings.find(h => h.slug === 'tasks');
  if (tasksSection == null) return null;

  const taskHeadings = await getTaskHeadings(document, tasksSection);
  const allTasks = await Promise.all(
    taskHeadings.map(async h => {
      const content = await manager.getSectionContent(documentPath, h.slug) ?? '';
      const status = extractTaskField(content, 'Status') ?? 'pending';
      return status;
    })
  );

  // Check if ALL tasks are completed
  const allComplete = allTasks.every(status => status === 'completed');

  if (!allComplete) {
    return null; // Not ready to archive
  }

  // Archive to /archived/coordinator/active-{timestamp}.md
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19); // 2025-10-14T15-30-45
  const archivePath = `/archived/coordinator/active-${timestamp}.md`;

  // Use existing archive functionality
  const result = await manager.archiveDocument(documentPath);

  return {
    archived: true,
    archived_to: result.archivePath
  };
}
```

**Integration Point:** Call in `complete_coordinator_task()` after marking task complete

**Effort:** Small (1 hour)
**Risk:** Low - Reusing existing archive infrastructure

---

## Testing Strategy

### Unit Tests Required

**Phase 1-2 (Shared Operations):**
```typescript
// src/shared/__tests__/task-operations.test.ts
describe('createTaskOperation', () => {
  it('should create task with reference slug');
  it('should create task without reference slug (append)');
  it('should auto-create Tasks section if missing');
});

// src/shared/__tests__/task-validation.test.ts
describe('validateSubagentTaskAccess', () => {
  it('should require #slug for subagent tools');
  it('should reject /coordinator/ namespace');
  it('should provide helpful error messages');
});

describe('validateCoordinatorTaskAccess', () => {
  it('should reject #slug for coordinator tools');
  it('should require exact path /coordinator/active.md');
  it('should provide helpful error messages');
});
```

**Phase 3 (Coordinator Tools):**
```typescript
// src/tools/implementations/__tests__/coordinator-task.test.ts
describe('start_coordinator_task', () => {
  it('should find next pending task in sequential order');
  it('should inject Main-Workflow from first task');
  it('should inject task-specific Workflow if present');
  it('should load hierarchical references');
  it('should reject #slug parameter');
  it('should reject non-coordinator paths');
});

describe('complete_coordinator_task', () => {
  it('should mark task complete and return next task');
  it('should NOT inject Main-Workflow in next task');
  it('should auto-archive when all tasks complete');
});
```

**Phase 4 (Renamed Subagent Tools):**
```typescript
// Update existing tests to use new names
// Add validation tests for #slug requirement
```

### MCP Inspector Testing

**Test Scenarios:**

1. **Subagent Ad-Hoc Flow:**
   ```bash
   # Create tasks in knowledge graph
   subagent_task --document=/docs/api/auth.md --operations=[...]

   # Start specific task (MUST have #slug)
   start_subagent_task --document=/docs/api/auth.md#implement-jwt

   # Complete specific task
   complete_subagent_task --document=/docs/api/auth.md#implement-jwt --note="..."
   ```

2. **Coordinator Sequential Flow:**
   ```bash
   # Create coordinator tasks
   coordinator_task --operations=[...] (auto-creates /coordinator/active.md)

   # Start next task (NO #slug allowed)
   start_coordinator_task  # Returns first pending task + Main-Workflow

   # Complete and get next
   complete_coordinator_task --note="..." # Returns next task (no Main-Workflow)

   # Final complete triggers auto-archive
   complete_coordinator_task --note="..." # Archives to /archived/coordinator/
   ```

3. **Cross-Tool Validation:**
   ```bash
   # Should ERROR: Subagent tool on coordinator path
   start_subagent_task --document=/coordinator/active.md#task
   → Error: "Subagent tools cannot access /coordinator/ namespace"

   # Should ERROR: Coordinator tool with #slug
   start_coordinator_task --document=/coordinator/active.md#task
   → Error: "Coordinator tasks are sequential only. Do not specify #slug"

   # Should ERROR: Subagent without #slug
   start_subagent_task --document=/docs/api/auth.md
   → Error: "Subagent tasks require #slug (ad-hoc mode)"
   ```

---

## Migration Guide for Users

### Breaking Changes (Phase 4)

**Tool Renames:**
- `task` → `subagent_task`
- `start_task` → `start_subagent_task`
- `complete_task` → `complete_subagent_task`

**New Requirement:** Subagent tools now require #slug

**Migration:**
```typescript
// OLD (will break after Phase 4)
start_task({ document: '/docs/api/auth.md' }); // Sequential mode

// NEW - Use coordinator for sequential
start_coordinator_task({ document: '/coordinator/active.md' });

// OLD (still works)
start_task({ document: '/docs/api/auth.md#task-slug' }); // Ad-hoc

// NEW (renamed, same behavior)
start_subagent_task({ document: '/docs/api/auth.md#task-slug' });
```

### Error Messages Guide

**Error:** "Subagent tasks require #slug (ad-hoc mode)"
- **Fix:** Add #task-slug to document parameter
- **Alternative:** Use `start_coordinator_task` for sequential work

**Error:** "Coordinator tasks are sequential only. Do not specify #slug"
- **Fix:** Remove #slug from document parameter
- **Note:** To change task order, reorder tasks in document

**Error:** "First coordinator task MUST have Main-Workflow field"
- **Fix:** Add `Main-Workflow: workflow-name` to first task metadata

---

## Timeline Estimate

| Phase | Effort | Risk | Duration |
|-------|--------|------|----------|
| 1. Extract Shared Ops | Medium | Low | 1-2 hours |
| 2. Validation Layer | Small | Very Low | 30 min |
| 3. Coordinator Tools | Medium | Low | 2-3 hours |
| 4. Rename Subagent | Small | Medium | 30 min |
| 5. Auto-Archive | Small | Low | 1 hour |
| **Testing** | Medium | - | 2-3 hours |
| **Documentation** | Small | - | 1 hour |
| **TOTAL** | - | - | **8-11 hours** |

---

## Recommendations

### ✅ DO This Way

1. **Implement in order (Phase 1-5)** - Each phase builds on previous
2. **Test after each phase** - Catch issues early
3. **Use validation layer pattern** - Clean separation, shared methods
4. **Write comprehensive tests** - Both systems share code, need coverage
5. **Deploy coordinator first (Phase 3)** - Non-breaking, get feedback
6. **Then rename subagent (Phase 4)** - Breaking change last

### ❌ DON'T Do These

1. **Don't duplicate core operations** - Use shared layer
2. **Don't use conditional flags** - Use separate validation functions
3. **Don't mix namespaces** - Keep /docs/ and /coordinator/ separate
4. **Don't skip tests** - Shared code needs comprehensive coverage
5. **Don't rush Phase 4** - Breaking change needs clear communication

### 🎯 Best Practice: Overload Pattern?

**Question:** Should we use TypeScript overloads?

**Answer:** **No, not recommended**

**Why:**
- Validation happens at runtime (MCP args are `Record<string, unknown>`)
- TypeScript overloads help with compile-time, not runtime validation
- Better to have **explicit separate functions** with clear names
- Easier to document and test

**Instead:**
- Use validation functions: `validateSubagentTaskAccess()` vs `validateCoordinatorTaskAccess()`
- Share core operations: `createTaskOperation()`, `editTaskOperation()`
- Keep tool implementations focused and clear

---

## Success Metrics

### Code Quality
- ✅ All tests pass (`pnpm test:run`)
- ✅ Zero lint errors (`pnpm lint`)
- ✅ Zero type errors (`pnpm typecheck`)
- ✅ Zero dead code (`pnpm check:dead-code`)

### Functionality
- ✅ Subagent tools enforce ad-hoc mode (#slug required)
- ✅ Coordinator tools enforce sequential mode (no #slug)
- ✅ Main-Workflow injects on `start_coordinator_task`
- ✅ Auto-archive works when all coordinator tasks complete
- ✅ Error messages are helpful and actionable

### User Experience
- ✅ Clear when to use coordinator vs subagent
- ✅ No confusion about workflow types
- ✅ Persistence across compression works
- ✅ Audit trail accessible and useful

---

## Conclusion

### Final Assessment: ✅ READY FOR IMPLEMENTATION

**Key Takeaways:**
1. **Existing architecture is excellent** - Mode detection, workflow enrichment, shared utilities all ready
2. **Method sharing is straightforward** - Validation layer + shared operations pattern
3. **No major refactoring needed** - Extract, add validation, implement new tools
4. **Risk is low** - Incremental phases, comprehensive testing, clear errors
5. **Timeline is reasonable** - 8-11 hours for complete implementation

**Recommended Next Step:**
Start with **Phase 1 (Extract Shared Operations)** - This sets up the foundation and can be done without breaking changes.

---

## Questions for Clarification

Before starting implementation:

1. **Namespace Restriction:** Should subagent tools be restricted to `/docs/**` ONLY, or allow any path except `/coordinator/`?
   - Proposal recommendation: `/docs/**` only
   - More flexible: Any path except `/coordinator/`

2. **Auto-Archive Trigger:** Should coordinator auto-archive happen:
   - Immediately on last task completion? (Recommended)
   - On explicit "archive" operation?
   - User choice per session?

3. **Migration Timeline:** When should Phase 4 (breaking rename) happen?
   - Same release as Phase 3 (coordinator tools)?
   - Separate release with deprecation period?
   - Immediate (no deprecation)?

4. **Main-Workflow Validation:** Should we validate workflow name exists?
   - Strict: Error if workflow not found
   - Permissive: Warning only (current behavior)
