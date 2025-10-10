# Workflow Prompt Injection - Implementation Plan

## Overview

Integrate workflow prompts directly into task content to provide deterministic, context-aware process guidance. This creates a three-tier system where tasks define **what** to do, spec docs explain **how** to do it, and workflow prompts provide the **process** to follow.

The system uses **tool choice as a continuity signal** to determine session state and inject appropriate workflow context without explicit session tracking.

## Goals

1. **Anchored Discovery** - Task names and workflow fields link back to prompts, increasing prompt usage
2. **Deterministic Injection** - Prompts appear automatically based on tool choice, not manual lookup
3. **Session Resilience** - Main workflows re-injected on session resumption via tool signals
4. **Process Guidance** - LLMs receive structured workflows as part of task context
5. **Flexible Application** - Support both project-level and task-specific prompt injection
6. **Zero Breaking Changes** - Backward compatible with existing task system

## System Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Prompt Guide MCP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 TASK SERIES (What to do)                                   │
│     ┌─ First Task: "Design API Architecture"                   │
│     │  └─ Main-Workflow: spec-first-integration  ◄─────┐       │
│     │  └─ Workflow: multi-option-tradeoff        ◄──┐  │       │
│     │                                                 │  │       │
│     ├─ Next Task: "Implement API Endpoints"          │  │       │
│     │  └─ Workflow: simplicity-gate              ◄───┤  │       │
│     │                                                 │  │       │
│     └─ Final Task: "Deploy to Production"            │  │       │
│        └─ Workflow: guardrailed-rollout         ◄────┘  │       │
│                                                            │       │
│  📖 SPEC DOCS (How to do it)                              │       │
│     └─ @/api/specs.md                                     │       │
│     └─ Technical details, constraints, requirements       │       │
│                                                            │       │
│  🔄 TASK WORKFLOW (Process for this task) ────────────────┘       │
│     └─ Multi-Option Trade-off Protocol                           │
│     └─ Decision-making for single task                           │
│                                                                   │
│  🎯 MAIN WORKFLOW (Process for entire series) ────────────────────┘
│     └─ Spec-First Integration Protocol                           │
│     └─ Overarching methodology for all tasks                     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Current State Analysis

### Task Structure (Current)
```markdown
### Initialize Database Schema

- Status: pending
- Priority: high
→ @/specs/database-schema.md

Set up the database schema following the specification in the linked document.
```

### Workflow Prompts (Current)
- Loaded from `.ai-prompt-guide/prompts/*.wfp.md`
- Exposed via MCP prompt resources (`prompts/list`, `prompts/get`)
- Accessed manually by LLMs when needed
- No automatic linkage to tasks

### Reference Loading (Current)
- Tasks already support `@/path/to/doc.md` references
- `ReferenceExtractor` extracts references from content
- `ReferenceLoader` loads hierarchical content with depth control
- `enrichTaskWithReferences()` processes references in task content

## Proposed Design

### 1. Two Workflow Types

The system supports two distinct workflow types to address different scoping needs:

#### A. Main-Workflow (Project-Level)
**Purpose:** Overarching methodology for entire task series
**Scope:** Applies to all tasks in the project
**Placement:** First task in task series only
**Injection:** Provided on session start/resumption via `continue_task`

```markdown
### Design API Architecture

- Status: pending
- Priority: high
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff
→ @/api/requirements.md

Design the overall API architecture following spec-first principles.
Use trade-off analysis to evaluate architectural options.
```

#### B. Workflow (Task-Specific)
**Purpose:** Decision-making process for individual task
**Scope:** Applies to single task only
**Placement:** Any task that needs process guidance
**Injection:** Provided when starting task or moving to next task

```markdown
### Choose Database Technology

- Status: pending
- Priority: high
- Workflow: multi-option-tradeoff

Evaluate database options (PostgreSQL, MongoDB, DynamoDB) based on
access patterns, consistency needs, and operational overhead.
```

### 2. Task Workflow Linking Syntax

