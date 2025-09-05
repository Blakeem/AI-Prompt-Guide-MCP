# CLAUDE.md - Assistant Instructions for Spec-Docs MCP Server

## Project Overview

This is a Markdown CRUD toolkit for building an MCP server that allows full Create, Read, Update, and Delete operations on Markdown files. The toolkit uses deterministic slug-based addressing for sections and enforces strict duplicate heading prevention.

**Purpose:** Enable LLMs to manage specification documents programmatically without direct markdown manipulation, providing a clean interface for document CRUD operations through MCP tools.

**Key Features:**
- Slug-based section addressing (e.g., `#get-users-id`, `#api-limits-quotas`) 
- Hierarchical TOC generation and navigation
- Duplicate heading prevention among siblings
- File safety with precondition checks
- Comprehensive markdown parsing and serialization 

**Package Manager**: pnpm (NOT npm or yarn)
**Language**: TypeScript with strict mode enabled
**Runtime**: Node.js with ES modules

## CRITICAL CODE QUALITY REQUIREMENTS

### Quality Gates (ALL must pass)
**AFTER EVERY CODE CHANGE:**
1. Run `pnpm test:run` - ALL tests must pass (runs once, exits)
2. Run `pnpm lint` - ZERO errors and warnings allowed  
3. Run `pnpm typecheck` - ZERO type errors allowed
4. **Unit Testing**: ALL new features must include unit tests following `docs/UNIT-TEST-STRATEGY.md`

### Test Commands
- `pnpm test:run` - Run tests once and exit (for CI/validation)
- `pnpm test` - Watch mode for development (stays running)
- `pnpm test:coverage` - Run with coverage report

