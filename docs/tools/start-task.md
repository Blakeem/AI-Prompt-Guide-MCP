# start_task Tool Specification

## Overview

The `start_task` tool provides **full context injection** for initiating or resuming work on a task. It is the primary entry point for task execution, delivering comprehensive context including task-specific workflow prompts, project-level methodology guidance, and hierarchically loaded referenced documents.

**Purpose:** Signal "I'm starting work on this task" and receive all necessary context to begin or resume task execution after session interruptions (e.g., context compression).

**Tool Type:** Context injection tool with enrichment capabilities

## When to Use This Tool

### Primary Use Cases

1. **Starting a New Task** - Begin work on a specific task for the first time
2. **Resuming After Context Compression** - Re-establish full context after session reset
3. **Session Initialization** - Get comprehensive context at the start of a work session

### vs. Other Task Tools

**Comparison with Related Tools:**

- **`view_task`** - Passive inspection (shows workflow metadata names only, NO content injection)
- **`start_task`** - Work initiation (injects FULL context: main workflow + task workflow + references)
- **`complete_task`** - Work continuation (injects next task workflow only, NO main workflow re-injection)

**Decision Tree:**

```
Need task information?
├─ Just browsing/inspecting? → use view_task
├─ Starting work (new session)? → use start_task (full context)
├─ Continuing work (same session)? → use complete_task (next task only)
└─ Task lifecycle management? → use task tool
```

## Input Parameters

### Schema

```typescript
{
  document: string;  // Required - Document path
  task: string;      // Required - Task slug to start
}
```

### Parameter Details

#### `document` (required)
- **Type:** `string`
- **Format:** Absolute path starting with `/`
- **Example:** `"/project/setup.md"`
- **Description:** Path to the document containing the task
- **Validation:** Must be a valid document path; throws `DocumentNotFoundError` if not found

#### `task` (required)
- **Type:** `string`
- **Format:** Task slug (with or without `#` prefix)
- **Example:** `"initialize-project"` or `"#initialize-project"`
- **Description:** Slug of the task to start (must be under a "Tasks" section)
- **Validation:** Must exist as a task under the Tasks section; throws `AddressingError` if not found or not a valid task

### Format Flexibility

The tool accepts flexible task slug formats:
- `"task-slug"` - Slug without prefix
- `"#task-slug"` - Slug with # prefix
- Task must be under a section titled "Tasks" (case-insensitive)
- Supports nested task hierarchies (depth 3+)

## Output Format

### Response Structure

```typescript
{
  document: string;
  task: {
    slug: string;
    title: string;
    content: string;
    status: string;
    full_path: string;
    workflow?: WorkflowPrompt;
    main_workflow?: WorkflowPrompt;
    referenced_documents?: HierarchicalContent[];
  }
}
```

### Field Descriptions

#### Root Level

- **`document`** - Document path where task is located

#### Task Object

**Core Fields (always present):**

- **`slug`** - Task identifier (e.g., `"initialize-project"`)
- **`title`** - Human-readable task name (e.g., `"Initialize Project"`)
- **`content`** - Full task content including metadata
- **`status`** - Task status (e.g., `"pending"`, `"in_progress"`, `"completed"`)
- **`full_path`** - Complete task path (e.g., `"/project/setup.md#initialize-project (task)"`)

**Optional Fields (conditional presence):**

- **`workflow`** - Task-specific workflow prompt (only if `Workflow:` field present in task metadata)
- **`main_workflow`** - Project-level methodology workflow (only if `Main-Workflow:` field present in FIRST task)
- **`referenced_documents`** - Hierarchical reference content (only if task contains `@/doc.md` references)

### WorkflowPrompt Structure

When workflow fields are present, they contain complete workflow prompt data:

```typescript
interface WorkflowPrompt {
  name: string;           // Unique identifier (e.g., "multi-option-tradeoff")
  description: string;    // Short, attention-grabbing description
  content: string;        // Full prompt content with instructions
  tags: string[];         // Keywords for discoverability
  whenToUse: string[];    // Situations when this workflow applies
}
```

**Example Workflow Injection:**

