# Task Tool Specification

## Overview

The `task` tool provides unified task management capabilities for creating, editing, and listing tasks within AI prompt guide documents. It serves as a comprehensive task lifecycle management interface with intelligent reference extraction, hierarchical organization support, and status tracking.

**Key Capabilities:**
- **Create Tasks**: Add new tasks to the Tasks section with structured metadata
- **Edit Tasks**: Update task content, status, and references
- **List Tasks**: Query tasks with filtering, status aggregation, and hierarchical summaries
- **Reference Loading**: Automatic extraction and hierarchical loading of @references in task content
- **Next Task Detection**: Intelligent identification of next available work items

**Design Philosophy:**
- Unified interface for all task operations (single tool instead of separate create/edit/list tools)
- Tasks are sections - leverages existing section addressing and content management
- Hierarchical reference loading provides rich context for task execution
- Progressive discovery through intelligent filtering and status tracking

## Tool Registration

**Tool Name:** `task`

**Description:** "Unified task management: create, edit, and list tasks with automatic @reference extraction and hierarchical context loading"

**Input Schema:** See [Input Parameters](#input-parameters) below

## Input Parameters

All operations share a common parameter schema with operation-specific requirements:

### Common Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `document` | string | Yes | Document path (e.g., `/specs/search-api.md`) |
| `operation` | string | No | Operation type: `create`, `edit`, or `list` (default: `list`) |

### Operation-Specific Parameters

#### List Operation (`operation: "list"`)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter tasks by status: `pending`, `in_progress`, `completed`, `blocked` |

#### Create Operation (`operation: "create"`)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Task title (used for heading and slug generation) |
| `content` | string | Yes | Task content including metadata (Status, Link, etc.) |
| `task` | string | No | Reference task slug for insertion placement (inserts after this task) |

**Note:** If `task` is provided, the new task is inserted after the reference task. Otherwise, it's appended to the Tasks section.

#### Edit Operation (`operation: "edit"`)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task` | string | Yes | Task slug to edit (e.g., `initialize-database`) |
| `content` | string | Yes | New task content (replaces existing content) |

### Parameter Validation

- Document path validated using central addressing system
- Operation must be one of: `create`, `edit`, `list`
- Status filter (if provided) must be valid status value
- Task slugs validated for existence during edit operations
- Missing required parameters throw `MISSING_PARAMETER` error

## Output Format

All operations return a standardized result object with operation-specific fields.

### Common Response Fields

```typescript
{
  operation: string;        // Operation performed: "create" | "edit" | "list"
  document: string;         // Document path
  document_info?: {         // Document metadata (optional)
    slug: string;
    title: string;
    namespace: string;
  };
  timestamp: string;        // ISO 8601 timestamp
}
```

### List Operation Response

```typescript
{
  operation: "list";
  document: string;
  tasks: Array<{
    slug: string;
    title: string;
    status: string;
    link?: string;                           // Task link (→ syntax)
    referenced_documents?: HierarchicalContent[];  // @references loaded hierarchically
    hierarchical_context?: {                 // Present if task uses hierarchical naming
      full_path: string;                     // e.g., "phase-1/database/initialize"
      parent_path: string;                   // e.g., "phase-1/database"
      phase: string;                         // e.g., "phase-1"
      category: string;                      // e.g., "database"
      task_name: string;                     // e.g., "initialize"
      depth: number;                         // Hierarchy depth
    };
  }>;
  hierarchical_summary?: {                   // Present if any tasks have hierarchical_context
    by_phase: Record<string, {
      total: number;
      pending: number;
      in_progress: number;
      completed: number;
    }>;
    by_category: Record<string, {
      total: number;
      pending: number;
      in_progress?: number;
      completed?: number;
    }>;
    critical_path: string[];                 // Sorted task slugs
  };
  next_task?: {                              // Next available task (pending/in_progress)
    slug: string;
    title: string;
    link?: string;
  };
  document_info?: { ... };
  timestamp: string;
}
```

**HierarchicalContent Structure:**
```typescript
{
  path: string;              // Document path
  title: string;             // Document title
  content: string;           // Full or section-specific content
  depth: number;             // Nesting depth (0 = root)
  namespace: string;         // Document namespace
  children: HierarchicalContent[];  // Nested references
}
```

### Create Operation Response

```typescript
{
  operation: "create";
  document: string;
  task_created: {
    slug: string;            // Generated task slug
    title: string;           // Task title
  };
  document_info?: { ... };
  timestamp: string;
}
```

### Edit Operation Response

```typescript
{
  operation: "edit";
  document: string;
  document_info?: { ... };
  timestamp: string;
}
```

## Operation Workflows

### List Tasks Workflow

1. **Document Validation**
   - Parse and validate document address using `ToolIntegration.validateAndParse()`
   - Load document from cache using `DocumentManager.getDocument()`
   - Verify document exists (throw `DocumentNotFoundError` if not found)

2. **Tasks Section Discovery**
   - Find Tasks section by slug (`tasks`) or title match (`Tasks`)
   - Return empty task list if no Tasks section exists

3. **Task Identification**
   - Use `getTaskHeadingsFromHeadings()` to identify all task headings under Tasks section
   - Task headings are direct children (depth = Tasks.depth + 1) validated by `isTaskSection()`

4. **Task Metadata Extraction**
   - For each task heading:
     - Load section content using `DocumentManager.getSectionContent()`
     - Extract status using `extractTaskField()` (default: `pending`)
     - Extract link using `extractTaskLink()` (→ syntax)

5. **Reference Loading**
   - Extract @references from task content using `ReferenceExtractor.extractReferences()`
   - Normalize references to resolved paths using `ReferenceExtractor.normalizeReferences()`
   - Load hierarchical content using `ReferenceLoader.loadReferences()` with configured depth

6. **Hierarchical Context Analysis**
   - Check task slugs for hierarchical naming (contains `/`)
   - Parse path components: `phase/category/task-name`
   - Build hierarchical context with parent paths and depth

7. **Filtering and Aggregation**
   - Apply status filter if specified
   - Generate hierarchical summary (by phase, by category, critical path)
   - Identify next available task (first pending/in_progress in document order)

8. **Response Construction**
   - Build task list with all metadata
   - Include hierarchical summary if hierarchical tasks present
   - Include next task suggestion
   - Add document info and timestamp

### Create Task Workflow

1. **Parameter Validation**
   - Validate required parameters: `title`, `content`
   - Parse document address using addressing system
   - Validate optional `task` parameter (reference task for placement)

2. **Tasks Section Verification**
   - Check for existing Tasks section using `ensureTasksSection()`
   - Throw `NO_TASKS_SECTION` error if Tasks section doesn't exist
   - Note: Tool doesn't auto-create Tasks section (must be added via section tool)

3. **Task Slug Generation**
   - Generate task slug from title using `titleToSlug()`
   - Slug is flat (not prefixed with `tasks/`)
   - Example: "Initialize Database" → `initialize-database`

4. **Task Content Formatting**
   - Build task content in standard format:
     ```markdown
     ### {title}
     {content}
     ```
   - Content should include metadata lines (Status, Link, etc.)

5. **Section Insertion**
   - Determine operation: `insert_after` (if reference task) or `append_child` (default)
   - Determine target section: reference task slug or `tasks`
   - Use `performSectionEdit()` to insert task at correct position

6. **Response Construction**
   - Return created task metadata (slug, title)
   - Include document info and timestamp

### Edit Task Workflow

1. **Parameter Validation**
   - Validate required parameters: `task`, `content`
   - Parse document and task addresses using addressing system
   - Verify task address exists in addresses object

2. **Task Validation**
   - Verify task exists in document
   - Addressing system validation ensures task is valid section

3. **Content Replacement**
   - Use `performSectionEdit()` with `replace` operation
   - Replace entire task section content with new content
   - Maintain task heading (### Title)

4. **Response Construction**
   - Return operation confirmation
   - Include document info and timestamp

## Integration Points

### Central Addressing System

**Task Address Structure:**
```typescript
interface TaskAddress {
  document: DocumentAddress;
  slug: string;              // Task slug (flat, no prefix)
  fullPath: string;          // Document path + # + slug
  isTask: true;              // Type discrimination
  cacheKey: string;          // Cache optimization
}
```

**Usage Pattern:**
```typescript
const { addresses } = ToolIntegration.validateAndParse({
  document: documentPath,
  task: taskSlug
});

// Access validated addresses
const docPath = addresses.document.path;
const taskSlug = addresses.task?.slug;
```

**Error Handling:**
- `DocumentNotFoundError` - Document doesn't exist
- `SectionNotFoundError` - Task section not found
- `AddressingError` - Generic addressing validation failure

### Reference Extraction System

**ReferenceExtractor** provides regex-based @reference extraction:

**Supported Formats:**
- `@#section` - Within-document reference (loads section from current document)
- `@/path/doc.md` - Cross-document reference (loads full document)
- `@/path/doc` - Cross-document without .md (extension added automatically)
- `@/path/doc.md#section` - Cross-document with section (loads specific section)

**Pattern:** `/@(?:\/[^\s\]),;:!?]+(?:#[^\s\]),;:!?]*)?|#[^\s\]),;:!?]*)/g`

**Usage:**
```typescript
const extractor = new ReferenceExtractor();

// Extract references from content
const refs = extractor.extractReferences(taskContent);
// Returns: ['@/api/auth.md', '@#local-section']

// Normalize to resolved paths
const normalized = extractor.normalizeReferences(refs, '/current/doc.md');
// Returns: [{ originalRef, resolvedPath, documentPath, sectionSlug }, ...]
```

### Reference Loading System

**ReferenceLoader** provides hierarchical content loading with cycle detection:

**Features:**
- Recursive loading up to configured depth (controlled by `REFERENCE_EXTRACTION_DEPTH`)
- Cycle detection prevents infinite loops
- Node count limits (MAX_TOTAL_NODES = 1000)
- Timeout protection (30 seconds)
- Cache-friendly with `AccessContext.REFERENCE` (2x eviction resistance)

**Usage:**
```typescript
const loader = new ReferenceLoader();
const hierarchy = await loader.loadReferences(
  normalizedRefs,
  manager,
  config.referenceExtractionDepth  // Depth from environment
);
```

**Depth Configuration:**
```bash
# .env file
REFERENCE_EXTRACTION_DEPTH=3  # Default: 3, Range: 1-5
```

**Depth Behavior:**
- `1` - Direct references only (no nested references)
- `3` - Balanced depth (recommended, default)
- `5` - Maximum depth (deep documentation trees)

### Task View Utilities

**Task Metadata Extraction:**
```typescript
extractTaskField(content, 'Status')     // Extract specific field
extractTaskLink(content)                // Extract → link
extractLinkedDocument(content)          // Extract @/path/doc.md link
extractTaskMetadata(content)            // Extract all metadata
```

**Supported Metadata Formats:**
```markdown
* Status: pending
- Status: pending
**Status:** pending
```

**Task Enrichment:**
```typescript
// Comprehensive task enrichment with references
const enrichedTask = await enrichTaskWithReferences(
  manager,
  documentPath,
  taskSlug,
  taskContent,
  heading,
  taskAddress
);
```

### Document Cache

**Cache Access Context:**
- Task listing uses `AccessContext.REFERENCE` for referenced documents
- Provides 2x eviction resistance for better performance
- Direct document access uses `AccessContext.DIRECT` (default)

**Cache Behavior:**
- Documents cached during reference loading
- Section content accessed through `DocumentManager.getSectionContent()`
- Cache invalidation on errors to maintain consistency

## Cache and State Management

### Document Cache

**Lifecycle:**
1. Document loaded during address validation
2. Section content loaded for each task
3. Referenced documents loaded with `AccessContext.REFERENCE`
4. Cache maintained across multiple task operations

**Error Recovery:**
```typescript
try {
  // Task processing
} catch (error) {
  // Critical operation failed - invalidate cache
  manager['cache'].invalidateDocument(documentPath);
  throw error;
}
```

### Reference Hierarchy Caching

**Per-Reference Cycle Detection:**
- `visitedPaths` Set tracks paths within current operation
- Reset between tool invocations
- Prevents circular reference loading

**Node Count Tracking:**
```typescript
const nodeTracker = { count: 0 };  // Tracks total nodes across all branches
nodeTracker.count++;                // Incremented for each loaded document
```

**Limits:**
- MAX_TOTAL_NODES: 1000 documents per operation
- DEFAULT_TIMEOUT_MS: 30000ms (30 seconds)
- Prevents exponential growth and memory exhaustion

### Session State

**No Session Persistence:**
- Task tool doesn't use progressive discovery
- No session state tracking required
- Each invocation is independent

## Use Cases and Examples

### Example 1: Create a Basic Task

**Input:**
```json
{
  "document": "/project/setup.md",
  "operation": "create",
  "title": "Initialize Database",
  "content": "* Status: pending\n* Priority: high\n\nSet up PostgreSQL database with initial schema."
}
```

**Output:**
```json
{
  "operation": "create",
  "document": "/project/setup.md",
  "task_created": {
    "slug": "initialize-database",
    "title": "Initialize Database"
  },
  "document_info": {
    "slug": "setup",
    "title": "Project Setup Guide",
    "namespace": "project"
  },
  "timestamp": "2025-10-11T15:30:00.000Z"
}
```

### Example 2: Create Task with @references

**Input:**
```json
{
  "document": "/project/setup.md",
  "operation": "create",
  "title": "Configure Authentication",
  "content": "* Status: pending\n\nImplement authentication system following @/api/auth.md#overview.\n\nRefer to @/security/best-practices.md for security guidelines."
}
```

**Result:**
- Task created with slug `configure-authentication`
- When listed, task will include hierarchical references:
  - `/api/auth.md#overview` (depth 0)
    - Any references in the overview section (depth 1)
  - `/security/best-practices.md` (depth 0)
    - Any references in that document (depth 1)

### Example 3: List All Tasks

**Input:**
```json
{
  "document": "/project/setup.md",
  "operation": "list"
}
```

**Output:**
```json
{
  "operation": "list",
  "document": "/project/setup.md",
  "tasks": [
    {
      "slug": "initialize-database",
      "title": "Initialize Database",
      "status": "pending",
      "link": null
    },
    {
      "slug": "configure-authentication",
      "title": "Configure Authentication",
      "status": "pending",
      "referenced_documents": [
        {
          "path": "/api/auth.md",
          "title": "Authentication Guide",
          "content": "# Overview\n\nAuthentication system uses JWT tokens...",
          "depth": 0,
          "namespace": "api",
          "children": []
        },
        {
          "path": "/security/best-practices.md",
          "title": "Security Best Practices",
          "content": "# Security Guidelines\n\nAlways use HTTPS...",
          "depth": 0,
          "namespace": "security",
          "children": [
            {
              "path": "/security/encryption.md",
              "title": "Encryption Standards",
              "content": "# Encryption\n\nUse AES-256...",
              "depth": 1,
              "namespace": "security",
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "next_task": {
    "slug": "initialize-database",
    "title": "Initialize Database"
  },
  "document_info": {
    "slug": "setup",
    "title": "Project Setup Guide",
    "namespace": "project"
  },
  "timestamp": "2025-10-11T15:35:00.000Z"
}
```

### Example 4: List Tasks with Status Filter

**Input:**
```json
{
  "document": "/project/setup.md",
  "operation": "list",
  "status": "in_progress"
}
```

**Output:**
```json
{
  "operation": "list",
  "document": "/project/setup.md",
  "tasks": [
    {
      "slug": "configure-authentication",
      "title": "Configure Authentication",
      "status": "in_progress",
      "referenced_documents": [...]
    }
  ],
  "next_task": {
    "slug": "configure-authentication",
    "title": "Configure Authentication"
  },
  "document_info": {...},
  "timestamp": "2025-10-11T15:40:00.000Z"
}
```

### Example 5: Edit Task Content

**Input:**
```json
{
  "document": "/project/setup.md",
  "operation": "edit",
  "task": "initialize-database",
  "content": "* Status: in_progress\n* Priority: high\n* Assigned: @john\n\nSet up PostgreSQL database with initial schema.\n\n**Progress:** Created database, now setting up tables."
}
```

**Output:**
```json
{
  "operation": "edit",
  "document": "/project/setup.md",
  "document_info": {
    "slug": "setup",
    "title": "Project Setup Guide",
    "namespace": "project"
  },
  "timestamp": "2025-10-11T15:45:00.000Z"
}
```

### Example 6: Hierarchical Task Organization

**Task Slugs:**
```
phase-1/database/initialize
phase-1/database/migrate
phase-1/auth/setup-jwt
phase-2/api/create-endpoints
phase-2/api/add-validation
```

**List Output:**
```json
{
  "operation": "list",
  "document": "/project/roadmap.md",
  "tasks": [
    {
      "slug": "phase-1/database/initialize",
      "title": "Initialize Database",
      "status": "completed",
      "hierarchical_context": {
        "full_path": "phase-1/database/initialize",
        "parent_path": "phase-1/database",
        "phase": "phase-1",
        "category": "database",
        "task_name": "initialize",
        "depth": 3
      }
    },
    ...
  ],
  "hierarchical_summary": {
    "by_phase": {
      "phase-1": {
        "total": 3,
        "pending": 0,
        "in_progress": 1,
        "completed": 2
      },
      "phase-2": {
        "total": 2,
        "pending": 2,
        "in_progress": 0,
        "completed": 0
      }
    },
    "by_category": {
      "database": {
        "total": 2,
        "pending": 0,
        "in_progress": 0,
        "completed": 2
      },
      "auth": {
        "total": 1,
        "pending": 0,
        "in_progress": 1
      },
      "api": {
        "total": 2,
        "pending": 2
      }
    },
    "critical_path": [
      "phase-1/auth/setup-jwt",
      "phase-2/api/create-endpoints",
      "phase-2/api/add-validation"
    ]
  },
  "next_task": {
    "slug": "phase-1/auth/setup-jwt",
    "title": "Setup JWT Authentication"
  },
  "timestamp": "2025-10-11T16:00:00.000Z"
}
```

### Example 7: Nested Reference Loading

**Task Content:**
```markdown
### Configure API Gateway

* Status: pending

Set up API gateway using @/api/gateway.md.

Reference @/infrastructure/load-balancer.md for scaling configuration.
```

**Reference Tree:**
```
Task: Configure API Gateway
├─ @/api/gateway.md (depth 0)
│  ├─ @/api/auth.md (depth 1)
│  │  └─ @/security/jwt.md (depth 2)
│  └─ @/api/rate-limiting.md (depth 1)
└─ @/infrastructure/load-balancer.md (depth 0)
   ├─ @/infrastructure/auto-scaling.md (depth 1)
   └─ @/monitoring/metrics.md (depth 1)
```

**Depth Configuration Impact:**

**REFERENCE_EXTRACTION_DEPTH=1:**
```
Task: Configure API Gateway
├─ @/api/gateway.md (loaded)
└─ @/infrastructure/load-balancer.md (loaded)
```

**REFERENCE_EXTRACTION_DEPTH=2:**
```
Task: Configure API Gateway
├─ @/api/gateway.md (loaded)
│  ├─ @/api/auth.md (loaded)
│  └─ @/api/rate-limiting.md (loaded)
└─ @/infrastructure/load-balancer.md (loaded)
   ├─ @/infrastructure/auto-scaling.md (loaded)
   └─ @/monitoring/metrics.md (loaded)
```

**REFERENCE_EXTRACTION_DEPTH=3:**
```
Task: Configure API Gateway
├─ @/api/gateway.md (loaded)
│  ├─ @/api/auth.md (loaded)
│  │  └─ @/security/jwt.md (loaded)
│  └─ @/api/rate-limiting.md (loaded)
└─ @/infrastructure/load-balancer.md (loaded)
   ├─ @/infrastructure/auto-scaling.md (loaded)
   └─ @/monitoring/metrics.md (loaded)
```

## Implementation Details

### File Structure

**Primary Implementation:**
- `/src/tools/implementations/task.ts` - Main tool implementation (591 lines)
- `/src/tools/schemas/task-schemas.ts` - Schema definitions and constants

**Shared Utilities:**
- `/src/shared/reference-extractor.ts` - Reference extraction system
- `/src/shared/reference-loader.ts` - Hierarchical reference loading
- `/src/shared/task-view-utilities.ts` - Task metadata and enrichment
- `/src/shared/task-utilities.ts` - Task identification logic
- `/src/shared/addressing-system.ts` - Central addressing and validation

### Core Functions

**Main Entry Point:**
```typescript
async function task(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<TaskResult>
```

**Operation Handlers:**
```typescript
async function listTasks(
  manager: DocumentManager,
  addresses: { document: DocumentAddress },
  statusFilter?: string,
  documentInfo?: unknown
): Promise<TaskResult>

async function createTask(
  manager: DocumentManager,
  addresses: { document: DocumentAddress },
  title: string,
  content: string,
  referenceSlug?: string,
  documentInfo?: unknown
): Promise<TaskResult>

async function editTask(
  manager: DocumentManager,
  addresses: { document: DocumentAddress; task?: TaskAddress },
  content: string,
  documentInfo?: unknown
): Promise<TaskResult>
```

**Helper Functions:**
```typescript
async function ensureTasksSection(
  manager: DocumentManager,
  docPath: string
): Promise<void>

function findNextTask(
  tasks: Array<{ status: string; slug: string; title: string; link?: string }>
): { slug: string; title: string; link?: string } | undefined

function generateHierarchicalSummary(
  tasks: Array<{ slug: string; status: string; hierarchical_context?: TaskHierarchicalContext }>
): HierarchicalSummaryResult | null

function getTaskHierarchicalContext(
  taskSlug: string
): TaskHierarchicalContext | null
```

### Error Handling

**Error Types:**
- `AddressingError` - Invalid addresses or addressing failures
- `DocumentNotFoundError` - Document doesn't exist
- `SectionNotFoundError` - Task section not found (from addressing system)

**Error Context:**
```typescript
{
  code: string;                    // Error code (MISSING_PARAMETER, NO_TASKS_SECTION, etc.)
  message: string;                 // Human-readable error message
  context: {
    document?: string;
    task?: string;
    availableSections?: string[];  // For section not found errors
    ...
  }
}
```

**Error Recovery Patterns:**

1. **Cache Invalidation on Critical Failure:**
```typescript
try {
  // Load tasks
} catch (error) {
  manager['cache'].invalidateDocument(documentPath);
  throw error;
}
```

2. **Graceful Degradation:**
```typescript
// Skip failed references but continue processing
for (const ref of refs) {
  try {
    const content = await loadSingleReference(ref);
    results.push(content);
  } catch (error) {
    logger.warn(`Failed to load reference "${ref.originalRef}"`, { error });
  }
}
```

### Performance Optimizations

**Reference Loading:**
- LRU cache with eviction protection (AccessContext.REFERENCE)
- Parallel reference loading with Promise.all
- Node count limits prevent exponential growth
- Timeout protection (30 seconds)

**Task Processing:**
- Batch task loading with Promise.allSettled
- Cycle detection prevents infinite loops
- Early termination on depth/count limits

**Cache Efficiency:**
- Cache keys optimized for addressing patterns
- Document reuse across multiple task operations
- Section content cached through DocumentManager

### Type Definitions

**TaskResult Interface:**
```typescript
interface TaskResult {
  operation: string;
  document: string;
  tasks?: Array<{
    slug: string;
    title: string;
    status: string;
    link?: string;
    referenced_documents?: HierarchicalContent[];
    hierarchical_context?: TaskHierarchicalContext;
  }>;
  hierarchical_summary?: {
    by_phase: Record<string, StatusCounts>;
    by_category: Record<string, StatusCounts>;
    critical_path: string[];
  };
  next_task?: {
    slug: string;
    title: string;
    link?: string;
  };
  task_created?: {
    slug: string;
    title: string;
  };
  document_info?: {
    slug: string;
    title: string;
    namespace: string;
  };
  timestamp: string;
}
```

**TaskHierarchicalContext Interface:**
```typescript
interface TaskHierarchicalContext {
  full_path: string;        // Complete hierarchical path
  parent_path: string;      // Parent path (all but last component)
  phase: string;            // First path component
  category: string;         // Second path component
  task_name: string;        // Last path component
  depth: number;            // Number of path components
}
```

### Hierarchical Reference Loading

**Algorithm:**
1. Extract @references from content using regex pattern
2. Normalize references to absolute paths with sections
3. Filter out already-visited paths (cycle detection)
4. Load document content (full or section-specific)
5. Recursively extract and load nested references
6. Build hierarchical tree with depth tracking
7. Stop at configured depth or node count limit

**Cycle Detection:**
```typescript
const visitedPaths = new Set<string>();
visitedPaths.add(ref.documentPath);  // Mark as visited

// Filter nested references
const filteredRefs = nestedRefs.filter(ref => {
  if (visitedPaths.has(ref.documentPath)) {
    logger.warn(`Cycle detected for path: ${ref.documentPath}`);
    return false;
  }
  return true;
});
```

**Resource Limits:**
```typescript
// Prevent exponential growth
if (nodeTracker.count >= MAX_TOTAL_NODES) {
  logger.error(`Node limit exceeded (${MAX_TOTAL_NODES})`);
  return [];
}

// Prevent long-running operations
if (Date.now() - operationStart > DEFAULT_TIMEOUT_MS) {
  throw new Error('Reference loading timeout exceeded');
}
```

### Depth Control Configuration

**Environment Variable:**
```bash
REFERENCE_EXTRACTION_DEPTH=3  # Default: 3, Range: 1-5
```

**Config Loading:**
```typescript
import { loadConfig } from '../config.js';

const config = loadConfig();
const maxDepth = config.referenceExtractionDepth;  // 1-5, validated
```

**Validation:**
- Integer validation: must be whole number
- Range validation: 1-5 inclusive
- Invalid values default to 3
- Configuration errors logged with context

## Related Tools

### section Tool

**Relationship:**
- Tasks ARE sections - same underlying structure
- `section` tool can manipulate task content directly
- Task tool adds task-specific logic (status extraction, reference loading)

**When to Use section vs task:**
- **Use task**: Task-specific operations (status tracking, reference loading, next task detection)
- **Use section**: Generic section operations (arbitrary content manipulation, structural changes)

### complete_task Tool

**Relationship:**
- Specialized tool for marking tasks complete
- Uses same reference loading and enrichment utilities
- Provides next task suggestion after completion

**Shared Components:**
- `enrichTaskWithReferences()` - Task data enrichment
- `findNextAvailableTask()` - Next task detection
- `extractTaskMetadata()` - Metadata parsing

### view_task Tool

**Relationship:**
- Read-only task viewing with clean output
- No hierarchical summaries or aggregation
- Uses same enrichment utilities

**Shared Components:**
- `enrichTaskWithReferences()` - Comprehensive task data
- `formatTaskResponse()` - Consistent response formatting

## Testing Strategy

**Unit Tests:**
- Schema validation tests
- Reference extraction pattern tests
- Hierarchical context parsing tests
- Error handling tests

**Integration Tests:**
- Full workflow tests (create → list → edit)
- Reference loading with depth control
- Cycle detection validation
- Cache consistency verification

**Test Files:**
- `/src/tools/__tests__/task-status-parsing.test.ts`
- `/src/tools/implementations/__tests__/[operation]-task.test.ts`
- `/src/shared/__tests__/task-view-utilities.test.ts`
- `/src/shared/__tests__/reference-*.test.ts`

## Limitations and Edge Cases

### Current Limitations

1. **No Tasks Section Auto-Creation**
   - Tool requires existing Tasks section
   - Must use `section` tool to create Tasks section first
   - Error code: `NO_TASKS_SECTION`

2. **Flat Task Slugs**
   - Task slugs are flat (not prefixed with `tasks/`)
   - Hierarchical organization detected from slug content (e.g., `phase-1/database/init`)
   - Document structure maintains relationship, not slug naming

3. **No Task Deletion**
   - Use `section` tool with `remove` operation to delete tasks
   - Task tool focused on lifecycle management, not destruction

4. **Reference Loading Limits**
   - Maximum 1000 nodes per operation
   - 30-second timeout for entire operation
   - Prevents exponential growth in deeply nested trees

### Edge Cases

**Empty Tasks Section:**
- Returns empty task list
- No error thrown
- Next task will be undefined

**Missing Status Field:**
- Defaults to `pending`
- No validation of status values during list
- Allows custom status values

**Circular References:**
- Detected by visitedPaths Set
- Logged as warning
- Does not cause infinite loops or errors

**Deeply Nested References:**
- Limited by `REFERENCE_EXTRACTION_DEPTH`
- Stops loading at max depth
- No error thrown, silently truncates

**Large Reference Trees:**
- Limited by `MAX_TOTAL_NODES` (1000)
- Stops loading when limit reached
- Prevents memory exhaustion

**Invalid Reference Formats:**
- Skipped with warning log
- Processing continues for valid references
- No error thrown to tool user

## Best Practices

### Task Content Structure

**Recommended Format:**
```markdown
### Task Title

* Status: pending
* Priority: high
* Assigned: @username

Task description with context.

@/path/to/reference.md for additional details.

**Progress Notes:**
- Step 1 completed
- Step 2 in progress
```

### Reference Usage

**Good Reference Patterns:**
```markdown
See @/api/auth.md#overview for authentication flow.
Implementation details in @/infrastructure/database.md.
Follow @/security/best-practices.md guidelines.
```

**Avoid:**
```markdown
Check out the auth docs.  (no @reference, not loaded)
@invalid-format  (not a valid path)
```

### Hierarchical Task Organization

**Effective Hierarchical Slugs:**
```
phase-1/setup/environment
phase-1/setup/dependencies
phase-2/implementation/api
phase-2/implementation/ui
```

**Benefits:**
- Automatic grouping in hierarchical_summary
- Critical path generation
- Progress tracking by phase/category

### Reference Depth Configuration

**Depth Selection Guidelines:**
- **Depth 1**: Simple tasks with direct references only
- **Depth 2-3**: Most workflows (balanced performance/context)
- **Depth 4-5**: Complex documentation trees requiring deep context

**Performance Considerations:**
- Higher depth = more documents loaded
- Monitor operation time (30s timeout)
- Consider node count limits (1000 nodes)

## Migration Notes

### From Separate Tools to Unified Task Tool

**Old Pattern:**
```typescript
// Previously: separate tools
await createTask({ ... });
await editTask({ ... });
await listTasks({ ... });
```

**New Pattern:**
```typescript
// Now: unified tool with operation parameter
await task({ operation: 'create', ... });
await task({ operation: 'edit', ... });
await task({ operation: 'list', ... });
```

**Benefits:**
- Consistent addressing system
- Shared validation logic
- Reduced code duplication
- Unified error handling

### Schema Changes

**Parameter Consolidation:**
- All operations share common schema
- Operation-specific parameters optional
- Validation enforces required parameters per operation

## Version History

**Current Implementation:**
- Version: 1.x (production-ready)
- File: `/src/tools/implementations/task.ts` (591 lines)
- Last Major Update: Unified addressing system integration

**Key Milestones:**
- Unified task operations (create/edit/list in single tool)
- Integrated central addressing system
- Hierarchical reference loading with depth control
- Cycle detection and resource limits
- Shared task utilities for cross-tool consistency
