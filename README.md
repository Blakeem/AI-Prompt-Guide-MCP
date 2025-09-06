# Spec-Docs MCP Server

A Model Context Protocol (MCP) server for intelligent specification document management through structured markdown operations.

## Overview

Spec-Docs MCP provides programmatic access to create, read, update, and delete markdown documentation with precision. Built for LLMs to manage technical specifications, API documentation, and structured knowledge bases without direct file manipulation.

## Status

🚧 **Active Development** - Core infrastructure complete, MCP tools coming soon.

## Features

### Current Capabilities
- **Structured Markdown Parsing** - Hierarchical heading analysis with parent-child relationships
- **Table of Contents Generation** - Automatic nested TOC building from document structure  
- **Slug-Based Addressing** - GitHub-compatible slug generation for precise section targeting
- **Safe Section Operations** - CRUD operations with duplicate prevention and hierarchy preservation
- **File Safety** - Modification time precondition checking to prevent concurrent edit conflicts

### Planned MCP Tools
- `list_headings` - Extract document structure with hierarchical metadata
- `read_section` - Retrieve specific sections by slug reference
- `create_section` - Insert new sections with automatic hierarchy management
- `update_section` - Modify section content while preserving structure
- `delete_section` - Remove sections and their descendants
- `rename_heading` - Update headings with automatic slug regeneration
- `search_docs` - Find relevant documentation by content and metadata

## Use Cases

- **Documentation Systems** - Maintain technical specifications and API docs
- **Knowledge Management** - Organize and navigate structured information
- **Content Automation** - Programmatically manage markdown-based content
- **LLM Integration** - Enable AI assistants to work with documentation intelligently

## Technical Foundation

Built with:
- TypeScript (strict mode)
- MCP SDK for protocol compliance
- Unified/Remark for AST-based markdown processing
- GitHub-slugger for compatible slug generation
- Comprehensive test coverage with Vitest

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/spec-docs-mcp.git
cd spec-docs-mcp

# Install dependencies
pnpm install

# Build project
pnpm build

# Run tests
pnpm test
```

## Architecture

The server uses a modular architecture with clean separation of concerns:

- **Core Operations** - Markdown parsing, TOC building, section CRUD
- **File Safety** - Atomic operations with mtime precondition checking
- **Error Handling** - Structured errors with context for debugging
- **Logging** - Comprehensive logging with sensitive data sanitization

## Development

```bash
# Run tests in watch mode
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build distribution
pnpm build
```

## Contributing

This project is in active development. Contributions, ideas, and feedback are welcome!

## License

MIT

## Acknowledgments

Built to complement the MCP ecosystem for enhanced documentation capabilities.