```json
{
  "workflow": {
    "name": "multi-option-tradeoff",
    "description": "Multi-option trade-off analysis with weighted criteria",
    "content": "# Multi-Option Trade-off Protocol\n\n## Purpose\nStructured decision-making...",
    "tags": ["decision-making", "analysis"],
    "whenToUse": ["Multiple solution approaches", "Trade-off analysis needed"]
  }
}
```

### HierarchicalContent Structure

Referenced documents are loaded hierarchically with cycle detection:

```typescript
interface HierarchicalContent {
  path: string;         // Document path
  title: string;        // Document title from metadata
  content: string;      // Document content (full or section-specific)
  depth: number;        // Nesting depth in hierarchy (0 = root)
  namespace: string;    // Document namespace for organization
  children: HierarchicalContent[];  // Nested referenced documents
}
```

**Example Reference Hierarchy:**

```json
{
  "referenced_documents": [
    {
      "path": "/specs/api-spec.md",
      "title": "API Specification",
      "content": "# API Specification\n\n...",
      "depth": 0,
      "namespace": "specs",
      "children": [
        {
          "path": "/specs/auth.md",
          "title": "Authentication",
          "content": "# Authentication\n\n...",
          "depth": 1,
          "namespace": "specs",
          "children": []
        }
      ]
    }
  ]
}
```

## Three-Level Context Injection Workflow

The `start_task` tool implements a sophisticated three-level context injection system:

### 1. Task-Specific Workflow (Workflow Field)

**Source:** `Workflow:` field in task metadata

**Purpose:** Provides task-specific process guidance

**Example Task Metadata:**
```markdown
### Implement Feature
- Status: pending
- Workflow: simplicity-gate

Implement the new feature following simplicity principles.
```

**Injection Behavior:**
- Extracts `Workflow:` field value from current task content
- Resolves workflow prompt by name from workflow library
- Injects full `WorkflowPrompt` object in response
- Gracefully handles missing/invalid workflow names (logs warning, continues without workflow)

### 2. Main Workflow (Main-Workflow Field)

**Source:** `Main-Workflow:` field in FIRST task of document

**Purpose:** Project-level methodology for entire task series

**Example First Task Metadata:**
```markdown
### Design Architecture
- Status: pending
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff

Design the system architecture following spec-first principles.
```

**Injection Behavior:**
- Locates Tasks section in document
- Identifies first task under Tasks section
- Extracts `Main-Workflow:` field from first task
- Resolves and injects as `main_workflow` field
- Available to ALL tasks in the document (not just the first task)

**Session Resilience:**
- Main workflow is RE-INJECTED when using `start_task` after context compression
- NOT re-injected during continuous work (use `complete_task` for work continuation)

### 3. Referenced Documents (@ References)

**Source:** `@/doc.md` or `@/doc.md#section` syntax in task content

**Purpose:** Load contextually relevant documentation

**Example Task with References:**
```markdown
### Setup Database
- Status: pending
→ @/specs/database-schema.md
→ @/guides/postgres-setup.md#installation

Set up the database following the schema specification.
```

**Reference Extraction Pattern:**
```typescript
// Supported reference formats
@/specs/doc.md              // Full document
@/specs/doc.md#section      // Specific section
→ @/specs/doc.md            // With arrow prefix
```

**Hierarchical Loading:**
- Extracts all `@/path` references from task content
- Normalizes references relative to current document
- Loads referenced documents recursively up to configured depth
- Detects and prevents cycles in reference chains
- Respects `REFERENCE_EXTRACTION_DEPTH` configuration (default: 3)

**Reference Loading Protection:**
- Maximum 1000 total nodes across all branches
- 30-second timeout for entire operation
- Cycle detection prevents exponential growth
- Failed references logged as warnings (non-blocking)

## Workflow Implementation Details

### Context Injection Order

The enrichment process follows a specific sequence:

