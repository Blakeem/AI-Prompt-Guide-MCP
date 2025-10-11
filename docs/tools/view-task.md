# view_task Tool Specification

## Overview

The `view_task` tool provides **clean, passive task inspection** with status and metadata extraction. It serves as the inspection tool in the three-tool task architecture, allowing LLMs to browse task details without triggering workflow injection or modifying session state.

**Key Characteristics:**
- **Passive Inspection** - View task data without workflow content injection
- **Status Parsing** - Extracts task status from multiple metadata formats
- **Reference Extraction** - Lists @references found in task content (not loaded)
- **Workflow Metadata** - Shows workflow names without injecting workflow content
- **Multi-Task Support** - View up to 10 tasks in a single call
- **Summary Statistics** - Provides aggregate counts and status breakdowns

**Position in Task Architecture:**
1. **`view_task`** - Browse tasks (THIS TOOL - no workflow injection)
2. **`start_task`** - Start/resume work (injects main workflow + task workflow + references)
3. **`complete_task`** - Finish task (injects next task workflow only)

---

## Input Parameters

### Required Parameters

#### `document` (string)
Absolute path to the document containing the tasks.

**Format:**
- Must start with `/` for absolute path
- Example: `"/project/setup.md"`

**Validation:**
- Path must exist in the document cache
- Document must contain a `tasks` section (heading with title "Tasks")

#### `task` (string | string[])
Task slug(s) to view. Supports single task or array of tasks.

**Format:**
- Single task: `"initialize-config"` or `"#initialize-config"`
- Multiple tasks: `["#initialize-config", "#database-setup"]`

