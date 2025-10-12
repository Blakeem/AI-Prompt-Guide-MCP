# AI Prompt Guide MCP

**Intelligent documentation management for AI agents with context-aware workflow injection and hierarchical reference loading.**

Transform your Markdown documentation into an interconnected knowledge graph that AI agents can navigate intelligently, loading exactly the context needed for each task with automatic workflow guidance.

---

## Table of Contents

- [What Is This?](#what-is-this)
- [Knowledge Graph Topology](#knowledge-graph-topology)
- [Context Engineering & Workflow Injection](#context-engineering--workflow-injection)
- [Complete Tool Reference](#complete-tool-reference)
- [Creating Custom Workflow Prompts](#creating-custom-workflow-prompts)
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

The system provides **13 powerful tools** organized by function, all using intelligent context engineering.

### 📄 Document Creation & Discovery

#### `create_document` - Progressive Document Creation
Guided blank document creation with namespace organization and intelligent suggestions.

**Features:**
- **Progressive discovery** (2 stages: Discovery → Creation)
- **Blank documents** with simple structure (title + overview + TOC placeholder)
- **Namespace organization** for structured documentation
- **Smart suggestions** analyze existing docs for related content
- **Security validation** prevents path traversal attacks

**Use when:** Creating new documentation that you'll structure organically

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

#### `section` - Complete Section Management (Bulk-Only)
Unified tool for ALL section operations via operations array with automatic depth calculation.

**Operations:**
- **Edit**: `replace`, `append`, `prepend`
- **Create**: `insert_before`, `insert_after`, `append_child` (auto-depth!)
- **Delete**: `remove`

**Features:**
- **Bulk operations only** - all operations passed as array for consistency
- **Multiple operations** in single call for efficiency
- **Link validation** checks for broken @references
- **Auto-depth calculation** for append_child operation
- **Markdown-aware** uses AST-based parsing, not string manipulation

**Use when:** Adding, modifying, or removing document sections (single or multiple)

---

#### `task` - Unified Task Management (Bulk-Only)
Complete task lifecycle via operations array: create, edit, and list with automatic @reference extraction.

**Operations:**
- **create**: Add new tasks with metadata
- **edit**: Update task content and status
- **list**: Query tasks with filtering and next-task detection

**Features:**
- **Bulk operations only** - all operations passed as array for consistency
- **Multiple operations** in single call for efficiency
- **Hierarchical @reference loading** brings in documentation context
- **Status filtering** (pending, in_progress, completed, blocked)
- **Hierarchical organization** supports phase/category grouping
- **Next task detection** finds first available work item

**Use when:** Managing task creation, updates, and discovery (single or multiple)

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

#### `edit_document` - Edit Document Metadata
Update document title and/or overview content.

**Fields:**
- **title**: Updates the first H1 heading (document title)
- **overview**: Replaces content between title and first H2 section

**Features:**
- **Flexible editing** - update title, overview, or both in single operation
- **Markdown-aware** - preserves document structure and formatting
- **Path normalization** - handles various document path formats
- **Cache invalidation** - ensures changes are immediately reflected

**Use when:** Updating document metadata without restructuring content

---

#### `delete_document` - Delete or Archive Documents
Remove documents permanently or archive with audit trail.

**Parameters:**
- **document**: Document path to delete (required)
- **archive**: Boolean flag for safe archival (default: false)

**Features:**
- **Permanent deletion** - complete file removal (archive=false)
- **Safe archival** - timestamped archive with audit trail (archive=true)
- **Audit files** - archive operations create `.audit` files with metadata
- **Recovery support** - archived documents can be manually restored

**Use when:** Retiring documents or cleaning up obsolete documentation

---

#### `move` - Move Sections & Tasks
Relocate sections or tasks between documents or within the same document.

**Parameters:**
- **from**: Source path with section slug (e.g., "/api/auth.md#jwt-tokens")
- **to**: Destination document path (e.g., "/api/security.md")
- **reference**: Reference section in destination for positioning
- **position**: Placement relative to reference (`before`, `after`, `child`)

**Features:**
- **Data safety** - creates in new location BEFORE deleting from old
- **Auto-depth calculation** - `child` position calculates proper heading depth
- **Within-document moves** - reorganize content in same document
- **Reuses shared utilities** - consistent with section creation operations

**Use when:** Restructuring documentation or reorganizing content hierarchy

---

#### `move_document` - Relocate Document Files
Move document files to different paths or namespaces.

**Parameters:**
- **from**: Source document path (e.g., "/api/auth.md")
- **to**: Destination path (e.g., "/api/security/auth.md")

**Features:**
- **Directory creation** - automatically creates destination directories
- **Existence validation** - prevents overwriting existing documents
- **Cache invalidation** - updates both source and destination caches
- **Path normalization** - handles various path formats consistently

**Use when:** Reorganizing document structure or changing namespaces

---

### Key Tool Design Principles

1. **Context Engineering**: Tools automatically load relevant context via @references
2. **Session Awareness**: start_task vs complete_task signal session state
3. **Unified Operations**: Single tools handle related operations (section for edit/create/delete, task for create/edit/list)
4. **Batch Support**: Process multiple operations efficiently
5. **Type Safety**: Central addressing system validates all paths
6. **Graceful Degradation**: Missing workflows/references don't break execution

---

## Creating Custom Workflow Prompts

The system includes a **powerful workflow prompt system** that lets you create custom, reusable methodologies for AI agents. Workflow prompts are structured instructions that guide agents through complex problem-solving patterns.

### What Are Workflow Prompts?

Workflow prompts are `.md` (Markdown) files that codify proven problem-solving frameworks:

- **Multi-Option Trade-off** - Structured decision-making with weighted criteria
- **Spec-First Integration** - Ensuring correctness before implementing new features
- **Failure Triage & Minimal Repro** - Converting bug reports into actionable fixes
- **Causal Flow Mapping** - Debugging complex cause-effect chains
- **Simplicity Gate** - Keeping solutions simple after non-negotiables are met

### File Format

Workflow files use YAML frontmatter + Markdown content:

```markdown
---
title: "My Custom Workflow"
description: "🎯 Brief description of what this workflow does"
whenToUse:
  - "When facing situation A"
  - "When needing to accomplish goal B"
  - "When dealing with constraint C"
tags:
  - "decision-making"
  - "your-domain"
---

# My Custom Workflow

## Purpose
Explain why this workflow exists and what problem it solves.

## Process

1. **Step 1: [Action]**
   - Detail A
   - Detail B
   - Consideration C

2. **Step 2: [Action]**
   - Detail A
   - Detail B

## Example
Concrete example showing the workflow in action...

## Common Pitfalls
- ❌ **Pitfall 1**: Why it's wrong
  - ✅ **Instead**: What to do
```

### How Workflows Are Used

**1. Define in Task Metadata:**
```markdown
### Implement Authentication
- Status: pending
- Workflow: spec-first-integration   ← Task-specific guidance
- Main-Workflow: causal-flow-mapping  ← Project-level methodology (first task only)

Implement JWT authentication following the API spec.

@/specs/auth-api.md
```

**2. Automatic Injection:**
When agents use `start_task` or `complete_task`, the system:
- Extracts workflow names from task metadata
- Loads full workflow content from `.md` files
- Injects complete methodology into the task response
- Provides structured guidance for that specific task

**3. Session-Aware Loading:**
- **Main-Workflow** (first task only): Project-level methodology, re-injected after context compression
- **Workflow** (any task): Task-specific process, always injected with task data

### Creating Your Own Workflows

**Step 1: Create the file**
```bash
# Workflows live in <DOCS_BASE_PATH>/../workflows/
cd .ai-prompt-guide/workflows
touch my-team-process.md
```

**Step 2: Define your methodology**
- Add YAML frontmatter with `title`, `description`, `whenToUse`, and `tags`
- Write structured process steps in Markdown
- Include examples and common pitfalls
- Keep it focused (200-500 lines ideal)

**Step 3: Restart the server**
Workflows are loaded at startup:
```bash
# Claude Desktop: Restart the app
# MCP Inspector: Rebuild and restart
pnpm build && npx @modelcontextprotocol/inspector node dist/index.js
```

**Step 4: Reference in tasks**
```markdown
### My Task
- Status: pending
- Workflow: my-team-process
- Description: Task requiring custom workflow...
```

### File Naming Rules

- **Lowercase only**: Use `kebab-case`, `snake_case`, or `dotted.notation`
- **Descriptive names**: Convey purpose clearly
- **Valid separators**: Hyphens (`-`), underscores (`_`), or dots (`.`)

**Valid:**
- `multi-option-tradeoff.md`
- `code_review_checklist.md`
- `performance.optimization.guide.md`

**Invalid:**
- `My Workflow.md` (spaces and capitals)
- `workflow.md` (not descriptive)

### Built-In Workflows

The system includes 8+ production-ready workflows:

1. **multi-option-tradeoff** - Structured decision-making with weighted criteria
2. **spec-first-integration** - Spec-driven API integration
3. **failure-triage-repro** - Bug triage with minimal reproduction
4. **causal-flow-mapping** - Cause→effect debugging
5. **simplicity-gate** - Complexity budgets and Occam's Razor
6. **guardrailed-rollout** - Safe deployment with automatic rollback
7. **evidence-based-experiment** - Hypothesis-driven testing
8. **interface-diff-adaptation** - Handling breaking API changes

See the [complete workflow documentation](docs/WORKFLOW-PROMPTS.md) for detailed examples and API reference.

### Discovery and Loading

**Automatic at startup:**
```
[INFO] Loading workflow prompts { directory: '/prompts', fileCount: 8 }
[DEBUG] Workflow prompts loaded { loaded: 8, failed: 0, total: 8 }
```

**Validation:**
- Filename format validated (lowercase, valid separators)
- YAML frontmatter validated (correct types)
- Content body must not be empty
- Invalid files logged as warnings but don't break startup

**Full documentation:** See [Workflow Prompts System](docs/WORKFLOW-PROMPTS.md) for complete guide including:
- Detailed frontmatter schema
- Best practices for effective workflows
- Troubleshooting common issues
- API reference for programmatic use
- Advanced usage patterns

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
- Build document structure organically using section operations

---

## Documentation

### Core Documentation

- **[Workflow Prompts System](docs/WORKFLOW-PROMPTS.md)** - Complete guide to creating and using workflow prompts
  - File format and frontmatter schema
  - Built-in workflow examples (multi-option-tradeoff, spec-first-integration, failure-triage-repro)
  - Creating custom workflows for your team
  - Workflow injection patterns (Main-Workflow vs Workflow)
  - API reference and troubleshooting

### For Contributors

- **[Unit Test Strategy](docs/UNIT-TEST-STRATEGY.md)** - Testing standards and patterns
- **See [CLAUDE.md](CLAUDE.md)** - Complete development guidelines and architecture

---

## License

MIT - See LICENSE file for details.

---

*Transforming documentation from static files into intelligent, context-aware knowledge graphs for AI agents.*