```
1. INPUT VALIDATION
   ↓
2. ADDRESS PARSING (document + task)
   ↓
3. DOCUMENT LOADING
   ↓
4. TASK VALIDATION
   ├─ Find Tasks section
   ├─ Verify task exists under Tasks
   └─ Validate task hierarchy
   ↓
5. TASK CONTENT LOADING
   ↓
6. BASE METADATA EXTRACTION
   ├─ Title from heading
   └─ Status from content
   ↓
7. WORKFLOW ENRICHMENT
   ├─ Extract Workflow field → enrich with task workflow
   └─ Extract Main-Workflow from first task → enrich with main workflow
   ↓
8. REFERENCE ENRICHMENT
   ├─ Extract @references from content
   ├─ Normalize references
   └─ Load hierarchical content
   ↓
9. OUTPUT CONSTRUCTION
   └─ Merge all enriched data
```

### Workflow Injection Logic

#### Task-Specific Workflow Injection

**Implementation:** `enrichTaskWithWorkflow()`

```typescript
// Extraction from task content
const workflowName = extractWorkflowName(taskContent);
// Pattern: /^[\s*-]+Workflow:[ \t]*(.*)$/m

// Resolution
const workflow = resolveWorkflowPrompt(workflowName);

// Injection (if valid)
if (workflow != null) {
  taskData.workflow = workflow;
}
```

**Field Format Flexibility:**
```markdown
- Workflow: multi-option-tradeoff     ✅ Dash format
* Workflow: multi-option-tradeoff     ✅ Star format
**Workflow:** multi-option-tradeoff   ✅ Bold format
```

#### Main Workflow Injection

**Implementation:** `enrichTaskWithMainWorkflow()`

```typescript
// Locate Tasks section
const tasksSection = document.headings.find(h =>
  h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
);

// Get first task under Tasks section
const taskHeadings = await getTaskHeadings(document, tasksSection);
const firstTask = taskHeadings[0];

// Load first task content
const firstTaskContent = await manager.getSectionContent(
  document.metadata.path,
  firstTask.slug
);

// Extract and resolve Main-Workflow
const mainWorkflowName = extractMainWorkflowName(firstTaskContent);
const mainWorkflow = resolveWorkflowPrompt(mainWorkflowName);

// Inject into response
if (mainWorkflow != null) {
  taskData.mainWorkflow = mainWorkflow;
}
```

### Reference Loading System

**Implementation:** Uses unified `ReferenceExtractor` and `ReferenceLoader`

```typescript
// Extract references from task content
const extractor = new ReferenceExtractor();
const refs = extractor.extractReferences(taskContent);

// Normalize relative to current document
const normalizedRefs = extractor.normalizeReferences(refs, documentPath);

// Load hierarchical content
const loader = new ReferenceLoader();
const referencedDocuments = await loader.loadReferences(
  normalizedRefs,
  manager,
  config.referenceExtractionDepth  // Default: 3
);
```

**Depth Configuration:**

Controlled by `REFERENCE_EXTRACTION_DEPTH` environment variable:

```bash
# .env or environment
REFERENCE_EXTRACTION_DEPTH=3  # Default: 3, Range: 1-5
```

**Configuration Impact:**
- `1` - Direct references only (no recursive loading)
- `3` - Balanced depth for most workflows (recommended)
- `5` - Maximum depth for complex documentation trees

## Integration Points

### Central Addressing System

Uses `ToolIntegration.validateAndParse()` for consistent address handling:

```typescript
const { addresses } = ToolIntegration.validateAndParse({
  document: documentPath,
  task: taskSlug
});

// Addresses contain validated, cached, type-safe references
// - addresses.document: DocumentAddress
// - addresses.task: TaskAddress
```

### Document Cache

**Cache Access Context:** Uses `AccessContext.REFERENCE` for reference loading

```typescript
// Reference loading with 2x eviction resistance
const document = await manager.cache.getDocument(
  ref.documentPath,
  AccessContext.REFERENCE
);
```

**Cache Benefits:**
- LRU caching with 1000 item limit
- Reference context provides 2x eviction resistance
- Automatic invalidation on document changes

### Workflow Prompt System

**Prompt Loading:** Workflows loaded from `.wfp.md` files at server startup

```typescript
// Available workflows cached in memory
const prompt = getWorkflowPrompt(workflowName);

// Returns WorkflowPrompt or undefined if not found
```

**Error Handling:**
- Invalid workflow names logged as warnings
- Execution continues without workflow field
- No blocking errors for missing workflows

### Task Validation

**Structural Validation:** Tasks must be under a "Tasks" section

