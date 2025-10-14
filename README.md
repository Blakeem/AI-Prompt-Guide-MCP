# AI Prompt Guide MCP

**MCP Server & Claude Code Plugin for Multi-Agent Workflows**

An MCP server that orchestrates AI agents through structured markdown documents. Create linked specifications and tasks, assign work to specialized agents with a single command, and let the system handle context injection and workflow management automatically.

## What It Does

This server enables you to:

- **Spec out projects** as a team or solo using interlinked markdown documents
- **Make better decisions** using the multi-option tradeoff workflow
- **Orchestrate specialized agents** by simply assigning tasks—the server injects the right context automatically
- **Maintain impartial reviews** by keeping the coordinator agent separate from implementation details

### How It Works

1. **Create linked documents** with specifications, guides, and architecture decisions
2. **Add @references** to link related content that gets auto-injected when needed
3. **Assign tasks to agents** using coordinator or subagent workflows
4. **Agent completes and reports** "Done"—coordinator reviews code changes directly
5. **Review without bias** by examining the actual changes, only consulting notes if needed

The system preserves context across sessions while keeping your main agent focused on orchestration and review rather than implementation details.

## Key Features

**Dual Task System**
- **Coordinator tasks** for sequential project work (auto-archives when complete)
- **Subagent tasks** for flexible ad-hoc work across documents

**Automatic Context Injection**
- Link documents with `@/path/doc.md#section` syntax
- Referenced content loads automatically when tasks start
- Works on any project—no configuration needed

**Workflow Library**
- Pre-built workflows for TDD, integration, decision-making, and code review
- Reference workflows in task metadata for automatic injection
- Create your own custom workflows easily

## Getting Started

### Requirements

- Node.js 18+
- pnpm 10.x

### Install & Build

```bash
pnpm install
pnpm build
```

### Run the Server

```bash
# Development
pnpm dev

# Production
pnpm start

# Test with inspector
pnpm inspector
```

### Configuration

Set environment variables in your MCP client config:

```json
{
  "mcpServers": {
    "ai-prompt-guide-mcp": {
      "command": "npx",
      "args": ["-y", "ai-prompt-guide-mcp"],
      "env": {
        "DOCS_BASE_PATH": "./.ai-prompt-guide"
      }
    }
  }
}
```

**Optional environment variables:**
- `WORKFLOWS_BASE_PATH` - Custom workflow directory (defaults to bundled workflows)
- `GUIDES_BASE_PATH` - Custom guides directory (defaults to bundled guides)
- `REFERENCE_EXTRACTION_DEPTH` - How deep to follow @references (1-5, default 3)
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)

### Directory Structure

The server creates and manages this structure:

```
.ai-prompt-guide/
├── docs/               # Your documents and subagent tasks
├── coordinator/        # Sequential project tasks (auto-archives when done)
├── archived/          # Completed work
├── workflows/         # Workflow protocols (optional - uses bundled if not present)
└── guides/           # Documentation guides (optional - uses bundled if not present)
```

Only `docs/` is required—everything else is created automatically.

## Claude Code Plugin

### Install

```bash
/plugin marketplace add https://github.com/Blakeem/AI-Prompt-Guide-MCP
/plugin install ai-prompt-guide
```

### Slash Commands

Each command launches a specialized workflow:

- `/ai-prompt-guide:build-tdd` – Build with test-driven development
- `/ai-prompt-guide:build-iterate` – Build with manual verification
- `/ai-prompt-guide:fix` – Debug and fix issues systematically
- `/ai-prompt-guide:refactor` – Plan and execute refactoring
- `/ai-prompt-guide:review` – Code quality review
- `/ai-prompt-guide:audit` – Comprehensive codebase audit
- `/ai-prompt-guide:coverage` – Add test coverage
- `/ai-prompt-guide:decide` – Multi-option decision analysis
- `/ai-prompt-guide:spec-feature` – Write internal specs
- `/ai-prompt-guide:spec-external` – Document external APIs

### Example

```
/ai-prompt-guide:build-tdd Build an admin dashboard with user activity charts, region filtering, and CSV export. Include tests for the aggregation logic.
```

The plugin creates a plan, assigns work to specialized agents, and orchestrates the workflow automatically.

## Tools Overview

The server provides 20 MCP tools organized by function:

### Document Discovery & Navigation

| Tool | Description |
|------|-------------|
| `create_document` | Create new documents with namespace selection |
| `browse_documents` | Navigate document hierarchy and list contents |
| `search_documents` | Full-text or regex search across all documents |

### Content Editing

| Tool | Description |
|------|-------------|
| `section` | Edit, append, insert, or remove sections in bulk |

### Coordinator Task Management

| Tool | Description |
|------|-------------|
| `coordinator_task` | Create, edit, or list coordinator tasks |
| `start_coordinator_task` | Start the first pending task with full context |
| `complete_coordinator_task` | Complete task and get next or auto-archive |
| `view_coordinator_task` | View coordinator task details |

### Subagent Task Management

| Tool | Description |
|------|-------------|
| `subagent_task` | Create, edit, or list subagent tasks |
| `start_subagent_task` | Start specific task with full context |
| `complete_subagent_task` | Complete task and get next pending |
| `view_subagent_task` | View subagent task details |

### View & Inspection

| Tool | Description |
|------|-------------|
| `view_document` | View complete document structure with metadata |
| `view_section` | View section content without starting work |

### Document Lifecycle

| Tool | Description |
|------|-------------|
| `edit_document` | Update document title and overview |
| `delete_document` | Delete or archive documents |
| `move` | Move sections or tasks between documents |
| `move_document` | Move documents to new namespaces |

### Workflow & Guide Access

| Tool | Description |
|------|-------------|
| `get_workflow` | Load workflow protocol content |
| `get_guide` | Access documentation guides |

All tools use consistent addressing (`/doc.md#section`) and work together seamlessly.

## Use Case

**Spec-driven development with automatic agent orchestration:**

1. Create linked specification documents for your project
2. Add coordinator tasks for the implementation phases
3. Assign the first task to a specialized agent with one command
4. Agent gets full context automatically (specs, workflows, references)
5. Agent completes work and reports "Done"
6. Review actual code changes to maintain objectivity
7. Move to next task—system queues it with the right context

The coordinator agent stays focused on orchestration and quality while specialized agents handle implementation. Your impartiality is preserved because you review code directly, not summaries.

## License

MIT. See `LICENSE` for details.
