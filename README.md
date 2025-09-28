# AI Prompt Guide MCP

**A knowledge-process graph with memory, acting as cognitive scaffolding for LLMs.**

---

## ⚠️ Alpha Status - Under Active Development

**This project is in early alpha and not recommended for production use.** The system is being actively developed and tested. APIs, data structures, and core concepts may change significantly. Use at your own risk.

---

## What Is This?

AI Prompt Guide is a **multilayer knowledge-process graph system** built on Model Context Protocol (MCP) that provides cognitive scaffolding for LLMs through structured reasoning workflows.

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

**Memory Layer** (Planned):
- Agent memory store indexed by graph IDs and context (document, git commit, task sequence)
- Episodic recall ("what happened last run?") and semantic recall ("what decisions were made for feature X?")
- Cross-session audit trail for tracking agent work and decisions over time

**Control Flow:**
- Traversing the graph = executing adaptive reasoning paths
- Just-in-time context injection ensures structured information, not "text soup"
- Progressive discovery reveals complexity as needed, conserving context

### In Plain English

Think of it as **accessibility tools for LLMs** - a system that:
- Provides go-to reasoning routines and decision-making scripts
- Organizes knowledge as a linked graph instead of scattered documents
- Tracks what the LLM has done across sessions (memory)
- Guides LLMs through complex multi-step workflows with structured thinking protocols

## Current Capabilities

### 🎯 Central Addressing System
- **Type-Safe Addressing** - Unified interfaces for documents, sections, and tasks with validation
- **Format Flexibility** - Supports `"section"`, `"#section"`, and `"/doc.md#section"` addressing
- **Performance** - LRU caching with automatic eviction (1000 item limit)
- **Error Handling** - Rich context with custom error types

### 🔗 Knowledge Graph Features
- **Cross-Document References** - Link documents with `@/path/doc.md#section` syntax
- **Automatic Context Loading** - Referenced documents load on-demand with cycle detection
- **Flat Section Addressing** - Unique slug addressing with automatic duplicate handling
- **Link Validation** - Health scoring and auto-fix suggestions for broken links

### 📋 Available MCP Tools

**Core Document Management:**
- `create_document` - Progressive document creation with smart link guidance
- `browse_documents` - Unified browsing and searching with namespace awareness

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
- `view_task` - Task data with status and priority

**Task Management:**
- `task` - Unified task operations (create, edit, list)
- `complete_task` - Mark completed, get next task with linked documents

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
    ├── Status tracking (pending/in-progress/completed)
    └── Priority ordering (high/medium/low)
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

## Future Vision

### 🧠 Memory System (Next Phase)
- **SQLite-based memory store** with full-text search (FTS5)
- **Git-integrated audit trail** - track decisions across commits
- **Cross-session agent memory** - LLMs can review past work
- **Sub-agent context sharing** - all agents share memory within the system
- Query interface: `store_memory`, `search_memory`, `get_session_memory`

### 🎯 Reasoning Protocol Library (Planned)

Structured workflows for common LLM reasoning tasks:

1. **`decide.tradeoffs@v1`** - Multi-option trade-off analysis with weighted criteria
2. **`integrate.spec-first@v1`** - Spec-first integration with canonical APIs
3. **`map.causal-flow.mermaid@v1`** - Cause→effect DAG mapping with evidence
4. **`triage.min-repro@v1`** - Failure triage with minimal reproduction
5. **`rollout.guardrails@v1`** - Guardrailed rollout with automatic rollback
6. **`experiment.evidence@v1`** - Evidence-based experiment protocol
7. **`simplify.complexity-budget@v1`** - Simplicity gate with complexity budgets
8. **`adapt.interface-diff@v1`** - Interface diff and adaptation planning
9. **`audit.assumptions@v1`** - Assumption audit with falsifiable tests
10. **`validate.data-quality@v1`** - Data quality gate with drift detection

Each protocol is a **reusable graph-encoded procedure** that guides LLMs through structured reasoning steps.

### 🚀 Long-Term Architecture

**Complete knowledge-process graph** with:
- **Graph traversal engine** for workflow execution
- **Prompt workflow DSL** for custom reasoning protocols
- **Episodic memory integration** across git history
- **Multi-agent coordination** with shared context
- **Decision artifact storage** with searchable history

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

### ✅ Completed (Alpha v0.1)
- Central addressing system with type-safe validation
- 8 MCP tools migrated to unified addressing framework
- Document linking system with `@` syntax
- Task management with status/priority tracking
- Progressive discovery workflows
- 253 passing tests with comprehensive coverage

### 🚧 In Progress
- Memory system design and SQLite integration
- Reasoning protocol library implementation
- Workflow template system

### 📋 Planned
- Git-integrated audit trail
- Cross-session agent memory queries
- Graph traversal engine for workflow execution
- Multi-agent context sharing
- Decision artifact search and retrieval

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
- Maintain audit trail of AI-assisted development

**For AI Research:**
- Test structured reasoning protocols vs free-form prompting
- Build reusable workflow libraries for common tasks
- Study agent memory and decision-making patterns

**For Documentation:**
- Create interconnected documentation ecosystems
- Link specifications to implementation guides
- Maintain living documentation that guides development

## Contributing

This project is building **cognitive infrastructure for LLMs**. We're creating:
- Structured reasoning protocols that improve AI decision-making
- Knowledge graph systems that provide just-in-time context
- Memory systems that enable cross-session learning

Contributions, ideas, and feedback welcome!

## License

MIT - See LICENSE file for details

---

*Building cognitive scaffolding for the next generation of AI systems.*