**Syntax Options Comparison:**

| Syntax | Example | Pros | Cons |
|--------|---------|------|------|
| **Workflow fields** | `- Main-Workflow: spec-first`<br>`- Workflow: multi-option` | ✅ Clear metadata<br>✅ Easy parsing<br>✅ Consistent with Status/Priority<br>✅ Two distinct scopes | ❌ Adds two new fields |
| Scoped reference | `→ @main-workflow:spec-first`<br>`→ @workflow:multi-option` | ✅ Consistent with doc refs | ❌ Ambiguous with docs<br>❌ Less discoverable |
| Tag notation | `- Tags: #main:spec-first, #local:multi` | ✅ Flexible tagging | ❌ Overloaded semantics<br>❌ Less explicit |

**Recommendation:** Use `Main-Workflow:` and `Workflow:` metadata fields for clarity and scope distinction.

### 3. Three-Tool Architecture & Continuity Signals

**Tool choice serves as an implicit continuity signal**, eliminating need for explicit session tracking:

#### A. `view_task` - Passive Inspection (NO workflow injection)
**Purpose:** Browse, review, plan, edit tasks
**Use Cases:**
- "Show me all pending tasks"
- "Let me review this task before editing"
- "What tasks are blocked?"

**Response:** Task data WITHOUT workflow injection
**Signal:** Inspection intent, not work intent

```typescript
interface ViewTaskResponse {
  document: string;
  tasks: Array<{
    slug: string;
    title: string;
    content: string;
    status: string;
    priority: string;
    workflow_name?: string;       // Name only, no content
    main_workflow_name?: string;  // Name only, no content
    has_workflow: boolean;
    referenced_documents?: HierarchicalContent[];
  }>;
  summary: {
    total_tasks: number;
    tasks_with_workflows: number;
    tasks_with_main_workflow: number;
  };
}
```

#### B. `continue_task` - Work Initiation (NEW - FULL workflow injection)
**Purpose:** Signal "I'm starting work on this task" (new session or post-compression)
**Use Cases:**
- "I want to work on task #3" (fresh start)
- "Resume work on authentication refactor" (after context compression)
- "Start the next pending task"

**Injects:**
- Main workflow (from first task in series) - ALWAYS if present
- Task-specific workflow (from current task) - if present
- Referenced documents (@references)

**Response:** Full task enrichment with both workflows

```typescript
interface ContinueTaskResponse {
  document: string;
  task: {
    slug: string;
    title: string;
    content: string;
    status: string;
    priority: string;

    // FULL workflow injection
    main_workflow?: {
      name: string;
      description: string;
      content: string;           // FULL prompt content
      whenToUse: string[];
    };

    workflow?: {
      name: string;
      description: string;
      content: string;           // FULL prompt content
      whenToUse: string[];
    };

    referenced_documents?: HierarchicalContent[];
    full_path: string;
  };
}
```

**Continuity Signal:** "New context, provide full orientation"

#### C. `complete_task` - Work Continuation (Task workflow ONLY)
**Purpose:** Finish current task, transition to next
**Use Cases:**
- "I finished this task, what's next?"
- "Mark authentication complete, move to testing"

**Injects:**
- Task-specific workflow (from next task) - if present
- Does NOT inject main workflow (already in context)

**Response:** Next task with task-specific workflow only

```typescript
interface CompleteTaskResult {
  completed_task: {
    slug: string;
    title: string;
    previous_status: string;
    new_status: 'completed';
  };

  next_task?: {
    slug: string;
    title: string;
    status: string;
    content: string;

    // Task workflow ONLY (no main workflow - already in context)
    workflow?: {
      name: string;
      description: string;
      content: string;
      whenToUse: string[];
    };

    referenced_documents?: HierarchicalContent[];
  };
}
```

**Continuity Signal:** "Continuing session, already have main workflow"

