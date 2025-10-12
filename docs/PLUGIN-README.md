# AI Prompt Guide - Claude Code Plugin

Intelligent document management and agent orchestration workflows for AI-assisted development.

## Features

- **Document Management MCP Server** - Full CRUD operations on interconnected markdown documents with advanced linking, task management, and hierarchical reference loading
- **Workflow Orchestration** - Battle-tested workflows for incremental development, TDD, code review, and decision-making
- **Slash Commands** - 9 commands for common development tasks with intelligent workflow selection
- **Specialized Subagents** - Code and Review agents with distinct expertise areas

## Installation

### Install from GitHub

```bash
/plugin add Blakeem/AI-Prompt-Guide-MCP
```

Or via URL:

```bash
/plugin add https://github.com/Blakeem/AI-Prompt-Guide-MCP
```

### Requirements

- Claude Code (latest version)
- Claude Pro, Claude Max subscription, or Anthropic API key
- Node.js (for MCP server)

## Slash Commands

Type `/guide-` to see all available commands:

### Documentation
- `/guide-spec-external` - Document 3rd party APIs/components from official sources
- `/guide-spec-feature` - Document internal feature specification

### Development
- `/guide-feature` - Build new feature with incremental workflow
- `/guide-fix` - Fix bug with systematic triage workflow
- `/guide-refactor` - Refactor code for improved quality

### Quality
- `/guide-review` - Review specific code changes or components
- `/guide-audit` - System-wide quality audit with parallel agents
- `/guide-test` - Write tests for existing code

### Planning
- `/guide-decide` - Multi-option decision making with structured analysis

## MCP Tools Available

Once installed, these tools are available for Claude to use:

**Document Management:**
- `create_document` - Create documents with progressive discovery
- `browse_documents` - Browse and search with namespace awareness
- `view_document` - View document with comprehensive stats
- `edit_document` - Edit title and overview
- `delete_document` - Delete or archive documents

**Content Operations:**
- `section` - Bulk section operations (edit, create, delete)
- `view_section` - View section content

**Task Management:**
- `task` - Create, edit, list tasks
- `start_task` - Start task with workflow injection
- `complete_task` - Complete and get next task
- `view_task` - View task details

**Document Operations:**
- `move` - Move sections/tasks between documents
- `move_document` - Move documents to different paths
- `search_documents` - Full-text and regex search

## Subagents

### Code Agent
**Specializes in:** Implementation, debugging, testing, documentation, refactoring

Automatically invoked for:
- Building features
- Fixing bugs
- Writing tests
- Creating documentation
- Refactoring code

### Review Agent
**Specializes in:** Code quality, security, architecture, best practices

Automatically invoked for:
- Code reviews
- Quality audits
- Security analysis
- Architecture reviews

## Workflows Included

Proven workflows for agent coordination:

1. **Incremental Orchestration** - Standard feature development with quality gates
2. **TDD Incremental Orchestration** - Test-driven development with strict discipline
3. **Code Review: Issue-Based** - Parallel review with specialized agents
4. **Multi-Option Trade-off** - Structured decision making
5. **Failure Triage & Repro** - Systematic bug fixing
6. **Spec-First Integration** - Integration correctness protocol

## Quick Start Examples

### Document an External API
```
/guide-spec-external Research and document the Stripe Payment Intents API for our Node.js integration
```

### Build a New Feature
```
/guide-feature Add user authentication with JWT tokens, include database schema and tests
```

### Fix a Bug
```
/guide-fix The user profile page shows wrong data after logout, only happens in production
```

### Code Review
```
/guide-review Review the authentication changes in PR #123
```

### Make a Design Decision
```
/guide-decide Choose between Redis vs in-memory cache for session storage
```

## Configuration

The MCP server uses these environment variables (configured automatically):

- `DOCS_BASE_PATH` - Base path for documents (default: `.ai-prompt-guide/docs`)
- `REFERENCE_EXTRACTION_DEPTH` - Depth for reference loading (default: 3)

## Management

```bash
# List installed plugins
/plugin list

# Update plugin
/plugin update ai-prompt-guide

# Remove plugin
/plugin remove ai-prompt-guide
```

## Documentation

All workflows and guides are included in the plugin:

- **Workflows:** `.ai-prompt-guide/workflows/` - Process frameworks
- **Guides:** `.ai-prompt-guide/guides/` - Best practices and standards

## Support

Report issues at: https://github.com/Blakeem/AI-Prompt-Guide-MCP/issues

## License

MIT License - See LICENSE file for details
