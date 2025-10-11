# AI Prompt Guide MCP

**Intelligent documentation management for AI agents with context-aware workflow injection and hierarchical reference loading.**

Transform your Markdown documentation into an interconnected knowledge graph that AI agents can navigate intelligently, loading exactly the context needed for each task with automatic workflow guidance.

---

## Table of Contents

- [What Is This?](#what-is-this)
- [Knowledge Graph Topology](#knowledge-graph-topology)
- [Context Engineering & Workflow Injection](#context-engineering--workflow-injection)
- [Complete Tool Reference](#complete-tool-reference)
- [Installation](#installation)
- [Use Cases](#use-cases)
- [License](#license)

---

## What Is This?

AI Prompt Guide MCP is a Model Context Protocol server that enables AI agents to work with **structured, interconnected documentation as a knowledge graph**. Documents reference each other, tasks inject relevant workflows, and context loads hierarchically—all automatically.

### Core Capabilities

**📚 Intelligent Document Management**
- Cross-document references with `@/path/doc.md#section` syntax
- Hierarchical content loading with cycle detection
- Namespace organization for large documentation sets
- Flat section addressing with automatic duplicate handling

**⚡ Context Engineering**
- **Smart workflow injection** based on session state (new vs. resuming)
- **Hierarchical @reference loading** brings in relevant documentation automatically
- **Progressive discovery** patterns conserve context tokens
- **Session-resilient** workflows survive context compression

**🎯 Task Management**
- Sequential task progression with status tracking
- Automatic next-task suggestion with context
- Workflow prompts injected based on task metadata
- Reference documents loaded hierarchically per task

---

## Knowledge Graph Topology

Your documentation forms a **multi-layer knowledge graph** where AI agents traverse structured relationships:

```
┌─────────────────────────────────────────────────────┐
│ DOCUMENT LAYER (Hyperedges)                        │
│ ├─ Documents bundle related sections               │
│ ├─ Organized by namespace (/api/, /guides/)        │
│ └─ Metadata: title, modified, links                │
└─────────────────────────────────────────────────────┘
              │
              ├─> SECTION LAYER (Content Nodes)
              │   ├─ Unique slug addressing (#overview, #task-1)
              │   ├─ Hierarchical parent/child relationships
              │   └─ Cross-document references (@/doc.md#section)
              │
              └─> TASK LAYER (Workflow Nodes)
                  ├─ Sequential dependencies (task → next)
                  ├─ Status tracking (pending/in-progress/completed)
                  ├─ Workflow field: Task-specific guidance
                  └─ Referenced documents: Hierarchical context loading
```

### How References Work

When a task contains `@/api/auth.md#overview`, the system:

1. **Extracts** the reference from task content
2. **Normalizes** it to an absolute document path
3. **Loads** the referenced section content
4. **Recursively loads** any @references in that section (up to configured depth)
5. **Detects cycles** to prevent infinite loops
6. **Returns hierarchical tree** with all loaded context

**Example Reference Tree:**
```
Task: "Configure API Gateway"
└─ @/api/gateway.md (depth 0)
   ├─ @/api/auth.md (depth 1)
   │  └─ @/security/jwt.md (depth 2)
   └─ @/api/rate-limiting.md (depth 1)
```

---

## Context Engineering & Workflow Injection

The system provides **deterministic, session-aware workflow injection** that automatically adapts based on whether you're starting new work or continuing a session.

### The Problem This Solves

**Without Context Engineering:**
- Agents must manually find and load relevant documentation
- Workflow prompts duplicated or forgotten across tasks
- Context compression breaks workflow continuity
- No automatic relationship traversal

**With Context Engineering:**
- Relevant docs load automatically via @references
- Workflows inject deterministically based on tool choice
- Session resumption re-injects project methodology
- Zero duplication in continuous work

### Three-Tool Task Architecture

The system uses **tool choice** to signal session state:

```
┌──────────────────┬───────────────┬────────────────┬──────────────┐
│ Tool             │ Task Workflow │ Main Workflow  │ References   │
├──────────────────┼───────────────┼────────────────┼──────────────┤
│ view_task        │ Name only     │ Never          │ Lists only   │
│ start_task       │ ✅ Full       │ ✅ Yes         │ ✅ Loaded    │
│ complete_task    │ ✅ Next task  │ ❌ No          │ ✅ Loaded    │
└──────────────────┴───────────────┴────────────────┴──────────────┘
```

### Session Lifecycle Example

```
NEW SESSION OR AFTER CONTEXT COMPRESSION
↓
1. view_task(task: "implement-auth")    → Browse available tasks (no injection)
2. start_task(task: "implement-auth")   → Main workflow + Task workflow + References ✅
   ├─ Main-Workflow: "spec-first-integration" (from first task)
   ├─ Workflow: "simplicity-gate" (from current task)
   └─ @/api/auth-spec.md loaded hierarchically

3. complete_task(task: "implement-auth") → Get next task
   └─ Next task workflow only (no main workflow duplication)

4. complete_task(task: "setup-database") → Continue work
   └─ Next task workflow only

[CONTEXT COMPRESSION - Session Reset]
↓
5. start_task(task: "create-api")       → Main workflow RE-INJECTED ✅
   ├─ Main-Workflow: "spec-first-integration" (re-injected!)
   ├─ Workflow: "multi-option-tradeoff"
   └─ @/api/design.md loaded hierarchically
```

### Why This Matters

**Zero Duplication**: Use `complete_task` for continuous work—main workflow isn't re-injected

**Session Resilient**: Use `start_task` after compression—main workflow automatically re-injected

**Deterministic**: Tool choice signals intent; no manual prompt management

**Context Aware**: System knows whether you're starting fresh or continuing

### Workflow Types

**Main-Workflow** (Project-level methodology)
- Defined in **first task** of document
- Represents overall project approach
- Re-injected only when starting/resuming work
- Example: `"spec-first-integration"`, `"causal-flow-mapping"`

**Workflow** (Task-specific guidance)
- Defined per-task as needed
- Process guidance for that specific task
- Always injected with task data
- Example: `"multi-option-tradeoff"`, `"simplicity-gate"`

**Example Task Metadata:**
```markdown
### Design API Architecture
- Status: pending
- Main-Workflow: spec-first-integration   ← Project methodology (first task only)
- Workflow: multi-option-tradeoff          ← Task-specific process

Design the REST API architecture.

@/specs/api-requirements.md
@/architecture/patterns.md
```

---

## Complete Tool Reference

The system provides **10 powerful tools** organized by function, all using intelligent context engineering.

### 📄 Document Creation & Discovery

#### `create_document` - Progressive Document Creation
Guided document creation with namespace-specific templates and intelligent suggestions.

**Features:**
- **Progressive discovery** (3 stages: Discovery → Instructions → Creation)
- **Namespace templates** (API specs, guides, components, services, troubleshooting)
- **Smart suggestions** analyze existing docs for related content
- **Security validation** prevents path traversal attacks

**Use when:** Creating new documentation with guidance and structure

---

#### `browse_documents` - Unified Browsing & Search
Explore documents by folder structure or perform full-text search.

**Features:**
- **Two modes**: Browse (no query) shows structure, Search (with query) finds content
- **Namespace awareness** understands document organization
- **Relevance scoring** ranks search results with context
- **Relationship analysis** shows document interconnections

**Use when:** Discovering what documentation exists or finding specific content

---

### ✏️ Content Operations

#### `section` - Complete Section Management
Unified tool for ALL section operations with automatic depth calculation.

**Operations:**
- **Edit**: `replace`, `append`, `prepend`
- **Create**: `insert_before`, `insert_after`, `append_child` (auto-depth!)
- **Delete**: `remove`

**Features:**
- **Batch support** for multiple operations in single call
- **Link validation** checks for broken @references
- **Auto-depth calculation** for append_child operation
- **Markdown-aware** uses AST-based parsing, not string manipulation

**Use when:** Adding, modifying, or removing document sections

---

#### `task` - Unified Task Management
Complete task lifecycle: create, edit, and list with automatic @reference extraction.

**Operations:**
- **create**: Add new tasks with metadata
- **edit**: Update task content and status
- **list**: Query tasks with filtering and next-task detection

**Features:**
- **Hierarchical @reference loading** brings in documentation context
- **Status filtering** (pending, in_progress, completed, blocked)
- **Hierarchical organization** supports phase/category grouping
- **Next task detection** finds first available work item

**Use when:** Managing task creation, updates, and discovery

---

### 🔄 Task Workflow Tools

#### `start_task` - Start Work with Full Context
**The primary entry point** for beginning work on any task.

**What it injects:**
1. **Task-specific workflow** (Workflow field) - Process guidance for this task
2. **Main workflow** (Main-Workflow from first task) - Project methodology
3. **Referenced documents** (@references) - Hierarchical context up to depth 3

**Use when:**
- Starting a new task for the first time
- Resuming work after context compression
- Beginning a new work session

**Example response:**
```json
{
  "task": {
    "slug": "implement-auth",
    "workflow": { "name": "simplicity-gate", "content": "..." },
    "main_workflow": { "name": "spec-first-integration", "content": "..." },
    "referenced_documents": [
      { "path": "/api/auth-spec.md", "content": "...", "children": [...] }
    ]
  }
}
```

---

#### `complete_task` - Finish and Get Next
Mark current task complete and automatically get the next task with its context.

**What it does:**
1. **Updates task status** to "completed" with timestamp and notes
2. **Finds next available task** (first pending/in-progress after current)
3. **Injects next task workflow** (task-specific only, NOT main workflow)
4. **Loads next task references** hierarchically for context

**Use when:**
- Finishing current task in ongoing session
- Continuing sequential work flow
- Want next task suggestion with minimal duplication

**Key difference:** Does NOT re-inject main workflow (already in context from start_task)

---

### 👁️ View & Inspection Tools

#### `view_document` - Comprehensive Document Inspection
Inspect document structure with full statistics and metadata.

**What you get:**
- **Document metadata** (title, namespace, modified date)
- **Section hierarchy** with heading structure
- **Link statistics** (total, internal, external, broken)
- **Task statistics** (total, completed, pending)
- **Word/heading counts** and file metadata

**Use when:** Need detailed overview of document structure and health

---

#### `view_section` - Clean Section Content
View specific sections without stats overhead—just clean content.

**Features:**
- **Batch viewing** (up to 10 sections)
- **Reference extraction** shows @links in content
- **Hierarchy detection** identifies parent/child relationships
- **Summary statistics** when viewing multiple sections

**Use when:** Quickly reading section content without full document context

---

#### `view_task` - Passive Task Inspection
Browse task data with workflow metadata (names only, no content injection).

**What you get:**
- **Task status** and basic metadata
- **Workflow names** (not full content)
- **Reference list** (@references present, not loaded)
- **Batch support** for multiple tasks

**Use when:** Inspecting tasks without triggering full context loading

**Key difference:** Shows workflow NAME only (unlike start_task which injects full content)

---

### 🗂️ Document Lifecycle Management

#### `manage_document` - Complete Document Operations
Unified tool for ALL document lifecycle operations with batch support.

**Operations:**
- **archive**: Safe archival with audit trails (timestamped, recoverable)
- **delete**: Permanent deletion (requires confirm: true)
- **rename**: Update document title (first heading only)
- **move**: Relocate to different path/namespace

**Features:**
- **Batch operations** (up to 100 operations)
- **Audit trails** for archive operations with recovery data
- **Path normalization** handles various path formats
- **Safety checks** require confirmation for destructive operations

**Use when:** Reorganizing, retiring, or relocating documents

---

### Key Tool Design Principles

1. **Context Engineering**: Tools automatically load relevant context via @references
2. **Session Awareness**: start_task vs complete_task signal session state
3. **Unified Operations**: Single tools handle related operations (section, task, manage_document)
4. **Batch Support**: Process multiple operations efficiently
5. **Type Safety**: Central addressing system validates all paths
6. **Graceful Degradation**: Missing workflows/references don't break execution

---

## Installation

### For Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-prompt-guide-mcp": {
      "command": "npx",
      "args": ["-y", "ai-prompt-guide-mcp"],
      "env": {
        "DOCS_BASE_PATH": "./.ai-prompt-guide/docs",
        "REFERENCE_EXTRACTION_DEPTH": "3"
      }
    }
  }
}
```

### Configuration Options

**Required:**
- `DOCS_BASE_PATH` - Path to your documents directory (e.g., `./.ai-prompt-guide/docs`)

**Optional:**
- `REFERENCE_EXTRACTION_DEPTH` - How deep to load @references hierarchically (1-5, default: 3)
  - `1` - Direct references only
  - `3` - Balanced depth (recommended)
  - `5` - Maximum depth for complex doc trees
- `LOG_LEVEL` - Logging verbosity: `debug`, `info`, `warn`, `error` (default: `info`)

### Document Structure

Create your docs directory with optional namespace organization:

```
.ai-prompt-guide/docs/
├── api/
│   ├── specs/
│   │   └── authentication.md
│   └── guides/
│       └── getting-started.md
├── frontend/
│   └── components/
│       └── button-system.md
└── workflows/
    └── development-process.md
```

---

## Use Cases

### For Development Teams

**Architectural Decision Records**
- Link decisions to implementations with @references
- Track progress through task workflows
- Maintain living documentation that guides development
- Resume work seamlessly after context compression

**API Documentation**
- Create interconnected API specs with automatic reference loading
- Guide implementation with task-specific workflows (spec-first, simplicity-gate)
- Track API implementation tasks with status and progress
- Search across all API documentation instantly

**Project Knowledge Bases**
- Organize docs by namespace (api/, guides/, troubleshooting/)
- Cross-link related documents for automatic context loading
- Define project methodologies in Main-Workflow for consistency
- Navigate documentation as a knowledge graph, not flat files

### For AI Research

**Structured Reasoning Protocols**
- Test workflow prompts vs. free-form prompting
- Build reusable workflow libraries for common tasks
- Study intelligent context loading patterns
- Measure effectiveness of different workflow combinations

**Context Engineering Experiments**
- Analyze hierarchical reference loading performance
- Compare session-aware vs. session-agnostic approaches
- Study impact of reference depth on task completion
- Test progressive discovery vs. full context upfront

### For Technical Writers

**Interconnected Documentation**
- Create documentation ecosystems with smart linking
- Link specifications to implementation guides automatically
- Maintain consistency with namespace templates
- Validate references and identify broken links

**Content Organization**
- Organize large doc sets with namespace hierarchies
- Track documentation tasks and completion status
- Generate suggestions for related content
- Browse and search across entire documentation system

---

## License

MIT - See LICENSE file for details.

---

*Transforming documentation from static files into intelligent, context-aware knowledge graphs for AI agents.*