### 4. Continuity Signal Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Session Lifecycle                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NEW SESSION or POST-COMPRESSION                           │
│  ↓                                                          │
│  continue_task("design-api-architecture")                  │
│  ├─ Injects: Main workflow (spec-first-integration)        │
│  ├─ Injects: Task workflow (multi-option-tradeoff)         │
│  └─ Injects: Referenced documents                          │
│                                                             │
│  WORKING IN SAME CONTEXT                                   │
│  ↓                                                          │
│  complete_task("design-api-architecture")                  │
│  ├─ Marks task completed                                   │
│  ├─ Returns: Next task info                                │
│  ├─ Injects: Next task workflow ONLY (simplicity-gate)     │
│  └─ Does NOT inject: Main workflow (already have it)       │
│                                                             │
│  ↓                                                          │
│  complete_task("implement-api-endpoints")                  │
│  ├─ Marks task completed                                   │
│  ├─ Returns: Next task info                                │
│  ├─ Injects: Next task workflow ONLY (guardrailed-rollout) │
│  └─ Does NOT inject: Main workflow (already have it)       │
│                                                             │
│  [CONTEXT COMPRESSION or NEW SESSION]                      │
│  ↓                                                          │
│  continue_task("deploy-to-production")                     │
│  ├─ Injects: Main workflow (spec-first-integration) ◄──────┤
│  ├─ Injects: Task workflow (guardrailed-rollout)           │
│  └─ FULL CONTEXT RESTORED                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight:** Tool choice implicitly signals whether full context is needed:
- `continue_task` → "Give me everything (new/resumed session)"
- `complete_task` → "Just what's new (continuing session)"
- `view_task` → "Just browsing (no workflow needed)"

### 5. Finding the Main Workflow

When `continue_task` is called, the system must locate the main workflow:

```typescript
/**
 * Find the first task in the task series
 * This is where Main-Workflow is defined
 */
async function findFirstTask(
  document: CachedDocument,
  tasksSection: HeadingInfo
): Promise<HeadingInfo | null> {
  const taskHeadings = await getTaskHeadings(document, tasksSection);
  return taskHeadings[0] ?? null;
}

/**
 * Extract main workflow name from first task
 */
async function extractMainWorkflowName(
  manager: DocumentManager,
  documentPath: string,
  firstTaskSlug: string
): Promise<string | null> {
  const content = await manager.getSectionContent(documentPath, firstTaskSlug);
  if (content == null) return null;

  return extractTaskField(content, 'Main-Workflow');
}
```

### 6. Prompt Resolution Logic

```typescript
// New utility: src/shared/workflow-prompt-utilities.ts

import { getWorkflowPrompt, type WorkflowPrompt } from '../prompts/workflow-prompts.js';
import { extractTaskField } from './task-view-utilities.js';
import { getGlobalLogger } from '../utils/logger.js';

const logger = getGlobalLogger();

/**
 * Extract workflow prompt name from task content
 */
export function extractWorkflowName(content: string): string | null {
  return extractTaskField(content, 'Workflow');
}

/**
 * Extract main workflow prompt name from task content
 */
export function extractMainWorkflowName(content: string): string | null {
  return extractTaskField(content, 'Main-Workflow');
}

/**
 * Resolve and load workflow prompt for a task
 */
export function resolveWorkflowPrompt(
  workflowName: string
): WorkflowPrompt | null {
  try {
    return getWorkflowPrompt(workflowName) ?? null;
  } catch {
    return null;
  }
}

/**
 * Enrich task with task-specific workflow (if specified)
 */
export function enrichTaskWithWorkflow(
  taskData: TaskViewData,
  taskContent: string
): TaskViewData & { workflow?: WorkflowPrompt } {
  const workflowName = extractWorkflowName(taskContent);

  if (workflowName == null || workflowName === '') {
    return taskData;
  }

  const workflow = resolveWorkflowPrompt(workflowName);

  if (workflow == null) {
    logger.warn('Workflow prompt not found', {
      workflowName,
      taskSlug: taskData.slug
    });
    return taskData;
  }

  return {
    ...taskData,
    workflow
  };
}

/**
 * Enrich task with main workflow from first task in series
 */
export async function enrichTaskWithMainWorkflow(
  manager: DocumentManager,
  document: CachedDocument,
  taskData: TaskViewData
): Promise<TaskViewData & { mainWorkflow?: WorkflowPrompt }> {

  // Find tasks section
  const tasksSection = document.headings.find(h =>
    h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
  );

  if (tasksSection == null) {
    return taskData;
  }

  // Find first task
  const { getTaskHeadings } = await import('./task-utilities.js');
  const taskHeadings = await getTaskHeadings(document, tasksSection);
  const firstTask = taskHeadings[0];

  if (firstTask == null) {
    return taskData;
  }

  // Get first task content
  const firstTaskContent = await manager.getSectionContent(
    document.metadata.path,
    firstTask.slug
  );

  if (firstTaskContent == null) {
    return taskData;
  }

  // Extract main workflow name
  const mainWorkflowName = extractMainWorkflowName(firstTaskContent);

  if (mainWorkflowName == null || mainWorkflowName === '') {
    return taskData;
  }

  // Resolve main workflow
  const mainWorkflow = resolveWorkflowPrompt(mainWorkflowName);

  if (mainWorkflow == null) {
    logger.warn('Main workflow prompt not found', {
      mainWorkflowName,
      firstTaskSlug: firstTask.slug
    });
    return taskData;
  }

  return {
    ...taskData,
    mainWorkflow: mainWorkflow
  };
}
```