```typescript
// Find Tasks section
const tasksSection = document.headings.find(h =>
  h.slug === 'tasks' || h.title.toLowerCase() === 'tasks'
);

// Validate task is under Tasks section
const taskIndex = document.headings.findIndex(h => h.slug === taskSlug);
const isUnderTasksSection = taskIndex > tasksIndex &&
  taskHeading.depth > tasksSection.depth;
```

**Hierarchy Support:**
- Direct children (depth 3) under Tasks (depth 2)
- Nested subtasks (depth 4+) supported
- Boundary checking ensures task within Tasks section

## Cache and State Management

### Document Cache

**Global Cache:** Shared across all tool invocations

```typescript
import { initializeGlobalCache } from './document-cache.js';

// Initialize cache before creating manager
initializeGlobalCache(docsRoot);
const manager = new DocumentManager(docsRoot);
```

**Cache Eviction:**
- LRU eviction at 1000 documents
- Access context affects eviction priority:
  - `DIRECT`: Standard access (1x resistance)
  - `REFERENCE`: Reference loading (2x resistance)
  - `SEARCH`: Search operations (3x resistance)

### Session State

**State Management:** Uses singleton `SessionStore`

```typescript
import { getGlobalSessionStore } from './session/session-store.js';

const sessionStore = getGlobalSessionStore();
// State persists across tool calls within same session
```

**Session Lifecycle:**
- State persists within a session across multiple tool calls
- Each session maintains independent state
- State resets when session ends (context compression)

### Reference Hierarchy Loading

**Cycle Detection:** Visited path tracking prevents infinite loops

```typescript
const visitedPaths = new Set<string>();

// During recursive loading
if (visitedPaths.has(ref.documentPath)) {
  logger.warn(`Cycle detected for path: ${ref.documentPath}`);
  return null;
}

visitedPaths.add(ref.documentPath);
```

**Resource Limits:**
- Maximum 1000 total nodes across all branches
- 30-second timeout for entire operation
- Node counter shared across all recursion branches

**Timeout Protection:**

```typescript
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const operationStart = Date.now();

if (Date.now() - operationStart > DEFAULT_TIMEOUT_MS) {
  throw new Error('Reference loading operation exceeded timeout');
}
```

## Use Cases and Examples

### Use Case 1: Starting First Task in New Session

**Scenario:** Beginning work on a project's first task

**Input:**
```json
{
  "document": "/project/setup.md",
  "task": "initialize-project"
}
```

**Task Content:**
```markdown
### Initialize Project
- Status: pending
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff
→ @/guides/project-structure.md

Set up the project structure following best practices.
```

**Response:**
```json
{
  "document": "/project/setup.md",
  "task": {
    "slug": "initialize-project",
    "title": "Initialize Project",
    "content": "### Initialize Project\n- Status: pending\n...",
    "status": "pending",
    "full_path": "/project/setup.md#initialize-project (task)",
    "workflow": {
      "name": "multi-option-tradeoff",
      "description": "Multi-option trade-off analysis with weighted criteria",
      "content": "# Multi-Option Trade-off Protocol\n\n...",
      "tags": ["decision-making", "analysis"],
      "whenToUse": ["Multiple solution approaches", "Trade-off analysis needed"]
    },
    "main_workflow": {
      "name": "spec-first-integration",
      "description": "Spec-first integration with canonical APIs",
      "content": "# Spec-First Integration Protocol\n\n...",
      "tags": ["integration", "specs"],
      "whenToUse": ["New integrations", "API work"]
    },
    "referenced_documents": [
      {
        "path": "/guides/project-structure.md",
        "title": "Project Structure Guide",
        "content": "# Project Structure Guide\n\n...",
        "depth": 0,
        "namespace": "guides",
        "children": []
      }
    ]
  }
}
```

**Context Injection:**
- ✅ Task workflow (multi-option-tradeoff) - Current task guidance
- ✅ Main workflow (spec-first-integration) - Project methodology
- ✅ Referenced documents - Project structure guide loaded

### Use Case 2: Resuming Task After Context Compression

**Scenario:** Session reset due to context compression, need to resume work

**Input:**
```json
{
  "document": "/project/setup.md",
  "task": "configure-database"
}
```

