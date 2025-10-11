# AI Prompt Guide MCP

**An MCP server for managing interconnected Markdown documentation with task tracking and content transclusion.**

---

## ⚠️ Alpha Status - Under Active Development

**This project is in early alpha and not recommended for production use.** The system is being actively developed and tested. APIs, data structures, and core concepts may change significantly. Use at your own risk.

---

## What Is This?

AI Prompt Guide MCP is a Model Context Protocol server that helps LLMs work with structured documentation. It treats your Markdown files as an interconnected graph where documents can reference each other, tasks can be tracked, and content is loaded hierarchically when needed.

### Technical Foundation

At its core, this is a **typed property hypergraph over Markdown** where:

**Graph Layer:**
- **Nodes** = document sections, tasks, workflows, and prompts
- **Edges** = containment (document → section), sequence (task → next task), and semantic links (transcludes, references, causal flows)
- **Documents** act as hyperedges, bundling related sections and tasks into coherent units

**Workflow Layer:**
- Specialized **reasoning protocols** (like Multi-Option Trade-off Analysis, Causal Flow Mapping, Spec-First Integration)
- Reusable, addressable workflow nodes with structured steps and constraints
- Not static prompts, but graph-encoded procedures that guide LLM reasoning

**Control Flow:**
- Traversing the graph = executing adaptive reasoning paths
- Just-in-time context injection ensures structured information, not "text soup"
- Progressive discovery reveals complexity as needed, conserving context

### In Plain English

This system provides:
- Structured document management with cross-references
- Task tracking with status and priority management
- Hierarchical content loading through document transclusion
- Namespace organization for large documentation sets

## Current Capabilities

### 🎯 Central Addressing System
- **Type-Safe Addressing** - Unified interfaces for documents, sections, and tasks with validation
- **Format Flexibility** - Supports `"section"`, `"#section"`, and `"/doc.md#section"` addressing
- **Performance** - LRU caching with automatic eviction (1000 item limit)
- **Error Handling** - Rich context with custom error types

### 📄 Document Features
- **Cross-Document References** - Link documents with `@/path/doc.md#section` syntax
- **Transclusion Support** - Referenced content loads hierarchically with cycle detection
- **Flat Section Addressing** - Unique slug addressing with automatic duplicate handling
- **Reference Validation** - Checks for broken references with fix suggestions

### 📋 Available MCP Tools

**Core Document Management:**
- `create_document` - Progressive document creation with reference suggestions
- `browse_documents` - Browse and search documents by namespace

**Unified Content Operations:**
- `section` - Complete section management (edit, create, delete)
  - Operations: `replace`, `append`, `prepend`, `insert_before`, `insert_after`, `append_child`, `remove`
  - Batch support for multiple operations
  - Link validation and suggestions

**Unified Document Operations:**
- `manage_document` - Complete document lifecycle
  - Operations: `archive`, `delete`, `rename`, `move`
  - Safe archival with audit trails
  - Batch operation support

**View & Inspection Tools:**
- `view_document` - Enhanced inspection with stats and metadata
- `view_section` - Clean section content viewer
- `view_task` - Passive task inspection with workflow metadata (names only, no content)

**Task Management with Workflow Injection:**
- `task` - Unified task operations (create, edit, list)
- `start_task` - **Start/resume work** with full context (main workflow + task workflow + references)
- `complete_task` - **Finish current task** and get next task with its workflow (no main workflow re-injection)

### 🔄 Workflow Prompt Injection System

The system provides **deterministic workflow injection** based on tool choice, eliminating manual prompt lookups:

**Three-Tool Architecture:**
1. **`view_task`** - Passive inspection (shows workflow names only, no content injection)
2. **`start_task`** - Work initiation (injects main workflow + task workflow + references)
3. **`complete_task`** - Work continuation (injects next task workflow only)

**Two Workflow Types:**
- **Main-Workflow** - Project-level methodology defined in first task (re-injected on session resumption)
- **Workflow** - Task-specific process guidance for individual tasks

**Session Lifecycle Example:**
```
NEW SESSION
↓
1. view_task(task: ["task1", "task2"])  → Browse tasks (no injection)
2. start_task(task: "task1")            → Main + Task workflow ✅
3. complete_task(task: "task1")         → Next task workflow only ✅
4. complete_task(task: "task2")         → Next task workflow only ✅

[CONTEXT COMPRESSION]
↓
5. start_task(task: "task3")            → Main workflow RE-INJECTED ✅
```

**Key Benefits:**
- **Deterministic** - Tool choice signals session state (start vs continue)
- **Session Resilient** - Main workflow re-injected after context compression
- **Zero Duplication** - No redundant workflow prompts in continuous sessions
- **Graceful Degradation** - Missing workflows don't break task execution

## Technical Architecture

### Graph Structure

```
Multilayer Knowledge Graph:
├── Document Layer (Hyperedges)
│   ├── Contains sections and tasks
│   ├── Namespace organization (e.g., /api/, /guides/)
│   └── Metadata (title, modified, links)
├── Section Layer (Content Nodes)
│   ├── Unique slug addressing (#overview, #task-1)
│   ├── Hierarchical relationships (parent/child)
│   └── Cross-document transclusions (@/doc.md#section)
└── Task Layer (Workflow Nodes)
    ├── Sequential dependencies (task → next)
    └── Status tracking (pending/in-progress/completed)
```