### 7. Tool Integration Points

#### A. `view_task.ts` - Passive Inspection (Updated)
```typescript
export async function viewTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<ViewTaskResponse> {
  // Existing task loading logic...

  const enrichedTask = await enrichTaskWithReferences(
    manager,
    addresses.document.path,
    taskAddr.slug,
    content,
    heading,
    taskAddr
  );

  // Format WITHOUT full workflow content
  const taskData: ViewTaskResponse['tasks'][0] = {
    slug: enrichedTask.slug,
    title: enrichedTask.title,
    content: enrichedTask.content,
    status: enrichedTask.status,
    priority: enrichedTask.priority ?? 'medium',

    // Include workflow NAMES only (not content)
    workflow_name: extractWorkflowName(content) ?? undefined,
    main_workflow_name: extractMainWorkflowName(content) ?? undefined,
    has_workflow: extractWorkflowName(content) != null,

    referenced_documents: enrichedTask.referencedDocuments
  };

  return { document: addresses.document.path, tasks: [taskData], summary };
}
```

#### B. `continue_task.ts` - Work Initiation (NEW TOOL)
```typescript
// New file: src/tools/implementations/continue-task.ts

export async function continueTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<ContinueTaskResponse> {

  // Validate and parse addresses
  const { addresses } = ToolIntegration.validateAndParse({
    document: args['document'] as string,
    task: args['task'] as string
  });

  // Get document
  const document = await manager.getDocument(addresses.document.path);
  if (document == null) {
    throw new DocumentNotFoundError(addresses.document.path);
  }

  // Get task content
  const taskContent = await manager.getSectionContent(
    addresses.document.path,
    addresses.task.slug
  ) ?? '';

  const heading = document.headings.find(h => h.slug === addresses.task.slug);

  // Enrich with references
  let enrichedTask = await enrichTaskWithReferences(
    manager,
    addresses.document.path,
    addresses.task.slug,
    taskContent,
    heading,
    addresses.task
  );

  // INJECT: Task-specific workflow
  enrichedTask = enrichTaskWithWorkflow(enrichedTask, taskContent);

  // INJECT: Main workflow from first task
  enrichedTask = await enrichTaskWithMainWorkflow(manager, document, enrichedTask);

  return {
    document: addresses.document.path,
    task: {
      slug: enrichedTask.slug,
      title: enrichedTask.title,
      content: enrichedTask.content,
      status: enrichedTask.status,
      priority: enrichedTask.priority ?? 'medium',
      full_path: ToolIntegration.formatTaskPath(addresses.task),

      // FULL workflow injection
      ...(enrichedTask.mainWorkflow != null && {
        main_workflow: {
          name: enrichedTask.mainWorkflow.name,
          description: enrichedTask.mainWorkflow.description,
          content: enrichedTask.mainWorkflow.content,
          whenToUse: enrichedTask.mainWorkflow.whenToUse
        }
      }),

      ...(enrichedTask.workflow != null && {
        workflow: {
          name: enrichedTask.workflow.name,
          description: enrichedTask.workflow.description,
          content: enrichedTask.workflow.content,
          whenToUse: enrichedTask.workflow.whenToUse
        }
      }),

      ...(enrichedTask.referencedDocuments != null && {
        referenced_documents: enrichedTask.referencedDocuments
      })
    }
  };
}
```