**Document Structure:**
```markdown
# Project Setup

## Tasks

### Initialize Project (completed)
- Status: completed
- Main-Workflow: spec-first-integration
- Workflow: multi-option-tradeoff

### Configure Database (current task)
- Status: in_progress
- Workflow: simplicity-gate
→ @/specs/database-schema.md

Configure the database following the schema.
```

**Response:**
```json
{
  "document": "/project/setup.md",
  "task": {
    "slug": "configure-database",
    "title": "Configure Database",
    "content": "### Configure Database\n- Status: in_progress\n...",
    "status": "in_progress",
    "full_path": "/project/setup.md#configure-database (task)",
    "workflow": {
      "name": "simplicity-gate",
      "description": "Simplicity gate with complexity budgets",
      "content": "# Simplicity Gate Protocol\n\n...",
      "tags": ["simplicity", "design"],
      "whenToUse": ["Design decisions", "Implementation choices"]
    },
    "main_workflow": {
      "name": "spec-first-integration",
      "description": "Spec-first integration with canonical APIs",
      "content": "# Spec-First Integration Protocol\n\n...",
      "tags": ["integration", "specs"],
      "whenToUse": ["New integrations", "API work"]
    },
    "referenced_documents": [
      {
        "path": "/specs/database-schema.md",
        "title": "Database Schema",
        "content": "# Database Schema\n\n...",
        "depth": 0,
        "namespace": "specs",
        "children": []
      }
    ]
  }
}
```

**Context Injection:**
- ✅ Task workflow (simplicity-gate) - Current task guidance
- ✅ Main workflow (spec-first-integration) - Re-injected project methodology
- ✅ Referenced documents - Database schema specification

**Key Benefit:** Main workflow is automatically re-injected after session reset, ensuring methodology continuity

### Use Case 3: Starting Task Without Workflows

**Scenario:** Simple task without workflow guidance

**Input:**
```json
{
  "document": "/project/tasks.md",
  "task": "update-readme"
}
```

**Task Content:**
```markdown
### Update README
- Status: pending

Update the README file with new installation instructions.
```

**Response:**
```json
{
  "document": "/project/tasks.md",
  "task": {
    "slug": "update-readme",
    "title": "Update README",
    "content": "### Update README\n- Status: pending\n...",
    "status": "pending",
    "full_path": "/project/tasks.md#update-readme (task)"
  }
}
```

**Context Injection:**
- ❌ No task workflow (field not present)
- ❌ No main workflow (first task has no Main-Workflow field)
- ❌ No referenced documents (no @references in content)

**Graceful Degradation:** Tool works perfectly for tasks without workflow/references

### Use Case 4: Nested Task with Hierarchical References

**Scenario:** Complex task with nested reference hierarchy

**Input:**
```json
{
  "document": "/project/api-tasks.md",
  "task": "implement-auth-endpoint"
}
```

**Task Content:**
```markdown
#### Implement Auth Endpoint
- Status: pending
- Workflow: spec-first-integration
→ @/specs/api-spec.md#authentication

Implement the authentication endpoint following the API specification.
```

