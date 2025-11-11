# AI-Prompt-Guide MCP Server - Developer Guide

## Project Overview

MCP server for AI prompt and guide document management. Provides full CRUD operations on interconnected Markdown documents with advanced linking, task management, and view capabilities.

**Tech Stack:**
- TypeScript with strict mode, ES modules
- Node.js runtime
- pnpm package manager (NOT npm/yarn)

**Key Architecture:**
- Central Addressing System - Type-safe addressing with LRU caching
- Unified Reference Extraction - Single source @reference pattern extraction
- Hierarchical Document Loading - Recursive reference loading with cycle detection
- Progressive Discovery Workflows - 2-stage document creation
- Flat Section Addressing - Unique slug addressing with duplicate handling

## Configuration

### Zero-Config Default

Works out-of-the-box. Uses `process.cwd()` as workspace, creates:
```
Project Directory/
└── .ai-prompt-guide/
    ├── docs/              ← Project documents
    ├── archived/          ← Archived documents
    └── coordinator/       ← Coordinator tasks
```

Shared resources from MCP server installation:
```
MCP Installation/
└── .ai-prompt-guide/
    ├── workflows/         ← Shared workflow templates
    └── guides/           ← Shared documentation guides
```

### Optional Override

Create `.mcp-config.json` for custom paths:
```json
{
  "env": {
    "MCP_WORKSPACE_PATH": "/custom/path",
    "DOCS_BASE_PATH": "/custom/docs",
    "ARCHIVED_BASE_PATH": "/custom/archive",
    "COORDINATOR_BASE_PATH": "/custom/coordinator"
  }
}
```

### Environment Variables

```bash
REFERENCE_EXTRACTION_DEPTH=3  # Default: 3, Range: 1-5
```
Controls hierarchical reference loading depth.

## Quality Gates (MANDATORY)

**After EVERY code change, ALL must pass:**
```bash
pnpm test:run           # ALL tests pass
pnpm lint               # ZERO errors/warnings
pnpm typecheck          # ZERO type errors
pnpm check:dead-code    # ZERO unused exports
pnpm check:all          # Combined check (recommended)
pnpm build && npx @modelcontextprotocol/inspector node dist/index.js  # MCP testing
```

**Test Commands:**
- `pnpm test` - Watch mode
- `pnpm test:run` - Run once, exit
- `pnpm test:coverage` - With coverage
- `pnpm test:ci` - CI-friendly

**Dead Code Detection:**
All unused exports must be cleaned up. Zero tolerance.

## Core Design Patterns

### VirtualPathResolver (Path Resolution)

**ALWAYS use VirtualPathResolver** for path resolution:
```typescript
// ✅ Correct
const absolutePath = manager.pathResolver.resolve(addresses.document.path);

// ❌ Wrong - manual construction
const absolutePath = path.join(config.workspaceBasePath, addresses.document.path);
```

**Methods:**
- `resolve(virtualPath)` - Virtual to absolute filesystem path
- `isCoordinatorPath(virtualPath)` - Check coordinator namespace
- `getArchivePath(virtualPath)` - Generate archive path
- `getBaseRoot(virtualPath)` - Get base root directory

**Path Structure:**
- Virtual: `/api/auth.md`, `/coordinator/active.md`
- Physical docs: `.ai-prompt-guide/docs/api/auth.md`
- Physical coordinator: `.ai-prompt-guide/coordinator/active.md`
- Archive: `.ai-prompt-guide/archived/docs/api/auth.md`

### Markdown Parsing

Use existing tools, not manual string manipulation:
- `listHeadings()` - Parse document headings
- `buildToc()` - Generate table of contents
- `insertRelative()` - Insert content relative to sections
- `readSection()` - Extract section content

### Task Identification

Structural analysis, not naming conventions:
```typescript
import { isTaskSection } from '../shared/addressing-system.js';

const isTask = await isTaskSection(heading.slug, document);
```

### GithubSlugger Pattern

Single instance per document for automatic duplicate handling:
```typescript
const slugger = new GithubSlugger();
headings.forEach(heading => {
  heading.slug = slugger.slug(heading.title);  // task, task-1, task-2
});
```