#### C. `complete-task.ts` - Work Continuation (Updated)
```typescript
export async function completeTask(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<CompleteTaskResult> {
  // Existing completion logic...
  // Mark task as completed...

  // Find next task
  const nextTask = await findNextAvailableTask(manager, document, taskSlug);

  if (nextTask != null) {
    // Get next task content
    const nextContent = await manager.getSectionContent(
      documentPath,
      nextTask.slug
    ) ?? '';

    // Enrich with task-specific workflow ONLY (no main workflow)
    const enrichedNext = enrichTaskWithWorkflow(nextTask, nextContent);

    return {
      completed_task: {
        slug: taskSlug,
        title: taskTitle,
        previous_status: originalStatus,
        new_status: 'completed'
      },
      next_task: {
        slug: enrichedNext.slug,
        title: enrichedNext.title,
        status: enrichedNext.status,
        content: enrichedNext.content,

        // Task workflow ONLY (main workflow already in context)
        ...(enrichedNext.workflow != null && {
          workflow: {
            name: enrichedNext.workflow.name,
            description: enrichedNext.workflow.description,
            content: enrichedNext.workflow.content,
            whenToUse: enrichedNext.workflow.whenToUse
          }
        }),

        ...(enrichedNext.referencedDocuments != null && {
          referenced_documents: enrichedNext.referencedDocuments
        })
      }
    };
  }

  return {
    completed_task: {
      slug: taskSlug,
      title: taskTitle,
      previous_status: originalStatus,
      new_status: 'completed'
    }
  };
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (3-4 hours)

**Tasks:**
1. Create `src/shared/workflow-prompt-utilities.ts`
   - `extractWorkflowName()` function
   - `extractMainWorkflowName()` function
   - `resolveWorkflowPrompt()` function
   - `enrichTaskWithWorkflow()` function
   - `enrichTaskWithMainWorkflow()` function
2. Add workflow prompt tests in `src/shared/__tests__/workflow-prompt-utilities.test.ts`
   - Test workflow name extraction (both types)
   - Test prompt resolution
   - Test task enrichment logic
   - Test main workflow discovery
   - Test missing workflow handling
3. Update `TaskViewData` interface to include optional `workflow` and `mainWorkflow` fields
4. Create tool schema for `continue_task` in `src/tools/schemas/continue-task-schemas.ts`

**Acceptance Criteria:**
- ✅ Can extract workflow name from task content
- ✅ Can extract main workflow name from first task
- ✅ Can resolve workflow prompt by name
- ✅ Enrichment adds both workflow types to task data
- ✅ Missing workflows handled gracefully
- ✅ All unit tests pass
- ✅ Type safety maintained

### Phase 2: Tool Implementation (3-4 hours)

**Tasks:**
1. Create `src/tools/implementations/continue-task.ts`
   - Implement full workflow injection logic
   - Include main workflow + task workflow + references
2. Update `view-task.ts` to show workflow names only
3. Update `complete-task.ts` to include task workflow only
4. Update `task.ts` list operation to show workflow indicators
5. Register `continue_task` in tool registry and executor
6. Update tool schemas for all modified tools

**Acceptance Criteria:**
- ✅ `continue_task` returns full workflow context
- ✅ `view_task` shows workflow names without content
- ✅ `complete_task` includes next task workflow only
- ✅ `task list` shows workflow_name and main_workflow_name indicators
- ✅ Backward compatible (works without workflow fields)
- ✅ All existing tests still pass

### Phase 3: MCP Inspector Testing (1-2 hours)

**Tasks:**
1. Test `continue_task` with various workflow combinations
2. Test `complete_task` workflow transitions
3. Test `view_task` workflow name display
4. Test continuity signal flow (continue → complete → complete → continue)
5. Verify main workflow re-injection after context gap

**Acceptance Criteria:**
- ✅ `continue_task` correctly injects both workflows
- ✅ `complete_task` correctly omits main workflow
- ✅ `view_task` shows names without injecting content
- ✅ Continuity signal flow works as designed
- ✅ All three tools work together seamlessly

### Phase 4: Documentation & Examples (1-2 hours)

**Tasks:**
1. Create example task documents with both workflow types
2. Update tool documentation for all three tools
3. Add workflow usage examples to README
4. Document continuity signal pattern
5. Update CLAUDE.md with workflow injection patterns
6. Create visual diagrams for workflow flow

**Acceptance Criteria:**
- ✅ Example documents demonstrate both workflow types
- ✅ Tool docs explain workflow fields and tool choices
- ✅ README has continuity signal examples
- ✅ Documentation explains when to use each tool
- ✅ CLAUDE.md updated with patterns
- ✅ Visual diagrams aid understanding

### Phase 5: Testing & Validation (1-2 hours)

**Tasks:**
1. Integration tests for all three tools
2. Test workflow injection with various combinations
3. Test continuity signal detection
4. Test error cases (invalid workflow names, missing main workflow)
5. Performance testing (workflow loading overhead)
6. Test with large task sets (100+ tasks)

**Acceptance Criteria:**
- ✅ All integration tests pass
- ✅ All three tools correctly handle workflows
- ✅ Continuity signals work correctly
- ✅ Error handling works properly
- ✅ Performance impact minimal (<10ms per task)
- ✅ Works with 100+ tasks
- ✅ All quality gates pass

## Technical Considerations

### Performance

**Workflow Resolution Cost:**
- Workflow prompts cached at startup (existing)
- Resolution is O(1) lookup by name
- No filesystem access during task operations
- Minimal memory overhead (~5KB per workflow)
- Main workflow lookup adds one extra task content read per `continue_task`

**Optimization Strategy:**
- Cache first task lookup within request lifecycle
- Only load workflow content when explicitly requested via `continue_task`
- `view_task` and `task list` operations remain lightweight

### Error Handling

**Missing Workflow:**
```typescript
// Log warning but continue
logger.warn('Workflow prompt not found', {
  workflowName,
  taskSlug,
  document: documentPath
});
// Return task without workflow field
```

**Missing Main Workflow:**
```typescript
// Log info (not warning - main workflow is optional)
logger.info('No main workflow defined for task series', {
  document: documentPath,
  firstTaskSlug
});
// Continue without main workflow field
```

**Invalid Workflow Name:**
```typescript
// Same as missing - graceful degradation
// No exception thrown, just omitted from response
```

### Backward Compatibility

**Existing Tasks:**
- Tasks without workflow fields work as before
- No migration required
- Optional fields in all responses
- Existing tools continue to function

**API Changes:**
- All response schema changes are additive
- New `continue_task` tool doesn't affect existing tools
- New fields are optional
- No breaking changes to required fields
- Consumers can ignore workflow fields

## Usage Examples

### Example 1: Full Project with Main Workflow

```markdown
## Tasks