### Addressing System Architecture

```
src/
├── shared/
│   ├── addressing-system.ts    # Central type-safe addressing (435 lines)
│   ├── path-utilities.ts       # Path and namespace utilities
│   └── utilities.ts            # Common helpers
├── session/
│   ├── session-store.ts        # Singleton state management
│   └── types.ts                # SessionState interface
├── tools/
│   ├── schemas/                # Centralized schema definitions
│   ├── implementations/        # Tool logic (all using central addressing)
│   ├── registry.ts             # Dynamic tool registration
│   └── executor.ts             # Tool execution dispatcher
└── server/
    └── request-handlers/       # MCP protocol handling
```

### Progressive Discovery Pattern

Tools reveal parameters gradually to conserve context:
- **Stage 0**: Discovery - Show available options
- **Stage 1**: Configuration - Gather specific requirements
- **Stage 2**: Execution - Complete operation with full context

## Workflow Protocol Library

### 🎯 Available Reasoning Workflows

Structured workflow prompts for common LLM reasoning tasks (automatically injected based on task metadata):

1. **`multi-option-tradeoff`** - Multi-option trade-off analysis with weighted criteria
2. **`spec-first-integration`** - Spec-first integration with canonical APIs
3. **`causal-flow-mapping`** - Cause→effect DAG mapping with evidence
4. **`failure-triage-repro`** - Failure triage with minimal reproduction
5. **`guardrailed-rollout`** - Guardrailed rollout with automatic rollback
6. **`evidence-based-experiment`** - Evidence-based experiment protocol
7. **`simplicity-gate`** - Simplicity gate with complexity budgets
8. **`interface-diff-adaptation`** - Interface diff and adaptation planning

**Usage in Tasks:**
```markdown
### Design API Architecture
- Status: pending
- Main-Workflow: spec-first-integration  ← Project-level methodology
- Workflow: multi-option-tradeoff        ← Task-specific process
```

Each workflow is a **reusable procedure** that guides LLMs through structured reasoning steps, automatically injected when starting or resuming work on tasks.

### 🚀 Long-Term Architecture

**Extended features** including:
- **Graph traversal engine** for workflow execution
- **Prompt workflow DSL** for custom reasoning protocols
- **Enhanced transclusion** with deeper reference chains
- **Multi-agent coordination** with shared context

## Installation & Setup

### For Claude Desktop Users

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-prompt-guide-mcp": {
      "command": "npx",
      "args": ["-y", "ai-prompt-guide-mcp"],
      "env": {
        "DOCS_BASE_PATH": "./.ai-prompt-guide/docs"
      }
    }
  }
}
```

**Configuration:**
- `DOCS_BASE_PATH` - Path to your documents directory (required)
- `LOG_LEVEL` - Set to `debug` for verbose logging (optional, defaults to `info`)

### For Development

```bash
# Clone and install
git clone https://github.com/Blakeem/AI-Prompt-Guide-MCP.git
cd AI-Prompt-Guide-MCP
pnpm install && pnpm build

# Start MCP inspector for testing
pnpm inspector:dev

# Run quality gates
pnpm check:all
```

## Testing with MCP Inspector

```bash
# Start inspector
pnpm inspector:dev

# Open URL with pre-filled token
# Test tools interactively
# Ctrl+C to stop when done
```

## Development Status

### ✅ Completed (Alpha v0.2)
- Central addressing system with type-safe validation
- 9 MCP tools with unified addressing framework
- Document linking system with `@` syntax
- Task management with status/priority tracking
- **Workflow prompt injection system** with deterministic session handling
- Three-tool task architecture (view/start/complete)
- Progressive discovery workflows
- 850 passing tests with comprehensive coverage

### 🚧 In Progress
- Enhanced workflow coordination across task series
- Workflow analytics and effectiveness tracking

### 📋 Planned
- Graph traversal engine for workflow execution
- Enhanced workflow coordination
- Advanced document relationship mapping

## Quality Standards

**Mandatory Quality Gates:**
```bash
pnpm test:run      # All tests must pass
pnpm lint          # Zero warnings/errors
pnpm typecheck     # Zero type errors
pnpm check:dead-code # Zero unused exports
pnpm check:all     # Run all checks
```

**Built With:**
- TypeScript (strict mode)
- MCP SDK (full protocol compliance)
- Unified/Remark (AST-based markdown)
- Vitest (comprehensive testing)
- ESLint (zero-tolerance linting)

## Use Cases

**For Development:**
- Track architectural decisions as linked knowledge graphs
- Guide LLMs through complex multi-step workflows
- Create interconnected documentation that loads context automatically

**For AI Research:**
- Test structured reasoning protocols vs free-form prompting
- Build reusable workflow libraries for common tasks
- Study intelligent context loading and document relationship patterns

**For Documentation:**
- Create interconnected documentation ecosystems
- Link specifications to implementation guides
- Maintain living documentation that guides development

## Contributing

This project is building **structured documentation tools for LLMs**. We're creating:
- Document management with transclusion and cross-references
- Task management systems integrated with documentation
- Hierarchical content loading for relevant context

Contributions, ideas, and feedback welcome!

## License

MIT - See LICENSE file for details

---

*Building cognitive scaffolding for the next generation of AI systems.*