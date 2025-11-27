# AI Prompt Guide MCP

**MCP Server & Claude Code Plugin for Multi-Agent Workflows**

An MCP server that orchestrates AI agents through structured markdown documents. Create linked specifications and tasks, assign work to specialized agents with a single command, and let the system handle context injection and workflow management automatically.

## Table of Contents

- [What It Does](#what-it-does)
- [Key Features](#key-features)
- [Claude Code Plugin](#claude-code-plugin)
- [Direct MCP Server Installation](#direct-mcp-server-installation)
- [Tools Overview](#tools-overview)
- [Use Case](#use-case)
- [License](#license)

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
- 11 pre-built workflows for common development scenarios
- Access via `get_workflow` tool or Claude Code plugin commands
- Reference workflows in task metadata for automatic injection
- Create your own custom workflows easily

## Claude Code Plugin

### Install

```bash
/plugin marketplace add https://github.com/Blakeem/AI-Prompt-Guide-MCP
/plugin install ai-prompt-guide@ai-prompt-guide-marketplace
```

### Workflows & Commands

The plugin provides **15 workflows** accessible both as slash commands and via the `get_workflow` MCP tool:

**Development Workflows:**
- `/ai-prompt-guide:develop` – Simple development with anti-pattern detection and regression prevention
- `/ai-prompt-guide:develop-fix` – Bug fixing with root cause analysis and regression prevention
- `/ai-prompt-guide:develop-staged` – Orchestrate multi-agent staged development with manual verification
- `/ai-prompt-guide:develop-staged-tdd` – Orchestrate multi-agent staged development with TDD

**Quality Workflows:**
- `/ai-prompt-guide:audit` – Comprehensive code audit (full codebase or targeted PR/component)
- `/ai-prompt-guide:coverage` – Add comprehensive test coverage

**Planning Workflows:**
- `/ai-prompt-guide:plan` – Structured information assessment before action (works well with Claude Code planning mode)

**Decision Workflows:**
- `/ai-prompt-guide:decide` – Structured decision making with trade-off analysis
- `/ai-prompt-guide:decide-lensed` – Multi-perspective decision analysis with parallel specialist lenses

**Ideation Workflows:**
- `/ai-prompt-guide:brainstorm` – Generate multiple distinct ideas with parallel specialist lenses
- `/ai-prompt-guide:brainstorm-refs` – Generate multiple distinct ideas with task orchestration and @references

**Specification Workflows:**
- `/ai-prompt-guide:spec-feature` – Document internal feature specifications
- `/ai-prompt-guide:spec-external` – Document external API specifications

**Commands are shortcuts to workflows.** When using Claude Code, the plugin commands provide a convenient way to invoke workflows. When using the MCP server directly, access the same workflows via:

```typescript
get_workflow({ workflow: "plan" })
get_workflow({ workflow: "develop" })
get_workflow({ workflow: "develop-fix" })
get_workflow({ workflow: "develop-staged" })
get_workflow({ workflow: "develop-staged-tdd" })
get_workflow({ workflow: "brainstorm" })
// ... etc
```

### Examples

**Planning before implementation:**
```
/ai-prompt-guide:plan How should we approach migrating from REST to GraphQL? I want to understand the key decision points and information gaps.
```

**Simple development (no multi-agent orchestration):**
```
/ai-prompt-guide:develop Add a dark mode toggle to the settings page with persistence to localStorage
```

**Bug fixing:**
```
/ai-prompt-guide:develop-fix The form submission fails when the email field is empty - returns undefined instead of validation error
```

**Multi-agent staged development with TDD:**
```
/ai-prompt-guide:develop-staged-tdd Build an admin dashboard with user activity charts, region filtering, and CSV export. Include tests for the aggregation logic.
```

The plugin loads the appropriate workflow and guides you through the implementation process.

## Direct MCP Server Installation

### Requirements

- Node.js 18+
- pnpm 10.x

### Zero-Config Setup (Recommended)

This repository includes **production dependencies (35MB)** for true zero-config operation:

```bash
# Clone and use immediately - no install needed!
git clone https://github.com/your-org/AI-Prompt-Guide-MCP.git
cd AI-Prompt-Guide-MCP
pnpm start  # Or use with Claude Code plugin directly
```

**For Contributors/Developers:**

To add development tools (linting, testing, TypeScript):

```bash
./scripts/dev-mode-on.sh  # Install dev tools, hide from git
pnpm build                # Rebuild after code changes
```

📖 **See [DEV_WORKFLOW.md](./DEV_WORKFLOW.md) for complete development documentation**

Key scripts:
- `./scripts/dev-mode-on.sh` - Enable development mode (adds dev tools, hides from git)
- `./scripts/dev-mode-off.sh` - Disable development mode (shows production state)
- `./scripts/update-prod-deps.sh` - Update production dependencies

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

**Zero-config by default** - the server works immediately with no setup required. When you run Claude Code from a project directory, it automatically creates a `.ai-prompt-guide/` folder in your project to store documents, tasks, and archives.

**MCP Server Setup** (for non-Claude Code Plugin users):

Add to your MCP client configuration (e.g., `.mcp.json`):

```json
{
  "mcpServers": {
    "ai-prompt-guide-mcp": {
      "command": "node",
      "args": ["/path/to/AI-Prompt-Guide-MCP/dist/index.js"],
      "env": {
        "MCP_WORKSPACE_PATH": "/custom/workspace/path"
      }
    }
  }
}
```

Replace `/path/to/AI-Prompt-Guide-MCP` with your actual clone location. No build step required—built files are included.

**Optional Settings:**

- `MCP_WORKSPACE_PATH` - Custom workspace path (default: current directory)
- `DOCS_BASE_PATH` - Documents location (default: `.ai-prompt-guide/docs` in zero-config mode)
- `ARCHIVED_BASE_PATH` - Archived documents (default: `.ai-prompt-guide/archived` in zero-config mode)
- `COORDINATOR_BASE_PATH` - Coordinator tasks (default: `.ai-prompt-guide/coordinator` in zero-config mode)
- `REFERENCE_EXTRACTION_DEPTH` - How deep to follow @references (1-5, default: 3)
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)

**Per-Project Configuration:**

Create `.mcp-config.json` in your project root for project-specific settings:

```json
{
  "env": {
    "DOCS_BASE_PATH": "/custom/docs",
    "ARCHIVED_BASE_PATH": "/custom/archive",
    "COORDINATOR_BASE_PATH": "/custom/coordinator"
  }
}
```

### Directory Structure

**Zero-config structure** (created automatically in your project):

```
your-project/
└── .ai-prompt-guide/
    ├── docs/               # Your documents and subagent tasks
    ├── coordinator/        # Sequential project tasks
    └── archived/           # Completed work (auto-populated)
        ├── docs/           # Archived documents
        └── coordinator/    # Archived task lists
```

**Shared resources** (bundled with the MCP server):

```
{mcp-server}/.ai-prompt-guide/
├── workflows/         # Reusable workflow protocols
└── guides/           # Documentation best practices
```

Everything is created automatically—no manual setup required. Workflows and guides are shared across all your projects.

## Tools Overview

The server provides 20 MCP tools organized by function:

### Document Discovery & Navigation

- **`create_document`** – Create new documents with namespace selection
- **`browse_documents`** – Navigate document hierarchy and list contents
- **`search_documents`** – Full-text or regex search across all documents

### Content Editing

- **`section`** – Edit, append, insert, or remove sections in bulk

### Coordinator Task Management

- **`coordinator_task`** – Create, edit, or list coordinator tasks
- **`start_coordinator_task`** – Start the first pending task with full context
- **`complete_coordinator_task`** – Complete task and get next or auto-archive
- **`view_coordinator_task`** – View coordinator task details

### Subagent Task Management

- **`subagent_task`** – Create, edit, or list subagent tasks
- **`start_subagent_task`** – Start specific task with full context
- **`complete_subagent_task`** – Complete task and get next pending
- **`view_subagent_task`** – View subagent task details

### View & Inspection

- **`view_document`** – View complete document structure with metadata
- **`view_section`** – View section content without starting work

### Document Lifecycle

- **`edit_document`** – Update document title and overview
- **`delete_document`** – Delete or archive documents
- **`move`** – Move sections within or across documents (supports both regular sections and subagent tasks)
- **`move_document`** – Move documents to new namespaces

### Workflow & Guide Access

- **`get_workflow`** – Load workflow protocol content
- **`get_guide`** – Access documentation guides

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