### Design API Architecture

- Status: pending
- Priority: high
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff
→ @/api/requirements.md

Design the overall API architecture following spec-first principles.
Evaluate multiple architectural patterns using structured trade-off analysis.

### Implement Core Endpoints

- Status: pending
- Priority: high
- Workflow: simplicity-gate
→ @/api/specs/core-endpoints.md

Implement the core API endpoints. Keep the implementation simple
and focused on meeting requirements without over-engineering.

### Deploy to Production

- Status: pending
- Priority: medium
- Workflow: guardrailed-rollout
→ @/deployment/production-checklist.md

Deploy the API to production with careful monitoring and
automatic rollback criteria.
```

**Session Flow:**

```bash
# Session Start
> continue_task(document="/project/tasks.md", task="design-api-architecture")

Response:
{
  "task": {
    "slug": "design-api-architecture",
    "title": "Design API Architecture",
    "main_workflow": {
      "name": "spec-first-integration",
      "content": "# Spec-First Integration Protocol..."  // FULL content
    },
    "workflow": {
      "name": "multi-option-tradeoff",
      "content": "# Multi-Option Trade-off Protocol..."  // FULL content
    },
    "referenced_documents": [...]
  }
}

# Continue working...
> complete_task(document="/project/tasks.md", task="design-api-architecture")

