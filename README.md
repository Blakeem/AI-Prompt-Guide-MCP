# AI Prompt Guide MCP

**Task-driven knowledge graph for agent orchestration and zero-configuration context delivery.**

A Model Context Protocol server that transforms Markdown documentation into an intelligent orchestration layer for AI agents. Assign tasks by path and the server injects the exact specs, workflows, and linked docs the agent needs—no manual prompt stitching, no repeated context dumps, and a persistent audit of everything completed.

## Overview

AI projects stall when agents need to be micromanaged with copy-pasted specs, decision frameworks, and status updates. AI Prompt Guide MCP removes that friction by turning your documentation into a navigable, deterministic knowledge graph that subagents can explore on demand.

### Key Capabilities
- Task-driven context loading (`start_task`, `complete_task`) that automatically injects linked documentation, workflows, and follow-up tasks.
- Unified @reference system that loads only the sections each task needs, with configurable depth, cycle detection, and namespace-aware addressing.
- Workflow library that surfaces project methodologies (“Main-Workflow”) and task-specific playbooks (“Workflow”) without re-prompting.
- Progressive tool suite for creating, browsing, editing, and moving documents, sections, and tasks in batches.
- Persistent audit trail that captures completion notes and next steps across sessions.

### Why It Exists
- Eliminate manual orchestration between agents.
- Preserve context across compression cycles.
- Keep documentation, workflows, and tasks synchronized as a single system.
- Provide deterministic, explainable context engineering.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
  - [Knowledge Graph Orchestration](#knowledge-graph-orchestration)
  - [Context Workflow Engine](#context-workflow-engine)
  - [Workflow Types](#workflow-types)
- [Tool Suite](#tool-suite)
- [Workflow Prompts](#workflow-prompts)
  - [Prompt Loading](#prompt-loading)
  - [File Format](#file-format)
  - [Using Workflows in Tasks](#using-workflows-in-tasks)
  - [Create Your Own](#create-your-own)
  - [Built-In Prompts](#built-in-prompts)
- [Claude Code Plugin](#claude-code-plugin)
- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Install & Build](#install--build)
  - [Run the Server](#run-the-server)
  - [Configuration](#configuration)
  - [Directory Structure](#directory-structure)
- [Codex & Other MCP Clients](#codex--other-mcp-clients)
- [Use Cases](#use-cases)
- [License](#license)

## Core Concepts

### Knowledge Graph Orchestration

Documents, sections, and tasks form a multi-layer knowledge graph that the server navigates for you. Each `@/path/doc.md#section` reference loads the exact subsection required and recursively resolves its own references until the configured depth is reached (default: 3, max: 5). Cycle detection, node limits, and a 30-second timeout prevent runaway traversals.

```
Task: "Configure API Gateway"
└─ @/api/gateway.md (depth 0)
   ├─ @/api/auth.md (depth 1)
   │  └─ @/security/jwt.md (depth 2)
   └─ @/api/rate-limiting.md (depth 1)
```

Namespaces (for example `/api/`, `/guides/`, `/specs/`) keep large ecosystems organized, and flat slug addressing (`#overview`, `#task-1`) ensures link stability even when sections repeat across documents.

### Context Workflow Engine

Tool choice communicates session intent, so the server can deliver the right amount of context every time:

| Tool            | Purpose                                  | Injects                                                               |
|-----------------|-------------------------------------------|-----------------------------------------------------------------------|
| `view_task`     | Browse tasks without starting work        | Titles, status, hierarchy (no workflows or references)                |
| `start_task`    | Begin new work or resume after compression| Task workflow, optional main workflow, hierarchical references        |
| `complete_task` | Finish current task and get the next one  | Completion receipt, next task + workflow + references (no main workflow) |

Use `start_task` whenever a session restarts; it re-injects the project’s main methodology. Stick with `complete_task` while working continuously to avoid duplicate main workflow prompts.

### Workflow Types

Two metadata fields control workflow injection:

- **Main-Workflow** – Project-level methodology defined in the first task of a document. Reappears only when work restarts (e.g., after compression or new session). Popular choices include `incremental-orchestration` and `tdd-incremental-orchestration`.
- **Workflow** – Task-level guidance. Injected every time the task is addressed. Useful options include `spec-first-integration`, `multi-option-tradeoff`, `failure-triage-repro`, and `code-review-issue-based`.

Example task definition:

```markdown
### Design API Architecture
- Status: pending
- Main-Workflow: incremental-orchestration   # project methodology (first task only)
- Workflow: spec-first-integration           # task-specific process

Design the REST API architecture.

@/specs/api-requirements.md
@/architecture/patterns.md
```

## Tool Suite

The server exposes 14 MCP tools grouped by workflow stage. Every tool uses unified addressing (`/doc.md#slug`) and context-aware responses.

### Document Discovery & Navigation
- `create_document` – Progressive discovery flow that helps you choose a namespace and create a blank document with title and overview.
- `browse_documents` – Navigate document hierarchy and list folders/documents with basic metadata.
- `search_documents` – Full-text or regex search across all document content with match highlighting, line numbers, and contextual snippets.

### Content & Task Editing
- `section` – Batch edit, append, insert, or remove sections across one or many documents while preserving structure.
- `task` – Create, edit, or list tasks with optional cross-document operations, status filtering, and reference extraction.

### Task Execution Helpers
- `start_task` – Load workflows and referenced docs to kick off (or resume) work with full context.
- `complete_task` – Mark work finished, capture completion notes, and queue the next actionable task.

### View & Inspection
- `view_document` – Complete document structure showing ALL sections (slug, title, depth) with comprehensive metadata including link statistics, task counts, and word counts.
- `view_section` – Section-specific content viewer with two modes: overview (titles only) or detailed content retrieval for specific sections.
- `view_task` – Task-specific viewer with two modes: overview (metadata only) or detailed content with workflows and reference trees.

### Document Lifecycle
- `edit_document` – Update a document’s title and overview without touching section structure.
- `delete_document` – Permanently delete or archive with timestamped audit trail.
- `move` – Relocate sections or tasks within or across documents with safe “create before delete” semantics.
- `move_document` – Move entire documents to new namespaces with automatic directory creation.

**Design principles:** Context-aware operations, batch-friendly APIs, and deterministic behavior even in large documentation sets.

## Workflow Prompts

### Prompt Loading

At startup the server loads Markdown files from two directories:

```
.ai-prompt-guide/workflows/ → workflow_* prompts
.ai-prompt-guide/guides/    → guide_* prompts
```

Logs summarize the load:

```
[INFO] Loading workflow prompts from directory { directory: '/workflows', fileCount: 6, prefix: 'workflow_' }
[INFO] Loading workflow prompts from directory { directory: '/guides', fileCount: 4, prefix: 'guide_' }
[INFO] Workflow prompts loaded from all directories { loaded: 10, failed: 0, directories: 2 }
```

Use your MCP client’s `prompts/list` command to discover them dynamically.

### File Format

Workflows and guides are Markdown files with YAML frontmatter:

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

### Using Workflows in Tasks

Reference workflows and guides directly in task metadata—omit the `workflow_` or `guide_` prefixes, they are added automatically during lookup:

```markdown
### Implement Authentication
- Status: pending
- Workflow: spec-first-integration
- Main-Workflow: causal-flow-mapping

Implement JWT authentication following the API spec.

@/specs/auth-api.md
```

`start_task` and `complete_task` extract these names, load the corresponding prompt files, and inject full methodology alongside referenced documents.

### Create Your Own

1. Create a Markdown file in `.ai-prompt-guide/workflows/` (for process prompts) or `.ai-prompt-guide/guides/` (for documentation helpers). Use lowercase, descriptive filenames (`multi-option-tradeoff.md`, `code_review_checklist.md`).
2. Add YAML frontmatter with `title`, `description`, and `whenToUse`, followed by structured Markdown content.
3. Restart the server (`pnpm build && npx @modelcontextprotocol/inspector node dist/index.js`) or reload your MCP client so the new prompt is detected.
4. Run `prompts/list` to confirm the new prompt appears (e.g., `workflow_my-team-process`).
5. Reference the workflow name (without prefix) from any task.

### Built-In Prompts

The repository includes six workflow prompts:
- `workflow_code-review-issue-based`
- `workflow_failure-triage-repro`
- `workflow_incremental-orchestration`
- `workflow_multi-option-tradeoff`
- `workflow_spec-first-integration`
- `workflow_tdd-incremental-orchestration`

and four documentation guides:
- `guide_activate-guide-documentation`
- `guide_activate-specification-documentation`
- `guide_documentation_standards`
- `guide_research_best_practices`

Consult `docs/WORKFLOW-PROMPTS.md` for detailed descriptions and authoring guidance.

## Claude Code Plugin

The Claude Code plugin bundles this MCP server with guided slash commands and specialized subagents so you can launch complex workflows in one message.

### Install

```bash
/plugin marketplace add https://github.com/Blakeem/AI-Prompt-Guide-MCP
/plugin install ai-prompt-guide
```

Use `/plugin list` to confirm installation or `/plugin update ai-prompt-guide` to pull the latest version.

### Slash Commands

Each command wraps an MCP workflow and expects a follow-up message, for example `/ai-prompt-guide:feature Give the new dashboard requirements`. Available commands:
- `/guide-feature` – Build or extend a feature with incremental orchestration.
- `/guide-fix` – Run the failure triage workflow to isolate and resolve a bug.
- `/guide-refactor` – Plan and execute refactoring with quantitative trade-off analysis.
- `/guide-review` – Launch a targeted code review using the review subagent.
- `/guide-audit` – Perform a comprehensive quality audit across the codebase.
- `/guide-coverage` – Add or improve automated test coverage.
- `/guide-decide` – Compare multiple approaches with structured decision analysis.
- `/guide-spec-feature` – Draft internal specifications before implementation.
- `/guide-spec-external` – Research and document third-party APIs or dependencies.

### Subagents

- **Code Subagent** – Implementation specialist covering feature work, debugging, refactoring, testing, and documentation.
- **Review Subagent** – Quality and risk analyst focused on correctness, security, performance, and architectural concerns.

Slash commands automatically route work to the right subagent and inject the corresponding workflows and reference material.

### Example Usage

```
/ai-prompt-guide:feature Ship an admin dashboard that surfaces active-user trends, includes filtering by region, and exposes download-ready CSV exports. Make sure tests cover the aggregation logic.
```

The plugin will create a structured plan, spin up the code subagent with incremental orchestration, and load any referenced documents or workflows automatically.

## Getting Started

### Requirements

- Node.js 18 or newer
- pnpm 10.x (the project uses pnpm workspaces and lockfiles)

### Install & Build

```bash
pnpm install
pnpm build
```

This compiles the TypeScript source into `dist/` and prepares the executable `ai-prompt-guide-mcp`.

### Run the Server

From a local clone:

```bash
# Development with hot reload
pnpm dev

# Production build
pnpm start          # after pnpm build

# Inspector-driven testing
pnpm build && pnpm inspector
```

You can also launch the published package directly:

```bash
npx -y ai-prompt-guide-mcp
```

### Configuration

- `DOCS_BASE_PATH` (required): Root directory for managed documents, e.g. `./.ai-prompt-guide/docs`.
- `REFERENCE_EXTRACTION_DEPTH` (optional, default `3`): Recursive @reference depth from `1` (direct only) to `5` (maximum).
- `LOG_LEVEL` (optional, default `info`): `debug`, `info`, `warn`, or `error`.

Out-of-range depth values default to `3`. Cycle detection and node limits keep reference loading safe regardless of configuration.

### Directory Structure

```
.ai-prompt-guide/
├── docs/                     # Documents managed by the MCP tools (required)
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
├── workflows/                # Workflow prompts → loaded as workflow_* prompts
│   ├── code-review-issue-based.md
│   ├── failure-triage-repro.md
│   ├── incremental-orchestration.md
│   ├── multi-option-tradeoff.md
│   ├── spec-first-integration.md
│   └── tdd-incremental-orchestration.md
│
└── guides/                   # Documentation guides → loaded as guide_* prompts
    ├── activate-guide-documentation.md
    ├── documentation_standards.md
    ├── activate-specification-documentation.md
    └── research_best_practices.md
```

`docs/` feeds the MCP tools, while `workflows/` and `guides/` load into the prompt system at startup.

## Codex & Other MCP Clients

Any MCP client that accepts a JSON configuration can launch the server the same way. Point the client to the CLI entry point and pass environment variables for your document root:

```json
{
  "mcpServers": {
    "ai-prompt-guide-mcp": {
      "command": "npx",
      "args": ["-y", "ai-prompt-guide-mcp"],
      "env": {
        "DOCS_BASE_PATH": "./.ai-prompt-guide/docs",
        "REFERENCE_EXTRACTION_DEPTH": "3",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Codex CLI Workflow

1. Clone the repository and build it locally (`pnpm install && pnpm build`).
2. Add an entry to your Codex MCP configuration referencing `node dist/index.js` (or the published `npx` command above).
3. Export `DOCS_BASE_PATH` to the folder containing your docs, workflows, and guides.
4. Validate the connection with `pnpm inspector` or `npx --yes @modelcontextprotocol/inspector node dist/index.js`.

Codex and most other MCP clients watch for the `bin` executable, so once the server is built you can point directly at the generated binary without additional glue code.

## Use Cases

- **Development Teams** – Link ADRs to implementations, spec driven feature delivery with structured workflows, and keep large specs searchable by namespace.
- **AI Research & Ops** – Experiment with context engineering, compare workflow strategies, and benchmark deterministic reference loading under different depths.
- **Technical Writers & Knowledge Managers** – Build interconnected documentation ecosystems, validate references automatically, and manage tasks alongside content updates.

## License

MIT. See `LICENSE` for details.

*Transform documentation into an intelligent, context-aware orchestration layer for AI agents.*