**Referenced Document (/specs/api-spec.md#authentication):**
```markdown
### Authentication

See @/specs/auth-flows.md for detailed authentication flows.

JWT-based authentication with refresh tokens.
```

**Response:**
```json
{
  "document": "/project/api-tasks.md",
  "task": {
    "slug": "implement-auth-endpoint",
    "title": "Implement Auth Endpoint",
    "content": "#### Implement Auth Endpoint\n- Status: pending\n...",
    "status": "pending",
    "full_path": "/project/api-tasks.md#implement-auth-endpoint (task)",
    "workflow": {
      "name": "spec-first-integration",
      "description": "Spec-first integration with canonical APIs",
      "content": "# Spec-First Integration Protocol\n\n...",
      "tags": ["integration", "specs"],
      "whenToUse": ["New integrations", "API work"]
    },
    "referenced_documents": [
      {
        "path": "/specs/api-spec.md",
        "title": "API Specification",
        "content": "### Authentication\n\nSee @/specs/auth-flows.md...",
        "depth": 0,
        "namespace": "specs",
        "children": [
          {
            "path": "/specs/auth-flows.md",
            "title": "Authentication Flows",
            "content": "# Authentication Flows\n\n...",
            "depth": 1,
            "namespace": "specs",
            "children": []
          }
        ]
      }
    ]
  }
}
```

**Context Injection:**
- ✅ Task workflow - API integration guidance
- ✅ Referenced documents - Hierarchical loading up to depth 3
  - Level 0: API specification (authentication section)
  - Level 1: Authentication flows (nested reference)

## Error Handling

### Error Types

#### DocumentNotFoundError

**When:** Document path does not exist

**Example:**
```typescript
throw new DocumentNotFoundError('/nonexistent/doc.md');
```

**Response:**
```json
{
  "error": "Document not found: /nonexistent/doc.md",
  "code": "DOCUMENT_NOT_FOUND"
}
```

#### AddressingError: Missing Parameters

**When:** Required parameters not provided

**Example:**
```typescript
await startTask({ document: '/doc.md' }, sessionState, manager);
// Missing 'task' parameter
```

**Response:**
```json
{
  "error": "task parameter is required",
  "code": "MISSING_PARAMETER"
}
```

#### AddressingError: No Tasks Section

**When:** Document has no Tasks section

**Example:**
```json
{
  "error": "No tasks section found in document",
  "code": "NO_TASKS_SECTION",
  "context": {
    "document": "/doc.md",
    "available_sections": ["overview", "details"]
  }
}
```

#### AddressingError: Task Not Found

**When:** Task slug does not exist under Tasks section

**Example:**
```json
{
  "error": "Task not found: missing-task",
  "code": "TASK_NOT_FOUND",
  "context": {
    "document": "/project/tasks.md",
    "task": "missing-task",
    "available_tasks": ["initialize-project", "setup-database", "configure-api"]
  }
}
```

#### AddressingError: Not a Task

**When:** Section exists but is not under Tasks section

**Example:**
```json
{
  "error": "Section overview is not under tasks section",
  "code": "NOT_A_TASK",
  "context": {
    "document": "/project/doc.md",
    "section": "overview"
  }
}
```

### Graceful Degradation

**Invalid Workflow Names:**
- Logged as warning: `"Workflow prompt not found: nonexistent-workflow"`
- Execution continues without workflow field
- No blocking error thrown

**Failed Reference Loading:**
- Logged as warning: `"Failed to load reference: /nonexistent/doc.md"`
- Continues loading other references
- Missing references omitted from response

**Empty/Missing Metadata:**
- Empty workflow field (e.g., `- Workflow:`) treated as no workflow
- Missing status defaults to `"pending"`
- Missing title extracted from heading or defaults to slug

## Best Practices

### When to Use start_task vs. complete_task

**Use `start_task` when:**
- Starting work on a task for the first time
- Resuming after context compression/session reset
- Need full context including main workflow
- Beginning a new work session

**Use `complete_task` when:**
- Finishing current task and moving to next
- Continuing work within the same session
- Don't need main workflow re-injection
- Sequential task progression

### Workflow Organization

**Main-Workflow Field:**
- Define ONLY in the first task of document
- Represents project-level methodology
- Automatically injected for all tasks via `start_task`

**Workflow Field:**
- Define in each task as needed
- Task-specific process guidance
- Can be different for each task

**Example Structure:**
```markdown
## Tasks

### Task 1: Design Architecture
- Status: pending
- Main-Workflow: spec-first-integration  ← Project methodology
- Workflow: multi-option-tradeoff        ← Task-specific process

### Task 2: Implement Feature
- Status: pending
- Workflow: simplicity-gate              ← Different task workflow

### Task 3: Write Tests
- Status: pending
- Workflow: evidence-based-experiment    ← Different task workflow
```

### Reference Organization

**Direct References:**
```markdown
→ @/specs/api-spec.md              # Full document
→ @/specs/api-spec.md#endpoints    # Specific section
```

**Hierarchical Loading:**
- Organize references to minimize depth
- Use section-specific references to reduce content size
- Be mindful of reference depth (default max: 3)

**Avoiding Cycles:**
- Don't create circular references (A → B → A)
- System detects and logs cycles, but organize to avoid them
- Keep reference trees reasonably shallow

### Performance Considerations

**Reference Depth:**
- Default depth (3) balances context vs. performance
- Increase only for deeply nested documentation
- Monitor reference loading times

**Document Size:**
- Large referenced documents increase context size
- Use section-specific references when possible
- Consider splitting large documents

**Cache Warming:**
- Frequently accessed references benefit from cache
- `REFERENCE` access context provides 2x eviction resistance

## Related Tools

### Complementary Tools

- **`view_task`** - Inspect task without workflow injection
- **`complete_task`** - Finish task and get next task
- **`task`** - Task lifecycle management (create/edit/list)
- **`view_document`** - Document inspection with stats
- **`section`** - Section content management

### Workflow Management

- **Workflow Prompt Library** - `.wfp.md` files in prompts directory
- **`getWorkflowPrompt(name)`** - Resolve workflow by name
- **`loadWorkflowPrompts()`** - Load all workflows at startup

### Reference System

- **`ReferenceExtractor`** - Extract @references from content
- **`ReferenceLoader`** - Hierarchical reference loading
- **`browse_documents`** - Discover available documents for references

## Technical Implementation

### Module Dependencies

```typescript
// Core dependencies
import { DocumentManager } from '../../document-manager.js';
import { ToolIntegration, AddressingError, DocumentNotFoundError } from '../../shared/addressing-system.js';
import { enrichTaskWithReferences, extractTaskField } from '../../shared/task-view-utilities.js';
import { enrichTaskWithWorkflow, enrichTaskWithMainWorkflow } from '../../shared/workflow-prompt-utilities.js';
import { getTaskHeadings } from '../../shared/task-utilities.js';

// Type imports
import type { SessionState } from '../../session/types.js';
import type { WorkflowPrompt } from '../../prompts/workflow-prompts.js';
import type { HierarchicalContent } from '../../shared/reference-loader.js';
```

### Key Functions

**`startTask(args, state, manager)`**
- Main entry point for tool execution
- Orchestrates all enrichment steps
- Returns complete task data with full context

**`enrichTaskWithWorkflow(taskData, content)`**
- Extracts and resolves task-specific workflow
- Returns enriched task data (non-mutating)

**`enrichTaskWithMainWorkflow(manager, document, taskData)`**
- Locates first task in document
- Extracts and resolves main workflow
- Returns enriched task data (non-mutating)

**`enrichTaskWithReferences(manager, docPath, taskSlug, content, heading, taskAddress)`**
- Extracts @references from content
- Loads hierarchical reference content
- Returns task data with referenced documents

### Configuration

**Environment Variables:**
```bash
REFERENCE_EXTRACTION_DEPTH=3  # Reference hierarchy depth (1-5, default: 3)
```

**Default Constants:**
```typescript
const MAX_TOTAL_NODES = 1000;       // Maximum reference nodes
const DEFAULT_TIMEOUT_MS = 30000;   // 30 seconds reference loading timeout
```

## Testing Considerations

### Unit Test Coverage

**Test Categories:**
1. Parameter validation (missing/empty/null parameters)
2. Document and task resolution (not found errors)
3. Task validation (Tasks section, hierarchy)
4. Workflow enrichment (present, missing, invalid)
5. Main workflow enrichment (first task logic)
6. Reference loading (hierarchical, cycles, failures)
7. Full integration (all enrichment levels)
8. Error handling (helpful messages)

### MCP Inspector Testing

```bash
# Build first
pnpm build

# Start inspector
npx @modelcontextprotocol/inspector node dist/index.js

# Test start_task tool
{
  "document": "/project/setup.md",
  "task": "initialize-project"
}
```

**Verification Points:**
- Workflow prompts contain full content
- Main workflow present when first task has Main-Workflow field
- Referenced documents loaded hierarchically
- Error messages provide helpful context

## Changelog

### Version 0.2.0 (Current)
- Added full workflow injection system
- Implemented main workflow support
- Added hierarchical reference loading
- Comprehensive error handling with context
- Support for nested task hierarchies

### Future Enhancements
- Workflow analytics and effectiveness tracking
- Enhanced workflow coordination across task series
- Dynamic workflow selection based on task context
- Reference caching optimization