Response:
{
  "completed_task": {...},
  "next_task": {
    "slug": "implement-core-endpoints",
    "workflow": {
      "name": "simplicity-gate",
      "content": "# Simplicity Gate..."  // Task workflow only
    }
    // NO main_workflow - already in context
  }
}

# Continue working...
> complete_task(document="/project/tasks.md", task="implement-core-endpoints")

Response:
{
  "completed_task": {...},
  "next_task": {
    "slug": "deploy-to-production",
    "workflow": {
      "name": "guardrailed-rollout",
      "content": "# Guardrailed Rollout..."  // Task workflow only
    }
    // NO main_workflow - already in context
  }
}

# [CONTEXT COMPRESSION or NEW SESSION]

# Resume work
> continue_task(document="/project/tasks.md", task="deploy-to-production")

Response:
{
  "task": {
    "slug": "deploy-to-production",
    "main_workflow": {
      "name": "spec-first-integration",
      "content": "# Spec-First Integration Protocol..."  // RE-INJECTED
    },
    "workflow": {
      "name": "guardrailed-rollout",
      "content": "# Guardrailed Rollout..."
    }
  }
}
```

### Example 2: Browsing vs Working

```bash
# Passive inspection - no workflow injection
> view_task(document="/project/tasks.md", task=["design-api", "implement-core"])

Response:
{
  "tasks": [
    {
      "slug": "design-api",
      "main_workflow_name": "spec-first-integration",  // Name only
      "workflow_name": "multi-option-tradeoff",        // Name only
      "has_workflow": true
    },
    {
      "slug": "implement-core",
      "workflow_name": "simplicity-gate",              // Name only
      "has_workflow": true
    }
  ]
}

# Active work initiation - full workflow injection
> continue_task(document="/project/tasks.md", task="design-api")

Response:
{
  "task": {
    "slug": "design-api",
    "main_workflow": {
      "content": "..."  // FULL content
    },
    "workflow": {
      "content": "..."  // FULL content
    }
  }
}
```

### Example 3: Task Without Main Workflow

```markdown
## Tasks

### Fix Authentication Bug

- Status: pending
- Priority: high
- Workflow: failure-triage-repro

Users are experiencing intermittent authentication failures.
Reproduce the issue and implement a fix.
```

**Session:**
```bash
> continue_task(document="/fixes/auth-bug.md", task="fix-authentication-bug")