**Validation:**
- Maximum 10 tasks per request
- Each task must exist under the Tasks section
- Task slugs are normalized (# prefix optional)

### Optional Parameters

None. This tool focuses on inspection without configuration options.

---

## Output Format

### Response Structure

```typescript
{
  document: string;                  // Document path
  tasks: Array<TaskData>;           // Array of task information
  summary: TaskSummary;             // Aggregate statistics
}
```

### TaskData Structure

```typescript
{
  slug: string;                      // Task slug (e.g., "initialize-config")
  title: string;                     // Task heading title
  content: string;                   // Full task content (markdown)
  depth: number;                     // Heading depth (e.g., 3 for ###)
  full_path: string;                 // Full task path with (task) marker
  status: string;                    // Extracted status (pending/in_progress/completed/blocked)
  word_count: number;                // Task content word count
  has_workflow: boolean;             // Whether task has workflow field

  // Optional fields (only present if applicable)
  parent?: string;                   // Parent task slug if nested
  linked_document?: string;          // Linked document from → @/path/doc.md
  referenced_documents?: Array<{     // @references found (not loaded)
    path: string;
    depth: number;
    references: string[];
  }>;
  workflow_name?: string;            // Workflow name (if has_workflow is true)
  main_workflow_name?: string;       // Main-Workflow from first task
}
```

### TaskSummary Structure

```typescript
{
  total_tasks: number;               // Total tasks viewed
  by_status: {                       // Status breakdown
    [status: string]: number;        // Count per status
  };
  with_links: number;                // Tasks with linked documents
  with_references: number;           // Tasks with @references
  tasks_with_workflows: number;      // Tasks with Workflow field
  tasks_with_main_workflow: number;  // Tasks with Main-Workflow field
}
```

---

## Task Status Parsing

The tool extracts task status from multiple metadata formats, supporting the evolution of documentation conventions.

### Supported Status Formats

#### 1. Star Format (Highest Priority)
```markdown
### Task Title
* Status: in_progress
```

#### 2. Dash Format (Second Priority)
```markdown
### Task Title
- Status: completed
```

#### 3. Bold Format (Lowest Priority)
```markdown
### Task Title
**Status:** pending
```

### Status Values

Standard status values:
- `pending` - Task not yet started (default if no status found)
- `in_progress` - Task currently being worked on
- `completed` - Task finished
- `blocked` - Task cannot proceed (dependencies or issues)

**Priority Order:** If multiple formats exist in the same task, the tool uses star format > dash format > bold format.

### Metadata Extraction Pattern

The tool uses `extractTaskField()` from `task-view-utilities.ts` to parse metadata:

```typescript
// Extract status with format priority
const status = extractTaskField(content, 'Status') ?? 'pending';

// Also supports other fields
const dependencies = extractTaskField(content, 'Dependencies');
```

**Implementation Details:**
- Regex-based extraction with trimming
- Case-sensitive field names (exactly "Status", not "status")
- Returns `null` if field not found (uses 'pending' as default)
- Whitespace trimmed from extracted values

---

## Workflow Metadata Extraction

The tool identifies and extracts workflow information but does **NOT inject workflow content** (unlike `start_task`).

### Workflow Types

#### 1. Task-Specific Workflow
Defined in individual task metadata:
```markdown
### Design API Architecture
* Status: pending
* Workflow: multi-option-tradeoff
```

**Extraction:**
- Field: `Workflow:`
- Extracted by: `extractWorkflowName(content)`
- Included in response: `workflow_name` field (if present and non-empty)
- Flag: `has_workflow: true`

#### 2. Main Workflow (Project-Level)
Defined in the first task of the series:
```markdown
### First Task
* Status: pending
* Main-Workflow: spec-first-integration
```

**Extraction:**
- Field: `Main-Workflow:`
- Extracted by: `extractMainWorkflowName(content)` from first task
- Included in response: `main_workflow_name` field for ALL tasks
- Applied to: All tasks in the response if defined

### Workflow Field Presence

```typescript
// Workflow field exists and has a value
has_workflow: workflowName != null && workflowName !== ''

// Only add workflow_name if present
if (hasWorkflow) {
  taskData.workflow_name = workflowName;
}

// Main workflow added to all tasks if defined in first task
if (mainWorkflowName != null && mainWorkflowName !== '') {
  taskData.main_workflow_name = mainWorkflowName;
}
```

**Key Distinction:** The tool shows workflow **names only**, not the actual workflow **content**. Use `start_task` to get full workflow injection.

---

## Reference Extraction

The tool identifies @references in task content but does **NOT load referenced content** (unlike `start_task` which loads hierarchically).

### Reference Patterns

Supported @reference formats:
```markdown
### Task Example
See @/api/specs/auth.md#overview for details.
Also check @#local-section within this document.
Review @/guides/setup.md for context.
```

### Extraction Process

**Step 1: Extract References**
```typescript
const extractor = new ReferenceExtractor();
const refs = extractor.extractReferences(content);
// Returns: ['@/api/specs/auth.md#overview', '@#local-section', '@/guides/setup.md']
```

**Step 2: Normalize References**
```typescript
const normalized = extractor.normalizeReferences(refs, documentPath);
// Returns: Array<NormalizedReference> with resolved paths
```

**Step 3: Load References (Hierarchical)**
```typescript
const loader = new ReferenceLoader();
const hierarchy = await loader.loadReferences(
  normalized,
  manager,
  config.referenceExtractionDepth
);
// Returns: HierarchicalContent[] with depth and nested references
```

### HierarchicalContent Structure

```typescript
interface HierarchicalContent {
  path: string;                      // Resolved document path
  depth: number;                     // Depth in reference hierarchy (0 = direct)
  references: string[];              // Child references found at this level
}
```

**Example:**
```typescript
[
  {
    path: '/api/specs/auth.md#overview',
    depth: 0,  // Direct reference from task
    references: ['@/api/common.md']  // References found in auth.md
  },
  {
    path: '/api/common.md',
    depth: 1,  // Indirect reference (from auth.md)
    references: []
  }
]
```

### Reference Extraction Depth

Controlled by environment variable:
```bash
REFERENCE_EXTRACTION_DEPTH=3  # Default: 3, Range: 1-5
```

**Depth Behavior:**
- `1`: Direct references only (no recursive loading)
- `3`: Recommended depth for most workflows
- `5`: Maximum depth for complex documentation trees

**Protection:**
- Maximum 1000 total nodes across all branches
- 30-second timeout for entire operation
- Cycle detection prevents infinite loops

### Output in Response

References included in `referenced_documents` array:
```typescript
{
  slug: "initialize-config",
  title: "Initialize Configuration",
  status: "pending",
  // ... other fields
  referenced_documents: [
    {
      path: '/guides/config.md',
      depth: 0,
      references: ['@/api/settings.md']
    },
    {
      path: '/api/settings.md',
      depth: 1,
      references: []
    }
  ]
}
```

**Key Point:** This tool **lists** references but doesn't inject their content into the response. Use `start_task` to get full context with loaded reference content.

---

## Task Identification and Validation

### Task Section Requirement

All tasks must be under a section with:
- **Slug:** `tasks`, OR
- **Title:** `Tasks` (case-insensitive match to "tasks")

**Example:**
```markdown
# Project Setup

## Overview
Project description here.

## Tasks

### Initialize Configuration
* Status: pending
```

### Task Identification Logic

The tool uses structural analysis (not naming patterns) to identify tasks:

```typescript
import { isTaskSection } from '../shared/addressing-system.js';

// Check if section is under tasks section
const isTask = await isTaskSection(heading.slug, document);
```

**Validation Steps:**
1. Find tasks section in document
2. Get all headings under tasks section using `getTaskHeadings()`
3. Verify each requested task slug exists in task headings
4. Validate each is actually a task using `isTaskSection()`

### Task Heading Extraction

```typescript
import { getTaskHeadings } from '../shared/task-utilities.js';

const taskHeadings = await getTaskHeadings(document, tasksSection);
// Returns: HeadingInfo[] with slug, title, depth
```

**HeadingInfo Structure:**
```typescript
interface HeadingInfo {
  slug: string;      // Unique slug (e.g., 'initialize-config')
  title: string;     // Heading text (e.g., 'Initialize Configuration')
  depth: number;     // Heading level (3 = ###)
}
```

### Error Handling

**Document Not Found:**
```typescript
throw new DocumentNotFoundError(path);
```

**No Tasks Section:**
```typescript
throw new AddressingError(
  `No tasks section found in document: ${path}`,
  'NO_TASKS_SECTION',
  { document: path }
);
```

**Task Not Found:**
```typescript
throw new AddressingError(
  `Task not found: ${taskSlug}. Available tasks: ${availableTasks}`,
  'TASK_NOT_FOUND',
  { taskSlug, document: path }
);
```

**Not a Task:**
```typescript
throw new AddressingError(
  `Section ${taskSlug} is not a task (not under tasks section)`,
  'NOT_A_TASK',
  { taskSlug, tasksSection: tasksSection.slug }
);
```

---

## Integration Points

### Document Cache Usage

The tool reads from the global document cache:

```typescript
import { getGlobalDocumentCache } from '../../document-cache.js';

const cache = getGlobalDocumentCache();
const document = await manager.getDocument(addresses.document.path);
```

**Cache Benefits:**
- Fast retrieval of parsed documents
- Automatic heading extraction
- Metadata caching
- LRU eviction at 1000 documents

### Addressing System Integration

Uses central addressing system for validation:

```typescript
import { ToolIntegration } from '../../shared/addressing-system.js';

// Validate and parse addresses
const { addresses } = ToolIntegration.validateAndParse({
  document: documentPath
});

// Format paths consistently
const taskPath = ToolIntegration.formatTaskPath(taskAddress);
// Returns: '/project/setup.md#initialize-config (task)'
```

### Task Enrichment Pipeline

Tasks are enriched using shared utilities:

```typescript
import { enrichTaskWithReferences } from '../../shared/task-view-utilities.js';

const enrichedTask = await enrichTaskWithReferences(
  manager,
  documentPath,
  taskSlug,
  content,
  heading,
  taskAddress
);
```

**Enrichment Process:**
1. Extract basic metadata (status, links)
2. Extract and normalize @references
3. Load references hierarchically
4. Calculate word count
5. Extract parent relationships
6. Format full task path

### Summary Calculation

Uses shared utility for consistent statistics:

```typescript
import { calculateTaskSummary } from '../../shared/task-view-utilities.js';

const baseSummary = calculateTaskSummary(taskViewData);
// Returns: { total_tasks, by_status, with_links, with_references }

// Add workflow-specific counts
const summary = {
  ...baseSummary,
  tasks_with_workflows: tasksWithWorkflows,
  tasks_with_main_workflow: tasksWithMainWorkflow
};
```

---

## Use Cases & Examples

### Example 1: View Single Task

**Request:**
```json
{
  "document": "/project/setup.md",
  "task": "#initialize-config"
}
```

**Response:**
```json
{
  "document": "/project/setup.md",
  "tasks": [
    {
      "slug": "initialize-config",
      "title": "Initialize Configuration",
      "content": "### Initialize Configuration\n* Status: in_progress\n* Workflow: spec-first-integration\n\nSet up project configuration files...",
      "depth": 3,
      "full_path": "/project/setup.md#initialize-config (task)",
      "status": "in_progress",
      "word_count": 45,
      "has_workflow": true,
      "workflow_name": "spec-first-integration",
      "referenced_documents": [
        {
          "path": "/guides/config.md",
          "depth": 0,
          "references": []
        }
      ]
    }
  ],
  "summary": {
    "total_tasks": 1,
    "by_status": {
      "in_progress": 1
    },
    "with_links": 0,
    "with_references": 1,
    "tasks_with_workflows": 1,
    "tasks_with_main_workflow": 0
  }
}
```

### Example 2: View Multiple Tasks

**Request:**
```json
{
  "document": "/project/setup.md",
  "task": ["#initialize-config", "#database-setup", "#api-integration"]
}
```

**Response:**
```json
{
  "document": "/project/setup.md",
  "tasks": [
    {
      "slug": "initialize-config",
      "title": "Initialize Configuration",
      "status": "completed",
      "word_count": 45,
      "has_workflow": true,
      "workflow_name": "spec-first-integration",
      "main_workflow_name": "spec-first-integration"
      // ... other fields
    },
    {
      "slug": "database-setup",
      "title": "Database Setup",
      "status": "in_progress",
      "word_count": 67,
      "has_workflow": false,
      "main_workflow_name": "spec-first-integration"
      // ... other fields
    },
    {
      "slug": "api-integration",
      "title": "API Integration",
      "status": "pending",
      "word_count": 89,
      "has_workflow": true,
      "workflow_name": "multi-option-tradeoff",
      "main_workflow_name": "spec-first-integration"
      // ... other fields
    }
  ],
  "summary": {
    "total_tasks": 3,
    "by_status": {
      "completed": 1,
      "in_progress": 1,
      "pending": 1
    },
    "with_links": 0,
    "with_references": 2,
    "tasks_with_workflows": 2,
    "tasks_with_main_workflow": 3
  }
}
```

### Example 3: Task with Linked Document

**Task Content:**
```markdown
### Deploy Infrastructure
* Status: pending
→ @/infrastructure/aws-setup.md
```

**Response:**
```json
{
  "slug": "deploy-infrastructure",
  "title": "Deploy Infrastructure",
  "status": "pending",
  "linked_document": "/infrastructure/aws-setup.md",
  // ... other fields
}
```

### Example 4: Nested Task with Parent

**Document Structure:**
```markdown
## Tasks

### Setup Phase

#### Initialize Config
* Status: completed

#### Database Setup
* Status: in_progress
```

**Response:**
```json
{
  "slug": "database-setup",
  "title": "Database Setup",
  "parent": "setup-phase",
  "depth": 4,
  "status": "in_progress"
  // ... other fields
}
```

### Example 5: Task with Multiple Status Formats

**Task Content:**
```markdown
### Multi-Format Task
* Status: in_progress
- Status: completed
**Status:** blocked
```

**Response:**
```json
{
  "slug": "multi-format-task",
  "status": "in_progress"  // Star format wins
}
```

### Example 6: Browse All Tasks Before Starting Work

**Workflow:**
```typescript
// 1. View all tasks to understand the work
const allTasks = await view_task({
  document: "/project/setup.md",
  task: ["#task1", "#task2", "#task3"]
});

// 2. Choose which task to start based on status and workflow
const nextTask = allTasks.tasks.find(t => t.status === 'pending');

// 3. Start work with full context injection
const workContext = await start_task({
  document: "/project/setup.md",
  task: nextTask.slug
});
```

---

## Implementation Details

### File Structure

**Main Implementation:**
- `src/tools/implementations/view-task.ts` - Core tool logic

**Schema Definition:**
- `src/tools/schemas/view-task-schemas.ts` - Input validation

**Shared Utilities:**
- `src/shared/task-view-utilities.ts` - Task enrichment and metadata extraction
- `src/shared/addressing-system.ts` - Address validation and parsing
- `src/shared/reference-extractor.ts` - @reference pattern extraction
- `src/shared/reference-loader.ts` - Hierarchical reference loading
- `src/shared/workflow-prompt-utilities.ts` - Workflow name extraction

### Key Functions

#### extractTaskMetadata()
Extracts metadata from task content:
```typescript
export function extractTaskMetadata(content: string): TaskMetadata {
  const status = extractTaskField(content, 'Status') ?? 'pending';
  const link = extractTaskLink(content);
  const linkedDocument = extractLinkedDocument(content);

  return { status, link, linkedDocument };
}
```

#### extractTaskField()
Parses field with format priority:
```typescript
export function extractTaskField(content: string, fieldName: string): string | null {
  // Priority 1: Star format
  const starMatch = content.match(/^\s*\*\s*${fieldName}:\s*(.+)$/m);
  if (starMatch?.[1]) return starMatch[1].trim();

  // Priority 2: Dash format
  const dashMatch = content.match(/^\s*-\s*${fieldName}:\s*(.+)$/m);
  if (dashMatch?.[1]) return dashMatch[1].trim();

  // Priority 3: Bold format
  const boldMatch = content.match(/^\s*\*\*${fieldName}:\*\*\s*(.+)$/m);
  return boldMatch?.[1]?.trim() ?? null;
}
```

#### enrichTaskWithReferences()
Complete task enrichment pipeline:
```typescript
export async function enrichTaskWithReferences(
  manager: DocumentManager,
  documentPath: string,
  taskSlug: string,
  taskContent: string,
  heading?: HeadingInfo,
  taskAddress?: TaskAddress
): Promise<TaskViewData> {
  // 1. Extract metadata
  const metadata = extractTaskMetadata(taskContent);

  // 2. Load references
  const extractor = new ReferenceExtractor();
  const refs = extractor.extractReferences(taskContent);
  const normalized = extractor.normalizeReferences(refs, documentPath);
  const referencedDocuments = await loader.loadReferences(normalized, manager, depth);

  // 3. Build enriched task
  return {
    slug: taskSlug,
    title: heading?.title ?? extractTaskTitle(taskContent),
    content: taskContent,
    status: metadata.status,
    referencedDocuments,
    // ... other fields
  };
}
```

#### calculateTaskSummary()
Aggregate statistics calculation:
```typescript
export function calculateTaskSummary(tasks: TaskViewData[]): TaskSummary {
  const statusCounts: Record<string, number> = {};
  let withLinks = 0;
  let withReferences = 0;

  for (const task of tasks) {
    statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
    if (task.link || task.linkedDocument) withLinks++;
    if (task.referencedDocuments?.length) withReferences++;
  }

  return {
    total_tasks: tasks.length,
    by_status: statusCounts,
    with_links: withLinks,
    with_references: withReferences
  };
}
```

### Graceful Failure Handling

The tool uses `Promise.allSettled()` for partial failure resilience:

```typescript
// Parse tasks with graceful handling
const taskAddressResults = await Promise.allSettled(
  tasks.map(taskSlug => parseTaskAddress(taskSlug, documentPath))
);

// Separate successful from failed
const taskAddresses: TaskAddress[] = [];
const failedTasks: string[] = [];

taskAddressResults.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    taskAddresses.push(result.value);
  } else {
    failedTasks.push(tasks[index]);
  }
});

// If all failed, throw first error
if (taskAddresses.length === 0 && failedTasks.length > 0) {
  throw taskAddressResults[0].reason;
}
```

**Benefits:**
- View partial results even if some tasks fail
- Clear error reporting for failed tasks
- Backward compatibility (throws if all fail)

### Performance Considerations

**Batch Processing:**
- Multiple tasks processed in parallel using `Promise.allSettled()`
- Reference loading cached per document
- Heading extraction cached in document cache

**Resource Limits:**
- Maximum 10 tasks per request
- Reference depth configurable (1-5 levels)
- 30-second timeout for reference loading
- 1000-node limit for reference hierarchy

**Cache Optimization:**
- LRU cache with 1000 document limit
- Automatic eviction of least-used documents
- Access context tracking for eviction resistance

---

## Comparison with Related Tools

### view_task vs start_task

| Feature | view_task | start_task |
|---------|-----------|------------|
| **Purpose** | Browse task data | Start work with context |
| **Workflow Injection** | Names only | Full content |
| **Reference Loading** | Lists only | Full hierarchical content |
| **Session State** | No change | Updates session |
| **Use Case** | Inspection | Work initiation |

### view_task vs complete_task

| Feature | view_task | complete_task |
|---------|-----------|---------------|
| **Purpose** | Browse task data | Mark complete + get next |
| **Status Update** | No change | Marks completed |
| **Next Task** | Not provided | Suggests next |
| **Workflow Injection** | Names only | Next task workflow only |
| **Use Case** | Inspection | Work progression |

### view_task vs view_section

| Feature | view_task | view_section |
|---------|-----------|--------------|
| **Purpose** | View tasks with status | View any section |
| **Task Validation** | Required | Not applicable |
| **Status Parsing** | Yes | No |
| **Workflow Metadata** | Yes | No |
| **Use Case** | Task inspection | General content viewing |

### view_task vs task (list operation)

| Feature | view_task | task (list) |
|---------|-----------|-------------|
| **Purpose** | View specific tasks | List all tasks |
| **Task Selection** | Explicit slugs | All under Tasks section |
| **Content Included** | Full content | Title + status only |
| **References** | Loaded hierarchically | Not included |
| **Use Case** | Detailed inspection | Overview/discovery |

---

## Best Practices

### When to Use view_task

✅ **Use view_task when:**
- Browsing available tasks before starting work
- Checking status of multiple tasks
- Inspecting task metadata and references
- Understanding workflow requirements
- Validating task structure and content

❌ **Don't use view_task when:**
- Starting work on a task (use `start_task`)
- Marking task complete (use `complete_task`)
- Viewing general sections (use `view_section`)
- Listing all tasks (use `task` with `list` operation)

### Optimal Workflows

**Discovery → Start → Complete:**
```typescript
// 1. Discover available tasks
const tasks = await view_task({
  document: "/project/setup.md",
  task: ["#task1", "#task2"]
});

// 2. Start work with full context
const context = await start_task({
  document: "/project/setup.md",
  task: "#task1"
});

// 3. Complete and move to next
const next = await complete_task({
  document: "/project/setup.md",
  task: "#task1"
});
```

**Periodic Status Checks:**
```typescript
// Check progress across multiple tasks
const progress = await view_task({
  document: "/project/setup.md",
  task: ["#task1", "#task2", "#task3"]
});

const completed = progress.tasks.filter(t => t.status === 'completed').length;
const total = progress.summary.total_tasks;
console.log(`Progress: ${completed}/${total} tasks completed`);
```

### Error Handling Patterns

```typescript
try {
  const tasks = await view_task({
    document: "/project/setup.md",
    task: ["#task1", "#invalid-task"]
  });
} catch (error) {
  if (error.code === 'TASK_NOT_FOUND') {
    console.error(`Task not found: ${error.context.taskSlug}`);
    console.log(`Available tasks: ${error.context.availableTasks}`);
  } else if (error.code === 'NO_TASKS_SECTION') {
    console.error('Document has no Tasks section');
  }
}
```

---

## Related Documentation

- **Central Addressing System** - `/home/blake/Development/AI-Prompt-Guide-MCP/src/shared/addressing-system.ts`
- **Task Utilities** - `/home/blake/Development/AI-Prompt-Guide-MCP/src/shared/task-utilities.ts`
- **Task View Utilities** - `/home/blake/Development/AI-Prompt-Guide-MCP/src/shared/task-view-utilities.ts`
- **Reference Extractor** - `/home/blake/Development/AI-Prompt-Guide-MCP/src/shared/reference-extractor.ts`
- **Reference Loader** - `/home/blake/Development/AI-Prompt-Guide-MCP/src/shared/reference-loader.ts`
- **Workflow Utilities** - `/home/blake/Development/AI-Prompt-Guide-MCP/src/shared/workflow-prompt-utilities.ts`

## Version Information

**Current Version:** Alpha v0.2
**Last Updated:** 2025-10-11
**Implementation:** `/home/blake/Development/AI-Prompt-Guide-MCP/src/tools/implementations/view-task.ts`