### ToolIntegration Pattern

Standard validation approach for all tools:
```typescript
import { ToolIntegration } from '../shared/addressing-system.js';

const { addresses } = ToolIntegration.validateAndParse({
  document: params.document as string,
  ...(params.section && { section: params.section as string })
});
```

Error handling:
```typescript
import { DocumentNotFoundError, SectionNotFoundError } from '../shared/addressing-system.js';

try {
  const { addresses } = ToolIntegration.validateAndParse({...});
} catch (error) {
  if (error instanceof DocumentNotFoundError) {
    // Handle document not found
  } else if (error instanceof SectionNotFoundError) {
    // Handle section not found
  }
}
```

## Error Handling Standards

All errors include code, context, and version:
```typescript
function createError(message: string, code: string, context?: Record<string, unknown>): SpecDocsError {
  const error = new Error(message) as SpecDocsError;
  return Object.assign(error, {
    code,
    context: { ...context, version: packageJson.version }
  });
}
```

**Error Severity:**
- **CRITICAL**: Throw error (path traversal, resource exhaustion)
- **IMPORTANT**: Log error, return error result (cache invalidation)
- **OPTIONAL**: Log warning, use fallback (config loading)

**Security Events:**
All violations logged via `SecurityAuditLogger`.

### Resource Management

**Session Cleanup:** 24hr TTL, LRU eviction at 1000 sessions, hourly cleanup
**Cache Management:** 100K heading limit, LRU eviction, destroy() cleanup
**File Watcher:** Exponential backoff, polling fallback after 3 failures
**Reference Loading:** 1000 node limit, 30s timeout, cycle detection

## MCP Testing

### Inspector Commands

```bash
# Build first
pnpm build

# List tools
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list

# Test specific tool
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call \
  --tool-name test_connection \
  --tool-arg includeServerInfo=true

# Web UI
npx @modelcontextprotocol/inspector node dist/index.js
```

### Common Issues

**1. Global Cache Initialization:**
```typescript
import { initializeGlobalCache } from './dist/document-cache.js';
import { DocumentManager } from './dist/document-manager.js';

initializeGlobalCache(docsRoot);  // REQUIRED before manager
const manager = new DocumentManager(docsRoot);
```

**2. ES Module Requirements:**
- Use `.js` extensions in imports
- Use `import`, not `require()`
- Built files in `dist/`, not `build/`

**3. Archive Testing:**
- Verify document movement AND audit file creation
- Test files in `.ai-prompt-guide/docs/` structure

## Tool Architecture

### File Structure

```
src/
├── session/                    # Session state management
│   ├── types.ts               # SessionState interfaces
│   ├── session-store.ts       # Singleton store
│   └── index.ts
├── tools/
│   ├── types.ts               # ToolDefinition interface
│   ├── registry.ts            # Dynamic registration
│   ├── executor.ts            # Execution dispatcher
│   ├── schemas/               # Schema definitions
│   │   └── [tool-name]-schemas.ts
│   └── implementations/       # Tool logic
│       ├── [tool-name].ts
│       └── index.ts
├── server/
│   ├── request-handlers/
│   │   └── tool-handlers.ts
│   └── server-factory.ts
└── shared/
    └── utilities.ts
```

### Available Tools

**Document Management:**
- `create_document` - 2-stage progressive discovery
- `browse_documents` - Namespace-aware browsing
- `search_documents` - Full-text/regex search
- `edit_document` - Edit title/overview
- `delete_document` - Delete or archive
- `move_document` - Relocate files

**Content Operations:**
- `section` - Bulk operations (replace, append, prepend, insert_before, insert_after, append_child, remove)
- `move` - Move sections/tasks between documents

**View & Inspection:**
- `view_document` - Comprehensive stats
- `view_section` - Clean section viewer
- `view_subagent_task` - Subagent task viewer
- `view_coordinator_task` - Coordinator task viewer

**Task Management:**
- `subagent_task` - Bulk operations (create, edit, list)
- `coordinator_task` - Bulk operations (create, edit, list)
- `complete_subagent_task` - Mark complete
- `complete_coordinator_task` - Mark complete
- `start_subagent_task` - Start work
- `start_coordinator_task` - Start work