Response:
{
  "task": {
    "slug": "fix-authentication-bug",
    "workflow": {
      "name": "failure-triage-repro",
      "content": "# Failure Triage & Minimal Repro Protocol..."
    }
    // NO main_workflow - none defined in first task
  }
}
```

## Open Questions & Decisions

### Q1: Should workflows be validated at task creation?

**Options:**
- A. Validate and error if workflow not found
- B. Validate and warn if workflow not found
- C. No validation, fail silently at runtime

**Recommendation:** Option B - Validate and warn
**Rationale:**
- Provides immediate feedback for typos
- Doesn't block task creation
- Non-breaking for existing workflows

### Q2: Should main workflow be inherited by subtasks?

**Options:**
- A. Main workflow applies only to top-level tasks
- B. Main workflow inherited by all subtasks in hierarchy
- C. Configurable per-document

**Recommendation:** Option A - Top-level only for v1
**Rationale:**
- Simpler implementation
- Clear scoping rules
- Can add inheritance in v2 if needed

### Q3: Should `continue_task` accept task status filter?

**Options:**
- A. Accept any task (current design)
- B. Only accept pending/in_progress tasks
- C. Accept with warning for completed tasks

**Recommendation:** Option A - Accept any task
**Rationale:**
- Allows reviewing completed work with full context
- User may want to restart completed task
- More flexible

### Q4: Should workflow content be cached within request?

**Options:**
- A. Lookup each time (simple, no caching)
- B. Cache within single request lifecycle
- C. Global cache with invalidation

**Recommendation:** Option A for v1, Option B for v2
**Rationale:**
- Workflow lookups are already O(1) from startup cache
- Request-level caching adds minimal benefit
- Can optimize later if needed

## Success Metrics

**Feature is successful if:**
1. ✅ Workflow prompts automatically appear based on tool choice
2. ✅ Main workflows successfully re-inject on session resumption
3. ✅ No duplicate workflow content in continuous sessions
4. ✅ LLMs use workflows more frequently (measurable via logs)
5. ✅ Zero breaking changes to existing task system
6. ✅ Performance overhead <10ms per task
7. ✅ All quality gates pass
8. ✅ Documentation complete and clear
9. ✅ Positive user feedback on workflow integration

## Timeline Estimate

**Phase 1 (Core Infrastructure):** 3-4 hours
- Utility functions and enrichment logic
- Main workflow discovery
- Unit tests
- Interface updates

**Phase 2 (Tool Implementation):** 3-4 hours
- Create `continue_task` tool
- Update `view_task` and `complete_task`
- Schema updates
- Registry integration

**Phase 3 (MCP Inspector Testing):** 1-2 hours
- Test all three tools
- Verify continuity signals
- Test workflow combinations

**Phase 4 (Documentation):** 1-2 hours
- Examples and guides
- README updates
- Pattern documentation
- Visual diagrams

**Phase 5 (Testing & Validation):** 1-2 hours
- Integration tests
- Performance testing
- Quality gate verification

**Total Estimate:** 9-14 hours

## Future Enhancements

### V2 Features (Optional)
1. **Workflow Templates** - Parameterized prompts with variable substitution
2. **Workflow Chaining** - Link multiple workflows in sequence
3. **Conditional Workflows** - Apply workflows based on task properties
4. **Workflow Analytics** - Track which workflows are most effective
5. **Custom Workflows** - User-defined workflows per project
6. **Workflow Inheritance** - Parent task workflows apply to children
7. **Smart Workflow Suggestions** - Auto-suggest workflows based on task content
8. **Workflow History** - Track which workflows were used for completed tasks

## Conclusion

This design provides a deterministic, session-resilient way to inject workflow prompts into task context using **tool choice as an implicit continuity signal**. The three-tool architecture (view, continue, complete) naturally communicates session state without explicit tracking.

**Key Innovations:**

1. **Two Workflow Types** - Main workflow (project-level) vs Workflow (task-specific)
2. **Continuity Signals** - Tool choice indicates session state and context needs
3. **Session Resilience** - Main workflow re-injection via `continue_task` after compression
4. **Zero Duplication** - `complete_task` omits main workflow in continuous sessions
5. **Passive Inspection** - `view_task` provides lightweight browsing without workflow injection

The system creates a three-tier guidance model (task → spec → workflow) that intelligently manages context based on how the LLM interacts with tasks, ensuring workflows are always available when needed and never duplicated unnecessarily.
