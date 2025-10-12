# AI Prompt Guide MCP

**Agent orchestration scaffolding with task-driven knowledge graphs and zero-configuration context engineering.**

A Model Context Protocol server that transforms documentation into an intelligent agent coordination system. Assign tasks to agents—specs, workflows, and interconnected docs load automatically. No manual prompt crafting, no context juggling, no repetitive setup. Just structured knowledge that guides agents through complex work while maximizing context efficiency.

## Why This Exists

Building with AI agents means drowning in prompt management: manually assembling specs, copying workflows, tracking what each agent needs, and losing context to compression. This system eliminates that friction entirely.

**What you get:**
- **Task-driven context loading** - Assign `"/tasks.md#implement-auth"` to a subagent → full spec, workflow, and linked docs inject automatically
- **Built-in best practices** - Custom workflows inject based on task type (no more copying boilerplate decision frameworks)
- **Zero manual orchestration** - Agents navigate a knowledge graph where every task knows its context requirements
- **Persistent audit trail** - Completion notes create searchable project memory across sessions
- **Context-efficient delegation** - Subagents get complete context without the main agent narrating (work longer before compression)
- **Cross-document intelligence** - `@/spec.md#auth` references pull exact sections needed, not entire files

**The result:** Agent scaffolding that feels like it reads your mind. You describe high-level work in tasks, the system handles the orchestration complexity.

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

Think of it as **Kubernetes for AI agents, but for knowledge instead of containers**. You define tasks in Markdown, link them to specs and workflows, and the system handles all orchestration—context loading, workflow injection, cross-document navigation, and audit trails.

### The Agent Orchestration Model

**Traditional approach (manual hell):**
```
You: "Implement authentication using JWT"
Agent: "What's the spec?"
You: [paste 500 lines of API spec]
Agent: "What pattern should I follow?"
You: [paste your decision-making workflow]
Agent: [runs out of context after 2 iterations]
You: [repeat everything for the subagent]
```

**With this system:**
```
You: assign start_task("/tasks.md#implement-auth") to Agent A
→ Full JWT spec, security workflow, related docs inject automatically
→ Agent A works until done, completes task with audit note

You: assign start_task("/tasks.md#setup-database") to Agent B
→ Database schema, migration workflow, connection docs inject automatically
→ Agent B gets full context without you repeating anything
→ Complete task history persists across all compression cycles
```

### Core Capabilities

**🤖 Agent Scaffolding & Orchestration**
- **Task-based handoff** - Assign tasks by path, full context loads automatically
- **Incremental & ad-hoc modes** - Sequential workflow for main agent, isolated tasks for subagents
- **Zero-config delegation** - Subagents receive complete context without main agent narration
- **Persistent audit trail** - Completion notes create searchable project memory
- **Cross-document operations** - Single batch edits across multiple files via unified paths

**📚 Knowledge Graph Architecture**
- **@reference linking** - `@/spec.md#section` pulls exact content needed, not entire files
- **Hierarchical loading** - References recursively load with configurable depth (prevent exponential growth)
- **Cycle detection** - Automatic prevention of circular reference loops
- **Namespace organization** - Structure large doc sets by domain (`/api/`, `/guides/`, `/specs/`)

**⚡ Intelligent Context Engineering**
- **Workflow injection** - Custom decision frameworks load based on task type
- **Session-aware loading** - Main workflow re-injects after context compression, skipped during continuous work
- **Progressive discovery** - Browse mode (fast) vs detail mode (full context) for all view tools
- **Dynamic context sizing** - Load only what each task actually needs

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
Create blank documents with namespace organization through guided 2-stage discovery.

**Capabilities:**
- **Progressive discovery** guides namespace selection
- **Blank documents** ready for organic structure building
- **Smart suggestions** based on existing documentation patterns
- **Namespace organization** for large documentation sets

**Use when:** Starting new documentation

---

#### `browse_documents` - Unified Browsing & Search
Explore folder structure or search content with namespace-aware organization.

**Capabilities:**
- **Dual-mode operation** - browse structure or search content
- **Namespace awareness** for organized navigation
- **Relevance scoring** with contextual ranking
- **Relationship analysis** across documents

**Use when:** Exploring documentation or finding content

---

#### `search_documents` - Full-Text & Regex Search
Search across all documents with context extraction and match highlighting.

**Capabilities:**
- **Full-text search** with case-insensitive matching
- **Regex patterns** for advanced queries
- **Context extraction** with surrounding lines
- **Scope filtering** by namespace
- **Match highlighting** with line numbers

**Use when:** Finding specific content patterns

---

### ✏️ Content Operations

#### `section` - Complete Section Management
Unified bulk operations for all section editing, creation, and deletion.

