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
4. Run `pnpm check:dead-code` - ZERO unused exports allowed
5. Run `pnpm check:all` - Combined quality validation (recommended)

### Dead Code Detection (MANDATORY)
```bash
# Individual checks
pnpm check:dead-code     # Must show "0 modules with unused exports"

# Comprehensive check (runs all quality gates)
pnpm check:all           # Lint + TypeCheck + Dead Code
```

### Test Commands
- `pnpm test:run` - Run tests once and exit (for CI/validation)
- `pnpm test` - Watch mode for development (stays running)
- `pnpm test:coverage` - Run with coverage report
- `pnpm test:ci` - CI-friendly test command (with environment flags)
- `pnpm test:all` - Run tests and all quality gates
- **Unit Testing**: ALL new features must include unit tests following `docs/UNIT-TEST-STRATEGY.md`

## COMMON ESLINT ISSUES & SOLUTIONS

Based on practical experience implementing this system, here are the most common linting issues encountered and their proper solutions:

### 1. **Non-null Assertions (`@typescript-eslint/no-non-null-assertion`)**
❌ **Avoid:** `array[0]!.property` or `value!`
✅ **Use:** Explicit null checks with proper handling
```typescript
// Bad
const firstHeading = headings[0]!.slug;

// Good 
const firstHeading = headings[0];
if (firstHeading != null) {
  const slug = firstHeading.slug;
  // ... use slug
}
```

### 2. **Contradictory Optional Chain vs Strict Boolean Rules**
When ESLint gives contradictory suggestions between `prefer-optional-chain` and `strict-boolean-expressions`:
```typescript
// If both rules conflict, use explicit null check with disable comment
// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
if (value != null && value.startsWith('#')) {
  // ... handle value
}
```

### 3. **Nullish Coalescing (`@typescript-eslint/prefer-nullish-coalescing`)**
❌ **Avoid:** `||` for potentially falsy values
✅ **Use:** `??` for null/undefined checks
```typescript
// Bad
const title = heading.title || 'Default Title';
const matches = content.match(regex) || [];

// Good
const title = heading.title ?? 'Default Title'; 
const matches = content.match(regex) ?? [];
```

### 4. **Nullish Assignment (`@typescript-eslint/prefer-nullish-coalescing`)**
❌ **Avoid:** Manual null checks for assignment
✅ **Use:** `??=` operator
```typescript
// Bad
if (document.sections == null) {
  document.sections = new Map();
}

// Good
document.sections ??= new Map();
```

### 5. **String Concatenation (`prefer-template`)**
❌ **Avoid:** String concatenation with `+`
✅ **Use:** Template literals
```typescript
// Bad
content += '\n\n' + tocPlaceholder;

// Good
content = `${content}\n\n${tocPlaceholder}`;
```

### 6. **Strict Boolean Expressions (`@typescript-eslint/strict-boolean-expressions`)**
❌ **Avoid:** Implicit truthiness checks
✅ **Use:** Explicit comparisons
```typescript
// Bad - implicit truthiness
if (line && !line.startsWith('#')) { }

// Good - explicit checks
if (line != null && line !== '' && !line.startsWith('#')) { }
```

### 7. **Function Return Types (`@typescript-eslint/explicit-function-return-type`)**
Always add explicit return types to public methods:
```typescript
// Bad
async getDocument(docPath: string) {
  return await this.cache.getDocument(docPath);
}

// Good
async getDocument(docPath: string): Promise<CachedDocument | null> {
  return await this.cache.getDocument(docPath);
}
```

### **Key Design Principle**
**ALWAYS use the existing markdown parsing tools** (`listHeadings()`, `buildToc()`, `insertRelative()`, `readSection()`) instead of manual string manipulation. The toolkit provides these tools specifically to avoid brittle string parsing that breaks on edge cases.

## TESTING AND DEVELOPMENT

### MCP Inspector Testing (REQUIRED)

#### **Development Workflow**
Use **ad hoc inspector sessions** - start only when testing, stop immediately after:

```bash
# Start inspector for testing
pnpm inspector:dev

# Test functionality in browser
# Stop inspector immediately: Ctrl+C
```

#### **Inspector Startup Process**
1. **Check for conflicts first:**
   ```bash
   lsof -i :6277  # Check proxy port  
   lsof -i :6274  # Check inspector port
   # Kill any running processes: kill <PID>
   ```

2. **Start fresh inspector:**
   ```bash
   pnpm inspector:dev
   ```

3. **Access URL:** Open the provided URL with pre-filled auth token:
   ```
   🔗 Open inspector with token pre-filled:
      http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=<token>
   ```

#### **Handoff Protocol**
**For user testing sessions:**
1. **Assistant**: Stop all background inspectors  
2. **User**: Start fresh inspector with `pnpm inspector:dev`
3. **User**: Test functionality, then stop with `Ctrl+C`
4. **Clean environment**: No persistent background processes