**Workflows & Guides:**
- `get_workflow` - Fetch workflow protocol
- `get_guide` - Fetch documentation guide

### Progressive Discovery Pattern

**create_document** implements 2-stage flow:
1. **Stage 0 (Discovery):** Show available namespaces
2. **Stage 1 (Creation):** Create blank document (title + overview + TOC placeholder)

Implementation requires:
- Schema stages in `src/tools/schemas/[tool]-schemas.ts`
- Session state tracking in `src/session/types.ts`
- Stage logic in `src/tools/implementations/[tool].ts`
- Dynamic schema in `src/tools/registry.ts`

### Session State Management

Always use singleton:
```typescript
import { getGlobalSessionStore } from '../session/session-store.js';

const sessionStore = getGlobalSessionStore();
sessionStore.updateSession(sessionId, { toolStage: newStage });
```

**Rules:**
- State persists within session across tool calls
- Each session maintains independent state
- Never create new SessionStore instances
- State resets when session ends

### Adding New Tools

- [ ] Schema in `src/tools/schemas/[tool]-schemas.ts`
- [ ] Implementation in `src/tools/implementations/[tool].ts`
- [ ] Update SessionState if progressive discovery
- [ ] Add to `src/tools/registry.ts`
- [ ] Update `src/tools/executor.ts` switch
- [ ] Export from `src/tools/implementations/index.ts`
- [ ] Write unit tests
- [ ] Test with MCP Inspector
- [ ] Document special behavior

## Central Addressing System

Type-safe, performant addressing with LRU caching.

**Features:**
- Interfaces: `DocumentAddress`, `SectionAddress`, `TaskAddress`
- LRU cache with 1000 item limit
- Custom error types: `AddressingError`, `DocumentNotFoundError`, `SectionNotFoundError`
- Multiple input formats: `"section"`, `"#section"`, `"/doc.md#section"`

**Document Addressing:**
```typescript
const document = parseDocumentAddress('/api/specs/auth.md');
// Returns: { path, slug, namespace, normalizedPath, cacheKey }
```

**Section Addressing:**
```typescript
// All formats supported:
parseSectionAddress('overview', '/api/specs/auth.md');
parseSectionAddress('#overview', '/api/specs/auth.md');
parseSectionAddress('/api/specs/auth.md#overview');
```

**Task Addressing:**
```typescript
// Structural identification, not naming-based
const task = parseTaskAddress('initialize-project', '/project/setup.md');
const isTask = await isTaskSection(slug, document);
```

## Type Safety & Conventions

### AccessContext Enum

Use enum, not string literals:
```typescript
import { AccessContext } from './document-cache.js';

const doc = await cache.getDocument(path, AccessContext.SEARCH);
// AccessContext.DIRECT (default), .SEARCH (3x eviction resistance), .REFERENCE (2x)
```

### Nullish Coalescing

Use `??` for null/undefined checks:
```typescript
const value = param ?? 'default';  // ✅ Correct
const value = param || 'default';  // ❌ Wrong (treats 0, '', false as falsy)
```

### Structured Logging

Use structured logger, not console:
```typescript
import { getGlobalLogger } from './utils/logger.js';
const logger = getGlobalLogger();

logger.warn('Failed to load reference', {
  reference: ref.originalRef,
  error: error instanceof Error ? error.message : String(error)
});
```

### Named Constants

Avoid magic numbers:
```typescript
const TOC_UPDATE_DEBOUNCE_MS = 100;
setTimeout(() => void this.updateTableOfContents(docPath), TOC_UPDATE_DEBOUNCE_MS);
```

## Key Principles

1. **Follow Established Patterns** - Use existing codebase patterns
2. **Schema Reuse** - Import from `src/tools/schemas/`, don't duplicate
3. **Quality Gates** - `pnpm check:all` MUST pass before completion
4. **No Dead Code** - Zero unused exports (enforced by CI)
5. **MCP Compliance** - Proper MCP patterns and error handling
6. **Type Safety** - Use enums and strong typing
7. **Resource Management** - Implement cleanup in destroy() methods