**Operations:**
- **Edit**: `replace`, `append`, `prepend`
- **Create**: `insert_before`, `insert_after`, `append_child`
- **Delete**: `remove`

**Capabilities:**
- **Batch processing** via operations array
- **Auto-depth calculation** for child insertions
- **Link validation** for @references
- **Structure-aware parsing** preserves document integrity

**Unified Path Support:**
- **Document parameter**: ALWAYS required - provides default context for all operations
- **Section field formats**:
  1. `"slug"` - Uses document parameter as context
  2. `"#slug"` - Uses document parameter as context (with # prefix)
  3. `"/other.md#slug"` - Overrides document parameter for this operation

**Multi-Document Example:**
```json
{
  "document": "/api/auth.md",
  "operations": [
    {
      "section": "overview",
      "operation": "replace",
      "content": "Updated authentication overview..."
    },
    {
      "section": "/api/security.md#authentication",
      "operation": "append",
      "content": "\n\n### Additional Security Notes\n..."
    },
    {
      "section": "/guides/setup.md#auth-setup",
      "operation": "replace",
      "content": "## Authentication Setup\n..."
    }
  ]
}
```
Edits three sections across three different documents in a single batch operation.

**Use when:** Managing section content and structure

---

#### `task` - Unified Task Management
Complete task lifecycle through bulk operations: create, edit, and list.

**Operations:**
- **create**: Add tasks with metadata
- **edit**: Update content and status
- **list**: Query with filtering

**Capabilities:**
- **Batch processing** via operations array
- **Hierarchical @reference loading** for context
- **Status filtering** across task states
- **Next task detection** for workflow progression
- **Hierarchical organization** for complex projects

**Unified Path Support:**
- **Document parameter**: ALWAYS required - provides default context for all operations
- **Task field formats**:
  1. `"slug"` - Uses document parameter as context
  2. `"#slug"` - Uses document parameter as context (with # prefix)
  3. `"/other.md#slug"` - Overrides document parameter for this operation

**Multi-Document Example:**
```json
{
  "document": "/project/main-tasks.md",
  "operations": [
    {
      "operation": "create",
      "title": "Main Agent Task",
      "content": "Work on main feature..."
    },
    {
      "operation": "create",
      "title": "Subagent Task",
      "content": "Background processing...",
      "task": "/project/subagent-tasks.md#background-task"
    }
  ]
}
```
Creates first task in main-tasks.md, second task in subagent-tasks.md - all in one batch operation.

**Use when:** Managing task lifecycles

---

### 🔄 Task Workflow Tools

#### `start_task` - Start Work with Full Context
Begin task work with complete workflow and documentation context injection using unified path addressing.

**Two Modes:**
- **Sequential**: `/project/tasks.md` - Starts first pending/in_progress task
- **Ad-hoc**: `/project/tasks.md#implement-auth` - Starts specific task only

**Injects:**
- **Task-specific workflow** - Process guidance (both modes)
- **Main workflow** - Project methodology (sequential mode only)
- **Referenced documents** - Hierarchical context tree (both modes)

**Key Difference:**
- **Sequential mode**: Full context with main workflow (for new/resumed sessions)
- **Ad-hoc mode**: Task workflow only, no main workflow (for assigned tasks)

**Use when:** Starting tasks or resuming after context loss

⚠️ **Important**: Always use full path with `#slug` when assigned a specific task, or you will start the WRONG TASK!

---

#### `complete_task` - Finish and Get Next
Mark task complete and optionally receive next task using unified path addressing.

**Two Modes:**
- **Sequential**: `/project/tasks.md` - Completes next pending task, returns next available task
- **Ad-hoc**: `/project/tasks.md#implement-auth` - Completes ONLY that specific task (no next task returned)

**Capabilities:**
- **Status updates** with completion notes
- **Automatic next-task** detection (sequential mode only)
- **Task workflow injection** for next work item
- **Reference loading** for next task context
- **Minimal duplication** - skips main workflow injection (always)

**Use when:** Completing tasks in ongoing sessions

⚠️ **Important**: Always use full path with `#slug` when assigned a specific task, or you will complete the WRONG TASK!

---

### 👁️ View & Inspection Tools

#### `view_document` - Comprehensive Document Inspection
Inspect document structure with complete statistics and metadata.

**Provides:**
- Document metadata and hierarchy
- Link and task statistics
- Section structure and relationships
- Word and heading counts

**Use when:** Analyzing document structure and health

---

#### `view_section` - View Document Sections
View section content with reference extraction and hierarchy detection using unified path addressing.

**Two Modes:**
- **Overview**: `/api/auth.md` - Lists ALL sections with titles and depth only (fast discovery)
- **Detail**: `/api/auth.md#endpoints` - Shows full content for specified section(s)

**Overview Mode:**
- Returns `slug`, `title`, `depth`, `full_path` for all sections
- No content loading (fast)
- Use for discovering document structure

**Detail Mode:**
- Full content with references and hierarchy
- Supports multiple sections: `/api/auth.md#endpoints,authentication`
- Batch viewing up to 10 sections
- Word counts and link extraction

**Use when:**
- Overview: Discovering what sections exist
- Detail: Reading specific section content

---

#### `view_task` - View Document Tasks
Browse task metadata and workflow names using unified path addressing.

**Two Modes:**
- **Overview**: `/project/tasks.md` - Lists ALL tasks with status only (fast discovery)
- **Detail**: `/project/tasks.md#implement-auth` - Shows full content for specified task(s)

**Overview Mode:**
- Returns `slug`, `title`, `status`, `depth`, `workflow_name` for all tasks
- No full content loading (fast)
- Use for discovering available tasks

**Detail Mode:**
- Full task content with references and workflows
- Supports multiple tasks: `/project/tasks.md#task1,task2`
- Batch viewing up to 10 tasks
- Complete metadata and context

**Use when:**
- Overview: Browsing available tasks
- Detail: Viewing specific task details

---

### 🗂️ Document Lifecycle Management

#### `edit_document` - Edit Document Metadata
Update document title and overview content.

**Capabilities:**
- **Title updates** (H1 heading)
- **Overview updates** (intro content)
- **Flexible editing** - update either or both fields
- **Structure preservation** during updates

**Use when:** Updating document metadata

---

#### `delete_document` - Delete or Archive Documents
Remove documents permanently or archive with audit trail.

**Capabilities:**
- **Permanent deletion** option
- **Safe archival** with timestamps
- **Audit trail** creation
- **Recovery support** for archived documents

**Use when:** Retiring or cleaning up documentation

---

#### `move` - Move Sections & Tasks
Relocate sections or tasks between or within documents.

**Positioning:**
- `before` - Insert before reference section
- `after` - Insert after reference section
- `child` - Append as child with auto-depth

**Capabilities:**
- **Cross-document moves** between files
- **Within-document moves** for reorganization
- **Auto-depth calculation** for child placement
- **Safe operations** - create before delete

**Use when:** Restructuring documentation

---

#### `move_document` - Relocate Document Files
Move documents to different paths or namespaces.

**Capabilities:**
- **Automatic directory creation**
- **Overwrite protection**
- **Namespace changes** supported
- **Cache updates** for moved documents

**Use when:** Reorganizing document structure

---

### Key Tool Design Principles

1. **Context Engineering** - Automatic @reference loading
2. **Session Awareness** - Tools signal and respond to session state
3. **Unified Operations** - Single tools for related operations
4. **Batch Support** - Efficient multi-operation processing
5. **Type Safety** - Validated addressing throughout
6. **Graceful Degradation** - Resilient to missing resources

---

## Creating Custom Workflow Prompts

The system includes a **unified prompt system** that automatically loads both workflows and guides as MCP prompts at server startup.

### Prompt Loading Architecture

**At Startup:**
All Markdown files from two directories are loaded as MCP prompts with automatic prefix assignment:

```
[INFO] Loading workflow prompts from directory { directory: '/workflows', fileCount: 12, prefix: 'workflow_' }
[INFO] Loading workflow prompts from directory { directory: '/guides', fileCount: 4, prefix: 'guide_' }
[INFO] Workflow prompts loaded from all directories { loaded: 16, failed: 0, directories: 2 }
```

**Directory Structure:**
```
.ai-prompt-guide/
├── workflows/          → Loaded with 'workflow_' prefix
│   ├── spec-first-integration.md
│   ├── multi-option-tradeoff.md
│   └── ...12 workflows total
└── guides/            → Loaded with 'guide_' prefix
    ├── activate-guide-documentation.md
    ├── documentation_standards.md
    └── ...4 guides total
```

### What Are Prompts?

The system provides two types of prompts (all `.md` Markdown files loaded at startup):

**Workflow Prompts** (`workflow_*` prefix) - Process-oriented problem-solving frameworks from `.ai-prompt-guide/workflows/`:
- **workflow_tdd-incremental-orchestration** - Multi-agent coordination with test-driven development
- **workflow_incremental-orchestration** - Multi-agent coordination with flexible testing
- **workflow_code-review-section-based** - Parallel review with agents assigned to code sections
- **workflow_code-review-issue-based** - Parallel review with agents assigned to issue types
- **workflow_multi-option-tradeoff** - Structured decision-making with weighted criteria
- **workflow_spec-first-integration** - Ensuring correctness before implementing
- And 6 more workflow prompts...

**Guide Prompts** (`guide_*` prefix) - Content-oriented documentation helpers from `.ai-prompt-guide/guides/`:
- **guide_activate-guide-documentation** - How to write guides and tutorials
- **guide_activate-specification-documentation** - How to write technical specs
- **guide_documentation_standards** - Writing style and formatting standards
- **guide_research_best_practices** - Research and validation methods

**Discovery**: Use your MCP client's `prompts/list` capability to see all available prompts dynamically after server starts.

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
- Workflow: spec-first-integration   ← Task-specific guidance (write without workflow_ prefix)
- Main-Workflow: causal-flow-mapping  ← Project-level methodology (write without workflow_ prefix)

Implement JWT authentication following the API spec.

@/specs/auth-api.md
```

**Note**: Write workflow names **without** the `workflow_` prefix in task metadata. The system automatically adds the prefix when looking up prompts.

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
- Add YAML frontmatter with `title`, `description`, and `whenToUse`
- Write structured process steps in Markdown
- Include examples and common pitfalls
- Keep it focused (200-500 lines ideal)

**Step 3: Restart the server to load new prompts**
All workflow and guide files are loaded as MCP prompts during server startup:
```bash
# Claude Desktop: Restart the app to reload prompts
# MCP Inspector: Rebuild and restart
pnpm build && npx @modelcontextprotocol/inspector node dist/index.js

# You'll see in the logs:
# [INFO] Loading workflow prompts from directory { directory: '/workflows', fileCount: 13, prefix: 'workflow_' }
# [INFO] Loading workflow prompts from directory { directory: '/guides', fileCount: 4, prefix: 'guide_' }
# [INFO] Workflow prompts loaded from all directories { loaded: 17, failed: 0, directories: 2 }
```

**Step 4: Verify prompt is loaded**
Use your MCP client's `prompts/list` to confirm your new prompt appears with the correct prefix:
- Workflows from `.ai-prompt-guide/workflows/` → `workflow_my-team-process`
- Guides from `.ai-prompt-guide/guides/` → `guide_my-team-process`

**Step 5: Reference in tasks**
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

### Built-In Prompts

The system includes **12 workflow prompts** and **4 guide prompts** (16 total), all automatically loaded as MCP prompts during server startup:

**Workflows** (`workflow_*` prefix) - Loaded from `.ai-prompt-guide/workflows/`:
- Main orchestration workflows (tdd-incremental-orchestration, incremental-orchestration)
- Code review workflows (code-review-section-based, code-review-issue-based)
- Decision-making and integration workflows (spec-first-integration, multi-option-tradeoff, etc.)

**Guides** (`guide_*` prefix) - Loaded from `.ai-prompt-guide/guides/`:
- Documentation writing guides (activate-guide-documentation, activate-specification-documentation)
- Standards and research guides (documentation_standards, research_best_practices)

**Dynamic Discovery**: After server startup, use your MCP client's `prompts/list` to see all available prompts with their descriptions and usage guidance.

See the [complete workflow documentation](docs/WORKFLOW-PROMPTS.md) for detailed examples and API reference.

### Prompt Validation and Error Handling

**Startup Validation:**
All prompt files are validated during server startup:
- **Filename format** - Must use lowercase with valid separators (hyphens, underscores, dots)
- **YAML frontmatter** - Required fields with correct types (`title`, `description`, `whenToUse`)
- **Content body** - Must not be empty
- **Invalid files** - Logged as warnings but don't break startup

**Error Recovery:**
The prompt system is resilient:
- Invalid files are skipped with detailed warnings
- Other prompts continue loading normally
- System remains functional even with some invalid prompts

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

### Directory Structure

The system expects a specific directory structure with docs, workflows, and guides:

```
.ai-prompt-guide/
├── docs/                     # Your documentation (REQUIRED)
│   ├── api/
│   │   ├── specs/
│   │   │   └── authentication.md
│   │   └── guides/
│   │       └── getting-started.md
│   ├── frontend/
│   │   └── components/
│   │       └── button-system.md
│   └── workflows/
│       └── development-process.md
│
├── workflows/                # Workflow prompts (loaded at startup)
│   ├── spec-first-integration.md
│   ├── multi-option-tradeoff.md
│   └── ...12 total workflows
│
└── guides/                   # Documentation guides (loaded at startup)
    ├── activate-guide-documentation.md
    ├── documentation_standards.md
    └── ...4 total guides
```

**At Startup:**
- Documents in `docs/` are available via MCP tools
- Workflows in `workflows/` are loaded as `workflow_*` MCP prompts
- Guides in `guides/` are loaded as `guide_*` MCP prompts

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
- Link specifications to implementation guides
- Validate references across documents

**Content Organization**
- Organize large doc sets with namespaces
- Track documentation tasks and status
- Generate suggestions for related content
- Browse and search entire documentation systems
- Build document structure organically

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