#### **Port Conflict Resolution**
If you encounter "PORT IS IN USE" errors:
```bash
# Method 1: Find and kill specific processes
lsof -i :6277 -i :6274  # Show what's using the ports
kill <PID1> <PID2> <PID3>  # Kill the specific process IDs

# Method 2: Kill by process pattern (more aggressive)
pkill -f "inspector.*tsx"
pkill -f "modelcontextprotocol"

# Method 3: One-liner to clear both ports
lsof -ti :6277,:6274 | xargs -r kill
```

**Common Cause**: Orphaned inspector processes that detached from Claude Code sessions but are still running in background.

### Common Development Issues & Solutions

#### 1. **Global Document Cache Initialization**
When testing DocumentManager programmatically:
```typescript
import { initializeGlobalCache } from './dist/document-cache.js';
import { DocumentManager } from './dist/document-manager.js';

// REQUIRED: Initialize cache before creating manager
initializeGlobalCache(docsRoot);
const manager = new DocumentManager(docsRoot);
```

#### 2. **ES Module Import Errors**
- Use `.js` extensions in import statements (TypeScript requirement)
- Use `import` syntax, not `require()` (ES modules enabled)
- Built files are in `dist/` directory, not `build/`

#### 3. **Archive Functionality Testing**
- Archive system creates `/archived` directory with audit trails
- Test files should be in `.spec-docs-mcp/docs/` structure
- Always verify both document movement AND audit file creation

#### 4. **Background Process Management**
- Use `run_in_background: true` for long-running commands
- Check process output with BashOutput tool
- Kill processes properly using KillBash tool or direct `kill` commands

### Integration Testing Workflow
1. **Start Inspector** → `pnpm inspector:dev`
2. **Run Quality Gates** → `pnpm check:all` (includes lint + typecheck + dead-code)
3. **Test CRUD Operations** → Use inspector interface
4. **Verify Archive System** → Create, then archive test documents
5. **Check Templates** → Verify `.spec-docs-mcp/templates/` accessibility

## Dead Code Prevention (MANDATORY)

**Quality Gate Requirements:**
```bash
# MUST pass before completion
pnpm check:dead-code     # Expected: "0 modules with unused exports"
pnpm check:all          # Runs all checks: lint + typecheck + dead-code
```

**Automated Detection:**
- Always run `pnpm check:all` before considering work complete
- Dead code detection enforced by strict ESLint rules and ts-unused-exports

**Prevention Guidelines:**
- Remove unused exports IMMEDIATELY after refactoring
- Delete helper functions when no longer needed
- Clean up old implementations after consolidation
- Verify all imports are actually used in the file

## RECENT MAJOR CHANGES

### Tool Consolidation (2025-09-21)
- **`insert_section` removed**: Functionality merged into enhanced `edit_section` tool
- **Enhanced `edit_section`**: Now supports both editing existing sections AND creating new sections with automatic depth calculation
- **Operations supported**: `replace`, `append`, `prepend` (edit existing) + `insert_before`, `insert_after`, `append_child` (create new)
- **Automatic depth**: No manual depth tracking needed - tool calculates optimal depth based on operation and reference section
- **Unified approach**: Single tool for all section manipulation, reducing MCP complexity

## MCP ARCHITECTURE & TOOL DEVELOPMENT

### File Structure Organization

MCP tools follow a modular architecture with clear separation of concerns:

```
src/
├── session/                    # Session state management
│   ├── types.ts               # SessionState interface definitions
│   ├── session-store.ts       # Singleton SessionStore implementation
│   └── index.ts               # Re-exports
├── tools/
│   ├── types.ts               # ToolDefinition interface
│   ├── registry.ts            # Dynamic tool registration & visibility
│   ├── executor.ts            # Tool execution dispatcher
│   ├── schemas/               # Centralized schema definitions
│   │   └── [tool-name]-schemas.ts
│   └── implementations/       # Tool implementation logic
│       ├── [tool-name].ts    # Individual tool implementations
│       └── index.ts           # Re-exports
├── server/
│   ├── request-handlers/      # MCP request handling
│   │   └── tool-handlers.ts   # Tool list & execution handlers
│   └── server-factory.ts      # Server initialization
└── shared/
    └── utilities.ts           # Shared helper functions
```

### Progressive Discovery Pattern

The progressive discovery pattern allows tools to reveal parameters gradually, conserving context and guiding users through complex flows.

#### Key Concepts

1. **Staged Schema Evolution**: Tool schemas change based on session state
2. **Response-Driven Guidance**: Each response teaches the next valid parameters
3. **Context Conservation**: Minimal schemas reduce token usage
4. **Graceful Error Handling**: Errors provide helpful guidance, not exceptions

#### Implementation Pattern

For any tool implementing progressive discovery:

1. **Define Schema Stages** (`src/tools/schemas/[tool]-schemas.ts`):
```typescript
export const TOOL_SCHEMAS: Record<number, SchemaStage> = {
  0: { /* minimal schema */ },
  1: { /* intermediate schema */ },
  2: { /* full schema */ }
};
```

2. **Track Session State** (`src/session/types.ts`):
```typescript
export interface SessionState {
  sessionId: string;
  toolNameStage: number;  // Add stage tracking for your tool
}
```

3. **Implement Stage Logic** (`src/tools/implementations/[tool].ts`):
```typescript
export async function executeTool(
  args: Record<string, unknown>,
  state: SessionState,
  onStageChange?: () => void
): Promise<unknown> {
  // Determine current stage from args
  // Update session state if stage changes
  // Return stage-appropriate response
}
```

4. **Update Tool Registry** (`src/tools/registry.ts`):
```typescript
const toolSchema = getToolSchema(state.toolNameStage);
// Return dynamic schema based on session state
```

### Session State Management

#### Singleton Pattern
Always use the global SessionStore singleton for state persistence:

```typescript
import { getGlobalSessionStore } from '../session/session-store.js';

const sessionStore = getGlobalSessionStore();
sessionStore.updateSession(sessionId, { toolStage: newStage });
```

#### State Persistence Rules
- State persists within a session across multiple tool calls
- Each session maintains independent state
- Never create new SessionStore instances - always use the singleton
- State resets when session ends

### Tool Implementation Best Practices

1. **Centralize Schemas**: All schemas, examples, and constants in `src/tools/schemas/`
2. **Single Responsibility**: Each tool implementation in its own file
3. **Explicit Typing**: Always define return types and interfaces
4. **Error Recovery**: Return helpful guidance instead of throwing errors
5. **State Updates**: Update session state before triggering notifications

### MCP Inspector Testing

#### Testing Progressive Discovery

1. **Manual Refresh Required**: MCP Inspector doesn't auto-refresh on `tools/list_changed`
2. **Test Flow**:
   - Call tool with minimal params
   - Manually refresh tool list (pull down or click refresh)
   - Observe schema changes
   - Call with next stage params
   - Repeat until complete

3. **Programmatic Testing**:
```javascript
// Create test script as .cjs file for CommonJS
const commands = [
  { name: 'Initial tools/list', request: '{"method":"tools/list"}' },
  { name: 'Call tool', request: '{"method":"tools/call","params":{...}}' },
  { name: 'Verify schema update', request: '{"method":"tools/list"}' }
];
```

### Tool List Update Notifications

#### How It Works
When tool schemas need updating:
```typescript
void server.notification({
  method: 'notifications/tools/list_changed',
  params: {}
});
```

#### Important Limitations
- **Not universally supported**: Many MCP clients ignore these notifications
- **Manual intervention often required**: Users must refresh manually
- **Transport-level only**: LLMs don't see these notifications in context
- **Still useful**: Some clients DO respect them, so always send

### Adding New Tools Checklist

When implementing a new MCP tool:

- [ ] Create schema definitions in `src/tools/schemas/[tool]-schemas.ts`
- [ ] Add implementation in `src/tools/implementations/[tool].ts`
- [ ] Update SessionState interface if using progressive discovery
- [ ] Add tool to registry in `src/tools/registry.ts`
- [ ] Update executor switch statement in `src/tools/executor.ts`
- [ ] Export from `src/tools/implementations/index.ts`
- [ ] Write unit tests for the implementation
- [ ] Test with MCP Inspector including all stages
- [ ] Document any special behavior or limitations

### Common Patterns to Follow

#### Pattern: Centralized Constants
```typescript
// src/tools/schemas/tool-schemas.ts
export const TOOL_CONSTANTS = {
  TYPES: { /* ... */ },
  LIMITS: { /* ... */ },
  DEFAULTS: { /* ... */ }
};
```

#### Pattern: Response Consistency
```typescript
// Always return structured responses
return {
  stage: 'current_stage',
  data: { /* relevant data */ },
  next_step: 'Clear instruction',
  example: { /* valid example */ }
};
```

#### Pattern: Error Fallbacks
```typescript
// Instead of throwing errors
if (invalid) {
  return {
    stage: 'error_fallback',
    error: 'What went wrong',
    help: 'How to fix it',
    example: { /* correct usage */ }
  };
}
```

## Key Principles

1. **Follow Established Patterns** - The codebase has mature patterns, use them
2. **Schema Reuse** - Import from `src/tools/schemas/` instead of duplicating
3. **Test Everything** - See `docs/UNIT-TEST-STRATEGY.md` for testing requirements
4. **Quality Gates** - `pnpm check:all` MUST show zero issues
5. **No Dead Code** - Zero unused exports allowed (enforced by CI)
6. **MCP Compliance** - Use proper MCP patterns and error handling
7. **Production Ready** - Every change must pass ALL quality gates

## DEBUGGING PRINCIPLES

### **Never Mask Issues - Always Find Root Cause**
When encountering warnings or errors:

❌ **DON'T:** Hide warnings with grep, redirects, or suppression
✅ **DO:** Trace to the actual source and resolve properly
